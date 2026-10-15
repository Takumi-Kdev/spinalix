import { useEffect, useRef, useState } from 'react'
import { useSpinalix } from '../store'
import { EMOTION_KEYS, EMOTION_META } from '../lib/emotion'
import type { EmotionKey, EmotionVector } from '../lib/types'

const EXAMPLES = [
  '今日、空がきれいで、少し立ち止まった。',
  '締め切りのことを考えると、胃が痛い。',
  '友達と話していて、自分のやりたいことが少し見えた気がした。',
]

export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addFragment = useSpinalix((s) => s.addFragment)
  const [text, setText] = useState('')
  const [emotion, setEmotion] = useState<EmotionKey | null>(null)
  const [intensity, setIntensity] = useState(3)
  const [saved, setSaved] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setText('')
      setEmotion(null)
      setIntensity(3)
      setSaved(false)
      window.setTimeout(() => areaRef.current?.focus(), 120)
    }
  }, [open])

  if (!open) return null

  const save = () => {
    if (!text.trim()) return
    let manual: EmotionVector | undefined
    if (emotion) {
      const base = EMOTION_META[emotion]
      manual = {
        valence: base.valence * (0.4 + intensity * 0.15),
        arousal: base.arousal,
        intensities: { [emotion]: Math.min(1, intensity * 0.22) } as Partial<Record<EmotionKey, number>>,
      }
    }
    addFragment(text, manual)
    setSaved(true)
    window.setTimeout(onClose, 720)
  }

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl border border-hairline bg-ink-2 px-5 pb-8 pt-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

        {saved ? (
          <div className="py-10 text-center">
            <p className="text-amber-soft">記憶しました。</p>
            <p className="mt-1 text-[12px] text-faint">回路が、静かに組み替えられています。</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] tracking-[0.28em] text-faint">CAPTURE — 5秒で残す</p>
            <textarea
              ref={areaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="今の気持ちを、ひとことで。"
              className="mt-3 w-full resize-none rounded-2xl border border-hairline bg-white/[0.03] px-4 py-3 text-[15px] leading-relaxed text-bone outline-none placeholder:text-faint focus:border-amber/50"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="rounded-full border border-hairline px-3 py-1 text-[11px] text-faint transition hover:border-white/20 hover:text-muted"
                >
                  {ex.slice(0, 14)}…
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] tracking-[0.28em] text-faint">いまの感情（なくてもいい）</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOTION_KEYS.map((k) => {
                const m = EMOTION_META[k]
                const active = emotion === k
                return (
                  <button
                    key={k}
                    onClick={() => setEmotion(active ? null : k)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition ${
                      active ? 'border-transparent text-ink' : 'border-hairline text-muted hover:text-bone'
                    }`}
                    style={active ? { background: m.color } : undefined}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? 'rgba(0,0,0,0.5)' : m.color }} />
                    {m.label}
                  </button>
                )
              })}
            </div>

            {emotion && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[11px] text-faint">強さ</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="h-1 flex-1 appearance-none rounded-full bg-white/15 accent-[#f0b35c]"
                />
                <span className="tabular text-[12px] text-amber">{intensity}</span>
              </div>
            )}

            <button
              onClick={save}
              disabled={!text.trim()}
              className="mt-6 w-full rounded-xl bg-gradient-to-b from-amber-soft to-amber px-4 py-3 text-[14px] font-bold text-[#241a08] transition active:scale-[0.99] disabled:opacity-40"
            >
              記憶する
            </button>
          </>
        )}
      </div>
    </div>
  )
}
