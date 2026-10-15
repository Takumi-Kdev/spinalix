import { useMemo, useState } from 'react'
import { useSpinalix } from '../store'
import type { ThoughtCrystal } from '../lib/types'
import { monthLabel } from '../lib/dates'

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
    }, 680)
  }

  const archive = useMemo(() => [...crystals].reverse().slice(0, 3), [crystals])

  return (
    <div className="max-w-[760px] space-y-8">
      <header>
        <h2 className="font-serif text-[22px] text-bone">目的モード</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          問いを書くと、エンジンが記憶をたどり、出典つきの思考結晶を組み上げます。引用はすべて、実在の断片です。
        </p>
      </header>

      <section>
        <div className="letter px-4 pb-4 pt-4">
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            rows={2}
            placeholder="例: 留学に行くべきか、迷っている"
            className="w-full resize-none bg-transparent font-serif text-[15.5px] leading-[1.95] text-sumi outline-none placeholder:text-[#a49a86]"
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 letter-rule">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setIntention(ex)} className="text-[11px] text-[#6f6656] underline-offset-4 transition hover:underline">
                {ex}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => run(intention)}
          disabled={!intention.trim() || weaving}
          className="mt-4 rounded-[6px] bg-shu px-5 py-2.5 text-[13.5px] font-bold text-paper transition active:translate-y-px disabled:opacity-40"
        >
          {weaving ? '記憶を編んでいます…' : '思考結晶をつくる'}
        </button>
      </section>

      {crystal && <CrystalView crystal={crystal} onOpenFragment={onOpenFragment} />}

      {!crystal && archive.length > 0 && (
        <section className="border-t border-rule pt-4">
          <p className="text-[11.5px] text-faint">これまでの結晶</p>
          <div className="mt-1 divide-y divide-rule">
            {archive.map((c) => (
              <button key={c.id} onClick={() => setCrystal(c)} className="block w-full py-2.5 text-left">
                <p className="text-[13px] text-bone">{c.intention}</p>
                <p className="tnum mt-0.5 text-[10.5px] text-faint">
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

export function CrystalView({ crystal, onOpenFragment }: { crystal: ThoughtCrystal; onOpenFragment: (id: string) => void }) {
  const maxAbs = Math.max(0.4, ...crystal.arcPoints.map((p) => Math.abs(p.valence)))
  const w = 340
  const h = 78
  const pad = 12
  const xs = crystal.arcPoints.map((_, i) => (crystal.arcPoints.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (crystal.arcPoints.length - 1)))
  const ys = crystal.arcPoints.map((p) => h / 2 - (p.valence / maxAbs) * (h / 2 - 14))
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')

  return (
    <article className="rise space-y-8">
      <header className="border-b border-rule pb-4">
        <p className="text-[11.5px] text-faint">思考結晶</p>
        <h3 className="mt-1 font-serif text-[20px] leading-snug text-bone">{crystal.intention}</h3>
      </header>

      <section>
        <div className="flex items-baseline justify-between">
          <p className="text-[11.5px] text-faint">感情の弧</p>
          <p className="text-[12px] text-shu">{crystal.arcLabel}</p>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full">
          <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(231,223,207,0.14)" strokeDasharray="2 4" />
          <path d={line} fill="none" stroke="#c8442a" strokeWidth="1.6" strokeLinecap="round" />
          {xs.map((x, i) => (
            <circle key={i} cx={x} cy={ys[i]} r="2.6" fill="#12100c" stroke="#c8442a" strokeWidth="1.4" />
          ))}
        </svg>
        <div className="flex justify-between text-[10.5px] text-faint">
          <span>{crystal.arcPoints[0] ? monthLabel(crystal.arcPoints[0].at) : ''}</span>
          <span>{crystal.arcPoints[crystal.arcPoints.length - 1] ? monthLabel(crystal.arcPoints[crystal.arcPoints.length - 1].at) : ''}</span>
        </div>
      </section>

      <section>
        <p className="text-[11.5px] text-faint">記憶からの想起（{crystal.recalled.length}）</p>
        <div className="mt-2 space-y-3">
          {crystal.recalled.map((r) => (
            <button key={r.fragmentId} onClick={() => onOpenFragment(r.fragmentId)} className="letter block w-full px-4 py-3 text-left transition hover:translate-y-[-1px]">
              <div className="flex items-baseline justify-between">
                <span className="tnum text-[10.5px] text-[#6f6656]">{r.when}</span>
                <span className="text-[10.5px] text-[#6f6656]">{r.why}</span>
              </div>
              <p className="mt-1.5 font-serif text-[13.5px] leading-relaxed text-sumi">{r.quote}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <p className="text-[11.5px] text-faint">洞察</p>
        <ul className="mt-2 space-y-2.5">
          {crystal.insights.map((ins, i) => (
            <li key={i} className="text-[13.5px] leading-[1.95] text-bone">
              {ins.text}
            </li>
          ))}
        </ul>
      </section>

      {crystal.tension && (
        <section className="border-t border-rule pt-4">
          <p className="text-[11.5px] text-shu">あなたの中の矛盾</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="tnum text-[10.5px] text-faint">{crystal.tension.pastWhen}のあなた</p>
              <p className="mt-1 font-serif text-[14px] leading-[1.95] text-bone/90">「{crystal.tension.pastQuote}」</p>
            </div>
            <div>
              <p className="text-[10.5px] text-faint">最近のあなた</p>
              <p className="mt-1 font-serif text-[14px] leading-[1.95] text-bone/90">「{crystal.tension.nowQuote}」</p>
            </div>
            <p className="border-t border-rule pt-3 text-[13px] leading-relaxed text-bone">{crystal.tension.question}</p>
          </div>
        </section>
      )}

      <section className="border-t border-rule pt-4">
        <p className="text-[11.5px] text-faint">次の一歩</p>
        <ul className="mt-2 space-y-1.5">
          {crystal.nextSteps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-[1.9] text-bone">
              <span className="tnum text-shu">{i + 1}</span>
              {s}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
