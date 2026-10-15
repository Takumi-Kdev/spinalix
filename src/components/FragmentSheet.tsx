import { useSpinalix } from '../store'
import { EMOTION_KEYS, EMOTION_META, dominantEmotion } from '../lib/emotion'
import { formatJPFull } from '../lib/dates'
import { emotionColor } from '../lib/design'
import type { LinkKind } from '../lib/types'

const LINK_LABEL: Record<LinkKind, string> = {
  recall: '自己引用',
  tension: '矛盾',
  echo: '反響',
  similar: '近い記憶',
  theme: '同じテーマ',
  person: '同じ人の記憶',
}

export function FragmentSheet({
  fragmentId,
  onClose,
  onJump,
}: {
  fragmentId: string | null
  onClose: () => void
  onJump: (id: string) => void
}) {
  const fragments = useSpinalix((s) => s.fragments)
  const links = useSpinalix((s) => s.links)
  if (!fragmentId) return null
  const f = fragments.find((x) => x.id === fragmentId)
  if (!f) return null

  const related = links
    .filter((l) => l.a === f.id || l.b === f.id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((l) => {
      const otherId = l.a === f.id ? l.b : l.a
      const other = fragments.find((x) => x.id === otherId)
      return other ? { link: l, other } : null
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  const dom = dominantEmotion(f.emotion)
  const max = Math.max(0.05, ...Object.values(f.emotion.intensities).map((v) => v ?? 0))

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-lg overflow-y-auto border-t border-rule bg-ink-2 px-5 pb-10 pt-5">
        <div className="flex items-baseline justify-between">
          <p className="tnum text-[11px] text-faint">{formatJPFull(f.createdAt)}</p>
          <span className="flex items-center gap-2 text-[11.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: emotionColor(f) }} />
            {dom ? EMOTION_META[dom].label : '凪'}
            {f.source === 'machine' && <span className="text-shu">機械の想起</span>}
          </span>
        </div>

        {/* 便箋として表示 */}
        <article className="letter mt-3 px-5 pb-5 pt-5">
          <p className="font-serif text-[15.5px] leading-[2] text-sumi">{f.text}</p>
        </article>

        {(f.people.length > 0 || f.themes.length > 0) && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
            {f.themes.length > 0 && <>テーマ {f.themes.join('・')}</>}
            {f.themes.length > 0 && f.people.length > 0 && '　'}
            {f.people.length > 0 && <>人 {f.people.join('・')}</>}
          </p>
        )}

        <section className="mt-5">
          <p className="text-[11px] text-faint">感情の構成</p>
          <div className="mt-2 space-y-1.5">
            {EMOTION_KEYS.filter((k) => (f.emotion.intensities[k] ?? 0) > 0.03).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-[11.5px] text-muted">{EMOTION_META[k].label}</span>
                <span className="h-[1px] flex-1 bg-rule">
                  <span
                    className="block h-[1px]"
                    style={{ width: `${((f.emotion.intensities[k] ?? 0) / max) * 100}%`, background: EMOTION_META[k].color }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-6">
            <p className="text-[11px] text-faint">つながっている記憶</p>
            <div className="mt-1 divide-y divide-rule border-y border-rule">
              {related.map(({ link, other }) => (
                <button key={other.id} onClick={() => onJump(other.id)} className="block w-full py-3 text-left transition hover:bg-white/[0.02]">
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-shu">{LINK_LABEL[link.kind]}</span>
                    <span className="tnum text-faint">{formatJPFull(other.createdAt)}</span>
                  </div>
                  <p className="mt-1 font-serif text-[13px] leading-relaxed text-muted">{other.text.slice(0, 64)}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
