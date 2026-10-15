// Spinalix ストア — 状態・永続化・同期・自立思考・APIモード
import { create } from 'zustand'
import type { EmotionVector, Fragment, Link, Preferences, SuddenThought, ThoughtCrystal } from './lib/types'
import { PERSONA_FRAGMENTS, USER_FRAGMENTS, type SeedFragment } from './lib/persona'
import { analyzeEmotion, blendEmotion } from './lib/emotion'
import { adoptThought, assembleCrystal, buildLinks } from './lib/engine'
import { thinkWithTrace, toThought } from './lib/think'
import { stylizeWithApi, type ApiConfig } from './lib/apiBrain'

const STORAGE_KEY = 'spinalix-v2'
const TS_KEY = 'spinalix-v2-ts'
const API_KEY = 'spinalix-api-v1'
const LEGACY_KEY = 'spinalix-v1'

export type SyncMode = 'local' | 'brain'

export interface ApiSettings extends ApiConfig {
  enabled: boolean
}

const DEFAULT_API: ApiSettings = { enabled: false, provider: 'gemini', model: 'gemini-2.0-flash', apiKey: '' }

/** v1のデータをv2の形へ移行する（フィールド欠落を埋める） */
function normalizeThought(t: SuddenThought): SuddenThought {
  return {
    ...t,
    path: t.path ?? t.from ?? [],
    steps: t.steps ?? [],
    engine: t.engine ?? 'local',
    score: t.score ?? 0,
    fingerprint: t.fingerprint ?? (t.from?.length ? [...t.from].sort().join('|') : `legacy|${t.id}`),
  }
}

export function normalizePrefs(p: Partial<Preferences> | undefined | null): Preferences {
  const keys = ['echo', 'tension', 'question', 'recall', 'arc', 'leap', 'openloop'] as const
  const adoptedKinds = {} as Record<(typeof keys)[number], number>
  const rejectedKinds = {} as Record<(typeof keys)[number], number>
  for (const k of keys) {
    adoptedKinds[k] = p?.adoptedKinds?.[k] ?? 0
    rejectedKinds[k] = p?.rejectedKinds?.[k] ?? 0
  }
  return { adoptedKinds, rejectedKinds, adoptedThoughtTexts: p?.adoptedThoughtTexts ?? [] }
}

interface Persisted {
  fragments: Fragment[]
  thoughts: SuddenThought[]
  crystals: ThoughtCrystal[]
  prefs: Preferences
}

function seedToFragment(seed: SeedFragment, idx: number): Fragment {
  const emotion: EmotionVector = seed.em
    ? { valence: seed.em.v, arousal: seed.em.a, intensities: seed.em.i ?? analyzeEmotion(seed.t).intensities }
    : analyzeEmotion(seed.t)
  return {
    id: `f${String(idx).padStart(3, '0')}`,
    text: seed.t,
    createdAt: new Date(`${seed.d}T09:00:00+09:00`).toISOString(),
    source: 'user',
    emotion,
    people: seed.p ?? [],
    themes: seed.th ?? [],
  }
}

