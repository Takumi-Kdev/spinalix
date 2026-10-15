import { useMemo } from 'react'
import { useSpinalix } from '../store'
import { ThoughtCard } from '../components/ThoughtCard'

/** 思考 — 自立思考モードの記録（タイムラインとしての内省） */
export function StreamView({
  autonomous,
  onToggleAutonomous,
  onOpenFragment,
  onDecide,
}: {
  autonomous: boolean
  onToggleAutonomous: () => void
  onOpenFragment: (id: string) => void
  onDecide: (id: string, accept: boolean) => void
}) {
  const thoughts = useSpinalix((s) => s.thoughts)
  const thinking = useSpinalix((s) => s.thinking)
  const deepThink = useSpinalix((s) => s.deepThink)
  const api = useSpinalix((s) => s.api)

  const stream = useMemo(() => [...thoughts].reverse(), [thoughts])
  const pending = stream.filter((t) => t.status === 'new')
  const adopted = stream.filter((t) => t.status === 'adopted').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11.5px] text-faint">思考</p>
          <h2 className="mt-1 font-serif text-[20px] text-bone">この脳は、あなた不在でも考えている</h2>
          <p className="mt-1 text-[11.5px] text-muted">
            未処理 {pending.length} 件・定着 {adopted} 件・
            {api.enabled && api.apiKey ? 'AI文体モード' : 'ローカル思考モード'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleAutonomous} className={`text-[12.5px] underline-offset-4 transition hover:underline ${autonomous ? 'text-shu' : 'text-muted'}`}>
            自立思考 {autonomous ? 'オン' : 'オフ'}
          </button>
          <button onClick={() => void deepThink(5)} disabled={thinking} className="text-[12.5px] text-shu underline-offset-4 transition hover:underline disabled:opacity-40">
            {thinking ? '考えている…' : '深く考える（5）'}
          </button>
        </div>
      </div>

      {thinking && (
        <div className="flex items-center gap-3 border-y border-rule px-1 py-3">
          <svg width="15" height="15" viewBox="0 0 24 24" className="thinking-orbit text-shu">
            <circle cx="12" cy="6" r="2" fill="currentColor" />
            <circle cx="18" cy="12" r="1.4" fill="currentColor" opacity="0.6" />
            <circle cx="6" cy="12" r="1.4" fill="currentColor" opacity="0.6" />
          </svg>
          <p className="text-[12.5px] text-muted">記憶の回路を歩いています。活性化 → 拡散 → 跳躍 → 検証</p>
        </div>
      )}

      {stream.length === 0 && (
        <div className="border border-rule px-5 py-10 text-center">
          <p className="text-[13px] text-muted">まだ思考がありません。</p>
          <p className="mt-1 text-[11.5px] text-faint">「深く考える」を押すか、自立思考モードをオンにしてください。</p>
        </div>
      )}

      <div className="space-y-4">
        {stream.map((t) => (
          <div key={t.id} className={t.status !== 'new' ? 'opacity-80' : ''}>
            <ThoughtCard
              thought={t}
              onOpenSource={onOpenFragment}
              onDecide={t.status === 'new' ? (accept) => onDecide(t.id, accept) : undefined}
            />
            {t.status !== 'new' && (
              <p className="mt-1.5 pl-1 text-[11px] text-faint">
                {t.status === 'adopted' ? '定着しました — 記憶回路に組み込まれています' : '手放しました — この組み合わせは再提示されません'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
