<template>
  <div class="ds-panel desk-seq desk-panel-row">
    <section class="ds-col desk-pane is-left">
      <h4 class="ds-sub">五维雷达</h4>
      <svg class="ds-radar desk-seq" viewBox="0 0 100 100" role="img" aria-label="文档规模雷达">
        <polygon points="50,8 90,37 75,86 25,86 10,37" class="ds-grid" />
        <polygon points="50,22 80,44 68,79 32,79 20,44" class="ds-grid" />
        <polygon :points="radar.poly" class="ds-area" />
        <circle v-for="(p, i) in radar.dots" :key="i" :cx="p[0]" :cy="p[1]" r="1.6" class="ds-dot" />
        <text
          v-for="(p, i) in labelPos"
          :key="'t' + i"
          :x="p[0]"
          :y="p[1]"
          class="ds-tick"
          :text-anchor="p[2]"
        >{{ LABELS[i] }}</text>
      </svg>

      <h4 class="ds-sub">笔记本 → 路径（旭日）</h4>
      <svg class="ds-sun" viewBox="0 0 200 200" role="img" aria-label="字数构成">
        <circle cx="100" cy="100" r="34" class="ds-core" />
        <text x="100" y="98" class="ds-core-num">{{ compact(d?.words ?? 0) }}</text>
        <text x="100" y="111" class="ds-core-cap">总字数</text>
        <path v-for="(a, i) in sunArcs" :key="i" :d="a.d" :fill="a.fill" class="ds-arc">
          <title>{{ a.title }}</title>
        </path>
      </svg>
      <ul class="ds-legend desk-ellipsis">
        <li v-for="(t, i) in d?.tree || []" :key="t.label">
          <i :style="{ background: COLORS[i % COLORS.length] }" />
          <span>{{ t.label }}</span>
          <b>{{ compact(t.words) }}</b>
        </li>
      </ul>
    </section>

    <section class="ds-col desk-pane is-mid">
      <h4 class="ds-sub">文档关系（立体）</h4>
      <DocGraph />
    </section>

    <section class="ds-col desk-pane is-right">
      <header class="ds-bar">
        <span class="ds-title">文档统计</span>
        <GlassButton :icon="RotateCcw" label="刷新" @click="refresh" />
      </header>
      <ul class="ds-tiles">
        <li><b>{{ compact(d?.docs ?? 0) }}</b><span>文档</span></li>
        <li><b>{{ compact(d?.words ?? 0) }}</b><span>总字数</span></li>
        <li><b>{{ d?.today ?? 0 }}</b><span>今日</span></li>
        <li><b>{{ d?.week ?? 0 }}</b><span>近 7 天</span></li>
      </ul>

      <h4 class="ds-sub">字数 Top 5</h4>
      <ul class="ds-bars desk-seq">
        <li v-for="b in d?.top || []" :key="b.label">
          <span class="ds-lab" :title="b.label">{{ b.label }}</span>
          <span class="ds-track desk-fill"><i :style="{ width: `${pct(b.value, topMax)}%` }" /></span>
        </li>
      </ul>

      <h4 class="ds-sub">笔记本</h4>
      <ul class="ds-bars">
        <li v-for="b in d?.notebooks || []" :key="b.label">
          <span class="ds-lab" :title="b.label">{{ b.label }}</span>
          <span class="ds-track desk-fill"><i :style="{ width: `${pct(b.value, nbMax)}%` }" /></span>
          <span class="ds-num">{{ b.value }} 篇</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { GlassButton } from "@/ui/controls"
import { computed, onMounted, ref } from "vue"
import { RotateCcw } from "lucide-vue-next"
import { RADAR_LABELS, compact, loadDocStats, radarOf, radarValuesOf, stats } from "./docstats"
import DocGraph from "./DocGraph.vue"

const LABELS = RADAR_LABELS
const COLORS = ["hsl(212 92% 56%)", "hsl(262 84% 62%)", "hsl(190 90% 46%)", "hsl(42 94% 54%)", "hsl(330 80% 60%)", "hsl(160 74% 42%)"]

const d = computed(() => stats.value)
const error = ref("")

const radar = computed(() => radarOf(radarValuesOf(d.value)))

/** 标签贴在五边形外侧顶点，角度与数据轴一致，但半径固定，不会随数值挤到一起 */
const labelPos = computed(() =>
  LABELS.map((_, i) => {
    const a = (Math.PI * 2 * i) / LABELS.length - Math.PI / 2
    const x = 50 + Math.cos(a) * 46
    const y = 50 + Math.sin(a) * 46 + 1.5
    const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle"
    return [Number(x.toFixed(1)), Number(y.toFixed(1)), anchor] as const
  }),
)
const pct = (v: number, max: number) => (max <= 0 ? 0 : Math.round((v / max) * 100))
const maxOf = (list: { value: number }[] = []) => Math.max(1, ...list.map((b) => b.value))
const topMax = computed(() => maxOf(d.value?.top))
const nbMax = computed(() => maxOf(d.value?.notebooks))

