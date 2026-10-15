// Spinalix ストア — 状態・永続化・同期（localStorage / Mac常駐サーバー）
import { create } from 'zustand'
import type { EmotionVector, Fragment, Link, Preferences, SuddenThought, ThoughtCrystal } from './lib/types'
import { PERSONA_FRAGMENTS, USER_FRAGMENTS, type SeedFragment } from './lib/persona'
import { analyzeEmotion, blendEmotion } from './lib/emotion'
import { adoptThought, assembleCrystal, buildLinks, generateSuddenThought } from './lib/engine'

const STORAGE_KEY = 'spinalix-v1'
const TS_KEY = 'spinalix-v1-ts'

export type SyncMode = 'local' | 'brain'

interface Persisted {
  fragments: Fragment[]
  thoughts: SuddenThought[]
  crystals: ThoughtCrystal[]
  prefs: Preferences
}

function seedToFragment(seed: SeedFragment, idx: number): Fragment {
  const emotion: EmotionVector = seed.em
    ? {
        valence: seed.em.v,
        arousal: seed.em.a,
        intensities: seed.em.i ?? analyzeEmotion(seed.t).intensities,
      }
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
  const all = [...PERSONA_FRAGMENTS, ...USER_FRAGMENTS]
  return all.map(seedToFragment).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

const EMPTY_PREFS: Preferences = {
  adoptedKinds: { echo: 0, tension: 0, question: 0, recall: 0 },
  rejectedKinds: { echo: 0, tension: 0, question: 0, recall: 0 },
  adoptedThoughtTexts: [],
}

interface SpinalixState extends Persisted {
  links: Link[]
  hydrated: boolean
  syncMode: SyncMode
  lan: string | null
  hydrate: () => Promise<void>
  addFragment: (text: string, manual?: EmotionVector) => Fragment
  advanceThought: () => SuddenThought | null
  decide: (thoughtId: string, accept: boolean) => void
  buildCrystal: (intention: string) => ThoughtCrystal
  resetAll: () => void
  exportJSON: () => string
  pullFromServer: () => Promise<void>
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
      // 容量制限などで保存できなくても動作は継続
    }
    if (get().syncMode === 'brain') {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ updatedAt: now, payload: data }),
      }).catch(() => {
        // サーバーが落ちていても手元の記憶は失われない
      })
    }
  }

  const apply = (data: Persisted) => {
    set({ ...data, links: buildLinks(data.fragments) })
  }

  return {
    fragments: [],
    links: [],
    thoughts: [],
    crystals: [],
    prefs: EMPTY_PREFS,
    hydrated: false,
    syncMode: 'local',
    lan: null,

    hydrate: async () => {
      if (get().hydrated) return

      // 1) 手元のデータを読み込む
      let local: Persisted | null = null
      let localTs = 0
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) local = JSON.parse(raw) as Persisted
        localTs = Number(localStorage.getItem(TS_KEY) ?? 0)
      } catch {
        local = null
      }

      // 2) Mac常駐の脳がいるか確かめる（静的デプロイでは黙ってローカル動作）
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

      // 3) 手元のデータ（なければ8ヶ月分の記憶）で開始
      const data: Persisted = local?.fragments?.length
        ? local
        : { fragments: seedFragments(), thoughts: [], crystals: [], prefs: EMPTY_PREFS }
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
      const fragments = [...get().fragments, f].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      set({ fragments, links: buildLinks(fragments) })
      commit()
      return f
    },

    advanceThought: () => {
      const { fragments, links, thoughts, prefs } = get()
      for (let i = thoughts.length - 1; i >= 0; i--) {
        if (thoughts[i].status === 'new') return thoughts[i]
      }
      const t = generateSuddenThought(fragments, links, thoughts, prefs, new Date())
      if (!t) return null
      set({ thoughts: [...thoughts, t] })
      commit()
      return t
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
      } catch {
        // ignore
      }
      const fragments = seedFragments()
      set({ fragments, links: buildLinks(fragments), thoughts: [], crystals: [], prefs: EMPTY_PREFS })
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
  }
})

const THEME_HINTS = ['留学', '家族', '友達', '仕事', '勉強', '健康', 'お金', '将来', '自分', '恋', '写真', '部活', '社会']
const PERSON_HINTS = ['母', '父', 'ミナ', '悠斗', 'ユイ', '先生', '店長', '同期', '弟']

function extractTags(text: string): { themes: string[]; people: string[] } {
  const themes = THEME_HINTS.filter((t) => text.includes(t))
  const people = PERSON_HINTS.filter((p) => text.includes(p))
  return { themes, people }
}
