import { useEffect, useMemo, useState } from 'react'
import { useSpinalix } from '../store'
import type { SuddenThought, ThoughtKind } from '../lib/types'
import { formatJP } from '../lib/dates'
import { EMOTION_META, blendEmotion, dominantEmotion } from '../lib/emotion'
import { SEAL_GLYPH, emotionColor } from '../lib/design'

export const KIND_META: Record<ThoughtKind, { label: string; hint: string }> = {
  recall: { label: '自己引用', hint: '過去のあなたが、今のあなたを支えている' },
  echo: { label: '反響', hint: '遠い日と今日が、同じ感情で鳴っている' },
  tension: { label: '矛盾', hint: 'あなたの中の、向きの違う二つの言葉' },
  question: { label: '問い', hint: 'まだ言葉になっていないもの' },
  arc: { label: '軌跡', hint: '記憶を貫く、一本の道' },
  leap: { label: '跳躍', hint: '無関係な二つの記憶が、同じ質感を持つ' },
  openloop: { label: '開いた輪', hint: '言ったのに、まだやっていないこと' },
}

/** 便箋としての想起カード。朱印・出典・思考の足跡・解剖（trace）を持つ。 */
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
    () => thought.from.map((id) => fragments.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => Boolean(f)),
    [thought.from, fragments],
  )
  const meta = KIND_META[thought.kind]
  const [showTrace, setShowTrace] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    setLeaving(false)
    setShowTrace(false)
  }, [thought.id])

  const blended = sources.length > 0 ? sources.slice(1).reduce((acc, s) => blendEmotion(acc, s.emotion), sources[0].emotion) : null
  const dom = blended ? dominantEmotion(blended) : null

  const decide = (accept: boolean) => {
    if (!onDecide) return
    setLeaving(true)
    window.setTimeout(() => onDecide(accept), 220)
  }

  return (
    <article className={`letter relative px-6 pb-5 pt-5 transition-opacity duration-200 ${leaving ? 'opacity-0' : 'rise'}`}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="seal text-[15px]" aria-label={meta.label}>
            {SEAL_GLYPH[thought.kind]}
          </span>
          <div>
            <p className="text-[13px] text-sumi">{meta.label}</p>
            <p className="tnum text-[10.5px] text-[#5f584a]">{formatJP(thought.createdAt)}</p>
          </div>
        </div>
        <p className="text-right text-[10.5px] leading-relaxed text-[#5f584a]">
          {thought.engine === 'ai' ? <span className="text-aiiro">AI文体・検証済</span> : 'ローカル思考'}
          <br />
          {dom ? `感情 ${EMOTION_META[dom].label}` : '感情 凪'}
        </p>
      </header>

      <p className={`mt-4 font-serif text-sumi ${compact ? 'text-[15.5px]' : 'text-[17px]'} leading-[1.95]`}>{thought.text}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className="text-[#5f584a]">出典</span>
        {sources.map((s, i) => (
          <button key={s.id} onClick={() => onOpenSource(s.id)} className="group inline-flex items-center gap-1.5 text-sumi/85 underline-offset-4 transition hover:underline">
            {i > 0 && <span className="text-[#8d8474]">・</span>}
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: emotionColor(s) }} />
            {formatJP(s.createdAt)}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11.5px] text-[#5f584a]">{meta.hint}</p>
      {thought.trace?.note && <p className="tnum mt-1 text-[10px] text-[#8d8474]">{thought.trace.note}</p>}

      {thought.steps.length > 0 && (
        <div className="mt-5 border-t pt-4 letter-rule">
          <button onClick={() => setShowTrace((v) => !v)} className="text-[11.5px] text-[#5f584a] transition hover:text-sumi">
            思考の足跡 {showTrace ? 'を閉じる' : 'をひらく'}
          </button>
          {showTrace && (
            <div className="rise mt-3 space-y-4">
              <ol className="space-y-1.5">
                {thought.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[12px] leading-relaxed text-[#4c4538]">
                    <span className="tnum w-10 shrink-0 text-[#8d8474]">{s.label}</span>
                    {s.detail}
                  </li>
                ))}
              </ol>

              {thought.trace && (
                <div className="border-t pt-3 letter-rule">
                  <p className="text-[11px] text-[#5f584a]">解剖 — なぜ、これが選ばれたか</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10.5px] text-[#8d8474]">起点（今のあなた）</p>
                      <ul className="mt-1 space-y-1">
                        {thought.trace.seeds.map((s) => (
                          <li key={s.id} className="flex items-baseline gap-2 text-[11.5px] text-[#4c4538]">
                            <span className="tnum text-[#8d8474]">{s.date}</span>
                            <span>{s.reason}</span>
                            <span className="tnum ml-auto text-[#5f584a]">A={s.activation.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-[#8d8474]">検討した道筋（上位）</p>
                      <ul className="mt-1 space-y-1">
                        {thought.trace.walks.slice(0, 6).map((w, i) => (
                          <li key={i} className="flex items-baseline gap-2 text-[11.5px] text-[#4c4538]">
                            <span className="tnum text-[#5f584a]">{w.score.toFixed(2)}</span>
                            <span>{MODE_LABEL[w.mode] ?? w.mode}</span>
                            <span className="ml-auto text-[#5f584a]">
                              {w.chosen ? '採用' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[#5f584a]">{thought.trace.note}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {onDecide && (
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={() => decide(true)}
            className="rounded-[6px] bg-sumi px-5 py-2.5 text-[13.5px] font-bold text-paper transition active:translate-y-px"
          >
            これは私だ
          </button>
          <button onClick={() => decide(false)} className="text-[13px] text-[#5f584a] underline-offset-4 transition hover:text-sumi hover:underline">
            ちがう
          </button>
        </div>
      )}
    </article>
  )
}

const MODE_LABEL: Record<string, string> = {
  resonance: '共鳴（過去の自分の言葉）',
  contrast: '対照（向きの反転）',
  dwell: '反すう（同じ感情）',
  arc: '軌跡（一本の道）',
  leap: '跳躍（遠い記憶）',
  openloop: '開いた輪',
  question: '問い',
}
