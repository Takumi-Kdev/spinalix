import { useEffect, useMemo, useState } from 'react'
import { useSpinalix } from './store'
import { HomeView } from './views/HomeView'
import { GraphView } from './views/GraphView'
import { TimelineView } from './views/TimelineView'
import { StreamView } from './views/StreamView'
import { PurposeView } from './views/PurposeView'
import { SystemView } from './views/SystemView'
import { LandingView } from './views/LandingView'
import { CaptureSheet } from './components/CaptureSheet'
import { FragmentSheet } from './components/FragmentSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { SearchSheet } from './components/SearchSheet'
import { JudgeGuide } from './components/JudgeGuide'
import { EMOTION_KEYS, EMOTION_META } from './lib/emotion'
import type { EmotionKey } from './lib/types'

type View = 'home' | 'circuit' | 'flow' | 'stream' | 'purpose' | 'system'

const NAV: { id: View; label: string }[] = [
  { id: 'home', label: '今日' },
  { id: 'circuit', label: '回路' },
  { id: 'flow', label: '流れ' },
  { id: 'stream', label: '思考' },
  { id: 'purpose', label: '目的' },
  { id: 'system', label: '計測' },
]

function useHashRoute(): ['landing' | 'app'] {
  const [route, setRoute] = useState<'landing' | 'app'>(() => (window.location.hash.startsWith('#/app') ? 'app' : 'landing'))
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash.startsWith('#/app') ? 'app' : 'landing')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return [route]
}

export default function App() {
  const [route] = useHashRoute()
  if (route === 'landing') return <LandingView />
  return <AppShell />
}

