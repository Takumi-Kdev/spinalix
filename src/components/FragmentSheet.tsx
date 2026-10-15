import { useSpinalix } from '../store'
import { EMOTION_KEYS, EMOTION_META, dominantEmotion } from '../lib/emotion'
import { formatJPFull } from '../lib/dates'
import { shortQuote } from '../lib/text'
import type { LinkKind } from '../lib/types'

const LINK_LABEL: Record<LinkKind, string> = {
  recall: '自己引用',
  tension: '矛盾',
  echo: '反響',
  similar: '近い記憶',
  theme: '同じテーマ',
  person: '同じ人の記憶',
}

const LINK_COLOR: Record<LinkKind, string> = {
  recall: '#f0b35c',
  tension: '#f07b6a',
  echo: '#7fd1ae',
  similar: '#8d96a8',
  theme: '#6b7d9e',
  person: '#8fb8e8',
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
      <button aria-label="閉じる" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[86vh] max-w-lg overflow-y-auto rounded-t-3xl border border-hairline bg-ink-2 px-5 pb-8 pt-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.2em] text-faint">{formatJPFull(f.createdAt)}</p>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: dom ? EMOTION_META[dom].color : '#9aa3b2' }} />
            {dom ? EMOTION_META[dom].label : '凪'}
          </span>
        </div>

        <p className="mt-4 font-serif text-[16.5px] leading-[1.95] text-bone">{f.text}</p>

        {f.source === 'machine' && (
          <p className="mt-3 rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-[11.5px] text-amber-soft">
            SPINALIXが生んだ想起です。あなたが「これは私だ」と定着させました。
          </p>
        )}

        {(f.people.length > 0 || f.themes.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {f.themes.map((t) => (
              <span key={t} className="rounded-full border border-hairline px-2.5 py-0.5 text-[11px] text-muted">
                {t}
              </span>
            ))}
            {f.people.map((p) => (
              <span key={p} className="rounded-full border border-sky/20 px-2.5 py-0.5 text-[11px] text-sky">
                {p}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-1.5">
          {EMOTION_KEYS.filter((k) => (f.emotion.intensities[k] ?? 0) > 0.03).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-14 text-[11px] text-faint">{EMOTION_META[k].label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${((f.emotion.intensities[k] ?? 0) / max) * 100}%`, background: EMOTION_META[k].color }}
                />
              </div>
            </div>
          ))}
        </div>

        {related.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] tracking-[0.24em] text-faint">つながっている記憶</p>
            <div className="mt-3 space-y-2">
              {related.map(({ link, other }) => (
                <button
                  key={other.id}
                  onClick={() => onJump(other.id)}
                  className="w-full rounded-xl border border-hairline bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px]" style={{ color: LINK_COLOR[link.kind] }}>
                      {LINK_LABEL[link.kind]}
                      {link.reason ? `・${link.reason}` : ''}
                    </span>
                    <span className="text-[10.5px] text-faint">{formatJPFull(other.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{shortQuote(other.text, 64)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
