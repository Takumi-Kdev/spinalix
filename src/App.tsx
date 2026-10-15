import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSpinalix } from './store'
import { HomeView } from './components/HomeView'
import { BrainGraph } from './components/BrainGraph'
import { PurposeView } from './components/PurposeView'
import { CaptureSheet } from './components/CaptureSheet'
import { FragmentSheet } from './components/FragmentSheet'
import { SettingsSheet } from './components/SettingsSheet'

type Tab = 'home' | 'graph' | 'purpose'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  { id: 'graph', label: '回路', icon: <GraphIcon /> },
  { id: 'purpose', label: '目的', icon: <PurposeIcon /> },
]

export default function App() {
  const hydrate = useSpinalix((s) => s.hydrate)
  const hydrated = useSpinalix((s) => s.hydrated)
  const thoughts = useSpinalix((s) => s.thoughts)
  const pullFromServer = useSpinalix((s) => s.pullFromServer)
  const [tab, setTab] = useState<Tab>('home')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openFragment, setOpenFragment] = useState<string | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Mac常駐の脳がいる場合は、他の端末からの更新を取り込む
  useEffect(() => {
    const id = window.setInterval(() => {
      void pullFromServer()
    }, 6000)
    return () => window.clearInterval(id)
  }, [pullFromServer])

  const pending = [...thoughts].reverse().find((t) => t.status === 'new')

  if (!hydrated) {
    return (
      <div className="grid min-h-full place-items-center">
        <p className="animate-pulse text-[12px] tracking-[0.3em] text-faint">SPINALIX</p>
      </div>
    )
  }

  return (
    <div className="grain min-h-full">
      <div className="mx-auto max-w-lg px-4 pb-32 pt-5">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[19px] tracking-wide text-bone">
              Spinalix
              <span className="ml-2 align-middle text-[11px] tracking-[0.24em] text-amber/80">BETA</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-faint">記憶が、あなたに話しかける。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-[13px] text-faint transition hover:text-bone"
              aria-label="設定"
            >
              ⋯
            </button>
            <button
              onClick={() => setCaptureOpen(true)}
              className="rounded-full border border-amber/40 px-3.5 py-1.5 text-[12px] text-amber transition hover:bg-amber/10"
            >
              + 記憶する
            </button>
          </div>
        </header>

        {tab === 'home' && <HomeView onOpenFragment={setOpenFragment} onCapture={() => setCaptureOpen(true)} />}
        {tab === 'graph' && <BrainGraph onOpenFragment={setOpenFragment} activeIds={pending?.from} />}
        {tab === 'purpose' && <PurposeView onOpenFragment={setOpenFragment} />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ink/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-6 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10.5px] transition ${
                tab === t.id ? 'text-amber' : 'text-faint hover:text-muted'
              }`}
            >
              <span className={tab === t.id ? 'drop-shadow-[0_0_8px_rgba(240,179,92,0.6)]' : ''}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <FragmentSheet fragmentId={openFragment} onClose={() => setOpenFragment(null)} onJump={setOpenFragment} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 11l8-7 8 7v9H4z" strokeLinejoin="round" />
    </svg>
  )
}

function GraphIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="9" r="2.2" />
      <circle cx="10" cy="17.5" r="2.2" />
      <path d="M7.7 8.6l8.2-.7M7.4 9.1l1.9 6.3M16.5 10.6l-5 5.3" />
    </svg>
  )
}

function PurposeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  )
}