function arcPath(a0: number, a1: number, r0: number, r1: number) {
  const c = 100
  const p = (a: number, r: number) => [c + Math.cos(a) * r, c + Math.sin(a) * r]
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = p(a0, r1)
  const [x1, y1] = p(a1, r1)
  const [x2, y2] = p(a1, r0)
  const [x3, y3] = p(a0, r0)
  return `M${x0.toFixed(1)},${y0.toFixed(1)}A${r1},${r1} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}A${r0},${r0} 0 ${large} 0 ${x3.toFixed(1)},${y3.toFixed(1)}Z`
}

/** 旭日：内环笔记本、外环一级路径，权重 = 字数 */
const sunArcs = computed(() => {
  const tree = d.value?.tree || []
  const total = tree.reduce((s, t) => s + t.words, 0)
  if (!total) return []
  const arcs: { d: string; fill: string; title: string }[] = []
  let start = -Math.PI / 2
  tree.forEach((node, i) => {
    const span = (node.words / total) * Math.PI * 2
    const fill = COLORS[i % COLORS.length]
    arcs.push({ d: arcPath(start + 0.006, start + span - 0.006, 36, 62), fill, title: `${node.label} · ${node.words} 字` })
    let cs = start
    for (const child of node.children) {
      const cspan = (child.words / node.words) * span
      arcs.push({
        d: arcPath(cs + 0.008, cs + cspan - 0.008, 65, 91),
        fill: `color-mix(in srgb, ${fill} 55%, var(--desk-surface))`,
        title: `${node.label} / ${child.label} · ${child.words} 字`,
      })
      cs += cspan
    }
    start += span
  })
  return arcs
})

async function refresh() {
  error.value = ""
  try {
    await loadDocStats(true)
  } catch {
    error.value = "读取失败"
  }
}

onMounted(refresh)
</script>

<style scoped>

.ds-col {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-detail-pad);
  min-height: 0;
}

.ds-col.is-left {
  flex: 0 0 300px;
  overflow: hidden;
}

.ds-col.is-mid {
  flex: 1 1 auto;
}

.ds-col.is-right {
  flex: 0 0 232px;
  overflow: auto;
}

.ds-bar {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
}

.ds-title {
  flex: 1 1 auto;
  font-size: var(--desk-fs-body);
  font-weight: var(--desk-fw-semibold);
}

.ds-sub {
  margin: var(--desk-sp-0) 0 0;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}

/* 雷达 */
.ds-radar {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  margin: 0 auto;
  display: block;
}

.ds-grid {
  fill: none;
  stroke: color-mix(in srgb, var(--desk-text) 14%, transparent);
  stroke-width: 0.6;
}

.ds-area {
  fill: color-mix(in srgb, var(--desk-accent) 24%, transparent);
  stroke: var(--desk-accent);
  stroke-width: 1.3;
}

.ds-dot {
  fill: var(--desk-accent);
}

.ds-tick {
  fill: var(--desk-text-3);
  font-size: 6px;
  font-family: inherit;
}

/* 旭日 */
.ds-sun {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  margin: 0 auto;
  display: block;
}

.ds-core {
  fill: color-mix(in srgb, var(--desk-accent) 10%, transparent);
}

.ds-core-num,
.ds-core-cap {
  text-anchor: middle;
  fill: var(--desk-text);
  font-family: inherit;
}

.ds-core-num {
  font-size: var(--desk-fs-body);
  font-weight: 600;
}

.ds-core-cap {
  font-size: 7px;
  fill: var(--desk-text-3);
}

.ds-arc {
  stroke: var(--desk-surface);
  stroke-width: 0.6;
}

.ds-arc:hover {
  opacity: 0.75;
}

.ds-legend li {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ds-legend i {
  width: 8px;
  height: 8px;
  border-radius: var(--desk-r-xs);
  flex: none;
}

.ds-legend span {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-legend b {
  color: var(--desk-text-2);
  font-variant-numeric: tabular-nums;
}

/* KPI + 条形 */
.ds-tiles {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--desk-sp-1h);
}

.ds-tiles b {
  display: block;
  font-size: 18px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.ds-tiles span {
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
}

.ds-bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1h);
  font-size: var(--desk-fs-caption);
}

.ds-bars li {
  display: grid;
  grid-template-columns: minmax(48px, 40%) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--desk-sp-2);
}

.ds-lab {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--desk-text-2);
}

.ds-track {
  height: 8px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-text) 7%, transparent);
  overflow: hidden;
}

.ds-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--desk-accent);
}

.ds-num {
  font-variant-numeric: tabular-nums;
  color: var(--desk-text-3);
  white-space: nowrap;
}
</style>