export function seedFragments(): Fragment[] {
  return [...PERSONA_FRAGMENTS, ...USER_FRAGMENTS]
    .map(seedToFragment)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

interface SpinalixState extends Persisted {
  links: Link[]
  hydrated: boolean
  syncMode: SyncMode
  lan: string | null
  autonomous: boolean
  thinking: boolean
  api: ApiSettings
  hydrate: () => Promise<void>
  addFragment: (text: string, manual?: EmotionVector) => Fragment
  advanceThought: () => SuddenThought | null
  runCycle: () => Promise<SuddenThought | null>
  deepThink: (n: number) => Promise<void>
  decide: (thoughtId: string, accept: boolean) => void
  buildCrystal: (intention: string) => ThoughtCrystal
  resetAll: () => void
  exportJSON: () => string
  pullFromServer: () => Promise<void>
  setAutonomous: (on: boolean) => void
  setApi: (patch: Partial<ApiSettings>) => void
  importVault: (files: File[]) => Promise<number>
}

export const useSpinalix = create<SpinalixState>((set, get) => {
  const snapshot = (): Persisted => {
    const { fragments, thoughts, crystals, prefs } = get()
    return { fragments, thoughts, crystals, prefs }
  }

  const commit = () => {
    const data = snapshot()
    const now = Date.now()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem(TS_KEY, String(now))
    } catch {
      // 保存できない環境でも動作は継続
    }
    if (get().syncMode === 'brain') {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ updatedAt: now, payload: data }),
      }).catch(() => {})
    }
  }

  const apply = (data: Persisted) => {
    const thoughts = (data.thoughts ?? []).map(normalizeThought)
    const prefs = normalizePrefs(data.prefs)
    set({ fragments: data.fragments, thoughts, crystals: data.crystals ?? [], prefs, links: buildLinks(data.fragments) })
  }

  /** 決定論的エンジンで下書きを作り、必要ならAPIで「文体化」する（検証つき） */
  const generateNext = async (): Promise<SuddenThought | null> => {
    const { fragments, links, thoughts, prefs, api } = get()
    const result = thinkWithTrace(fragments, links, thoughts, prefs, { now: new Date(), cycleIndex: thoughts.length })
    if (!result) return null
    const { draft, trace } = result
    let engine: SuddenThought['engine'] = 'local'
    let verifyNote: string | undefined
    if (api.enabled && api.apiKey.trim()) {
      const outcome = await stylizeWithApi(draft, fragments, { provider: api.provider, model: api.model, apiKey: api.apiKey })
      if (outcome.ok && outcome.text) {
        draft.text = outcome.text
        engine = 'ai'
        verifyNote = `AI文体・検証済（${outcome.attempts}回目で通過）`
      } else {
        verifyNote = `AI文体は破棄（${outcome.error ?? '検証失敗'}）。ローカルの文を使用`
      }
    }
    if (verifyNote) trace.note = `${trace.note ?? ''}${trace.note ? '。' : ''}${verifyNote}`
    const thought = toThought(draft, new Date(), trace)
    thought.engine = engine
    const next = [...get().thoughts, thought]
    set({ thoughts: next })
    commit()
    return thought
  }

  return {
    fragments: [],
    links: [],
    thoughts: [],
    crystals: [],
    prefs: normalizePrefs(null),
    hydrated: false,
    syncMode: 'local',
    lan: null,
    autonomous: false,
    thinking: false,
    api: DEFAULT_API,

    hydrate: async () => {
      if (get().hydrated) return

      // API設定（端末にだけ保存・同期しない）
      try {
        const rawApi = localStorage.getItem(API_KEY)
        if (rawApi) set({ api: { ...DEFAULT_API, ...(JSON.parse(rawApi) as Partial<ApiSettings>) } })
      } catch {
        // ignore
      }

      let local: Persisted | null = null
      let localTs = 0
      try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
        if (raw) local = JSON.parse(raw) as Persisted
        localTs = Number(localStorage.getItem(TS_KEY) ?? 0)
      } catch {
        local = null
      }

      try {
        const info = await fetch('/api/info', { signal: AbortSignal.timeout(1200) })
        if (info.ok) {
          const meta = (await info.json()) as { mode: string; lan: string }
          set({ syncMode: 'brain', lan: meta.lan })
          const res = await fetch('/api/state')
          const server = (await res.json()) as { updatedAt: number; payload: Persisted | null }
          if (server.payload && server.updatedAt > localTs) {
            apply(server.payload)
            set({ hydrated: true })
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(server.payload))
              localStorage.setItem(TS_KEY, String(server.updatedAt))
            } catch {
              // ignore
            }
            return
          }
        }
      } catch {
        set({ syncMode: 'local' })
      }

      const data: Persisted = local?.fragments?.length
        ? local
        : { fragments: seedFragments(), thoughts: [], crystals: [], prefs: normalizePrefs(null) }
      apply(data)
      set({ hydrated: true })
      if (get().syncMode === 'brain') commit()
    },

    addFragment: (text: string, manual?: EmotionVector) => {
      const auto = analyzeEmotion(text)
      const emotion = manual ? blendEmotion(auto, manual) : auto
      const tags = extractTags(text)
      const f: Fragment = {
        id: `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        source: 'user',
        emotion,
        people: tags.people,
        themes: tags.themes,
      }
      const fragments = [...get().fragments, f].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      set({ fragments, links: buildLinks(fragments) })
      commit()
      return f
    },

    advanceThought: () => {
      const { fragments, links, thoughts, prefs } = get()
      for (let i = thoughts.length - 1; i >= 0; i--) {
        if (thoughts[i].status === 'new') return thoughts[i]
      }
      const result = thinkWithTrace(fragments, links, thoughts, prefs, { now: new Date(), cycleIndex: thoughts.length })
      if (!result) return null
      const thought = toThought(result.draft, new Date(), result.trace)
      const next = [...thoughts, thought]
      set({ thoughts: next })
      commit()
      return thought
    },

    runCycle: async () => {
      if (get().thinking) return null
      set({ thinking: true })
      try {
        const t = await generateNext()
        return t
      } finally {
        set({ thinking: false })
      }
    },

    deepThink: async (n: number) => {
      for (let i = 0; i < n; i++) {
        const t = await get().runCycle()
        if (!t) break
      }
    },

    decide: (thoughtId: string, accept: boolean) => {
      const { fragments, thoughts, prefs } = get()
      const target = thoughts.find((t) => t.id === thoughtId)
      if (!target) return
      const nextThoughts = thoughts.map((t) => (t.id === thoughtId ? { ...t, status: accept ? 'adopted' : 'rejected' } : t))
      const nextPrefs: Preferences = {
        adoptedKinds: { ...prefs.adoptedKinds, [target.kind]: (prefs.adoptedKinds[target.kind] ?? 0) + (accept ? 1 : 0) },
        rejectedKinds: { ...prefs.rejectedKinds, [target.kind]: (prefs.rejectedKinds[target.kind] ?? 0) + (accept ? 0 : 1) },
        adoptedThoughtTexts: accept ? [...prefs.adoptedThoughtTexts, target.text] : prefs.adoptedThoughtTexts,
      }
      let nextFragments = fragments
      if (accept) {
        const mf = adoptThought(target, fragments)
        nextFragments = [...fragments, mf].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
      set({
        thoughts: nextThoughts as SuddenThought[],
        prefs: nextPrefs,
        fragments: nextFragments,
        links: buildLinks(nextFragments),
      })
      commit()
    },

    buildCrystal: (intention: string) => {
      const { fragments, links, crystals } = get()
      const c = assembleCrystal(intention, fragments, links, new Date())
      set({ crystals: [...crystals, c] })
      commit()
      return c
    },

    resetAll: () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(TS_KEY)
        localStorage.removeItem(LEGACY_KEY)
      } catch {
        // ignore
      }
      const fragments = seedFragments()
      set({ fragments, links: buildLinks(fragments), thoughts: [], crystals: [], prefs: normalizePrefs(null) })
      commit()
    },

    exportJSON: () => {
      const data = snapshot()
      return JSON.stringify({ app: 'Spinalix', exportedAt: new Date().toISOString(), ...data }, null, 2)
    },

    pullFromServer: async () => {
      if (get().syncMode !== 'brain') return
      try {
        const res = await fetch('/api/state', { signal: AbortSignal.timeout(1500) })
        const server = (await res.json()) as { updatedAt: number; payload: Persisted | null }
        const localTs = Number(localStorage.getItem(TS_KEY) ?? 0)
        if (server.payload && server.updatedAt > localTs) {
          apply(server.payload)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(server.payload))
          localStorage.setItem(TS_KEY, String(server.updatedAt))
        }
      } catch {
        // 通信できないだけ。何もしない
      }
    },

    setAutonomous: (on: boolean) => set({ autonomous: on }),

    setApi: (patch: Partial<ApiSettings>) => {
      const next = { ...get().api, ...patch }
      set({ api: next })
      try {
        localStorage.setItem(API_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
    },

    importVault: async (files: File[]) => {
      const { fragments } = get()
      const imported: Fragment[] = []
      const seen = new Set(fragments.map((f) => f.text))
      const md = files.filter((f) => /\.(md|markdown|txt)$/i.test(f.name)).slice(0, 300)
      for (const file of md) {
        try {
          const raw = await file.text()
          const text = extractVaultText(raw)
          if (!text || text.length < 8 || seen.has(text)) continue
          const when = extractVaultDate(raw, file) ?? null
          const tags = extractVaultTags(raw)
          const emotion = analyzeEmotion(text)
          imported.push({
            id: `v-${Date.now().toString(36)}-${imported.length}`,
            text,
            createdAt: (when ?? new Date(Date.now() - imported.length * 3600_000)).toISOString(),
            source: 'user',
            emotion,
            people: PERSON_HINTS.filter((p) => text.includes(p)),
            themes: [...new Set([...tags, ...THEME_HINTS.filter((t) => text.includes(t))])].slice(0, 5),
          })
        } catch {
          // 読めないファイルは飛ばす
        }
      }
      if (imported.length === 0) return 0
      const next = [...fragments, ...imported].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      set({ fragments: next, links: buildLinks(next) })
      commit()
      return imported.length
    },
  }
})

const THEME_HINTS = ['留学', '家族', '友達', '仕事', '勉強', '健康', 'お金', '将来', '自分', '恋', '写真', '部活', '社会', '夢', '挑戦']
const PERSON_HINTS = ['母', '父', 'ミナ', '悠斗', 'ユイ', '先生', '店長', '同期', '弟']

function extractTags(text: string): { themes: string[]; people: string[] } {
  return {
    themes: THEME_HINTS.filter((t) => text.includes(t)),
    people: PERSON_HINTS.filter((p) => text.includes(p)),
  }
}

/** ObsidianのMarkdownから、断片として使える一文を取り出す */
function extractVaultText(raw: string): string {
  const withoutFrontmatter = raw.replace(/^---[\s\S]*?---\s*/m, '')
  const lines = withoutFrontmatter
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('[[') && !/^[-*]\s*$/.test(l))
  const body = lines.join(' ').replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1').replace(/[#*_>`]/g, '')
  return body.slice(0, 140)
}

function extractVaultDate(raw: string, file: File): Date | null {
  const fm = raw.match(/^---([\s\S]*?)---/)
  if (fm) {
    const m = fm[1].match(/(?:date|created|created_at)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)
    if (m) return new Date(`${m[1]}T09:00:00`)
  }
  const fromName = file.name.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/)
  if (fromName) return new Date(`${fromName[1]}-${fromName[2]}-${fromName[3]}T09:00:00`)
  if (file.lastModified) return new Date(file.lastModified)
  return null
}

function extractVaultTags(raw: string): string[] {
  const tags = new Set<string>()
  for (const m of raw.matchAll(/#([^\s#\]]{2,16})/g)) tags.add(m[1])
  const fm = raw.match(/^---([\s\S]*?)---/)
  if (fm) {
    const list = fm[1].match(/tags\s*:\s*\[([^\]]+)\]/)
    if (list) for (const t of list[1].split(',')) tags.add(t.trim().replace(/['"#]/g, ''))
    for (const m of fm[1].matchAll(/^\s*-\s*([^\s#]{2,16})$/gm)) tags.add(m[1])
  }
  return [...tags].filter((t) => t.length > 0)
}
