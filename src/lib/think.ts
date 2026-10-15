// 思考サイクル — エンジンの中核
// 拡散活性化 → 記憶グラフの歩行（ビーム探索）→ 言語化 → 特別な思考（開いた輪・問い）
// すべて決定論的。APIはここでは使わない（使う場合も「文体化」だけを API に委ねる）。

import type { Fragment, Link, Preferences, SuddenThought, ThoughtKind } from './types'
import { activate, primingSeeds } from './activation'
import { analyzeMemory } from './analysis'
import { findWalks, type WalkMode } from './walk'
import { renderOpenLoop, renderQuestion, renderWalk, type ThoughtDraft } from './render'
import { pairKey } from './text'

const MODE_ORDER: WalkMode[] = ['resonance', 'contrast', 'dwell', 'arc', 'leap']

export interface ThinkOptions {
  now?: Date
  cycleIndex?: number
}

function kindBias(prefs: Preferences, kind: ThoughtKind): number {
  const adopted = prefs.adoptedKinds[kind] ?? 0
  const rejected = prefs.rejectedKinds[kind] ?? 0
  return Math.max(-0.25, Math.min(0.35, (adopted - rejected) * 0.08))
}

export function think(fragments: Fragment[], links: Link[], prevThoughts: SuddenThought[], prefs: Preferences, opts: ThinkOptions = {}): ThoughtDraft | null {
  const now = opts.now ?? new Date()
  const cycle = opts.cycleIndex ?? prevThoughts.length
  const activation = activate(fragments, links, now)
  const seeds = primingSeeds(fragments, now, cycle, activation)
  if (seeds.length === 0) return null

  const usedFingerprints = new Set(prevThoughts.map((t) => t.fingerprint).filter(Boolean))
  const usedEnds = new Set(
    prevThoughts
      .filter((t) => t.path && t.path.length >= 2)
      .map((t) => `${t.path[0]}>${t.path[t.path.length - 1]}`),
  )
  // 直近の想起で使った記憶・ペアは冷ます（同じ記憶ばかり見ないため）
  const recentUsage = new Map<string, number>()
  for (const t of prevThoughts.slice(-5)) {
    for (const id of t.path ?? []) recentUsage.set(id, (recentUsage.get(id) ?? 0) + 1)
  }
  const usedPairs = new Set<string>()
  for (const t of prevThoughts) {
    const p = t.path ?? []
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) usedPairs.add(pairKey(p[i], p[j]))
    }
    // 出典の組（from）も再利用しない
    const f = t.from ?? []
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) usedPairs.add(pairKey(f[i], f[j]))
    }
  }

  const drafts: ThoughtDraft[] = []
  const preferred = MODE_ORDER[((cycle % MODE_ORDER.length) + MODE_ORDER.length) % MODE_ORDER.length]
  const order = [preferred, ...MODE_ORDER.filter((m) => m !== preferred)]
  for (const mode of order) {
    const walks = findWalks(fragments, links, activation, seeds, mode, { excludeFingerprints: usedFingerprints, excludePairs: usedPairs })
    let added = 0
    for (const w of walks) {
      const ends = `${w.path[0]}>${w.path[w.path.length - 1]}`
      if (usedEnds.has(ends)) continue
      drafts.push(renderWalk(w, fragments))
      added++
      if (added >= 2) break
    }
    if (drafts.length >= 4) break
  }

  // 特別な思考: 開いた輪（言ったのに、やっていない）
  const analysis = analyzeMemory(fragments, now)
  const openloop = analysis.openLoops
    .filter((l) => !usedFingerprints.has(`openloop|${l.theme}`))
    .map((l) => renderOpenLoop(l, fragments))[0]
  if (openloop) drafts.push(openloop)

  // 問い（まだ答えていない）は4サイクルに1回だけ混ぜる
  if (cycle > 0 && cycle % 4 === 3) {
    const q = analysis.questions.find((x) => !usedFingerprints.has(`question|${x.fragmentId}`))
    if (q) drafts.push(renderQuestion(q, fragments))
  }

  if (drafts.length === 0) return null

  const adjusted = drafts.map((d) => {
    let s = d.score + kindBias(prefs, d.kind)
    if (d.mode === preferred) s += 0.14
    if (d.kind === 'tension' && d.path.length >= 2) {
      const first = fragments.find((f) => f.id === d.path[0])
      const last = fragments.find((f) => f.id === d.path[d.path.length - 1])
      if (first && last) s += Math.min(0.16, Math.abs(first.emotion.valence - last.emotion.valence) * 0.12)
    }
    for (const id of d.path) s -= 0.12 * (recentUsage.get(id) ?? 0)
    for (const t of prevThoughts) {
      const overlap = (t.path ?? []).filter((id) => d.path.includes(id)).length
      if (overlap >= 2) s -= 0.15 * overlap
    }
    return { d, s }
  })
  adjusted.sort((x, y) => y.s - x.s || x.d.fingerprint.localeCompare(y.d.fingerprint))
  return adjusted[0].d
}

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function toThought(draft: ThoughtDraft, now: Date = new Date()): SuddenThought {
  return {
    id: `st-${hash(draft.fingerprint)}-${Math.floor(now.getTime() / 1000)}`,
    createdAt: now.toISOString(),
    kind: draft.kind,
    text: draft.text,
    from: draft.from,
    path: draft.path,
    steps: draft.steps,
    engine: 'local',
    score: draft.score,
    fingerprint: draft.fingerprint,
    status: 'new',
  }
}

export function generateSuddenThought(
  fragments: Fragment[],
  links: Link[],
  prevThoughts: SuddenThought[],
  prefs: Preferences,
  now: Date = new Date(),
): SuddenThought | null {
  const draft = think(fragments, links, prevThoughts, prefs, { now })
  if (!draft) return null
  return toThought(draft, now)
}
