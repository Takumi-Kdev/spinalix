import { useEffect, useMemo, useRef, useState } from 'react'
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { select } from 'd3-selection'
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
import { EMOTION_META, dominantEmotion } from '../lib/emotion'
import { formatJP } from '../lib/dates'
import { emotionTheme } from '../lib/design'

const LINK_STYLE: Record<LinkKind, { color: string; label: string; width: number; curve: number }> = {
  recall: { color: '#c8442a', label: '自己引用', width: 1.6, curve: 0.18 },
  tension: { color: '#9a7fa8', label: '矛盾', width: 1.2, curve: 0.22 },
  echo: { color: '#7d9a6f', label: '反響', width: 1.0, curve: 0.16 },
  similar: { color: '#4a4238', label: '近さ', width: 0.5, curve: 0.08 },
  theme: { color: '#332e26', label: 'テーマ', width: 0.5, curve: 0.06 },
  person: { color: '#5b7a9e', label: '人', width: 0.6, curve: 0.1 },
}

interface GNode extends SimulationNodeDatum {
  id: string
  r: number
  color: string
  color2: string
  fragment: Fragment
}

interface GLink extends SimulationLinkDatum<GNode> {
  kind: LinkKind
  weight: number
}

export function GraphView({
  fragments,
  activePath,
  onOpenFragment,
  allCount,
}: {
  fragments: Fragment[]
  activePath: string[]
  onOpenFragment: (id: string) => void
  allCount: number
}) {
  const allLinks = useSpinalix((s) => s.links)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Simulation<GNode, GLink> | null>(null)
  const nodesRef = useRef<GNode[]>([])
  const linksRef = useRef<GLink[]>([])
  const trRef = useRef<ZoomTransform>(zoomIdentity)
  const sizeRef = useRef({ w: 800, h: 560 })
  const hoverRef = useRef<string | null>(null)
  const selectedRef = useRef<string | null>(null)
  const draggingRef = useRef<string | null>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const [hovered, setHovered] = useState<{ id: string; x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const didFitRef = useRef(false)

  const ids = useMemo(() => new Set(fragments.map((f) => f.id)), [fragments])
  const graph = useMemo(() => {
    const nodes: GNode[] = fragments.map((f) => {
      const theme = emotionTheme(f.emotion)
      const maxI = Math.max(0.15, ...Object.values(f.emotion.intensities).map((v) => v ?? 0))
      const c = theme.match(/#[0-9a-f]{6}/gi) ?? ['#8c8478']
      return { id: f.id, r: 3.5 + maxI * 8, color: c[0], color2: c[1] ?? c[0], fragment: f }
    })
    const idx = new Map(nodes.map((n) => [n.id, n]))
    const glinks: GLink[] = []
    for (const l of allLinks) {
      if (!ids.has(l.a) || !ids.has(l.b)) continue
      const s = idx.get(l.a)
      const t = idx.get(l.b)
      if (s && t) glinks.push({ source: s, target: t, kind: l.kind, weight: l.weight })
    }
    return { nodes, glinks }
  }, [fragments, allLinks, ids])

  // シミュレーション
  useEffect(() => {
    const sim = forceSimulation<GNode>(graph.nodes)
      .force('link', forceLink<GNode, GLink>(graph.glinks).id((d) => d.id).distance((l) => 34 + (1 - l.weight) * 90).strength(0.4))
      .force('charge', forceManyBody().strength(-110))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<GNode>().radius((d) => d.r + 6))
      .alphaDecay(0.03)
    simRef.current = sim
    nodesRef.current = graph.nodes
    linksRef.current = graph.glinks
  }, [graph])

  // キャンバスとズーム
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

    const zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.25, 3.2])
      .filter((e) => draggingRef.current === null && !e.button)
      .on('zoom', (e) => {
        trRef.current = e.transform
      })
    select(canvas).call(zoomBehavior).on('dblclick.zoom', null)

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const { w, h } = sizeRef.current
      const t = trRef.current
      return { x: (clientX - rect.left - w / 2 - t.x) / t.k, y: (clientY - rect.top - h / 2 - t.y) / t.k }
    }

    const hit = (clientX: number, clientY: number): GNode | null => {
      const p = toWorld(clientX, clientY)
      let found: GNode | null = null
      let best = Infinity
      for (const n of nodesRef.current) {
        const d = Math.hypot((n.x ?? 0) - p.x, (n.y ?? 0) - p.y)
        if (d < n.r + 8 && d < best) {
          best = d
          found = n
        }
      }
      return found
    }

    let downAt: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY }
      const n = hit(e.clientX, e.clientY)
      if (n) {
        draggingRef.current = n.id
        simRef.current?.alphaTarget(0.25).restart()
        canvas.setPointerCapture(e.pointerId)
      }
    }
    const onMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      const dragId = draggingRef.current
      if (dragId) {
        const n = nodesRef.current.find((x) => x.id === dragId)
        if (n) {
          const p = toWorld(e.clientX, e.clientY)
          n.fx = p.x
          n.fy = p.y
        }
        return
      }
      const n = hit(e.clientX, e.clientY)
      const next = n ? n.id : null
      if (next !== hoverRef.current) {
        hoverRef.current = next
        if (n) {
          const rect = canvas.getBoundingClientRect()
          setHovered({ id: n.id, x: e.clientX - rect.left, y: e.clientY - rect.top })
        } else setHovered(null)
      } else if (n) {
        const rect = canvas.getBoundingClientRect()
        setHovered({ id: n.id, x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    }
    const onUp = (e: PointerEvent) => {
      const dragId = draggingRef.current
      if (dragId) {
        const n = nodesRef.current.find((x) => x.id === dragId)
        if (n) {
          n.fx = null
          n.fy = null
        }
        simRef.current?.alphaTarget(0)
        draggingRef.current = null
        return
      }
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5) {
        const n = hit(e.clientX, e.clientY)
        selectedRef.current = n ? n.id : null
        setSelected(selectedRef.current)
      }
      downAt = null
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', () => setHovered(null))

    let raf = 0
    const draw = (t: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { w, h } = sizeRef.current
      const tr = trRef.current
      ctx.clearRect(0, 0, w, h)

      // 背景グリッド（幾何学）
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = 'rgba(255,255,255,0.02)'
      const gs = 28 * tr.k
      const ox = (tr.x + w / 2) % gs
      const oy = (tr.y + h / 2) % gs
      ctx.beginPath()
      for (let x = ox; x < w; x += gs) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      for (let y = oy; y < h; y += gs) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.translate(w / 2 + tr.x, h / 2 + tr.y)
      ctx.scale(tr.k, tr.k)

      const activeSet = new Set(activePath)
      const sel = selectedRef.current
      const neighborSet = new Set<string>()
      if (sel) {
        neighborSet.add(sel)
        for (const l of linksRef.current) {
          const s = l.source as GNode
          const tg = l.target as GNode
          if (s.id === sel) neighborSet.add(tg.id)
          if (tg.id === sel) neighborSet.add(s.id)
        }
      }

      // リンク（ベジェ曲線）
      for (const l of linksRef.current) {
        const s = l.source as GNode
        const tg = l.target as GNode
        const st = LINK_STYLE[l.kind]
        const isActive = activeSet.has(s.id) && activeSet.has(tg.id)
        const dimmed = sel ? !(neighborSet.has(s.id) && neighborSet.has(tg.id)) : false
        const mx = ((s.x ?? 0) + (tg.x ?? 0)) / 2
        const my = ((s.y ?? 0) + (tg.y ?? 0)) / 2
        const dx = (tg.x ?? 0) - (s.x ?? 0)
        const dy = (tg.y ?? 0) - (s.y ?? 0)
        const cx = mx - dy * st.curve
        const cy = my + dx * st.curve
        ctx.beginPath()
        ctx.moveTo(s.x ?? 0, s.y ?? 0)
        ctx.quadraticCurveTo(cx, cy, tg.x ?? 0, tg.y ?? 0)
        ctx.strokeStyle = st.color
        ctx.globalAlpha = dimmed ? 0.06 : isActive ? 0.9 : 0.28 + l.weight * 0.3
        ctx.lineWidth = st.width + (isActive ? 0.7 : 0)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // 発火（想起の道筋を光の粒が走る）
      if (activePath.length >= 2) {
        const byId = new Map(nodesRef.current.map((n) => [n.id, n]))
        for (let i = 0; i < activePath.length - 1; i++) {
          const s = byId.get(activePath[i])
          const tg = byId.get(activePath[i + 1])
          if (!s || !tg) continue
          const linkKind = linksRef.current.find(
            (l) => ((l.source as GNode).id === s.id && (l.target as GNode).id === tg.id) || ((l.source as GNode).id === tg.id && (l.target as GNode).id === s.id),
          )
          const st = LINK_STYLE[linkKind?.kind ?? 'similar']
          const mx = ((s.x ?? 0) + (tg.x ?? 0)) / 2
          const my = ((s.y ?? 0) + (tg.y ?? 0)) / 2
          const cx = mx - ((tg.y ?? 0) - (s.y ?? 0)) * st.curve
          const cy = my + ((tg.x ?? 0) - (s.x ?? 0)) * st.curve
          for (let k = 0; k < 3; k++) {
            const phase = ((t / 1600 + k / 3 + i * 0.2) % 1)
            const u = phase
            const x = (1 - u) * (1 - u) * (s.x ?? 0) + 2 * (1 - u) * u * cx + u * u * (tg.x ?? 0)
            const y = (1 - u) * (1 - u) * (s.y ?? 0) + 2 * (1 - u) * u * cy + u * u * (tg.y ?? 0)
            ctx.beginPath()
            ctx.arc(x, y, 2.0, 0, Math.PI * 2)
            ctx.fillStyle = '#c8442a'
            ctx.fill()
          }
        }
      }

      // ノード
      for (const n of nodesRef.current) {
        const isActive = activeSet.has(n.id)
        const isSel = sel === n.id
        const dimmed = sel ? !neighborSet.has(n.id) : false
        ctx.globalAlpha = dimmed ? 0.18 : 1
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r + (isActive || isSel ? 1.4 : 0), 0, Math.PI * 2)
        ctx.fillStyle = n.color + 'cc'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r + (isActive || isSel ? 1.4 : 0), 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(18,16,12,0.55)'
        ctx.lineWidth = 0.8
        ctx.stroke()
        if (isSel || isActive) {
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, n.r + (isActive ? 3.2 : 4), 0, Math.PI * 2)
          ctx.strokeStyle = '#c8442a'
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
        ctx.globalAlpha = 1

        if (isSel) {
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, n.r + 6, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(236,231,220,0.5)'
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
    const fitTimer = window.setTimeout(() => {
      if (didFitRef.current) return
      const nodes = nodesRef.current
      if (nodes.length === 0) return
      didFitRef.current = true
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const n of nodes) {
        minX = Math.min(minX, (n.x ?? 0) - n.r)
        maxX = Math.max(maxX, (n.x ?? 0) + n.r)
        minY = Math.min(minY, (n.y ?? 0) - n.r)
        maxY = Math.max(maxY, (n.y ?? 0) + n.r)
      }
      const { w, h } = sizeRef.current
      const k = Math.min(2.6, Math.max(0.3, Math.min(w / (maxX - minX + 90), h / (maxY - minY + 90)) || 1))
      trRef.current = zoomIdentity.translate(-((minX + maxX) / 2) * k, -((minY + maxY) / 2) * k).scale(k)
    }, 1600)

    return () => {
      window.clearTimeout(fitTimer)
      cancelAnimationFrame(raf)
      ro.disconnect()
      simRef.current?.stop()
    }
  }, [activePath])

  const hoveredFragment = hovered ? fragments.find((f) => f.id === hovered.id) : null
  const selectedFragment = selected ? fragments.find((f) => f.id === selected) : null

  const zoomToFit = () => {
    const nodes = nodesRef.current
    if (nodes.length === 0) return
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, (n.x ?? 0) - n.r)
      maxX = Math.max(maxX, (n.x ?? 0) + n.r)
      minY = Math.min(minY, (n.y ?? 0) - n.r)
      maxY = Math.max(maxY, (n.y ?? 0) + n.r)
    }
    const { w, h } = sizeRef.current
    const k = Math.min(2.4, (Math.min(w / (maxX - minX + 80), h / (maxY - minY + 80)) || 1))
    trRef.current = zoomIdentity.translate(-((minX + maxX) / 2) * k, -((minY + maxY) / 2) * k).scale(k)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11.5px] text-faint">回路</p>
          <h2 className="mt-1 font-serif text-[20px] text-bone">
            {fragments.length}の断片が、{graph.glinks.length}の回路で繋がっている
          </h2>
          {fragments.length < allCount && (
            <p className="mt-0.5 text-[11px] text-amber/80">フィルタ適用中（全{allCount}断片）</p>
          )}
        </div>
        <button onClick={zoomToFit} className="text-[11.5px] text-muted underline-offset-4 transition hover:text-bone hover:underline">
          全体を表示
        </button>
      </div>

      <div ref={wrapRef} className="relative h-[520px] overflow-hidden border border-rule bg-ink lg:h-[600px]">
        <canvas ref={canvasRef} className="h-full w-full touch-none" />
        {activePath.length >= 2 && (
          <p className="pointer-events-none absolute left-4 top-3 text-[11.5px] text-shu">想起の回路を発火中</p>
        )}
        {hovered && hoveredFragment && (
          <div
            className="pointer-events-none absolute z-10 max-w-[250px] border border-rule bg-ink-2 px-3 py-2"
            style={{ left: Math.min(hovered.x + 14, sizeRef.current.w - 250), top: Math.max(hovered.y - 10, 8) }}
          >
            <p className="mono text-faint">{formatJP(hoveredFragment.createdAt)}</p>
            <p className="mt-1 font-serif text-[12.5px] leading-snug text-bone">{hoveredFragment.text.slice(0, 64)}</p>
            <p className="mt-1 text-[10px] text-faint">クリックで詳細</p>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 right-3 text-[10.5px] text-faint">
          ドラッグ・拡大・ノード移動
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {(Object.keys(LINK_STYLE) as LinkKind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5 text-[11px] text-faint">
            <span className="inline-block h-[2px] w-4 rounded" style={{ background: LINK_STYLE[kind].color }} />
            {LINK_STYLE[kind].label}
          </span>
        ))}
        {(Object.keys(EMOTION_META) as (keyof typeof EMOTION_META)[]).slice(0, 6).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] text-faint">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: EMOTION_META[k].color }} />
            {EMOTION_META[k].label}
          </span>
        ))}
      </div>

      {selectedFragment && (
        <div className="rise border border-rule px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="mono text-faint">{formatJP(selectedFragment.createdAt)}</p>
            <p className="text-[11px] text-muted">{dominantFragmentLabel(selectedFragment)}</p>
          </div>
          <p className="mt-2 font-serif text-[14.5px] leading-relaxed text-bone">{selectedFragment.text}</p>
          <button onClick={() => onOpenFragment(selectedFragment.id)} className="mt-3 text-[12.5px] text-shu underline-offset-4 transition hover:underline">
            つながりをひらく
          </button>
        </div>
      )}
    </div>
  )
}

function dominantFragmentLabel(f: Fragment): string {
  const d = dominantEmotion(f.emotion)
  return d ? EMOTION_META[d].label : '凪'
}
