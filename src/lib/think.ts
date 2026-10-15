// 思考サイクル — エンジンの中核
// 拡散活性化 → 記憶グラフの歩行（ビーム探索）→ 言語化 → 特別な思考（開いた輪・問い）
// すべて決定論的。APIはここでは使わない（使う場合も「文体化」だけを API に委ねる）。

import type { Fragment, Link, Preferences, SuddenThought, ThinkTrace, ThoughtKind } from './types'
import { activate, primingSeeds } from './activation'
import { analyzeMemory } from './analysis'
import { findWalks, walkSpanDays, type WalkMode } from './walk'
import { renderOpenLoop, renderQuestion, renderWalk, type ThoughtDraft } from './render'
import { pairKey } from './text'
import { formatJP } from './dates'

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
  return thinkWithTrace(fragments, links, prevThoughts, prefs, opts)?.draft ?? null
}

/** 思考と、その全記録（解剖）を返す */
export function thinkWithTrace(
  fragments: Fragment[],
  links: Link[],
  prevThoughts: SuddenThought[],
  prefs: Preferences,
  opts: ThinkOptions = {},
): { draft: ThoughtDraft; trace: ThinkTrace } | null {
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
    const f = t.from ?? []
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) usedPairs.add(pairKey(f[i], f[j]))
    }
  }

  const byId = new Map(fragments.map((f) => [f.id, f]))
  const draftMeta = new Map<ThoughtDraft, { mode: string; walkScore: number; path: string[] }>()
  const walkLog: ThinkTrace['walks'] = []
  const drafts: ThoughtDraft[] = []
  const preferred = MODE_ORDER[((cycle % MODE_ORDER.length) + MODE_ORDER.length) % MODE_ORDER.length]
  const order = [preferred, ...MODE_ORDER.filter((m) => m !== preferred)]
  for (const mode of order) {
    const walks = findWalks(fragments, links, activation, seeds, mode, { excludeFingerprints: usedFingerprints, excludePairs: usedPairs })
    let added = 0
    for (const w of walks) {
      walkLog.push({ mode, score: Number(w.score.toFixed(3)), path: w.path, chosen: false })
      const ends = `${w.path[0]}>${w.path[w.path.length - 1]}`
      if (usedEnds.has(ends)) continue
      if (added >= 2) continue
      const d = renderWalk(w, fragments)
      drafts.push(d)
      draftMeta.set(d, { mode, walkScore: w.score, path: w.path })
      added++
    }
    if (drafts.length >= 4) break
  }

  // 視野狭窄の防止: まだ一度も語っていない記憶の中から、活性の高いものを1本歩く
  const neverUsed = new Set(fragments.map((f) => f.id))
  for (const t of prevThoughts) for (const id of t.path ?? []) neverUsed.delete(id)
  if (neverUsed.size > 0 && neverUsed.size >= Math.min(5, fragments.length * 0.2)) {
    const fresh = [...neverUsed]
      .map((id) => fragments.find((f) => f.id === id)!)
      .filter(Boolean)
      .sort((a, b) => (activation.get(b.id) ?? 0) - (activation.get(a.id) ?? 0) || b.id.localeCompare(a.id))
      .slice(0, 6)
    const seed = fresh[cycle % fresh.length]
    if (seed) {
      const walks = findWalks(fragments, links, activation, [{ id: seed.id, weight: 0.82 }], preferred, {
        excludeFingerprints: usedFingerprints,
        excludePairs: usedPairs,
      })
      if (walks[0]) {
        const d = renderWalk(walks[0], fragments)
        drafts.push(d)
        draftMeta.set(d, { mode: preferred, walkScore: walks[0].score, path: walks[0].path })
      }
    }
  }

  const analysis = analyzeMemory(fragments, now)
  const openloop = analysis.openLoops
    .filter((l) => !usedFingerprints.has(`openloop|${l.theme}`))
    .map((l) => renderOpenLoop(l, fragments))[0]
  if (openloop) drafts.push(openloop)
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
      // 道筋の中で「いちばん新しい側」が最近であるほど、いま効いている矛盾として優先する
      const newest = d.path
        .map((id) => fragments.find((f) => f.id === id))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      if (newest) {
        const ageDays = (now.getTime() - new Date(newest.createdAt).getTime()) / 86400000
        s += Math.max(0, (90 - ageDays) / 90) * 0.06
      }
    }
    for (const id of d.path) s -= 0.12 * (recentUsage.get(id) ?? 0)
    // まだ語っていない記憶を含む道には、わずかな探索ボーナス
    const freshCount = d.path.filter((id) => neverUsed.has(id)).length
    if (freshCount > 0) s += Math.min(0.12, freshCount * 0.05)
    for (const t of prevThoughts) {
      const overlap = (t.path ?? []).filter((id) => d.path.includes(id)).length
      if (overlap >= 2) s -= 0.15 * overlap
    }
    return { d, s }
  })
  adjusted.sort((x, y) => y.s - x.s || x.d.fingerprint.localeCompare(y.d.fingerprint))
  const winner = adjusted[0]

  const trace: ThinkTrace = {
    cycle,
    preferredMode: preferred,
    seeds: seeds.map((s) => ({
      id: s.id,
      date: formatJP(byId.get(s.id)?.createdAt ?? now.toISOString()),
      reason: s.reason,
      activation: Number((activation.get(s.id) ?? 0).toFixed(3)),
    })),
    walks: walkLog.slice(0, 12).map((w) => ({
      ...w,
      chosen: w.path.join('>') === winner.d.path.join('>') && (draftMeta.get(winner.d)?.mode ?? '') === w.mode,
    })),
    drafts: adjusted.map(({ d, s }) => ({
      kind: d.kind,
      mode: (draftMeta.get(d)?.mode ?? String(d.mode)) as string,
      score: Number(d.score.toFixed(3)),
      adjusted: Number(s.toFixed(3)),
      chosen: d === winner.d,
    })),
    note:
      winner.d.kind === 'openloop'
        ? '開いた輪（意志語に対して行動語が少ないテーマ）から生成'
        : winner.d.kind === 'question'
          ? '問いの形のまま残った断片から生成'
          : `モード「${draftMeta.get(winner.d)?.mode ?? ''}」の歩行から生成（${walkSpanDays({ mode: 'arc', path: winner.d.path, hops: [], score: 0, fingerprint: '' }, fragments)}日の道筋）`,
  }

  return { draft: winner.d, trace }
}

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function toThought(draft: ThoughtDraft, now: Date = new Date(), trace?: ThinkTrace): SuddenThought {
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
    trace,
  }
}

export function generateSuddenThought(
  fragments: Fragment[],
  links: Link[],
  prevThoughts: SuddenThought[],
  prefs: Preferences,
  now: Date = new Date(),
): SuddenThought | null {
  const result = thinkWithTrace(fragments, links, prevThoughts, prefs, { now })
  if (!result) return null
  return toThought(result.draft, now, result.trace)
}
