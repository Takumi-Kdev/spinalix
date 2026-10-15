import { useMemo } from 'react'
import { useSpinalix } from '../store'
import { analyzeMemory } from '../lib/analysis'
import { activate } from '../lib/activation'
import { formatJP } from '../lib/dates'
import { EMOTION_META } from '../lib/emotion'
import { KIND_META } from '../components/ThoughtCard'
import type { LinkKind, ThoughtKind } from '../lib/types'

const LINK_LABEL: Record<LinkKind, string> = {
  recall: '自己引用',
  tension: '矛盾',
  echo: '反響',
  similar: '近さ',
  theme: 'テーマ',
  person: '人',
}

/** 計測 — この記憶とエンジンの現在の状態を、数字だけで読む */
export function SystemView({ onOpenFragment }: { onOpenFragment: (id: string) => void }) {
  const fragments = useSpinalix((s) => s.fragments)
  const links = useSpinalix((s) => s.links)
  const thoughts = useSpinalix((s) => s.thoughts)
  const prefs = useSpinalix((s) => s.prefs)
  const syncMode = useSpinalix((s) => s.syncMode)
  const lan = useSpinalix((s) => s.lan)

  const stats = useMemo(() => {
    const byKind = new Map<LinkKind, number>()
    for (const l of links) byKind.set(l.kind, (byKind.get(l.kind) ?? 0) + 1)
    const thoughtKinds = new Map<ThoughtKind, number>()
    for (const t of thoughts) thoughtKinds.set(t.kind, (thoughtKinds.get(t.kind) ?? 0) + 1)
    const adopted = thoughts.filter((t) => t.status === 'adopted').length
    const decided = thoughts.filter((t) => t.status !== 'new').length
    const analysis = analyzeMemory(fragments)
    const activation = activate(fragments, links)
    const top = [...activation.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => ({ f: fragments.find((f) => f.id === id)!, v }))
      .filter((x) => x.f)
    const emotional = fragments.filter((f) => Math.max(...Object.values(f.emotion.intensities).map((v) => v ?? 0)) > 0.3).length
    return { byKind, thoughtKinds, adopted, decided, analysis, top, emotional }
  }, [fragments, links, thoughts])

  const maxLink = Math.max(1, ...stats.byKind.values())

  return (
    <div className="max-w-[860px] space-y-10">
      <header>
        <h2 className="font-serif text-[22px] text-bone">計測</h2>
        <p className="mt-1 text-[12px] text-faint">この記憶とエンジンの、いまの状態。数字はすべて実測です。</p>
      </header>

      {/* 数字（罫線と言葉だけで、メトリクスカードは作らない） */}
      <section className="grid grid-cols-2 gap-x-10 gap-y-6 border-y border-rule py-6 sm:grid-cols-4">
        <Measure label="断片" value={fragments.length} note={`うち感情が強いもの ${stats.emotional}`} />
        <Measure label="回路" value={links.length} note={`6種（下に内訳）`} />
        <Measure label="思考" value={thoughts.length} note={`定着 ${stats.adopted} / 決定済み ${stats.decided}`} />
        <Measure label="開いた輪" value={stats.analysis.openLoops.length} note="言ったのに、やっていないこと" />
      </section>

      {/* 回路の内訳 */}
      <section>
        <h3 className="text-[14px] text-bone">回路の内訳</h3>
        <div className="mt-3 space-y-2">
          {(Object.keys(LINK_LABEL) as LinkKind[]).map((k) => {
            const n = stats.byKind.get(k) ?? 0
            return (
              <div key={k} className="flex items-center gap-4">
                <span className="w-16 shrink-0 text-[12.5px] text-muted">{LINK_LABEL[k]}</span>
                <span className="h-[1px] flex-1 bg-rule">
                  <span className="block h-[1px] bg-bone" style={{ width: `${(n / maxLink) * 100}%` }} />
                </span>
                <span className="tnum w-10 shrink-0 text-right text-[12px] text-bone">{n}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 思考の内訳 */}
      <section>
        <h3 className="text-[14px] text-bone">思考の内訳</h3>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          {(Object.keys(KIND_META) as ThoughtKind[]).map((k) => (
            <div key={k} className="flex items-baseline gap-2">
              <span className="text-[12.5px] text-muted">{KIND_META[k].label}</span>
              <span className="tnum text-[13px] text-bone">{stats.thoughtKinds.get(k) ?? 0}</span>
              <span className="tnum text-[10.5px] text-faint">
                採{(prefs.adoptedKinds[k] ?? 0)} / 否{(prefs.rejectedKinds[k] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* テーマの弧 */}
      <section>
        <h3 className="text-[14px] text-bone">テーマの弧</h3>
        <p className="mt-1 text-[11.5px] text-faint">前半と後半の感情（快-不快）の変化。↗ 持ち直し / ↘ 沈み / → 横ばい。</p>
        <div className="mt-3 divide-y divide-rule border-y border-rule">
          {stats.analysis.themes.slice(0, 8).map((t) => (
            <div key={t.theme} className="flex items-baseline gap-4 py-2.5">
              <span className="w-20 shrink-0 text-[13px] text-bone">{t.theme}</span>
              <span className="tnum w-10 shrink-0 text-[12px] text-muted">{t.count}</span>
              <span className="text-[13px]" style={{ color: t.direction === 'rising' ? '#7d9a6f' : t.direction === 'falling' ? '#8b86ae' : '#9a9182' }}>
                {t.direction === 'rising' ? '↗' : t.direction === 'falling' ? '↘' : '→'}
              </span>
              <span className="tnum ml-auto text-[10.5px] text-faint">
                {formatJP(t.firstAt)} → {formatJP(t.lastAt)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* テーマの交差 */}
      {stats.analysis.themePairs.length > 0 && (
        <section>
          <h3 className="text-[14px] text-bone">テーマの交差</h3>
          <p className="mt-1 text-[11.5px] text-faint">同じ断片に一緒に現れるテーマ。切り離せない二つが見えます。</p>
          <div className="mt-3 divide-y divide-rule border-y border-rule">
            {stats.analysis.themePairs.slice(0, 6).map((p) => (
              <div key={`${p.a}-${p.b}`} className="flex items-baseline gap-4 py-2">
                <span className="text-[12.5px] text-bone">
                  {p.a} <span className="text-faint">×</span> {p.b}
                </span>
                <span className="tnum ml-auto text-[11px] text-muted">{p.count}回</span>
                <span className="tnum text-[10.5px] text-faint">最後 {formatJP(p.latest)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 開いた輪 */}
      {stats.analysis.openLoops.length > 0 && (
        <section>
          <h3 className="text-[14px] text-bone">開いた輪</h3>
          <div className="mt-3 divide-y divide-rule border-y border-rule">
            {stats.analysis.openLoops.slice(0, 6).map((l) => (
              <button key={l.theme} onClick={() => l.want[0] && onOpenFragment(l.want[l.want.length - 1].fragmentId)} className="block w-full py-3 text-left">
                <div className="flex items-baseline gap-4">
                  <span className="w-20 shrink-0 text-[13px] text-bone">{l.theme}</span>
                  <span className="tnum text-[11.5px] text-muted">
                    やりたい {l.want.length} / 行動 {l.actions.length}
                  </span>
                  <span className="tnum ml-auto text-[11px] text-shu">{l.monthsQuiet}ヶ月 開いたまま</span>
                </div>
                <p className="mt-1 truncate text-[12px] text-faint">「{l.want[l.want.length - 1].quote.slice(0, 52)}」</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 活性トップ */}
      <section>
        <h3 className="text-[14px] text-bone">いま、温まっている記憶</h3>
        <p className="mt-1 text-[11.5px] text-faint">活性化の上位10件。想起はここから歩き始めます。</p>
        <div className="mt-3 divide-y divide-rule border-y border-rule">
          {stats.top.map(({ f, v }) => (
            <button key={f.id} onClick={() => onOpenFragment(f.id)} className="flex w-full items-baseline gap-4 py-2.5 text-left">
              <span className="tnum w-10 shrink-0 text-right text-[12px]" style={{ color: EMOTION_META[dominantKey(f)]?.color ?? '#8c8478' }}>
                {v.toFixed(2)}
              </span>
              <span className="tnum w-14 shrink-0 text-[11px] text-faint">{formatJP(f.createdAt)}</span>
              <span className="truncate text-[12.5px] text-muted">{f.text.slice(0, 60)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* データ */}
      <section className="border-t border-rule pt-5">
        <h3 className="text-[14px] text-bone">データの場所</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          同期モード: {syncMode === 'brain' ? `Mac常駐（${lan ?? 'LAN'}）` : 'ブラウザ内（判定用モード）'}
          <br />
          記憶は1つのJSON（brain.json / localStorage）に保存され、外部に送信されません。設定から書き出せます。
        </p>
      </section>
    </div>
  )
}

function Measure({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div>
      <p className="tnum text-[26px] leading-none text-bone">{value}</p>
      <p className="mt-1.5 text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 text-[10.5px] text-faint">{note}</p>
    </div>
  )
}

function dominantKey(f: { emotion: { intensities: Record<string, number | undefined> } }): keyof typeof EMOTION_META {
  const entries = Object.entries(f.emotion.intensities).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  return (entries[0]?.[0] ?? 'fatigue') as keyof typeof EMOTION_META
}
