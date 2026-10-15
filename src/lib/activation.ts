// 拡散活性化モデル — 記憶の「今の熱」を計算する
// 人間の想起は、最近の出来事・感情・言及された回数によって「温まっている」記憶から始まる。
// このモデルは決定論的で、外部APIを使わない。

import type { Fragment, Link } from './types'
import { dominantEmotion, EMOTION_META, emotionDistance } from './emotion'

export interface ActivationEntry {
  id: string
  value: number
  reason: string
}

function maxIntensity(f: Fragment): number {
  return Math.max(0, ...Object.values(f.emotion.intensities).map((v) => v ?? 0))
}

/** 参照カウント: 他の断片がこの断片の言葉を引用している回数 */
export function referenceCounts(fragments: Fragment[], links: Link[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const l of links) {
    if (l.kind !== 'recall') continue
    counts.set(l.a, (counts.get(l.a) ?? 0) + 1)
    counts.set(l.b, (counts.get(l.b) ?? 0) + 1)
  }
  return counts
}

export interface BaseActivationOptions {
  now?: Date
  halfLifeDays?: number
}

/**
 * 基礎活性: 感情の強さ × 近さ（忘却曲線） × 参照された回数
 * 強い感情の記憶は忘れにくい（扁桃体効果）。参照された記憶は強化される（復習効果）。
 */
export function baseActivation(f: Fragment, refCount: number, opts: BaseActivationOptions = {}): number {
  const now = opts.now ?? new Date()
  const halfLife = opts.halfLifeDays ?? 180
  const ageDays = Math.max(0, (now.getTime() - new Date(f.createdAt).getTime()) / 86400000)
  const recency = Math.pow(0.5, ageDays / halfLife)
  const intensity = maxIntensity(f)
  const referenced = Math.min(1, refCount / 3)
  return 0.5 * intensity + 0.3 * recency + 0.14 * referenced + (f.source === 'machine' ? 0.03 : 0.06)
}

/** 活性化マップ（全断片） */
export function activationMap(fragments: Fragment[], links: Link[], opts: BaseActivationOptions = {}): Map<string, number> {
  const refs = referenceCounts(fragments, links)
  const out = new Map<string, number>()
  for (const f of fragments) out.set(f.id, baseActivation(f, refs.get(f.id) ?? 0, opts))
  return out
}

/** 現在の「熱」の一括計算（今の時刻で） */
export function activate(fragments: Fragment[], links: Link[], now: Date = new Date()): Map<string, number> {
  return activationMap(fragments, links, { now })
}

export interface PrimingSeed {
  id: string
  weight: number
  reason: string
}

/** プライミング: 「今のあなた」を表す種（直近の断片・強い感情・サイクルで回る高活性の記憶） */
export function primingSeeds(fragments: Fragment[], now: Date = new Date(), cycle = 0, activation?: Map<string, number>): PrimingSeed[] {
  const sorted = [...fragments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const seeds: PrimingSeed[] = []
  for (const f of sorted.slice(0, 2)) {
    const ageDays = (now.getTime() - new Date(f.createdAt).getTime()) / 86400000
    if (ageDays > 30) break
    const days = Math.max(0, Math.round(ageDays))
    seeds.push({ id: f.id, weight: 1 - days * 0.03, reason: days === 0 ? '今日の断片' : `${days}日前の断片` })
  }
  const recentIntense = sorted
    .filter((f) => (now.getTime() - new Date(f.createdAt).getTime()) / 86400000 <= 30)
    .sort((a, b) => maxIntensity(b) - maxIntensity(a))[0]
  if (recentIntense && !seeds.some((s) => s.id === recentIntense.id)) {
    const d = dominantEmotion(recentIntense.emotion)
    seeds.push({ id: recentIntense.id, weight: 0.85, reason: `強い感情（${d ? EMOTION_META[d].label : '凪'}）` })
  }
  // サイクルごとに、活性の高い記憶を1つ混ぜる（同じ起点に沈まないため）
  if (activation && activation.size > 0) {
    const ranked = [...activation.entries()]
      .filter(([id]) => !seeds.some((s) => s.id === id))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
    if (ranked.length > 0) {
      const [id] = ranked[((cycle % ranked.length) + ranked.length) % ranked.length]
      seeds.push({ id, weight: 0.7, reason: '記憶の核（活性が高い）' })
    }
  }
  return seeds
}

/**
 * 拡散活性化: 種から隣接ノードへ活性を伝播させる（ホップごとに減衰）。
 * リンクの種類によって伝わりやすさが違う（自己引用・矛盾は強く、テーマの一致は弱い）。
 */
const KIND_TRANSMISSION: Record<Link['kind'], number> = {
  recall: 1.0,
  tension: 0.85,
  echo: 0.8,
  similar: 0.5,
  person: 0.4,
  theme: 0.3,
}

export interface SpreadOptions {
  steps?: number
  decay?: number
  excluded?: Set<string>
}

export function spreadActivation(
  seeds: PrimingSeed[],
  links: Link[],
  steps = 2,
  opts: SpreadOptions = {},
): Map<string, number> {
  const decay = opts.decay ?? 0.55
  const result = new Map<string, number>()
  const frontier = new Map<string, number>()
  for (const s of seeds) {
    if (opts.excluded?.has(s.id)) continue
    result.set(s.id, (result.get(s.id) ?? 0) + s.weight)
    frontier.set(s.id, s.weight)
  }
  for (let step = 0; step < steps; step++) {
    const next = new Map<string, number>()
    for (const l of links) {
      const w = l.weight * KIND_TRANSMISSION[l.kind] * decay
      const fromA = frontier.get(l.a)
      const fromB = frontier.get(l.b)
      if (fromA !== undefined && !opts.excluded?.has(l.b)) next.set(l.b, Math.max(next.get(l.b) ?? 0, fromA * w))
      if (fromB !== undefined && !opts.excluded?.has(l.a)) next.set(l.a, Math.max(next.get(l.a) ?? 0, fromB * w))
    }
    for (const [id, v] of next) {
      result.set(id, (result.get(id) ?? 0) + v)
      frontier.set(id, v)
    }
    if (next.size === 0) break
  }
  return result
}

/** 感情の共鳴度（0..1）: 同じ感情＝高い、正反対＝低い */
export function resonance(a: Fragment, b: Fragment): number {
  return 1 - emotionDistance(a.emotion, b.emotion)
}
