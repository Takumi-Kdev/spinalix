import { useMemo, useState } from 'react'
import { useSpinalix } from '../store'
import type { ThoughtCrystal } from '../lib/types'
import { monthLabel } from '../lib/dates'
import { emotionTheme } from '../lib/design'

const EXAMPLES = ['留学に行くべきか、迷っている', 'この1ヶ月の自分を振り返りたい', '今年、やめることを決めたい']

export function PurposeView({ onOpenFragment }: { onOpenFragment: (id: string) => void }) {
  const buildCrystal = useSpinalix((s) => s.buildCrystal)
  const crystals = useSpinalix((s) => s.crystals)
  const [intention, setIntention] = useState('')
  const [crystal, setCrystal] = useState<ThoughtCrystal | null>(null)
  const [weaving, setWeaving] = useState(false)

  const run = (text: string) => {
    const t = text.trim()
    if (!t) return
    setIntention(t)
    setWeaving(true)
    window.setTimeout(() => {
      setCrystal(buildCrystal(t))
      setWeaving(false)
    }, 720)
  }

  const archive = useMemo(() => [...crystals].reverse().slice(0, 3), [crystals])

  return (
    <div className="max-w-[760px] space-y-6">
      <section>
        <p className="mono text-faint">PURPOSE — 目的モード</p>
        <h2 className="mt-1 font-serif text-[20px] text-bone">いま、何を考えたい?</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          問いを書くと、記憶エンジンが断片をたどって「思考結晶」を組み上げます。引用はすべて、実在のあなたの記憶です。
        </p>
      </section>

      <section className="panel rounded-xl p-4">
        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          rows={2}
          placeholder="例: 留学に行くべきか、迷っている"
          className="w-full resize-none rounded-lg border border-hairline bg-white/[0.03] px-4 py-3 text-[15px] leading-relaxed text-bone outline-none placeholder:text-faint focus:border-amber/50"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setIntention(ex)}
              className="rounded-full border border-hairline px-3 py-1 text-[11px] text-faint transition hover:border-white/20 hover:text-muted"
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          onClick={() => run(intention)}
          disabled={!intention.trim() || weaving}
          className="mt-4 w-full rounded-xl bg-gradient-to-b from-amber-soft to-amber px-4 py-3 text-[14px] font-bold text-[#241a08] transition active:scale-[0.99] disabled:opacity-40"
        >
          {weaving ? '記憶を編んでいます…' : '思考結晶をつくる'}
        </button>
      </section>

      {crystal && <CrystalView crystal={crystal} onOpenFragment={onOpenFragment} />}

      {!crystal && archive.length > 0 && (
        <section>
          <p className="mono mb-2 text-faint">PAST CRYSTALS</p>
          <div className="space-y-2">
            {archive.map((c) => (
              <button
                key={c.id}
                onClick={() => setCrystal(c)}
                className="panel w-full rounded-lg px-4 py-3 text-left transition hover:border-white/20"
              >
                <p className="text-[13px] text-bone">{c.intention}</p>
                <p className="mt-1 text-[11px] text-faint">
                  {new Date(c.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} に結晶化
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function CrystalView({
  crystal,
  onOpenFragment,
}: {
  crystal: ThoughtCrystal
  onOpenFragment: (id: string) => void
}) {
  const maxAbs = Math.max(0.4, ...crystal.arcPoints.map((p) => Math.abs(p.valence)))
  const w = 340
  const h = 78
  const pad = 12
  const xs = crystal.arcPoints.map((_, i) =>
    crystal.arcPoints.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (crystal.arcPoints.length - 1),
  )
  const ys = crystal.arcPoints.map((p) => h / 2 - (p.valence / maxAbs) * (h / 2 - 14))
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${line} L${xs[xs.length - 1] ?? pad},${h / 2} L${xs[0] ?? pad},${h / 2} Z`

  return (
    <article className="rise space-y-5">
      <header className="thought-card px-4 py-4" style={{ ['--edge' as string]: 'linear-gradient(135deg, rgba(240,179,92,0.7), rgba(240,179,92,0.08) 55%, rgba(143,184,232,0.4))' }}>
        <p className="mono text-amber-soft/80">思考結晶</p>
        <h3 className="mt-1.5 font-serif text-[19px] leading-snug text-bone">{crystal.intention}</h3>
      </header>

      <section className="panel rounded-xl p-4">
        <div className="flex items-baseline justify-between">
          <p className="mono text-faint">感情の弧</p>
          <p className="text-[12px] text-amber">{crystal.arcLabel}</p>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full">
          <defs>
            <linearGradient id="arcfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0b35c" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f0b35c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" />
          <path d={area} fill="url(#arcfill)" />
          <path d={line} fill="none" stroke="#f0b35c" strokeWidth="2" strokeLinecap="round" />
          {xs.map((x, i) => (
            <circle key={i} cx={x} cy={ys[i]} r="3" fill="#0c1018" stroke="#f0b35c" strokeWidth="1.6" />
          ))}
        </svg>
        <div className="flex justify-between text-[10.5px] text-faint">
          <span>{crystal.arcPoints[0] ? monthLabel(crystal.arcPoints[0].at) : ''}</span>
          <span>{crystal.arcPoints[crystal.arcPoints.length - 1] ? monthLabel(crystal.arcPoints[crystal.arcPoints.length - 1].at) : ''}</span>
        </div>
      </section>

      <section>
        <p className="mono mb-2 text-faint">RECALLED — 記憶からの想起（{crystal.recalled.length}）</p>
        <div className="space-y-2">
          {crystal.recalled.map((r) => (
            <button key={r.fragmentId} onClick={() => onOpenFragment(r.fragmentId)} className="paper w-full rounded-xl p-3.5 text-left transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="mono text-[#6b6657]">{r.when}</span>
                <span className="rounded-full bg-[#1b1e26]/10 px-2 py-0.5 text-[10px] text-[#6b6657]">{r.why}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#23262e]">{r.quote}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="panel rounded-xl p-4">
        <p className="mono text-faint">INSIGHT — 洞察</p>
        <ul className="mt-3 space-y-3">
          {crystal.insights.map((ins, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
              <p className="text-[13.5px] leading-relaxed text-bone">{ins.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {crystal.tension && (
        <section className="rounded-xl border border-coral/30 p-4" style={{ background: 'linear-gradient(180deg, rgba(240,123,106,0.07), transparent)' }}>
          <p className="mono text-coral/90">TENSION — あなたの中の矛盾</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[11px] text-faint">{crystal.tension.pastWhen}のあなた</p>
              <p className="mt-1 font-serif text-[14px] leading-relaxed text-bone/90">「{crystal.tension.pastQuote}」</p>
            </div>
            <div>
              <p className="text-[11px] text-faint">最近のあなた</p>
              <p className="mt-1 font-serif text-[14px] leading-relaxed text-bone/90">「{crystal.tension.nowQuote}」</p>
            </div>
            <p className="border-t border-coral/20 pt-3 text-[13px] leading-relaxed text-coral/95">{crystal.tension.question}</p>
          </div>
        </section>
      )}

      <section className="panel rounded-xl p-4">
        <p className="mono text-faint">NEXT — 次の一歩</p>
        <ul className="mt-3 space-y-2">
          {crystal.nextSteps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-bone">
              <span className="tabular text-amber">{i + 1}</span>
              {s}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

void emotionTheme