function AppShell() {
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

  useEffect(() => {
    window.spinalix?.onQuickCapture(() => setCaptureOpen(true))
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => void pullFromServer(), 6000)
    return () => window.clearInterval(id)
  }, [pullFromServer])

  // ショートカット（プロツールの手触り）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === 'Escape') {
        setCaptureOpen(false)
        setSettingsOpen(false)
        setSearchOpen(false)
        setOpenFragment(null)
        return
      }
      if (typing) return
      if (e.key === 'n') setCaptureOpen(true)
      if (e.key === '/') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('aside input')
        if (input) input.focus()
        else setSearchOpen(true)
      }
      const idx = Number(e.key)
      if (idx >= 1 && idx <= NAV.length) setView(NAV[idx - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9)
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

  const searchHits = useMemo(() => (search.trim() ? filtered.slice(0, 8) : []), [filtered, search])

  if (!hydrated) {
    return (
      <div className="grid min-h-full place-items-center">
        <p className="tnum text-[11px] text-faint">SPINALIX</p>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-[1360px]">
        {/* ─── 左 rail（罫線と文字だけ） ─── */}
        <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-rule px-5 py-6 lg:flex">
          <a href="#/" className="flex items-baseline gap-2 text-bone">
            <span className="font-serif text-[19px]">Spinalix</span>
            <span className="seal text-[10px]">脊</span>
          </a>
          <p className="mt-1 text-[11px] text-faint">記憶が、あなたに話しかける。</p>

          <div className="relative mt-5 border-b border-rule pb-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="記憶を検索"
              className="w-full bg-transparent text-[12.5px] text-bone outline-none placeholder:text-faint"
            />
            {searchHits.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 border border-rule bg-ink-2 p-1">
                {searchHits.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setOpenFragment(f.id)
                      setSearch('')
                    }}
                    className="block w-full truncate px-2 py-1.5 text-left text-[12px] text-muted transition hover:bg-white/[0.04] hover:text-bone"
                  >
                    {f.text.slice(0, 30)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="mt-5 space-y-0.5">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex w-full items-center justify-between border-l-[1.5px] py-1.5 pl-3 text-[13px] transition ${
                  view === n.id ? 'border-shu text-bone' : 'border-transparent text-muted hover:text-bone'
                }`}
              >
                {n.label}
                {n.id === 'stream' && thoughts.filter((t) => t.status === 'new').length > 0 && (
                  <span className="tnum text-[10.5px] text-shu">{thoughts.filter((t) => t.status === 'new').length}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-rule pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted">自立思考</span>
              <button
                onClick={() => setAutonomous(!autonomous)}
                aria-label="自立思考モード"
                className="flex items-center gap-2"
              >
                <span className={`h-[1px] w-6 ${autonomous ? 'bg-shu' : 'bg-rule'}`} />
                <span className={`tnum text-[10.5px] ${autonomous ? 'text-shu' : 'text-faint'}`}>{autonomous ? '入' : '切'}</span>
              </button>
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-faint">
              {autonomous ? '24秒ごとに、記憶を歩いて考えます' : '手動（深く考える）で動きます'}
            </p>
            <button
              onClick={() => void deepThink(5)}
              disabled={thinking}
              className="mt-2 text-[11.5px] text-shu underline-offset-4 transition hover:underline disabled:opacity-40"
            >
              {thinking ? '考えています…' : '深く考える（5サイクル）'}
            </button>
            <p className="mt-1 text-[10.5px] text-faint">文体: {api.enabled && api.apiKey ? `AI（${api.provider}）・検証あり` : 'ローカル'}</p>
          </div>

          <div className="mt-5">
            <p className="text-[10.5px] text-faint">感情で絞る</p>
            <div className="mt-1.5 space-y-0.5">
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
                    className={`flex w-full items-center gap-2 py-0.5 text-left text-[12px] transition ${
                      on ? 'text-bone' : 'text-muted hover:text-bone'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMOTION_META[k].color }} />
                    {EMOTION_META[k].label}
                    {on && <span className="tnum ml-auto text-[10px] text-shu">選択</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 flex-1 overflow-y-auto">
            <p className="text-[10.5px] text-faint">テーマ</p>
            <div className="mt-1.5 space-y-0.5">
              {themes.map(([t, n]) => (
                <button
                  key={t}
                  onClick={() => setThemeFilter(themeFilter === t ? null : t)}
                  className={`flex w-full items-center justify-between py-0.5 text-[12px] transition ${
                    themeFilter === t ? 'text-bone' : 'text-muted hover:text-bone'
                  }`}
                >
                  {t}
                  <span className="tnum text-[10px] text-faint">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-rule pt-3">
            <button onClick={() => setSettingsOpen(true)} className="text-[12px] text-muted transition hover:text-bone">
              設定・接続・取り込み
            </button>
            <p className="tnum mt-1 text-[10px] text-faint">
              {fragments.length} fragments / {thoughts.length} thoughts
            </p>
            <p className="mt-2 text-[10px] text-faint">n 記憶する ・ 1–6 切替 ・ / 検索</p>
            <button
              onClick={() => window.dispatchEvent(new Event('spinalix-guide'))}
              className="mt-2 text-[10px] text-faint underline-offset-4 transition hover:text-bone hover:underline"
            >
              English guide
            </button>
          </div>
        </aside>

        {/* ─── 本文 ─── */}
        <main className="min-h-screen w-full px-5 pb-28 pt-5 lg:px-10 lg:pb-16 lg:pt-8">
          <header className="mb-5 flex items-center justify-between lg:hidden">
            <a href="#/" className="flex items-baseline gap-2 text-bone">
              <span className="font-serif text-[17px]">Spinalix</span>
              <span className="seal text-[9px]">脊</span>
            </a>
            <div className="flex items-center gap-4 text-[12px] text-muted">
              <button onClick={() => setSearchOpen(true)}>検索</button>
              <button onClick={() => setSettingsOpen(true)}>設定</button>
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
            <GraphView fragments={filtered} activePath={pending?.path ?? []} onOpenFragment={setOpenFragment} allCount={fragments.length} />
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
          {view === 'system' && <SystemView onOpenFragment={setOpenFragment} />}
        </main>
      </div>

      <button
        onClick={() => setCaptureOpen(true)}
        className="fixed bottom-24 right-4 z-30 rounded-[6px] bg-shu px-4 py-3 text-[13px] font-bold text-paper transition active:translate-y-px lg:bottom-10 lg:right-10"
        aria-label="記憶する"
      >
        記憶する
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-ink/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex-1 border-b-[1.5px] py-2 text-[11.5px] transition ${
                view === n.id ? 'border-shu text-bone' : 'border-transparent text-faint'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      <JudgeGuide />
      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <FragmentSheet fragmentId={openFragment} onClose={() => setOpenFragment(null)} onJump={setOpenFragment} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} onOpenFragment={setOpenFragment} />
    </div>
  )
}
