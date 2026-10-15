import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSpinalix } from './store'
import { HomeView } from './views/HomeView'
import { GraphView } from './views/GraphView'
import { TimelineView } from './views/TimelineView'
import { StreamView } from './views/StreamView'
import { PurposeView } from './views/PurposeView'
import { CaptureSheet } from './components/CaptureSheet'
import { FragmentSheet } from './components/FragmentSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { SearchSheet } from './components/SearchSheet'
import { EMOTION_KEYS, EMOTION_META } from './lib/emotion'
import type { EmotionKey } from './lib/types'
import { emotionTheme } from './lib/design'

type View = 'home' | 'circuit' | 'flow' | 'stream' | 'purpose'

const Icons = {
  home: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 11l8-7 8 7v9H4z" strokeLinejoin="round" />
    </svg>
  ),
  circuit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="9" r="2.2" />
      <circle cx="10" cy="17.5" r="2.2" />
      <path d="M7.7 8.6l8.2-.7M7.4 9.1l1.9 6.3M16.5 10.6l-5 5.3" />
    </svg>
  ),
  flow: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 17c3 0 3-8 6-8s3 5 6 5 3-7 6-7" strokeLinecap="round" />
    </svg>
  ),
  stream: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 7h16M4 12h10M4 17h13" strokeLinecap="round" />
    </svg>
  ),
  purpose: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  ),
}

const NAV: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'ホーム', icon: <Icons.home /> },
  { id: 'circuit', label: '回路', icon: <Icons.circuit /> },
  { id: 'flow', label: '流れ', icon: <Icons.flow /> },
  { id: 'stream', label: '思考', icon: <Icons.stream /> },
  { id: 'purpose', label: '目的', icon: <Icons.purpose /> },
]

