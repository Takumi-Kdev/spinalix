import { useMemo } from 'react'
import { useSpinalix } from '../store'
import { ThoughtCard } from '../components/ThoughtCard'
import { formatJP } from '../lib/dates'
import { emotionColor } from '../lib/design'
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

  if (!pending && fragments.length > 0 && !thinking) {
    window.setTimeout(() => advanceThought(), 50)
  }

  return (
    <div className="max-w-[720px] space-y-8">
      <header className="flex items-baseline justify-between">
        <p className="font-serif text-[17px] text-bone">おかえりなさい。</p>
        <p className="tnum text-[11px] text-faint">{formatJP(new Date().toISOString())}</p>
      </header>

      {pending ? (
        <ThoughtCard thought={pending} onOpenSource={onOpenFragment} onDecide={(accept) => decide(pending.id, accept)} />
      ) : (
        <div className="border border-rule px-6 py-8 text-center">
          <p className="text-[13px] text-muted">{thinking ? '考えています…' : 'まだ想起の種がありません。'}</p>
          <button onClick={onDeepThink} className="mt-3 text-[12.5px] text-shu underline-offset-4 hover:underline">
            深く考える
          </button>
        </div>
      )}

      {thoughtsCount <= 1 && (
        <p className="border border-rule px-4 py-3 text-[12px] leading-relaxed text-muted">
          <span className="text-bone">はじめての方へ。</span>{' '}
          便箋の「思考の足跡をひらく」を押すと、この想起がどう生まれたか（起点・拡散・跳躍・解剖）まで見られます。
        </p>
      )}

      {/* 数字は「一行の文」で（メトリクスカードは作らない） */}
      <p className="text-[12px] leading-relaxed text-faint">
        断片 <span className="tnum text-muted">{filteredCount === totalFragments ? totalFragments : `${filteredCount}/${totalFragments}`}</span>・回路{' '}
        <span className="tnum text-muted">{links.length}</span>・思考 <span className="tnum text-muted">{thoughtsCount}</span>・定着{' '}
        <span className="tnum text-muted">{adopted}</span>
      </p>

      <section>
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="text-[13px] text-muted">最近の断片</h2>
          <button onClick={onCapture} className="text-[12px] text-shu underline-offset-4 transition hover:underline">
            記憶する
          </button>
        </div>
        <div className="grid gap-x-10 lg:grid-cols-2">
          {recent.map((f) => (
            <button key={f.id} onClick={() => onOpenFragment(f.id)} className="group flex items-baseline gap-3 border-b border-rule py-3 text-left">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: emotionColor(f) }} />
              <span className="tnum w-14 shrink-0 whitespace-nowrap text-[11px] text-faint">{formatJP(f.createdAt)}</span>
              <span className="truncate font-serif text-[13.5px] text-muted transition group-hover:text-bone">{f.text}</span>
              {f.source === 'machine' && <span className="tnum ml-auto shrink-0 text-[10px] text-shu">機械</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-rule pt-5">
        <p className="text-[12px] leading-[2] text-faint">
          想起は、拡散活性化（今温まっている記憶）から始まり、記憶回路を歩くことで生まれます。すべての想起は実在の断片に接地し、
          思考の足跡から「なぜ生まれたか」を確認できます。選んだ想起だけが回路に定着します。
        </p>
      </section>
    </div>
  )
}
