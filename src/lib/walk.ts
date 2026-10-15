// 思考歩行 — 記憶グラフを「歩く」ことで、想起の道筋（path）を見つける
// 単なるペア検出ではなく、多ホップの道筋（例: 3月→8月→10月）を探索する。
// ビーム探索・決定論的・重複排除つき。

import type { Fragment, Link, LinkKind } from './types'
import { bigrams, jaccard, pairKey } from './text'
import { daysBetween } from './dates'
import { EMOTION_META, dominantEmotion } from './emotion'

export type WalkMode = 'dwell' | 'resonance' | 'contrast' | 'arc' | 'leap'

export interface WalkHop {
  from: string
  to: string
  kind: LinkKind
  weight: number
  note: string
  reason?: string // テーマ名・人物名・引用語（描画に使う）
}

export interface Walk {
  mode: WalkMode
  path: string[]
  hops: WalkHop[]
  score: number
  fingerprint: string
}

const MODE_KINDS: Record<WalkMode, LinkKind[]> = {
  dwell: ['echo', 'similar', 'recall'],
  resonance: ['recall', 'echo', 'person'],
  contrast: ['tension', 'similar'],
  arc: ['recall', 'tension', 'echo', 'similar', 'person'],
  leap: ['similar', 'echo', 'person', 'recall'],
}

const MODE_KIND_BONUS: Record<WalkMode, Partial<Record<LinkKind, number>>> = {
  dwell: { echo: 1.55, similar: 0.8, recall: 1.05, person: 0.6, theme: 0.4, tension: 0.25 },
  resonance: { recall: 1.6, echo: 1.25, person: 0.85, similar: 0.7, theme: 0.5, tension: 0.45 },
  contrast: { tension: 1.7, similar: 0.6, theme: 0.75, person: 0.7, echo: 0.55, recall: 0.85 },
  arc: { recall: 1.25, tension: 1.2, echo: 1.15, similar: 0.9, person: 0.8, theme: 0.75 },
  leap: { similar: 1.2, echo: 1.2, person: 1.0, recall: 0.95, theme: 0.7, tension: 0.6 },
}

function hopNote(l: Link): string {
  switch (l.kind) {
    case 'recall':
      return `自分の言葉を引用（「${l.reason ?? ''}」）`
    case 'tension':
      return `向きが反対（${l.reason ?? 'テーマ'}）`
    case 'echo':
      return `同じ${l.reason ?? '感情'}が重なる`
    case 'similar':
      return '近い記憶'
    case 'person':
      return `${l.reason ?? '誰か'}が繋ぐ`
    case 'theme':
      return `${l.reason ?? 'テーマ'}の軸`
    default:
      return 'つながり'
  }
}

function hopScore(
  l: Link,
  to: Fragment,
  from: Fragment,
  activationOf: (id: string) => number,
  mode: WalkMode,
  priorNodes: Set<string>,
): number {
  const kindBonus = MODE_KIND_BONUS[mode][l.kind] ?? 0.5
  const lex = jaccard(bigrams(from.text), bigrams(to.text))
  // 「跳躍」は、言葉が重ならないのに感情が響く接続を好む
  const novelty = mode === 'leap' ? 0.55 + 0.45 * (1 - lex) : 0.75 + 0.25 * (1 - lex)
  const emotionTerm = 0.75 + 0.5 * (1 - Math.abs(from.emotion.valence - to.emotion.valence) / 2)
  const revisit = priorNodes.has(to.id) ? 0.35 : 1
  const targetHeat = 0.45 + 0.55 * activationOf(to.id)
  return l.weight * kindBonus * novelty * emotionTerm * revisit * targetHeat
}

function spanDays(path: string[], byId: Map<string, Fragment>): number {
  const dates = path.map((id) => new Date(byId.get(id)!.createdAt).getTime())
  return Math.round(Math.abs(Math.max(...dates) - Math.min(...dates)) / 86400000)
}

export interface FindWalkOptions {
  beamWidth?: number
  maxHops?: number
  excludeFingerprints?: Set<string>
  excludePairs?: Set<string>
}

const MODE_MAX_HOPS: Record<WalkMode, number> = {
  dwell: 2,
  resonance: 2,
  contrast: 2,
  arc: 3,
  leap: 2,
}

/**
 * プライミング種（活性化の高い記憶）から記憶グラフを歩き、最良の道筋を返す。
 * 同じ入力・同じモードなら常に同じ道筋（決定論的）。
 */
