<template>
  <div class="ds">
    <svg
      class="pie desk-seq"
      :viewBox="`0 0 ${box.w} ${box.h}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="文档统计"
    >
      <defs>
        <linearGradient id="ds-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(212 92% 58%)" />
          <stop offset="100%" stop-color="hsl(242 84% 60%)" />
        </linearGradient>
        <linearGradient id="ds-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(190 88% 46%)" />
          <stop offset="100%" stop-color="hsl(160 74% 44%)" />
        </linearGradient>
        <linearGradient id="ds-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(42 94% 54%)" />
          <stop offset="100%" stop-color="hsl(24 92% 56%)" />
        </linearGradient>
        <linearGradient id="ds-d" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(330 80% 62%)" />
          <stop offset="100%" stop-color="hsl(288 76% 60%)" />
        </linearGradient>
        <linearGradient id="ds-e" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(258 82% 62%)" />
          <stop offset="100%" stop-color="hsl(288 74% 58%)" />
        </linearGradient>
        <linearGradient id="ds-f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(158 66% 44%)" />
          <stop offset="100%" stop-color="hsl(190 80% 46%)" />
        </linearGradient>
        <linearGradient id="ds-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(16 88% 56%)" />
          <stop offset="100%" stop-color="hsl(42 92% 54%)" />
        </linearGradient>
        <linearGradient id="ds-h" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(206 76% 46%)" />
          <stop offset="100%" stop-color="hsl(190 88% 50%)" />
        </linearGradient>
      </defs>

      <path v-for="q in pieces" :key="q.id" :d="q.d" :fill="`url(#ds-${q.id})`" class="ds-piece" />

      <template v-for="q in pieces" :key="`t-${q.id}`">
        <text :x="q.x" :y="q.y" class="ds-num" :style="{ fontSize: `${q.fs}px` }">{{ q.value }}</text>
        <text :x="q.x" :y="q.y + q.fs * 0.72" class="ds-lab" :style="{ fontSize: `${q.fs * 0.52}px` }">{{ q.label }}</text>
      </template>
    </svg>
  </div>
</template>

<script setup lang="ts">
/**
 * 文档统计：拼图（块数随卡片大小、排布随卡片比例）
 *
 *   指标（全部来自同一份 SQL 缓存，不再额外查询）：
 *     文档 / 字数 / 今日 / 近 7 天 / 近 30 天 / 笔记本 / 篇均字数 / 最长一篇
 *
 *   块数看面积：≤4 格 2 块、≤9 格 4 块、≤16 格 6 块、更大 8 块
 *   排布看比例：在 n 的因数里挑最接近卡面长宽比的那组（n=6 → 3×2 / 2×3 / 6×1 …），
 *   因此永远铺满、没有空格，缝也是天然的拼图缝。
 */
import { computed, onMounted } from "vue"
import { compact, loadDocStats, stats } from "./docstats"

type P = [number, number]

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number }>(), { size: "6x6", w: 6, h: 6 })

