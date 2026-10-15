import { useEffect, useState } from 'react'

const KEY = 'spinalix-guide-v1'

/** 審査員向けの英語ガイド（日本語UIの読み方を最初に1回だけ表示） */
export function JudgeGuide() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = () => setOpen(true)
    let seen = false
    try {
      seen = localStorage.getItem(KEY) === '1'
    } catch {
      seen = false
    }
    if (!seen) window.setTimeout(show, 900)
    window.addEventListener('spinalix-guide', show)
    return () => window.removeEventListener('spinalix-guide', show)
  }, [])

  if (!open) return null

  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto border border-rule bg-ink-2 px-6 pb-8 pt-6">
        <p className="text-[11px] text-faint">FOR JUDGES — 60-second guide（この画面は日本語です）</p>
        <h2 className="mt-2 font-serif text-[20px] leading-snug text-bone">
          Spinalix — a memory that speaks to you.
        </h2>
        <p className="mt-3 text-[13px] leading-[1.9] text-muted">
          A local-first thinking brain. Fragments (one line, with emotion) become a memory circuit, and the engine walks it to
          generate <span className="text-bone">involuntary recall</span> — with sources and a thinking trace. AI is only allowed
          to style; a verifier rejects anything not grounded in your memories.
        </p>

        <ol className="mt-5 space-y-3 text-[13px] leading-[1.85] text-muted">
          <li className="flex gap-3">
            <span className="tnum shrink-0 text-shu">1</span>
            <span>
              This is today&apos;s letter — a recall found in 8 months of memory. Click{' '}
              <span className="text-bone">「思考の足跡をひらく」(open the thinking trace)</span> to see the origin, the spreading,
              the leaps — and under <span className="text-bone">「解剖」(anatomy)</span>, the candidates it rejected.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="tnum shrink-0 text-shu">2</span>
            <span>
              <span className="text-bone">「これは私だ」(this is me)</span> keeps a recall and writes it into the circuit;{' '}
              <span className="text-bone">「ちがう」(not this)</span> dismisses it. The engine learns from your choices.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="tnum shrink-0 text-shu">3</span>
            <span>
              Left rail: <span className="text-bone">今日</span> home · <span className="text-bone">回路</span> circuit (drag &
              zoom; vermilion sparks trace the recall) · <span className="text-bone">流れ</span> flow (8 months of emotion) ·{' '}
              <span className="text-bone">思考</span> thoughts (autonomous mode; <span className="text-bone">「深く考える」</span>{' '}
              = think 5 cycles) · <span className="text-bone">目的</span> purpose (write a question → a crystallization with
              sources) · <span className="text-bone">計測</span> metrics.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="tnum shrink-0 text-shu">4</span>
            <span>
              <span className="text-bone">n</span> = capture · <span className="text-bone">1–6</span> = switch views ·{' '}
              <span className="text-bone">/</span> = search. Everything runs on-device: no account, no API keys, data never
              leaves the browser. The demo memory is an 8-month sample (fictional + the author&apos;s own fragments).
            </span>
          </li>
        </ol>

        <button
          onClick={close}
          className="mt-6 w-full rounded-[6px] bg-shu px-4 py-3 text-[13.5px] font-bold text-paper transition active:translate-y-px"
        >
          Start exploring（はじめる）
        </button>
        <p className="mt-3 text-center text-[10.5px] text-faint">
          You can reopen this from the bottom of the left rail:「English guide」
        </p>
      </div>
    </div>
  )
}
