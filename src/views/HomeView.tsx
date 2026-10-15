import { useMemo } from 'react'
import { useSpinalix } from '../store'
import { ThoughtCard } from '../components/ThoughtCard'
import { formatJP } from '../lib/dates'
import { emotionTheme } from '../lib/design'
import type { SuddenThought } from '../lib/types'

export function HomeView({
  pending,
  onOpenFragment,
  onCapture,
  onDeepThink,
  thinking,
  filteredCount,
  totalFragments,
  thoughtsCount,
}: {
  pending: SuddenThought | null
  onOpenFragment: (id: string) => void
  onCapture: () => void
  onDeepThink: () => void
  thinking: boolean
  filteredCount: number
  totalFragments: number
  thoughtsCount: number
}) {
  const decide = useSpinalix((s) => s.decide)
  const advanceThought = useSpinalix((s) => s.advanceThought)
  const fragments = useSpinalix((s) => s.fragments)
  const links = useSpinalix((s) => s.links)
  const prefs = useSpinalix((s) => s.prefs)

  const adopted = prefs.adoptedThoughtTexts.length
  const recent = useMemo(
    () => [...fragments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [fragments],
  )

  // 未処理がない場合は1つ用意する（開いた瞬間に何か言っている状態）
  if (!pending && fragments.length > 0 && !thinking) {
    window.setTimeout(() => advanceThought(), 50)
  }

  return (
    <div className="space-y-6">
      <section className="rise">
        <div className="flex items-baseline justify-between">
          <p className="mono text-faint">TODAY</p>
          <p className="mono text-faint">{formatJP(new Date().toISOString())}</p>
        </div>
        <h1 className="mt-2 max-w-[520px] font-serif text-[22px] leading-snug text-bone">
          おかえりなさい。
          <span className="text-muted">あなたの記憶が、何か言いたそうです。</span>
        </h1>
      </section>

      {pending ? (
        <div className="max-w-[640px]">
          <ThoughtCard
            thought={pending}
            onOpenSource={onOpenFragment}
            onDecide={(accept) => decide(pending.id, accept)}
          />
        </div>
      ) : (
        <div className="panel max-w-[640px] rounded-xl p-6 text-center">
          <p className="text-[13px] text-muted">{thinking ? '考えています…' : 'まだ想起の種がありません。'}</p>
          <button onClick={onDeepThink} className="mt-3 rounded-lg border border-amber/40 px-4 py-2 text-[12.5px] text-amber">
            深く考える
          </button>
        </div>
      )}

      <section className="rise grid max-w-[640px] grid-cols-4 gap-2.5" style={{ animationDelay: '80ms' }}>
        <Stat label="断片" value={filteredCount === totalFragments ? totalFragments : `${filteredCount}/${totalFragments}`} />
        <Stat label="回路" value={links.length} />
        <Stat label="定着した想起" value={adopted} accent />
        <Stat label="思考" value={thoughtsCount} />
      </section>

      <section className="rise" style={{ animationDelay: '140ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="mono text-faint">RECENT FRAGMENTS</p>
          <button onClick={onCapture} className="text-[12px] text-amber/90 transition hover:text-amber-soft">
            + 記憶する
          </button>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:-mx-0 lg:px-0">
          {recent.map((f) => {
            const theme = emotionTheme(f.emotion)
            return (
              <button
                key={f.id}
                onClick={() => onOpenFragment(f.id)}
                className="paper group relative w-[196px] shrink-0 overflow-hidden rounded-xl p-3.5 text-left transition hover:-translate-y-0.5"
              >
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: theme.gradient }} />
                <div className="flex items-center justify-between pl-1.5">
                  <span className="mono text-[#6b6657]">{formatJP(f.createdAt)}</span>
                  {f.source === 'machine' && <span className="mono text-[#9a8248]">MACHINE</span>}
                </div>
                <p className="mt-2 line-clamp-3 pl-1.5 text-[12.5px] leading-relaxed text-[#23262e]">{f.text}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rise panel max-w-[640px] rounded-xl p-4" style={{ animationDelay: '200ms' }}>
        <p className="mono text-faint">HOW THIS WORKS</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          想起は、<span className="text-bone">拡散活性化</span>（今温まっている記憶）から始まり、
          記憶回路を<span className="text-bone">歩く</span>ことで生まれます。すべての想起は実在の断片に接地し、
          <span className="text-bone">思考の足跡</span>から「なぜ生まれたか」を確認できます。
          「これは私だ」で選んだ想起だけが回路に定着します。
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="panel rounded-xl px-3 py-3 text-center">
      <p className={`tabular text-[20px] font-bold ${accent ? 'text-amber' : 'text-bone'}`}>{value}</p>
      <p className="mt-0.5 text-[10px] tracking-wider text-faint">{label}</p>
    </div>
  )
}
