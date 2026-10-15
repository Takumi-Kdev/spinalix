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
    window.setTimeout(onClose, 700)
  }

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg border-t border-rule bg-ink-2 px-5 pb-8 pt-5">
        {saved ? (
          <div className="py-10 text-center">
            <p className="font-serif text-[15px] text-bone">記憶しました。</p>
            <p className="mt-1 text-[11.5px] text-faint">回路が、静かに組み替えられています。</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] text-muted">記憶する</p>
              <p className="text-[11px] text-faint">5秒で残す。整理は要りません。</p>
            </div>

            {/* 便箋に書く */}
            <div className="letter mt-3 px-4 pb-3 pt-3">
              <textarea
                ref={areaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="今の気持ちを、ひとことで。"
                className="w-full resize-none bg-transparent font-serif text-[15.5px] leading-[1.95] text-sumi outline-none placeholder:text-[#a49a86]"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 letter-rule">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => setText(ex)} className="text-left text-[11px] text-[#6f6656] underline-offset-4 transition hover:underline">
                    {ex.slice(0, 16)}…
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] text-faint">いまの感情（なくてもいい）</p>
              <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-1.5">
                {EMOTION_KEYS.map((k) => {
                  const active = emotion === k
                  return (
                    <button
                      key={k}
                      onClick={() => setEmotion(active ? null : k)}
                      className={`flex items-center gap-2 py-0.5 text-left text-[12px] transition ${active ? 'text-bone' : 'text-muted hover:text-bone'}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMOTION_META[k].color }} />
                      {EMOTION_META[k].label}
                      {active && <span className="tnum ml-auto text-[10px] text-shu">{intensity}</span>}
                    </button>
                  )
                })}
              </div>
              {emotion && (
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="mt-2 h-[2px] w-full appearance-none bg-rule"
                />
              )}
            </div>

            <div className="mt-5 flex items-center gap-5">
              <button
                onClick={save}
                disabled={!text.trim()}
                className="rounded-[6px] bg-shu px-5 py-2.5 text-[13.5px] font-bold text-paper transition active:translate-y-px disabled:opacity-40"
              >
                記憶する
              </button>
              <button onClick={onClose} className="text-[12.5px] text-muted underline-offset-4 transition hover:text-bone hover:underline">
                やめる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
