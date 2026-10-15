import { useMemo } from 'react'
import { useSpinalix } from '../store'
import { ThoughtCard, useCurrentThought } from './ThoughtCard'
import { formatJP } from '../lib/dates'
import { EMOTION_META, dominantEmotion } from '../lib/emotion'
import { shortQuote } from '../lib/text'

export function HomeView({
  onOpenFragment,
  onCapture,
}: {
  onOpenFragment: (id: string) => void
  onCapture: () => void
}) {
  const thought = useCurrentThought()
  const decide = useSpinalix((s) => s.decide)
  const advanceThought = useSpinalix((s) => s.advanceThought)
  const fragments = useSpinalix((s) => s.fragments)
  const links = useSpinalix((s) => s.links)
  const prefs = useSpinalix((s) => s.prefs)

  const adopted = prefs.adoptedThoughtTexts.length
  const recent = useMemo(
    () => [...fragments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [fragments],
  )
  const today = formatJP(new Date().toISOString())

  return (
    <div className="space-y-6">
      <section className="rise">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] tracking-[0.28em] text-faint">TODAY</p>
          <p className="text-[11px] text-faint">{today}</p>
        </div>
        <h1 className="mt-2 font-serif text-[22px] leading-snug text-bone">
          おかえりなさい。
          <span className="text-muted">あなたの記憶が、何か言いたそうです。</span>
        </h1>
      </section>

      {thought ? (
        <div className="rise" style={{ animationDelay: '60ms' }}>
          <ThoughtCard thought={thought} onOpenSource={onOpenFragment} onDecide={(accept) => decide(thought.id, accept)} />
        </div>
      ) : (
        <div className="rise rounded-2xl border border-hairline bg-panel/60 p-6 text-center">
          <p className="text-sm text-muted">まだ想起の種がありません。</p>
          <button
            onClick={() => advanceThought()}
            className="mt-3 rounded-lg border border-amber/40 px-4 py-2 text-[13px] text-amber"
          >
            想起を生成する
          </button>
        </div>
      )}

      <section className="rise grid grid-cols-3 gap-2.5" style={{ animationDelay: '120ms' }}>
        <Stat label="断片" value={fragments.length} />
        <Stat label="回路" value={links.length} />
        <Stat label="定着した想起" value={adopted} accent />
      </section>

      <section className="rise" style={{ animationDelay: '180ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] tracking-[0.28em] text-faint">最近の断片</p>
          <button onClick={onCapture} className="text-[12px] text-amber/90 transition hover:text-amber-soft">
            + 記憶する
          </button>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {recent.map((f) => {
            const dom = dominantEmotion(f.emotion)
            const color = dom ? EMOTION_META[dom].color : '#9aa3b2'
            return (
              <button
                key={f.id}
                onClick={() => onOpenFragment(f.id)}
                className="paper w-[190px] shrink-0 rounded-2xl p-3.5 text-left transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] tracking-wider text-[#6b6657]">{formatJP(f.createdAt)}</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} title={dom ? EMOTION_META[dom].label : ''} />
                </div>
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#23262e]">{shortQuote(f.text, 52)}</p>
                {f.source === 'machine' && (
                  <p className="mt-2 text-[10px] tracking-widest text-[#9a8248]">SPINALIXが生んだ想起</p>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rise rounded-2xl border border-hairline bg-panel/50 p-4" style={{ animationDelay: '240ms' }}>
        <p className="text-[11px] tracking-[0.28em] text-faint">この記憶について</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          すべての想起は、あなたの断片に接地しています（出典のない文は生まれません）。
          データはこの端末の外に出ません。気に入った想起だけを「これは私だ」で回路に定着させてください。
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-hairline bg-panel/60 px-3 py-3 text-center">
      <p className={`tabular text-[22px] font-bold ${accent ? 'text-amber' : 'text-bone'}`}>{value}</p>
      <p className="mt-0.5 text-[10.5px] tracking-wider text-faint">{label}</p>
    </div>
  )
}
