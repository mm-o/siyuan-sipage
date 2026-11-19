<template>
  <div class="dg-wrap">
    <canvas ref="cv" class="dg-canvas" />
    <p v-if="hint" class="dg-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"
import { openDoc } from "@/core/quickdocs"

/**
 * 全局文档关系图（自绘 canvas，零第三方依赖）。
 *
 * 布局：按笔记本分簇（每簇有中心，节点被簇心吸引）+ 两两斥力，跑固定轮数后停住；
 * 投影：正交投影 + 按包围盒缩放，打开即全部可见，不自动旋转；
 * 交互：拖拽平移、滚轮缩放、悬停高亮邻居并显示标题、点击用 openTab 打开文档。
 */
const cv = ref<HTMLCanvasElement>()
const hint = ref("")

interface Node {
  id: string
  title: string
  box: string
  x: number
  y: number
  vx: number
  vy: number
  hue: number
  z: number
}

const HUES = [212, 262, 190, 42, 330, 160, 90, 280]
const LABEL_MAX = 60

async function sql(stmt: string) {
  const res = await fetch("/api/query/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stmt }),
  })
  const json = await res.json()
  return (json.data || []) as Record<string, unknown>[]
}

let redraw: (() => void) | null = null

onMounted(async () => {
  const canvas = cv.value
  if (!canvas) return
  const ctx = canvas.getContext("2d")!

  const docs = await sql("select id, content as title, box from blocks where type = 'd' limit 240").catch(() => [])
  if (!docs.length) {
    hint.value = "还没有文档"
    return
  }

  /* 簇心：按笔记本角度均匀分布，同簇节点围绕簇心 */
  const boxList = [...new Set(docs.map((d) => String(d.box || "")))]
  const centers = new Map<string, { x: number; y: number; hue: number }>()
  boxList.forEach((box, i) => {
    const a = (i / Math.max(1, boxList.length)) * Math.PI * 2
    centers.set(box, { x: Math.cos(a) * 150, y: Math.sin(a) * 150, hue: HUES[i % HUES.length] })
  })

  const nodes: Node[] = docs.map((d, i) => {
    const box = String(d.box || "")
    const c = centers.get(box)!
    const a = (i * 2.399) % (Math.PI * 2)
    const r = 24 + (i % 5) * 10
    return {
      id: String(d.id),
      title: String(d.title || "未命名"),
      box,
      hue: c.hue,
      x: c.x + Math.cos(a) * r,
      y: c.y + Math.sin(a) * r,
      z: (i % 7) - 3,
    }
  })
  const ids = new Set(nodes.map((n) => n.id))
  const refRows = await sql("select block_id as a, def_block_root_id as b from refs limit 800").catch(() => [])
  const links = refRows
    .map((r) => [String(r.a), String(r.b)] as const)
    .filter(([a, b]) => ids.has(a) && ids.has(b))

  /* 邻居表：悬停高亮用 */
  const neighbours = new Map<string, Set<string>>()
  for (const [a, b] of links) {
    if (!neighbours.has(a)) neighbours.set(a, new Set())
    if (!neighbours.has(b)) neighbours.set(b, new Set())
    neighbours.get(a)!.add(b)
    neighbours.get(b)!.add(a)
  }

  /* 松弛：斥力 + 簇心吸引 + 速度阻尼，跑 160 轮定住 */
  for (let step = 0; step < 160; step += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i]
      let fx = 0
      let fy = 0
      for (let j = 0; j < nodes.length; j += 1) {
        if (i === j) continue
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d2 = dx * dx + dy * dy || 1
        const f = 260 / d2
        fx += dx * f
        fy += dy * f
      }
      const c = centers.get(a.box)!
      fx += (c.x - a.x) * 0.012
      fy += (c.y - a.y) * 0.012
      a.x += fx * 0.5
      a.y += fy * 0.5
    }
  }

  let zoom = 1
  let panX = 0
  let panY = 0
  let hover: Node | null = null
  let projected: { n: Node; x: number; y: number; r: number }[] = []

  const draw = () => {
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y)
    }
    const pad = 26
    const fit = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const k = fit * zoom
    const px = (n: Node) => w / 2 + (n.x - cx) * k + panX
    const py = (n: Node) => h / 2 + (n.y - cy) * k + panY

    const focus = hover ? neighbours.get(hover.id) || new Set<string>() : null

    /* 连线：悬停时只亮邻居，其余压暗 */
    for (const [a, b] of links) {
      const na = nodes.find((n) => n.id === a)!
      const nb = nodes.find((n) => n.id === b)!
      const hot = hover && (a === hover.id || b === hover.id)
      ctx.strokeStyle = hot ? "rgb(90 160 255 / 0.85)" : focus ? "rgb(120 150 200 / 0.10)" : "rgb(120 150 200 / 0.22)"
      ctx.lineWidth = hot ? 1.6 : 0.7
      ctx.beginPath()
      ctx.moveTo(px(na), py(na))
      ctx.lineTo(px(nb), py(nb))
      ctx.stroke()
    }

    projected = nodes.map((n) => ({ n, x: px(n), y: py(n), r: 2.8 + (n.z + 3) * 0.35 }))

    /* 标签：只画「重要的」——度高或悬停/邻居，避免糊成一片 */
    const labelSet = new Set<string>()
    if (hover) {
      labelSet.add(hover.id)
      for (const id of focus || []) labelSet.add(id)
    }
    const topNodes = [...nodes].sort((l, r) => (neighbours.get(r.id)?.size || 0) - (neighbours.get(l.id)?.size || 0))
    for (const n of topNodes.slice(0, 12)) labelSet.add(n.id)
    if (LABEL_MAX >= nodes.length) for (const n of nodes) labelSet.add(n.id)

    for (const p of projected) {
      const hot = hover?.id === p.n.id
      const dim = focus && !hot && !focus.has(p.n.id)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * (hot ? 1.7 : 1), 0, Math.PI * 2)
      ctx.fillStyle = `hsl(${p.n.hue} 82% 62% / ${dim ? 0.28 : hot ? 1 : 0.82})`
      ctx.fill()
      if (hot) {
        ctx.strokeStyle = "#fff"
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
      if (labelSet.has(p.n.id) && !dim) {
        ctx.font = `${hot ? 600 : 500} ${hot ? 12 : 10}px ui-sans-serif, system-ui`
        ctx.fillStyle = hot ? "var(--desk-text)" : "rgb(150 160 180 / 0.95)"
        ctx.textAlign = "center"
        const text = p.n.title.length > 14 ? `${p.n.title.slice(0, 14)}…` : p.n.title
        ctx.fillText(text, p.x, p.y - p.r - 6)
      }
    }
  }

  redraw = draw
  draw()

  const hitTest = (mx: number, my: number) =>
    projected
      .map((p) => ({ p, d: (p.x - mx) ** 2 + (p.y - my) ** 2 }))
      .filter((it) => it.d < Math.max(64, (it.p.r + 6) ** 2))
      .sort((l, r) => l.d - r.d)[0]?.p.n || null

  let dragging = false
  let lastX = 0
  let lastY = 0
  canvas.addEventListener("mousedown", (e) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  })
  window.addEventListener("mouseup", () => {
    dragging = false
  })
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (dragging) {
      panX += e.clientX - lastX
      panY += e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      draw()
      return
    }
    const hit = hitTest(mx, my)
    if (hit !== hover) {
      hover = hit
      canvas.style.cursor = hit ? "pointer" : "grab"
      draw()
    }
  })
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect()
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
    if (hit) void openDoc(hit.id)
  })
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault()
      zoom = Math.min(4, Math.max(0.4, zoom - e.deltaY * 0.0015))
      draw()
    },
    { passive: false },
  )
})

onBeforeUnmount(() => {
  redraw = null
})
</script>

<style scoped>
.dg-wrap {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-height: 220px;
  min-width: 0;
}

.dg-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: var(--desk-r-control);
  cursor: grab;
}

.dg-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-3);
}
</style>
