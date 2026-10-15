import { useEffect, useMemo, useState } from 'react'
import { useSpinalix } from '../store'
import type { EmotionVector, SuddenThought, ThoughtKind } from '../lib/types'
import { formatJP, relativeJP } from '../lib/dates'
import { EMOTION_META, dominantEmotion } from '../lib/emotion'

const KIND_LABEL: Record<ThoughtKind, { label: string; hint: string; color: string }> = {
  recall: { label: '自己引用', hint: '過去のあなたが、今のあなたを支えている', color: '#f0b35c' },
  echo: { label: '反響', hint: '遠い日と今日が、同じ感情で鳴っている', color: '#7fd1ae' },
  tension: { label: '矛盾', hint: 'あなたの中の、向きの違う二つの言葉', color: '#f07b6a' },
  question: { label: '問い', hint: 'まだ言葉になっていないもの', color: '#c7a0f0' },
}

export function ThoughtCard({
  thought,
  onOpenSource,
  onDecide,
}: {
  thought: SuddenThought
  onOpenSource: (id: string) => void
  onDecide: (accept: boolean) => void
}) {
  const fragments = useSpinalix((s) => s.fragments)
  const sources = thought.from.map((id) => fragments.find((f) => f.id === id)).filter(Boolean)
  const meta = KIND_LABEL[thought.kind]
  const [leaving, setLeaving] = useState<'left' | 'stay' | null>(null)

  useEffect(() => {
    setLeaving(null)
  }, [thought.id])

  const decide = (accept: boolean) => {
    setLeaving(accept ? 'stay' : 'left')
    window.setTimeout(() => onDecide(accept), 260)
  }

  return (
    <article
      className={`thought-card rise px-5 pb-4 pt-5 ${leaving === 'left' ? 'opacity-0 transition-all duration-300 -translate-x-3' : ''}`}
    >
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full pulse-glow"
            style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }}
          />
          <span className="text-[11px] tracking-[0.22em] text-amber-soft/90">{meta.label}</span>
        </div>
        <span className="text-[11px] text-faint">{relativeJP(thought.createdAt)}</span>
      </header>

      <p className="relative z-10 mt-4 font-serif text-[17.5px] leading-[1.95] text-bone">{thought.text}</p>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-faint">出典</span>
        {sources.map((s) =>
          s ? (
            <button
              key={s.id}
              onClick={() => onOpenSource(s.id)}
              className="group rounded-full border border-hairline bg-white/[0.03] px-3 py-1 text-[11px] text-muted transition hover:border-amber/50 hover:text-bone"
            >
              {formatJP(s.createdAt)}
              <span
                className="ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ background: emotionDot(s.emotion) }}
              />
            </button>
          ) : null,
        )}
      </div>

      <p className="relative z-10 mt-3 text-[11px] text-faint">{meta.hint}</p>

      <div className="relative z-10 mt-5 flex items-center gap-2.5">
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
    </article>
  )
}

function emotionDot(e: EmotionVector): string {
  const d = dominantEmotion(e)
  return d ? EMOTION_META[d].color : '#9aa3b2'
}

export function useCurrentThought() {
  const fragments = useSpinalix((s) => s.fragments)
  const thoughts = useSpinalix((s) => s.thoughts)
  const advanceThought = useSpinalix((s) => s.advanceThought)

  const pending = useMemo(() => {
    for (let i = thoughts.length - 1; i >= 0; i--) if (thoughts[i].status === 'new') return thoughts[i]
    return null
  }, [thoughts])

  useEffect(() => {
    if (!pending && fragments.length > 0) advanceThought()
  }, [pending, fragments.length, advanceThought])

  return pending
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] tracking-[0.28em] text-faint">{children}</p>
}
