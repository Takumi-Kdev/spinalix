// デザインヘルパー — 感情ベクトルから視覚言語（グラデーション）を生成する
import type { EmotionVector, Fragment } from './types'
import { EMOTION_KEYS, EMOTION_META } from './emotion'

export interface EmotionTheme {
  colors: string[]
  gradient: string // 135deg のグラデーション（ボーダー・バー用）
  softGradient: string // 背景用（低alpha）
}

export function emotionTheme(e: EmotionVector): EmotionTheme {
  const ranked = EMOTION_KEYS.map((k) => ({ k, v: e.intensities[k] ?? 0 }))
    .filter((x) => x.v > 0.02)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
  const colors = ranked.length > 0 ? ranked.map((r) => EMOTION_META[r.k].color) : ['#9aa3b2']
  if (colors.length === 1) colors.push(colors[0])
  const [c1, c2] = colors
  return {
    colors,
    gradient: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
    softGradient: `linear-gradient(135deg, ${hexA(c1, 0.16)} 0%, ${hexA(c2, 0.05)} 60%, transparent 100%)`,
  }
}

export function fragmentTheme(f: Fragment): EmotionTheme {
  return emotionTheme(f.emotion)
}

export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function emotionWord(e: EmotionVector): string {
  const ranked = EMOTION_KEYS.map((k) => ({ k, v: e.intensities[k] ?? 0 })).sort((a, b) => b.v - a.v)[0]
  return ranked && ranked.v > 0.05 ? EMOTION_META[ranked.k].label : '凪'
}