export function findWalks(
  fragments: Fragment[],
  links: Link[],
  activation: Map<string, number>,
  seeds: { id: string; weight: number }[],
  mode: WalkMode,
  opts: FindWalkOptions = {},
): Walk[] {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  const allowed = MODE_KINDS[mode]
  const beamWidth = opts.beamWidth ?? 5
  const maxHops = opts.maxHops ?? MODE_MAX_HOPS[mode]
  const exclude = opts.excludeFingerprints ?? new Set<string>()
  const excludePairs = opts.excludePairs ?? new Set<string>()

  // ノード→リンクの索引（候補の高速化）
  const nodeLinks = new Map<string, Link[]>()
  for (const l of links) {
    if (!allowed.includes(l.kind)) continue
    nodeLinks.set(l.a, [...(nodeLinks.get(l.a) ?? []), l])
    nodeLinks.set(l.b, [...(nodeLinks.get(l.b) ?? []), l])
  }

  interface Beam {
    path: string[]
    hops: WalkHop[]
    score: number
  }

  let beams: Beam[] = seeds
    .filter((s) => byId.has(s.id))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map((s) => ({ path: [s.id], hops: [], score: 0.35 * s.weight + 0.25 * (activation.get(s.id) ?? 0) }))

  const finished: Beam[] = []

  for (let hop = 0; hop < maxHops; hop++) {
    const next: Beam[] = []
    for (const beam of beams) {
      const last = beam.path[beam.path.length - 1]
      const candidates = [...(nodeLinks.get(last) ?? [])].sort(
        (a, b) => b.weight - a.weight || pairKey(a.a, a.b).localeCompare(pairKey(b.a, b.b)),
      )
      for (const l of candidates.slice(0, 12)) {
        const toId = l.a === last ? l.b : l.a
        if (beam.path.includes(toId)) continue
        if (excludePairs.has(pairKey(l.a, l.b))) continue
        const from = byId.get(last)
        const to = byId.get(toId)
        if (!from || !to) continue
        const s = hopScore(l, to, from, (id) => activation.get(id) ?? 0, mode, new Set(beam.path))
        if (s <= 0.02) continue
        next.push({
          path: [...beam.path, toId],
          hops: [...beam.hops, { from: last, to: toId, kind: l.kind, weight: l.weight, note: hopNote(l), reason: l.reason }],
          score: beam.score + s,
        })
      }
    }
    // 打ち切り終了したビーム（伸びなかった場合）も候補として保持
    if (next.length === 0) break
    next.sort((a, b) => b.score - a.score || a.path.join('>').localeCompare(b.path.join('>')))
    beams = next.slice(0, beamWidth)
    finished.push(...beams)
  }

  // 仕上げスコア: 期間の広がり・モード条件・時間の向き
  const walks: Walk[] = finished
    .filter((b) => b.path.length >= 2)
    .map((b) => {
      const span = spanDays(b.path, byId)
      let score = b.score + Math.min(0.28, span / 1400)
      // 時間の向き: 往復（ジグザグ）する道筋は物語として弱い
      const times = b.path.map((id) => new Date(byId.get(id)!.createdAt).getTime())
      let reversals = 0
      for (let i = 2; i < times.length; i++) {
        const d1 = times[i - 1] - times[i - 2]
        const d2 = times[i] - times[i - 1]
        if (d1 * d2 < 0) reversals++
      }
      score *= Math.pow(0.72, reversals)
      const kinds = new Set(b.hops.map((h) => h.kind))
      if (mode === 'dwell' && !kinds.has('echo') && !kinds.has('recall')) score *= 0.55
      if (mode === 'contrast' && !kinds.has('tension')) score *= 0.5
      if (mode === 'resonance' && !(kinds.has('recall') || kinds.has('echo'))) score *= 0.55
      // 短すぎる（同月の）道筋は物語性が低い
      if (span < 10) score *= 0.8
      const fingerprint = [...b.path].sort().join('|')
      return { mode, path: b.path, hops: b.hops, score, fingerprint }
    })
    .filter((w) => !exclude.has(w.fingerprint))

  walks.sort((a, b) => b.score - a.score || a.fingerprint.localeCompare(b.fingerprint))
  // 同じ始点・終点の重複を除く
  const seenEnds = new Set<string>()
  const unique: Walk[] = []
  for (const w of walks) {
    const ends = `${w.path[0]}>${w.path[w.path.length - 1]}`
    if (seenEnds.has(ends)) continue
    seenEnds.add(ends)
    unique.push(w)
  }
  return unique
}

export function walkSpanDays(w: Walk, fragments: Fragment[]): number {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  return spanDays(w.path, byId)
}

export function emotionLabelOfPath(w: Walk, fragments: Fragment[]): string {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  const f = byId.get(w.path[w.path.length - 1])
  if (!f) return '凪'
  const d = dominantEmotion(f.emotion)
  return d ? EMOTION_META[d].label : '凪'
}