export default function App() {
  const hydrate = useSpinalix((s) => s.hydrate)
  const hydrated = useSpinalix((s) => s.hydrated)
  const fragments = useSpinalix((s) => s.fragments)
  const thoughts = useSpinalix((s) => s.thoughts)
  const autonomous = useSpinalix((s) => s.autonomous)
  const thinking = useSpinalix((s) => s.thinking)
  const setAutonomous = useSpinalix((s) => s.setAutonomous)
  const runCycle = useSpinalix((s) => s.runCycle)
  const deepThink = useSpinalix((s) => s.deepThink)
  const pullFromServer = useSpinalix((s) => s.pullFromServer)
  const api = useSpinalix((s) => s.api)

  const [view, setView] = useState<View>('home')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [openFragment, setOpenFragment] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [emotionFilter, setEmotionFilter] = useState<Set<EmotionKey>>(new Set())
  const [themeFilter, setThemeFilter] = useState<string | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // デスクトップアプリ: グローバルショートカット（⌥Space）で「記憶する」が開く
  useEffect(() => {
    window.spinalix?.onQuickCapture(() => setCaptureOpen(true))
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => void pullFromServer(), 6000)
    return () => window.clearInterval(id)
  }, [pullFromServer])

  // 自立思考モード: アプリが開いている間、定期的に「考える」
  useEffect(() => {
    if (!autonomous) return
    const id = window.setInterval(() => {
      if (!document.hidden) void runCycle()
    }, 24000)
    return () => window.clearInterval(id)
  }, [autonomous, runCycle])

  const pending = useMemo(() => thoughts.find((t) => t.status === 'new') ?? null, [thoughts])
  const themes = useMemo(() => {
    const tally = new Map<string, number>()
    for (const f of fragments) for (const t of f.themes) tally.set(t, (tally.get(t) ?? 0) + 1)
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([t]) => t)
  }, [fragments])

  const filtered = useMemo(() => {
    const q = search.trim()
    return fragments.filter((f) => {
      if (emotionFilter.size > 0) {
        const dom = EMOTION_KEYS.find((k) => (f.emotion.intensities[k] ?? 0) > 0.25)
        if (!dom || !emotionFilter.has(dom)) return false
      }
      if (themeFilter && !f.themes.includes(themeFilter)) return false
      if (q && !f.text.includes(q)) return false
      return true
    })
  }, [fragments, search, emotionFilter, themeFilter])

  if (!hydrated) {
    return (
      <div className="grid-bg grid min-h-full place-items-center">
        <p className="mono animate-pulse text-faint">SPINALIX</p>
      </div>
    )
  }

  return (
    <div className="grid-bg vignette min-h-full">
      <div className="relative z-10 mx-auto flex max-w-[1400px]">
        {/* ── サイドバー（デスクトップ）────────────── */}
        <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r border-hairline px-4 py-5 lg:flex">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif text-[20px] tracking-wide text-bone">Spinalix</h1>
            <span className="mono text-amber/80">β</span>
          </div>
          <p className="mt-0.5 text-[11px] text-faint">記憶が、あなたに話しかける。</p>

          <div className="relative mt-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="記憶を検索…"
              className="w-full rounded-lg border border-hairline bg-white/[0.03] px-3 py-2 text-[12.5px] text-bone outline-none placeholder:text-faint focus:border-amber/40"
            />
            {search.trim() && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-hairline bg-ink-2 p-1 shadow-2xl">
                {filtered.slice(0, 8).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setOpenFragment(f.id)
                      setSearch('')
                    }}
                    className="block w-full truncate rounded-md px-2.5 py-2 text-left text-[12px] text-muted transition hover:bg-white/5 hover:text-bone"
                  >
                    <span className="mono mr-2 text-faint">{f.createdAt.slice(5, 10).replace('-', '/')}</span>
                    {f.text.slice(0, 34)}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-2 text-[12px] text-faint">見つかりません</p>}
              </div>
            )}
          </div>

          <nav className="mt-5 space-y-0.5">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition ${
                  view === n.id ? 'bg-white/[0.06] text-bone' : 'text-muted hover:bg-white/[0.03] hover:text-bone'
                }`}
              >
                <span className={view === n.id ? 'text-amber' : 'text-faint'}>{n.icon}</span>
                {n.label}
                {n.id === 'stream' && thoughts.filter((t) => t.status === 'new').length > 0 && (
                  <span className="ml-auto rounded-full bg-amber/15 px-1.5 py-0.5 text-[10px] text-amber">
                    {thoughts.filter((t) => t.status === 'new').length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-xl border border-hairline bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="mono text-faint">自立思考</span>
              <button
                onClick={() => setAutonomous(!autonomous)}
                className={`relative h-4.5 w-8 rounded-full transition ${autonomous ? 'bg-amber/80' : 'bg-white/10'}`}
                style={{ height: 18, width: 34 }}
                aria-label="自立思考モード"
              >
                <span
                  className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-ink transition-all ${autonomous ? 'left-[17px]' : 'left-0.5'}`}
                />
              </button>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">
              {autonomous ? 'オンの間、24秒ごとに記憶を歩いて考えます' : 'オフ（手動で考えさせる）'}
            </p>
            <button
              onClick={() => void deepThink(5)}
              disabled={thinking}
              className="mt-2 w-full rounded-lg border border-amber/35 px-3 py-1.5 text-[11.5px] text-amber transition hover:bg-amber/10 disabled:opacity-40"
            >
              {thinking ? '思考中…' : '深く考える（5サイクル）'}
            </button>
            <p className="mt-1.5 text-[10px] text-faint">
              文体: {api.enabled && api.apiKey ? `AI（${api.provider}）` : 'ローカル'}
            </p>
          </div>

          <div className="mt-4">
            <p className="mono text-faint">EMOTION FILTER</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EMOTION_KEYS.map((k) => {
                const on = emotionFilter.has(k)
                return (
                  <button
                    key={k}
                    onClick={() => {
                      const next = new Set(emotionFilter)
                      if (on) next.delete(k)
                      else next.add(k)
                      setEmotionFilter(next)
                    }}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] transition ${
                      on ? 'border-transparent text-ink' : 'border-hairline text-muted hover:text-bone'
                    }`}
                    style={on ? { background: EMOTION_META[k].color } : undefined}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? 'rgba(0,0,0,0.4)' : EMOTION_META[k].color }} />
                    {EMOTION_META[k].label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            <p className="mono text-faint">THEMES</p>
            <div className="mt-2 space-y-0.5">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setThemeFilter(themeFilter === t ? null : t)}
                  className={`block w-full rounded-md px-2 py-1 text-left text-[12px] transition ${
                    themeFilter === t ? 'bg-white/[0.06] text-bone' : 'text-muted hover:text-bone'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="hairline-t mt-3 pt-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-[12px] text-muted transition hover:bg-white/[0.03] hover:text-bone"
            >
              <span>設定・接続・取り込み</span>
              <span className="text-faint">⋯</span>
            </button>
            <p className="mt-1 px-2 text-[10px] text-faint">
              {fragments.length}断片・{thoughts.length}想起
            </p>
          </div>
        </aside>

        {/* ── メイン ───────────────────────────── */}
        <main className="min-h-screen w-full px-4 pb-28 pt-4 lg:px-8 lg:pt-6 lg:pb-12">
          {/* モバイルバー */}
          <header className="mb-4 flex items-center justify-between lg:hidden">
            <div className="flex items-baseline gap-2">
              <h1 className="font-serif text-[18px] text-bone">Spinalix</h1>
              <span className="mono text-amber/80">β</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-[13px] text-faint"
                aria-label="検索"
              >
                ⌕
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-[13px] text-faint"
                aria-label="設定"
              >
                ⋯
              </button>
            </div>
          </header>

          {view === 'home' && (
            <HomeView
              pending={pending}
              onOpenFragment={setOpenFragment}
              onCapture={() => setCaptureOpen(true)}
              onDeepThink={() => void deepThink(5)}
              thinking={thinking}
              filteredCount={filtered.length}
              totalFragments={fragments.length}
              thoughtsCount={thoughts.length}
            />
          )}
          {view === 'circuit' && (
            <GraphView
              fragments={filtered}
              activePath={pending?.path ?? []}
              onOpenFragment={setOpenFragment}
              allCount={fragments.length}
            />
          )}
          {view === 'flow' && <TimelineView fragments={filtered} onOpenFragment={setOpenFragment} />}
          {view === 'stream' && (
            <StreamView
              autonomous={autonomous}
              onToggleAutonomous={() => setAutonomous(!autonomous)}
              onOpenFragment={setOpenFragment}
              onDecide={(id, accept) => useSpinalix.getState().decide(id, accept)}
            />
          )}
          {view === 'purpose' && <PurposeView onOpenFragment={setOpenFragment} />}
        </main>
      </div>

      {/* キャプチャFAB */}
      <button
        onClick={() => setCaptureOpen(true)}
        className="fixed bottom-20 right-5 z-30 grid h-13 w-13 place-items-center rounded-full bg-gradient-to-b from-amber-soft to-amber text-2xl font-bold text-[#241a08] shadow-[0_16px_36px_-14px_rgba(240,179,92,0.8)] transition active:scale-95 lg:bottom-8 lg:right-8"
        style={{ height: 54, width: 54 }}
        aria-label="記憶する"
      >
        +
      </button>

      {/* モバイルナビ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ink/90 backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-0.5 text-[10px] transition ${
                view === n.id ? 'text-amber' : 'text-faint'
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <FragmentSheet fragmentId={openFragment} onClose={() => setOpenFragment(null)} onJump={setOpenFragment} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} onOpenFragment={setOpenFragment} />
    </div>
  )
}
