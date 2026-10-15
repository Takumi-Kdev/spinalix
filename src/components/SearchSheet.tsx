import { useMemo, useState } from 'react'
import { useSpinalix } from '../store'
import { formatJP } from '../lib/dates'
import { emotionColor } from '../lib/design'

/** モバイル用の検索シート */
export function SearchSheet({
  open,
  onClose,
  onOpenFragment,
}: {
  open: boolean
  onClose: () => void
  onOpenFragment: (id: string) => void
}) {
  const fragments = useSpinalix((s) => s.fragments)
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const query = q.trim()
    const sorted = [...fragments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (!query) return sorted.slice(0, 30)
    return sorted.filter((f) => f.text.includes(query) || f.themes.some((t) => t.includes(query))).slice(0, 40)
  }, [fragments, q])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[86vh] max-w-lg flex-col border-t border-rule bg-ink-2 px-4 pb-6 pt-4">
        
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="記憶を検索…"
          autoFocus
          className="w-full rounded-lg border border-hairline bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-bone outline-none placeholder:text-faint focus:border-amber/40"
        />
        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
          {results.map((f) => {
            const color = emotionColor(f)
            return (
              <button
                key={f.id}
                onClick={() => {
                  onOpenFragment(f.id)
                  onClose()
                }}
                className="flex w-full items-start gap-3 border-b border-rule py-2.5 text-left transition hover:bg-white/[0.02]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                <span>
                  <span className="mono text-faint">{formatJP(f.createdAt)}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{f.text.slice(0, 52)}</span>
                </span>
              </button>
            )
          })}
          {results.length === 0 && <p className="py-8 text-center text-[12px] text-faint">見つかりません</p>}
        </div>
      </div>
    </div>
  )
}