const K = 10
const F = (p: P) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`

/** 带凸起的缝：p1 → p2，凸起朝 bulge；相邻两块反向遍历同一条缝即互补 */
function seam(p1: P, p2: P, bulge: P) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const mx = (p1[0] + p2[0]) / 2
  const my = (p1[1] + p2[1]) / 2
  const a: P = [mx - ux * K, my - uy * K]
  const b: P = [mx + ux * K, my + uy * K]
  const sweep = ux * bulge[1] - uy * bulge[0] < 0 ? 1 : 0
  return `L ${F(a)} A ${K} ${K} 0 1 ${sweep} ${F(b)} L ${F(p2)}`
}

/* ── 维度 ─────────────────────────────────────────────── */
const dims = computed(() => {
  const v = stats.value
  const docs = v?.docs ?? 0
  const words = v?.words ?? 0
  const notebooks = v?.notebooks?.length ?? 0
  const today = v?.today ?? 0
  const week = v?.week ?? 0
  const month = v?.month ?? 0
  const longest = v?.top?.[0]?.value ?? 0
  const second = v?.top?.[1]?.value ?? 0

  return [
    { label: "文档", value: compact(docs) },
    { label: "字数", value: compact(words) },
    { label: "今日", value: compact(today) },
    { label: "近 7 天", value: compact(week) },
    { label: "近 30 天", value: compact(month) },
    { label: "笔记本", value: compact(notebooks) },
    { label: "篇均字数", value: docs ? compact(Math.round(words / docs)) : "0" },
    { label: "最长一篇", value: compact(longest) },
    { label: "次长一篇", value: compact(second) },
    { label: "本均篇数", value: notebooks ? compact(Math.round(docs / notebooks)) : "0" },
    { label: "日均 30 天", value: compact(Math.round(month / 30)) },
    { label: "今日占比", value: week ? `${Math.round((today / week) * 100)}%` : "0%" },
  ]
})

/* ── 块数与排布：每块占 2×2 格，卡大就多几块 ── */
const grid = computed(() => {
  const w = props.w ?? 6
  const h = props.h ?? 6
  /* 一块拼图占 3×3 格：3×3 一块、6×6 四块、6×9 六块、9×9 九块 */
  let cols = Math.min(4, Math.max(1, Math.floor(w / 3)))
  let rows = Math.min(4, Math.max(1, Math.floor(h / 3)))
  /* 上限 12 块：再多就太小，在 12 的因数里挑最贴合卡面比例的一组 */
  if (cols * rows > 12) {
    const a = w / h
    const pairs: [number, number][] = [
      [4, 3],
      [3, 4],
      [6, 2],
      [2, 6],
      [12, 1],
      [1, 12],
    ]
    let best = pairs[0]
    let score = Infinity
    for (const [c, r] of pairs) {
      const d = Math.abs(Math.log2(c / r / a))
      if (d < score) {
        score = d
        best = [c, r]
      }
    }
    ;[cols, rows] = best
  }
  return { cols, rows }
})

const count = computed(() => grid.value.cols * grid.value.rows)

/* viewBox 用卡面比例：单块时铺满整卡，多块时按格均分（格本身来自 w/3、h/3，天然接近正方形） */
const box = computed(() => {
  const w = props.w ?? 6
  const h = props.h ?? 6
  return w >= h ? { w: 200, h: Math.max(20, Math.round((200 * h) / w)) } : { w: Math.max(20, Math.round((200 * w) / h)), h: 200 }
})

const pieces = computed(() => {
  const { cols, rows } = grid.value
  const { w: W, h: H } = box.value
  const cw = W / cols
  const ch = H / rows
  const fs = cols * rows <= 4 ? 21 : 16
  const list = dims.value.slice(0, count.value)

  return list.map((d, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x0 = col * cw
    const x1 = x0 + cw
    const y0 = row * ch
    const y1 = y0 + ch

    /* 顺时针：上 → 右 → 下 → 左；有邻居的地方用缝，否则直线 */
    const top = row === 0 ? `L ${F([x1, y0])}` : seam([x0, y0], [x1, y0], [0, -1])
    const right = col === cols - 1 ? `L ${F([x1, y1])}` : seam([x1, y0], [x1, y1], [1, 0])
    const bottom = row === rows - 1 ? `L ${F([x0, y1])}` : seam([x1, y1], [x0, y1], [0, -1])
    const left = col === 0 ? `Z` : seam([x0, y1], [x0, y0], [1, 0])

    return {
      id: "abcdefgh"[i] ?? "a",
      d: `M ${F([x0, y0])} ${top} ${right} ${bottom} ${left}`,
      value: d.value,
      label: d.label,
      x: x0 + cw / 2,
      y: y0 + ch / 2,
      fs,
    }
  })
})

onMounted(() => {
  void loadDocStats()
})
</script>

<style scoped>
.ds {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 缩放交给 viewBox，不做任何拉扯 */
.pie {
  display: block;
  width: 100%;
  height: 100%;
}

.ds-piece {
  stroke: var(--desk-surface);
  stroke-width: 1.2;
  stroke-linejoin: round;
}

.ds-num {
  text-anchor: middle;
  font-weight: var(--desk-fw-semibold);
  fill: #fff;
  paint-order: stroke;
  stroke: rgb(0 0 0 / 18%);
  stroke-width: 2.5px;
}

.ds-lab {
  text-anchor: middle;
  fill: rgb(255 255 255 / 90%);
}
</style>
