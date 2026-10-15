import { useEffect, useMemo, useState } from 'react'
import { useSpinalix } from '../store'
import type { SuddenThought, ThoughtKind } from '../lib/types'
import { formatJP, relativeJP } from '../lib/dates'
import { EMOTION_META, blendEmotion, dominantEmotion } from '../lib/emotion'
import { emotionTheme, hexA } from '../lib/design'

export const KIND_META: Record<ThoughtKind, { label: string; en: string; color: string; hint: string }> = {
  recall: { label: '自己引用', en: 'SELF-QUOTE', color: '#f0b35c', hint: '過去のあなたが、今のあなたを支えている' },
  echo: { label: '反響', en: 'ECHO', color: '#7fd1ae', hint: '遠い日と今日が、同じ感情で鳴っている' },
  tension: { label: '矛盾', en: 'TENSION', color: '#f07b6a', hint: 'あなたの中の、向きの違う二つの言葉' },
  question: { label: '問い', en: 'OPEN QUESTION', color: '#c7a0f0', hint: 'まだ言葉になっていないもの' },
  arc: { label: '軌跡', en: 'ARC', color: '#8fb8e8', hint: '記憶を貫く、一本の道' },
  leap: { label: '跳躍', en: 'LEAP', color: '#f27ba7', hint: '無関係な二つの記憶が、同じ質感を持つ' },
  openloop: { label: '開いた輪', en: 'OPEN LOOP', color: '#ffd48f', hint: '言ったのに、まだやっていないこと' },
}

export function ThoughtCard({
  thought,
  onOpenSource,
  onDecide,
  compact,
}: {
  thought: SuddenThought
  onOpenSource: (id: string) => void
  onDecide?: (accept: boolean) => void
  compact?: boolean
}) {
  const fragments = useSpinalix((s) => s.fragments)
  const sources = useMemo(
    () => thought.from.map((id) => fragments.find((f) => f.id === id)).filter(Boolean),
    [thought.from, fragments],
  )
  const meta = KIND_META[thought.kind]
  const [showSteps, setShowSteps] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    setLeaving(false)
    setShowSteps(false)
  }, [thought.id])

  const blended = sources.length > 0 ? sources.slice(1).reduce((acc, s) => blendEmotion(acc, s!.emotion), sources[0]!.emotion) : null
  const theme = emotionTheme(blended ?? { valence: 0, arousal: 0.3, intensities: {} })
  const dom = blended ? dominantEmotion(blended) : null

  const decide = (accept: boolean) => {
    if (!onDecide) return
    setLeaving(true)
    window.setTimeout(() => onDecide(accept), 240)
  }

  return (
    <article
      className={`thought-card relative px-5 pb-4 pt-5 transition-all duration-300 ${
        leaving ? 'pointer-events-none -translate-y-1 opacity-0' : 'rise'
      } ${compact ? 'pb-3 pt-4' : ''}`}
      style={{ ['--edge' as string]: theme.gradient }}
    >
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-60 pulse-glow" style={{ background: meta.color }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: meta.color }} />
          </span>
          <span className="mono text-amber-soft/90">{meta.label}</span>
          <span className="mono text-faint">{meta.en}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`mono rounded-full border px-2 py-0.5 ${
              thought.engine === 'ai' ? 'border-sky/40 text-sky' : 'border-hairline text-faint'
            }`}
            title={
              thought.engine === 'ai'
                ? 'AI文体モード: エンジンの思考を、検証済みの言葉で整えたもの（新しい事実は禁止）'
                : 'ローカル思考: 端末内で完結。外部API不使用'
            }
          >
            {thought.engine === 'ai' ? 'AI文体・検証済' : 'ローカル思考'}
          </span>
          <span className="text-[10.5px] text-faint">{relativeJP(thought.createdAt)}</span>
        </div>
      </header>

      <p className={`relative z-10 mt-4 font-serif leading-[1.95] text-bone ${compact ? 'text-[15px]' : 'text-[17px]'}`}>
        {thought.text}
      </p>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        <span className="mono text-faint">SOURCES</span>
        {sources.map((s) =>
          s ? (
            <button
              key={s.id}
              onClick={() => onOpenSource(s.id)}
              className="group flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted transition hover:border-white/25 hover:text-bone"
            >
              {formatJP(s.createdAt)}
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: emotionTheme(s.emotion).colors[0] }} />
            </button>
          ) : null,
        )}
        {dom && <span className="text-[10.5px] text-faint">感情: {EMOTION_META[dom].label}</span>}
      </div>

      {thought.steps.length > 0 && (
        <div className="relative z-10 mt-3">
          <button onClick={() => setShowSteps((v) => !v)} className="mono text-faint transition hover:text-muted">
            思考の足跡 {showSteps ? '−' : '+'}
          </button>
          {showSteps && (
            <ol className="fadein mt-2 space-y-1.5 border-l border-hairline pl-4">
              {thought.steps.map((s, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-muted">
                  <span className="mono mr-2 text-amber/80">{s.label}</span>
                  {s.detail}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <p className="relative z-10 mt-3 text-[10.5px] text-faint">{meta.hint}</p>

      {onDecide && (
        <div className="relative z-10 mt-4 flex items-center gap-2.5">
          <button
            onClick={() => decide(true)}
            className="flex-1 rounded-xl bg-gradient-to-b from-amber-soft to-amber px-4 py-2.5 text-[13.5px] font-bold text-[#241a08] shadow-[0_10px_24px_-12px_rgba(240,179,92,0.7)] transition active:scale-[0.98]"
          >
            これは私だ
          </button>
          <button
            onClick={() => decide(false)}
            className="rounded-xl border border-hairline px-4 py-2.5 text-[13px] text-muted transition hover:border-white/20 hover:text-bone active:scale-[0.98]"
          >
            ちがう
          </button>
        </div>
      )}
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: hexA(theme.colors[0], 0.5) }} />
    </article>
  )
}
