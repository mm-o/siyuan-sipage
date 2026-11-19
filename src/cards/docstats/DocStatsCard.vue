<template>
  <div class="ds">
    <svg class="pie desk-seq" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" role="img" aria-label="文档统计">
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

      <text v-for="q in pieces" :key="`n-${q.id}`" :x="q.x" :y="q.y" class="ds-num">{{ q.value }}</text>
      <text v-for="q in pieces" :key="`l-${q.id}`" :x="q.x" :y="q.y + 15" class="ds-lab">{{ q.label }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
/**
 * 文档统计：四块拼图（200×200，缝在 x=100 / y=100）。
 *
 * 每条缝有一个固定的「世界凸起方向」。相邻两块用同一条曲线、遍历方向相反，
 * 于是一块凸、一块凹，拼起来严丝合缝 —— 同一条缝只描述一次。
 */
import { computed, onMounted } from "vue"
import { compact, loadDocStats, stats } from "./docstats"

type P = [number, number]

const K = 12 // 凸起半径
const C = 100 // 缝坐标
const E = 200

/** 带凸起的缝：p1 → p2，凸起朝世界方向 bulge */
function seam(p1: P, p2: P, bulge: P): string {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const mx = (p1[0] + p2[0]) / 2
  const my = (p1[1] + p2[1]) / 2
  const s: P = [mx - ux * K, my - uy * K]
  const e: P = [mx + ux * K, my + uy * K]
  const sweep = ux * bulge[1] - uy * bulge[0] < 0 ? 1 : 0
  const f = (p: P) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  return `L ${f(s)} A ${K} ${K} 0 1 ${sweep} ${f(e)} L ${f(p2)}`
}

const L = (p: P) => `L ${p[0]} ${p[1]}`

const pieces = computed(() => {
  const v = stats.value
  /* 四条缝各描述一次，相邻两块用「反向遍历 + 同一凸起方向」共用 */
  const vDown = seam([C, 0], [C, C], [1, 0]) // 上纵缝向右
  const vUp = seam([C, C], [C, 0], [1, 0])
  const hToLeft = seam([C, C], [0, C], [0, -1]) // 左横缝向上
  const hFromLeft = seam([0, C], [C, C], [0, -1])
  const hToMid = seam([E, C], [C, C], [0, -1]) // 右横缝向上
  const hFromMid = seam([C, C], [E, C], [0, -1])
  const vBotDown = seam([C, C], [C, E], [-1, 0]) // 下纵缝向左
  const vBotUp = seam([C, E], [C, C], [-1, 0])
  const [docs, words, today, week] = [v?.docs ?? 0, v?.words ?? 0, v?.today ?? 0, v?.week ?? 0]

  return [
    { id: "a", d: `M 0 0 ${L([C, 0])}${vDown}${hToLeft} Z`, value: compact(docs), label: "文档", x: 50, y: 44 },
    { id: "b", d: `M ${E} 0 ${L([E, C])}${hToMid}${vUp} Z`, value: compact(words), label: "字数", x: 150, y: 44 },
    { id: "c", d: `M 0 ${E} ${L([0, C])}${hFromLeft}${vBotDown} Z`, value: compact(today), label: "今日", x: 50, y: 150 },
    { id: "d", d: `M ${E} ${E} ${L([C, E])}${vBotUp}${hFromMid} Z`, value: compact(week), label: "近 7 天", x: 150, y: 150 },
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

.pie {
  aspect-ratio: 1;
  height: 100%;
  max-height: 100%;
  margin: 0 auto;
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
