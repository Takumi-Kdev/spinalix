// デザインヘルパー — 感情ベクトルから視覚言語を生成（DESIGN.md のトークンのみ使用）
import type { EmotionVector, Fragment, ThoughtKind } from './types'
import { EMOTION_KEYS, EMOTION_META } from './emotion'

export function emotionTheme(e: EmotionVector): string {
  const ranked = EMOTION_KEYS.map((k) => ({ k, v: e.intensities[k] ?? 0 }))
    .filter((x) => x.v > 0.02)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
  const colors = ranked.length > 0 ? ranked.map((r) => EMOTION_META[r.k].color) : ['#8c8478']
  if (colors.length === 1) colors.push(colors[0])
  return `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`
}

export function emotionColor(f: Fragment): string {
  const theme = emotionTheme(f.emotion)
  return theme.match(/#[0-9a-f]{6}/i)?.[0] ?? '#8c8478'
}

export function emotionWord(e: EmotionVector): string {
  const ranked = EMOTION_KEYS.map((k) => ({ k, v: e.intensities[k] ?? 0 })).sort((a, b) => b.v - a.v)[0]
  return ranked && ranked.v > 0.05 ? EMOTION_META[ranked.k].label : '凪'
}

/** 想起の種類 → 朱印の一字 */
export const SEAL_GLYPH: Record<ThoughtKind, string> = {
  recall: '引',
  echo: '響',
  tension: '矛',
  question: '問',
  arc: '跡',
  leap: '跳',
  openloop: '輪',
}
