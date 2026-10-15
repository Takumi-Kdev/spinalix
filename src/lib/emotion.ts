// 感情モデル — 日本語の感情語彙から体験ベクトルを推定する（端末内・決定論的）
import type { EmotionKey, EmotionVector } from './types'

export const EMOTION_KEYS: EmotionKey[] = [
  'joy',
  'love',
  'anticipation',
  'calm',
  'sadness',
  'anxiety',
  'anger',
  'fatigue',
]

export const EMOTION_META: Record<EmotionKey, { label: string; color: string; valence: number; arousal: number }> = {
  joy: { label: '喜び', color: '#d9a441', valence: 0.8, arousal: 0.7 },
  love: { label: '愛おしさ', color: '#c9738c', valence: 0.75, arousal: 0.55 },
  anticipation: { label: '期待', color: '#7d9a6f', valence: 0.45, arousal: 0.6 },
  calm: { label: '静けさ', color: '#7c9db0', valence: 0.3, arousal: 0.15 },
  sadness: { label: '悲しみ', color: '#8b86ae', valence: -0.6, arousal: 0.3 },
  anxiety: { label: '不安', color: '#9a7fa8', valence: -0.5, arousal: 0.75 },
  anger: { label: '怒り', color: '#c8442a', valence: -0.6, arousal: 0.85 },
  fatigue: { label: '疲れ', color: '#8c8478', valence: -0.35, arousal: 0.2 },
}

const LEXICON: Record<EmotionKey, RegExp> = {
  joy: /嬉し|うれし|楽しい|たのし|幸せ|しあわせ|最高|笑っ|ありがとう|うれし|ハッピー|好きだ|やった|できた|合格|成功/g,
  love: /好き|大好き|愛|恋|大切|いとおし|会いたい|そばに|家族|友達が|ありがとう/g,
  anticipation: /楽しみ|ワクワク|わくわく|挑戦|やってみ|始め|スタート|計画|夢|目標|予定|期待|留学/g,
  calm: /静か|落ち着|穏やか|ゆっくり|安定|安心|ほっと|平和/g,
  sadness: /悲し|かなし|寂し|さびし|涙|泣|落ち込|つらい|辛い|傷つ|失った|別れ|さようなら|後悔/g,
  anxiety: /不安|心配|怖|こわ|緊張|焦|ドキドキ|どきどき|迷っ|迷う|押しつぶ|ビクビク/g,
  anger: /ムカつ|むかつ|腹立|はらだた|イライラ|いらいら|許せな|怒|理不尽/g,
  fatigue: /疲れ|つかれ|だる|眠い|しんど|息切れ|限界|倒れ|休みたい|やめたい/g,
}

const INTENSIFIERS = /とても|すごく|めっちゃ|本当に|かなり|すごい|マジ|超/g

export function analyzeEmotion(text: string): EmotionVector {
  const caught: Partial<Record<EmotionKey, number>> = {}
  const intensified = INTENSIFIERS.test(text)
  for (const key of EMOTION_KEYS) {
    const matches = text.match(LEXICON[key])
    if (matches && matches.length > 0) {
      const raw = Math.min(1, matches.length * 0.45)
      caught[key] = Math.min(1, raw * (intensified ? 1.25 : 1))
    }
  }
  const keys = Object.keys(caught) as EmotionKey[]
  if (keys.length === 0) {
    return { valence: 0.05, arousal: 0.3, intensities: {} }
  }
  let vsum = 0
  let asum = 0
  let wsum = 0
  for (const k of keys) {
    const w = caught[k] as number
    vsum += EMOTION_META[k].valence * w
    asum += EMOTION_META[k].arousal * w
    wsum += w
  }
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
  return {
    valence: clamp(vsum / wsum, -1, 1),
    arousal: clamp(asum / wsum, 0, 1),
    intensities: caught,
  }
}

export function dominantEmotion(e: EmotionVector): EmotionKey | null {
  let best: EmotionKey | null = null
  let bestVal = 0
  for (const k of EMOTION_KEYS) {
    const v = e.intensities[k] ?? 0
    if (v > bestVal) {
      bestVal = v
      best = k
    }
  }
  return best
}

export function intensityOf(e: EmotionVector, key: EmotionKey): number {
  return e.intensities[key] ?? 0
}

const VEC_KEYS = EMOTION_KEYS

export function emotionVectorArray(e: EmotionVector): number[] {
  return VEC_KEYS.map((k) => e.intensities[k] ?? 0)
}

export function emotionDistance(a: EmotionVector, b: EmotionVector): number {
  const va = emotionVectorArray(a)
  const vb = emotionVectorArray(b)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < va.length; i++) {
    dot += va[i] * vb[i]
    na += va[i] * va[i]
    nb += vb[i] * vb[i]
  }
  if (na === 0 && nb === 0) return 0.35 // 両方ニュートラル → 中庸の距離
  if (na === 0 || nb === 0) return 0.55
  const cos = dot / (Math.sqrt(na) * Math.sqrt(nb))
  return Math.max(0, Math.min(1, 1 - cos))
}

export function blendEmotion(a: EmotionVector, b: EmotionVector): EmotionVector {
  const intensities: Partial<Record<EmotionKey, number>> = {}
  for (const k of EMOTION_KEYS) {
    const v = ((a.intensities[k] ?? 0) + (b.intensities[k] ?? 0)) / 2
    if (v > 0.05) intensities[k] = v
  }
  return {
    valence: (a.valence + b.valence) / 2,
    arousal: (a.arousal + b.arousal) / 2,
    intensities,
  }
}
