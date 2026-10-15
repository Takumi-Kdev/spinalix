// Spinalix — データモデル
// 「断片」= 感情つきの記憶の最小単位。「想起」= 機械が生成した新しい断片。

export type EmotionKey =
  | 'joy'
  | 'love'
  | 'anticipation'
  | 'calm'
  | 'sadness'
  | 'anxiety'
  | 'anger'
  | 'fatigue'

/** 感情ベクトル: 快-不快(valence) と 静-動(arousal) + 8感情の強度 */
export interface EmotionVector {
  valence: number // -1..1
  arousal: number // 0..1
  intensities: Partial<Record<EmotionKey, number>> // 0..1
}

export type FragmentSource = 'user' | 'machine'

export interface Fragment {
  id: string
  text: string
  createdAt: string // ISO
  source: FragmentSource
  emotion: EmotionVector
  people: string[]
  themes: string[]
}

export type LinkKind = 'similar' | 'echo' | 'tension' | 'theme' | 'person' | 'recall'

export interface Link {
  a: string
  b: string
  kind: LinkKind
  weight: number // 0..1
  reason?: string
}

export type ThoughtKind = 'echo' | 'tension' | 'question' | 'recall' | 'arc' | 'leap' | 'openloop'

/** 「ふと」— システム主導で届く想起 */
export interface SuddenThought {
  id: string
  createdAt: string
  kind: ThoughtKind
  text: string
  from: string[] // 出典断片ID（必ず1つ以上。捏造しない）
  path: string[] // 思考歩行の道筋（起点→…→着地）
  steps: { label: string; detail: string }[] // 思考の足跡（なぜこの想起が生まれたか）
  engine: 'local' | 'ai' // ローカル思考 / APIによる文体化（検証済み）
  score: number
  fingerprint: string
  status: 'new' | 'adopted' | 'rejected'
}

/** 思考結晶 — 目的モードの出力 */
export interface CrystalRecall {
  fragmentId: string
  quote: string
  when: string
  why: string
}

export interface EmotionPoint {
  at: string // YYYY-MM
  valence: number
  arousal: number
}

export interface ThoughtCrystal {
  id: string
  createdAt: string
  intention: string
  recalled: CrystalRecall[]
  arcLabel: string
  arcPoints: EmotionPoint[]
  insights: { text: string; evidence: string[] }[]
  tension?: {
    pastQuote: string
    pastWhen: string
    nowQuote: string
    theme: string
    question: string
  }
  nextSteps: string[]
}

export interface Preferences {
  adoptedKinds: Record<ThoughtKind, number>
  rejectedKinds: Record<ThoughtKind, number>
  adoptedThoughtTexts: string[]
}
