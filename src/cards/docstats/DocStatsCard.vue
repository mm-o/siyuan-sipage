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
      </defs>

      <path v-for="q in pieces" :key="q.id" :d="q.d" :fill="`url(#ds-${q.id})`" class="ds-piece" />

      <template v-for="q in pieces" :key="`t-${q.id}`">
        <text :x="q.x" :y="q.y" class="ds-num">{{ q.value }}</text>
        <text :x="q.x" :y="q.y + 15" class="ds-lab">{{ q.label }}</text>
      </template>
    </svg>
  </div>
</template>

<script setup lang="ts">
/**
 * 文档统计：拼图
 *
 *   ／正方：四块（文档 / 字数 / 今日 / 近 7 天）
 *   宽卡 2:1：左右两块（纵向缝）
 *   竖卡 1:2：上下两块（横向缝）
 *
 * 每条缝描述一次，相邻两块用同一条曲线、反向遍历，所以一块凸一块凹，拼起来严丝合缝。
 * 只按比例挑块数，不做别的分支 —— 变换尺寸就是换 viewBox。
 */
import { computed, onMounted } from "vue"
import { sizeTier } from "@/ui/sizes"
import { compact, loadDocStats, stats } from "./docstats"

type P = [number, number]

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number }>(), { size: "4x4", w: 4, h: 4 })

const K = 12
const F = (p: P) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`

/** 带凸起的缝：p1 → p2，凸起朝 bulge 方向 */
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

const tier = computed(() => sizeTier(props.w ?? 4, props.h ?? 4))
const wide = computed(() => tier.value === "wide")
const tall = computed(() => tier.value === "tall")
const box = computed(() => (wide.value ? { w: 200, h: 100 } : tall.value ? { w: 100, h: 200 } : { w: 200, h: 200 }))

const pieces = computed(() => {
  const v = stats.value
  const { w: W, h: H } = box.value
  const cx = W / 2
  const cy = H / 2
  const docs = compact(v?.docs ?? 0)
  const words = compact(v?.words ?? 0)
  const today = compact(v?.today ?? 0)
  const week = compact(v?.week ?? 0)

  /* 宽卡：一条纵缝，左右两块 */
  if (wide.value) {
    const down = seam([cx, 0], [cx, H], [1, 0])
    const up = seam([cx, H], [cx, 0], [1, 0])
    return [
      { id: "a", d: `M 0 0 L ${cx} 0 ${down} L 0 ${H} Z`, value: docs, label: "文档", x: cx / 2, y: cy + 4 },
      { id: "b", d: `M ${W} 0 L ${W} ${H} L ${cx} ${H} ${up} Z`, value: words, label: "字数", x: cx + cx / 2, y: cy + 4 },
    ]
  }

  /* 竖卡：一条横缝，上下两块 */
  if (tall.value) {
    const left = seam([cx, cy], [0, cy], [0, -1])
    const right = seam([0, cy], [cx, cy], [0, -1])
    return [
      { id: "c", d: `M 0 0 L ${W} 0 L ${W} ${cy} L ${cx} ${cy} ${left} L 0 ${cy} Z`, value: today, label: "今日", x: cx, y: cy / 2 + 4 },
      { id: "d", d: `M 0 ${H} L 0 ${cy} ${right} L ${W} ${cy} L ${W} ${H} Z`, value: week, label: "近 7 天", x: cx, y: cy + cy / 2 + 4 },
    ]
  }

  /* 正方：四块 */
  const vDown = seam([cx, 0], [cx, cy], [1, 0])
  const vUp = seam([cx, cy], [cx, 0], [1, 0])
  const hToLeft = seam([cx, cy], [0, cy], [0, -1])
  const hFromLeft = seam([0, cy], [cx, cy], [0, -1])
  const hToMid = seam([W, cy], [cx, cy], [0, -1])
  const hFromMid = seam([cx, cy], [W, cy], [0, -1])
  const vBotDown = seam([cx, cy], [cx, H], [-1, 0])
  const vBotUp = seam([cx, H], [cx, cy], [-1, 0])

  return [
    { id: "a", d: `M 0 0 L ${cx} 0 ${vDown} ${hToLeft} Z`, value: docs, label: "文档", x: cx / 2, y: cy / 2 + 4 },
    { id: "b", d: `M ${W} 0 L ${W} ${cy} ${hToMid} ${vUp} Z`, value: words, label: "字数", x: cx + cx / 2, y: cy / 2 + 4 },
    { id: "c", d: `M 0 ${H} L 0 ${cy} ${hFromLeft} ${vBotDown} Z`, value: today, label: "今日", x: cx / 2, y: cy + cy / 2 + 4 },
    { id: "d", d: `M ${W} ${H} L ${cx} ${H} ${vBotUp} ${hFromMid} Z`, value: week, label: "近 7 天", x: cx + cx / 2, y: cy + cy / 2 + 4 },
  ]
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

/* 缩放交给 viewBox 与 aspect-ratio，不做任何横向拉扯 */
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
  font-size: 21px;
  font-weight: var(--desk-fw-semibold);
  fill: #fff;
  paint-order: stroke;
  stroke: rgb(0 0 0 / 18%);
  stroke-width: 2.5px;
}

.ds-lab {
  text-anchor: middle;
  font-size: 11px;
  fill: rgb(255 255 255 / 90%);
}
</style>
