import { useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { useSpinalix } from '../store'
import type { Fragment, LinkKind } from '../lib/types'
import { EMOTION_META, dominantEmotion, intensityOf } from '../lib/emotion'

const LINK_STYLE: Record<LinkKind, { color: string; label: string; width: number }> = {
  recall: { color: '#f0b35c', label: '自己引用', width: 2.2 },
  tension: { color: '#f07b6a', label: '矛盾', width: 1.6 },
  echo: { color: '#7fd1ae', label: '反響', width: 1.4 },
  similar: { color: '#44536e', label: '近さ', width: 0.8 },
  theme: { color: '#2c3850', label: 'テーマ', width: 0.7 },
  person: { color: '#6e86c9', label: '人', width: 0.8 },
}

interface GNode extends SimulationNodeDatum {
  id: string
  r: number
  color: string
  fragment: Fragment
}

interface GLink extends SimulationLinkDatum<GNode> {
  kind: LinkKind
  weight: number
}

export function BrainGraph({
  onOpenFragment,
  activeIds,
}: {
  onOpenFragment: (id: string) => void
  activeIds?: string[]
}) {
  const fragments = useSpinalix((s) => s.fragments)
  const links = useSpinalix((s) => s.links)
  const [selected, setSelected] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Simulation<GNode, GLink> | null>(null)
  const nodesRef = useRef<GNode[]>([])
  const linksRef = useRef<GLink[]>([])
  const transformRef = useRef({ k: 1, x: 0, y: 0 })
  const sizeRef = useRef({ w: 600, h: 480 })
  const dragRef = useRef<{ active: boolean; moved: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false,
    moved: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  })

  const graph = useMemo(() => {
    const nodes: GNode[] = fragments.map((f) => {
      const dom = dominantEmotion(f.emotion)
      const maxI = Math.max(0.15, ...Object.values(f.emotion.intensities).map((v) => v ?? 0))
      return {
        id: f.id,
        r: 4.5 + maxI * 8,
        color: dom ? EMOTION_META[dom].color : '#7c8698',
        fragment: f,
      }
    })
    const idx = new Map(nodes.map((n) => [n.id, n]))
    const glinks: GLink[] = []
    for (const l of links) {
      const s = idx.get(l.a)
      const t = idx.get(l.b)
      if (s && t) glinks.push({ source: s, target: t, kind: l.kind, weight: l.weight })
    }
    return { nodes, glinks }
  }, [fragments, links])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      sizeRef.current = { w: rect.width, h: rect.height }
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const sim = forceSimulation<GNode>(graph.nodes)
      .force('link', forceLink<GNode, GLink>(graph.glinks).id((d) => d.id).distance((l) => 30 + (1 - l.weight) * 80).strength(0.42))
      .force('charge', forceManyBody().strength(-95))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<GNode>().radius((d) => d.r + 5))
      .alphaDecay(0.032)
    simRef.current = sim
    nodesRef.current = graph.nodes
    linksRef.current = graph.glinks

    let raf = 0
    const draw = (t: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { w, h } = sizeRef.current
      const { k, x, y } = transformRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2 + x, h / 2 + y)
      ctx.scale(k, k)

      const active = new Set(activeIds ?? [])
      const selectedSet = selected ? new Set([selected]) : new Set<string>()

      // リンク
      for (const l of linksRef.current) {
        const s = l.source as GNode
        const tg = l.target as GNode
        const st = LINK_STYLE[l.kind]
        const isActive = active.has(s.id) && active.has(tg.id)
        const alpha = l.kind === 'similar' || l.kind === 'theme' || l.kind === 'person' ? 0.35 : 0.75
        ctx.beginPath()
        ctx.moveTo(s.x ?? 0, s.y ?? 0)
        ctx.lineTo(tg.x ?? 0, tg.y ?? 0)
        if (isActive) {
          const pulse = 0.55 + 0.45 * Math.sin(t / 420)
          ctx.strokeStyle = st.color
          ctx.globalAlpha = pulse
          ctx.lineWidth = st.width + 0.8
          ctx.shadowColor = st.color
          ctx.shadowBlur = 12
        } else {
          ctx.strokeStyle = st.color
          ctx.globalAlpha = alpha * (l.weight * 0.6 + 0.4)
          ctx.lineWidth = st.width
          ctx.shadowBlur = 0
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      // ノード
      for (const n of nodesRef.current) {
        const isActive = active.has(n.id)
        const isSel = selectedSet.has(n.id)
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r + (isActive || isSel ? 2.5 : 0), 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = isActive || isSel ? 1 : 0.82
        if (isActive || isSel) {
          ctx.shadowColor = n.color
          ctx.shadowBlur = 18
        }
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        if (isSel) {
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, n.r + 6, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(236,231,220,0.6)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    const loop = (t: number) => {
      draw(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      sim.stop()
    }
  }, [graph, activeIds, selected])

  // ポインタ操作（パン / ズーム / 選択）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const { w, h } = sizeRef.current
      const { k, x, y } = transformRef.current
      const px = clientX - rect.left
      const py = clientY - rect.top
      return { wx: (px - w / 2 - x) / k, wy: (py - h / 2 - y) / k }
    }

    const onDown = (e: PointerEvent) => {
      dragRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: transformRef.current.x, oy: transformRef.current.y }
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d.active) return
      const dx = e.clientX - d.sx
      const dy = e.clientY - d.sy
      if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
      transformRef.current.x = d.ox + dx
      transformRef.current.y = d.oy + dy
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      d.active = false
      if (d.moved) return
      const { wx, wy } = toWorld(e.clientX, e.clientY)
      let hit: GNode | null = null
      let best = Infinity
      for (const n of nodesRef.current) {
        const dist = Math.hypot((n.x ?? 0) - wx, (n.y ?? 0) - wy)
        if (dist < n.r + 10 && dist < best) {
          best = dist
          hit = n
        }
      }
      setSelected(hit ? hit.id : null)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      transformRef.current.k = Math.max(0.4, Math.min(3, transformRef.current.k * factor))
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  const selectedFragment = selected ? fragments.find((f) => f.id === selected) : null
  const activeCount = activeIds?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-faint">CIRCUIT — 記憶回路</p>
          <h2 className="mt-1 font-serif text-[19px] text-bone">いま、{fragments.length}の断片が繋がっています</h2>
        </div>
        <button
          onClick={() => {
            transformRef.current = { k: 1, x: 0, y: 0 }
          }}
          className="rounded-full border border-hairline px-3 py-1 text-[11px] text-faint transition hover:text-bone"
        >
          中心へ
        </button>
      </div>

      <div
        ref={wrapRef}
        className="relative h-[430px] overflow-hidden rounded-3xl border border-hairline bg-[#0d1017]"
      >
        <canvas ref={canvasRef} className="h-full w-full touch-none" />
        {activeCount > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-amber/30 bg-black/40 px-3 py-1 text-[11px] text-amber-soft backdrop-blur">
            想起の回路を発火中
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 right-3 text-[10.5px] text-faint">
          タップで断片をひらく・ドラッグで移動・ホイールで拡大
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-faint">
        {Object.entries(LINK_STYLE).map(([kind, st]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 rounded" style={{ background: st.color }} />
            {st.label}
          </span>
        ))}
      </div>

      {selectedFragment && (
        <div className="rise rounded-2xl border border-hairline bg-panel/70 p-4">
          <p className="text-[11px] text-faint">{new Date(selectedFragment.createdAt).toLocaleDateString('ja-JP')}</p>
          <p className="mt-2 font-serif text-[15px] leading-relaxed text-bone">{selectedFragment.text}</p>
          <button
            onClick={() => onOpenFragment(selectedFragment.id)}
            className="mt-3 rounded-lg border border-amber/40 px-3 py-1.5 text-[12px] text-amber transition hover:bg-amber/10"
          >
            詳しく見る
          </button>
        </div>
      )}
    </div>
  )
}

export function emotionIntensityOf(f: Fragment, key: Parameters<typeof intensityOf>[1]): number {
  return intensityOf(f.emotion, key)
}
