import { useMemo, useState } from 'react'
import type { Fragment } from '../lib/types'
import { formatJP, monthKey, monthLabel } from '../lib/dates'
import { dominantEmotion, EMOTION_META } from '../lib/emotion'
import { emotionTheme, hexA } from '../lib/design'

/** 流れ — 8ヶ月の記憶を、時間の川として見る */
export function TimelineView({ fragments, onOpenFragment }: { fragments: Fragment[]; onOpenFragment: (id: string) => void }) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  const { bars, months, valencePath, minT, maxT } = useMemo(() => {
    const sorted = [...fragments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    if (sorted.length === 0) return { bars: [], months: [], valencePath: '', minT: 0, maxT: 1 }
    const minT = new Date(sorted[0].createdAt).getTime()
    const maxT = new Date(sorted[sorted.length - 1].createdAt).getTime()
    const span = Math.max(1, maxT - minT)
    const W = 1000
    const x = (iso: string) => 40 + ((new Date(iso).getTime() - minT) / span) * (W - 80)
    const bars = sorted.map((f) => {
      const theme = emotionTheme(f.emotion)
      const maxI = Math.max(0.2, ...Object.values(f.emotion.intensities).map((v) => v ?? 0))
      return {
        f,
        x: x(f.createdAt),
        h: 30 + maxI * 120,
        color: theme.colors[0],
        color2: theme.colors[1],
        arousal: f.emotion.arousal,
      }
    })
    // 月の目盛り
    const monthSet = new Map<string, number>()
    for (const f of sorted) {
      const k = monthKey(f.createdAt)
      if (!monthSet.has(k)) monthSet.set(k, x(f.createdAt))
    }
    const months = [...monthSet.entries()].map(([k, px]) => ({ key: k, label: monthLabel(k), x: px }))
    // 感情（valence）の線: 月平均
    const buckets = new Map<string, Fragment[]>()
    for (const f of sorted) buckets.set(monthKey(f.createdAt), [...(buckets.get(monthKey(f.createdAt)) ?? []), f])
    const points = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, fs]) => {
        const v = fs.reduce((acc, f) => acc + f.emotion.valence, 0) / fs.length
        return { x: x(fs[0].createdAt), y: 120 - v * 70 }
      })
    const valencePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    return { bars, months, valencePath, minT, maxT }
  }, [fragments])

  void minT
  void maxT
  const hovered = hoverId ? fragments.find((f) => f.id === hoverId) : null

  return (
    <div className="space-y-3">
      <div>
        <p className="mono text-faint">FLOW — 記憶の流れ</p>
        <h2 className="mt-1 font-serif text-[19px] text-bone">8ヶ月の感情の川</h2>
        <p className="mt-1 text-[11.5px] text-muted">棒＝断片（高さ＝感情の強さ／色＝感情）。線＝月ごとの快-不快の平均。</p>
      </div>

      <div className="panel relative overflow-hidden rounded-2xl p-3">
        <svg viewBox="0 0 1000 260" className="w-full" style={{ height: 'min(46vh, 300px)' }}>
          <defs>
            {bars.slice(0, 120).map((b, i) => (
              <linearGradient key={i} id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={b.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={b.color2} stopOpacity="0.15" />
              </linearGradient>
            ))}
          </defs>
          {/* 月グリッド */}
          {months.map((m) => (
            <g key={m.key}>
              <line x1={m.x} y1={20} x2={m.x} y2={210} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 5" />
              <text x={m.x} y={232} fill="#5d6678" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                {m.label}
              </text>
            </g>
          ))}
          <line x1={30} y1={120} x2={970} y2={120} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" />

          {/* 断片のバー */}
          {bars.map((b, i) => (
            <g
              key={b.f.id}
              onMouseEnter={() => setHoverId(b.f.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onOpenFragment(b.f.id)}
              style={{ cursor: 'pointer' }}
            >
              <line
                x1={b.x}
                y1={210}
                x2={b.x}
                y2={210 - b.h}
                stroke={`url(#bar-${i})`}
                strokeWidth={hoverId === b.f.id ? 5 : b.arousal > 0.6 ? 3 : 2}
                strokeLinecap="round"
                opacity={hoverId && hoverId !== b.f.id ? 0.35 : 1}
              />
              <circle cx={b.x} cy={210 - b.h} r={hoverId === b.f.id ? 3.4 : 1.7} fill={b.color} opacity={hoverId && hoverId !== b.f.id ? 0.35 : 0.95} />
              <rect x={b.x - 5} y={0} width={10} height={250} fill="transparent" />
            </g>
          ))}

          {/* 感情の線 */}
          <path d={valencePath} fill="none" stroke="#f0b35c" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        </svg>

        {hovered && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-[320px] rounded-lg border border-hairline bg-ink-2/95 px-3 py-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="mono text-faint">{formatJP(hovered.createdAt)}</span>
              {(() => {
                const d = dominantEmotion(hovered.emotion)
                return d ? (
                  <span className="mono" style={{ color: EMOTION_META[d].color }}>
                    {EMOTION_META[d].label}
                  </span>
                ) : null
              })()}
            </div>
            <p className="mt-1 text-[12px] leading-snug text-bone">{hovered.text}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(EMOTION_META) as (keyof typeof EMOTION_META)[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] text-faint">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: EMOTION_META[k].color }} />
            {EMOTION_META[k].label}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-faint">
          <span className="inline-block h-[2px] w-4 rounded" style={{ background: hexA('#f0b35c', 0.9) }} />
          快-不快の平均
        </span>
      </div>
    </div>
  )
}
