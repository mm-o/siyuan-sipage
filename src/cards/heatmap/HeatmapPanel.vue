<template>
  <div class="hm-panel desk-seq">
    <div class="hm-body">
      <div class="hm-main desk-pane is-left">
      <header class="hm-head">
        <p class="hm-range">{{ rangeText }}</p>
        <p class="hm-hint">按天统计当天新增或修改的块数</p>
      </header>

      <template v-if="counts">
        <div class="hm-chart">
          <div class="hg is-split is-animate">
            <div v-for="(row, ri) in rows" :key="ri" class="hg-row">
              <div class="hg-months" :style="{ '--weeks': row.weeks.length }">
                <span
                  v-for="month in row.months"
                  :key="month.label + month.col"
                  class="hg-month"
                  :style="{ '--col': month.col, '--weeks': row.weeks.length }"
                >{{ month.label }}</span>
              </div>
              <div class="hg-weeks" :style="{ '--weeks': row.weeks.length }">
                <div v-for="(week, wi) in row.weeks" :key="wi" class="hg-week">
                  <span
                    v-for="(day, di) in week"
                    :key="day.date"
                    class="hg-cell"
                    :class="[`is-${day.level}`, { 'is-hover': hovered === day.date }]"
                    :style="{ '--col': ri * 27 + wi, '--row': di }"
                    :title="`${day.date} · ${day.count} 块`"
                    @mouseenter="hovered = day.date"
                    @mouseleave="hovered = ''"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="hm-foot">
          <p class="hm-caption">
            <template v-if="hoveredDay">{{ hoveredDay.date }} · <b>{{ hoveredDay.count }}</b> 块</template>
            <template v-else-if="!stats.active">最近 53 周没有写作记录</template>
            <template v-else>单日最多 <b>{{ stats.busiest?.count ?? 0 }}</b> 块（{{ stats.busiest?.date }}）</template>
          </p>
          <p class="hm-legend">
            <span>少</span>
            <i class="hg-cell is-0" />
            <i class="hg-cell is-1" />
            <i class="hg-cell is-2" />
            <i class="hg-cell is-3" />
            <i class="hg-cell is-4" />
            <span>多</span>
          </p>
        </footer>
      </template>

      <div v-else class="hm-state">
        <span class="hm-state-text">{{ error ? "读取写作记录失败" : "读取中" }}</span>
        <GlassButton v-if="error" text label="重试" @click="reload" />
      </div>
    </div>

    <aside class="hm-side desk-pane is-right">
      <ul class="hm-figures">
        <li class="hm-figure">
          <span class="hm-figure-num">{{ stats.active }}</span>
          <span class="hm-figure-label desk-note">天有写</span>
        </li>
        <li class="hm-figure">
          <span class="hm-figure-num">{{ stats.current }}</span>
          <span class="hm-figure-label desk-note">天连续</span>
        </li>
        <li class="hm-figure">
          <span class="hm-figure-num">{{ stats.longest }}</span>
          <span class="hm-figure-label desk-note">最长连续</span>
        </li>
        <li class="hm-figure">
          <span class="hm-figure-num">{{ stats.total }}</span>
          <span class="hm-figure-label desk-note">块合计</span>
        </li>
      </ul>

      <section class="hm-recent">
        <h2 class="hm-recent-title">最近活跃</h2>
        <ul v-if="recent.length" class="hm-recent-list">
          <li v-for="item in recent" :key="item.date" class="hm-recent-row">
            <span class="hm-recent-date">{{ item.date.slice(5) }} {{ weekdayOf(item.date) }}</span>
            <span class="hm-recent-bar desk-fill"><i :style="{ width: `${Math.max(6, Math.round((item.count / maxCount) * 100))}%` }" /></span>
            <span class="hm-recent-num">{{ item.count }}</span>
          </li>
        </ul>
        <p v-else class="hm-recent-empty desk-note">还没有记录</p>
      </section>
    </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 写作热力图详情（两栏）
 *
 * 左：一年 53 周的大图（周一开始，顶部月份标签，左侧周一/三/五标签，底部图例 + hover 读数）；
 * 右 240px：四个关键数字（有写天数 / 当前连续 / 最长连续 / 块合计）+「最近活跃」条形列表。
 *
 * 设计依据（apple-design-skill）：charting-data「一张图只讲一件事，细节按需展开」→ 具体日期/块数放 hover 与右栏；
 * accessibility「不要只靠颜色」→ 数字与列表同时给结论；layout「对齐与分组」→ 图与统计各自成组、统一基线；
 * typography「macOS 正文 13pt、最小 10pt」→ 数字 22 / 标签 11 / 读数 12。
 */
import { GlassButton } from "@/ui/controls"
import { computed, ref } from "vue"
import { buildGrid, buildStats, recentActive, splitGrid, useHeatmap, WEEKS_YEAR } from "./heatmap"
import "./styles.css"

/** 详情固定看一年（53 周），和卡片上的「近 N 周」无关 */
const { counts, error, reload } = useHeatmap(WEEKS_YEAR)

const hovered = ref("")
const grid = computed(() => buildGrid(counts.value ?? new Map(), WEEKS_YEAR))
/** 一年拆成上下两段（每段 ≤27 周），月份标签跟着段落走 */
const rows = computed(() => splitGrid(grid.value, 27))
const stats = computed(() => buildStats(counts.value ?? new Map(), WEEKS_YEAR))
const recent = computed(() => recentActive(counts.value ?? new Map(), 6))
const maxCount = computed(() => Math.max(1, ...recent.value.map((r) => r.count)))

const hoveredDay = computed(() => {
  if (!hovered.value) return null
  const count = counts.value?.get(hovered.value) ?? 0
  return { date: hovered.value, count }
})

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
const weekdayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number)
  return WEEK[new Date(y, m - 1, d).getDay()]
}

/** 窗口范围：从第一周周一到今天（不写到本周还没到的周日） */
const rangeText = computed(() => {
  if (!counts.value) return "近 53 周"
  const first = grid.value.weeks[0]?.[0]?.date ?? ""
  return `${first} → ${new Date().toLocaleDateString("sv-SE")}`
})
</script>

<style scoped>
.hm-panel {
  container-type: inline-size;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
}

.hm-body {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: var(--desk-detail-gap);
}

/* ── 左：图 ───────────────────────────────────────────── */
.hm-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  padding: var(--desk-detail-pad);
}

.hm-head {
  flex: none;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  min-width: 0;
}

.hm-range {
  margin: var(--desk-sp-0) 0 0;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

.hm-hint {
  margin: 0;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
  text-align: right;
}

.hm-chart {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

/* 左侧星期标签：7 行，只标一/三/五；高度与网格同一公式，所以和格子严丝合缝 */
/* 网格本体在 heatmap.css 的 .hg-* 里（卡片与详情共用），这里只留布局与 hover 描边 */
.hg {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.hg-cell.is-hover {
  outline: 1px solid var(--desk-text);
}

.hm-foot {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  min-width: 0;
}

.hm-caption {
  margin: 0;
  font-size: var(--desk-fs-body);
  color: var(--desk-text-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hm-caption b {
  color: var(--desk-text);
  font-weight: var(--desk-fw-semibold);
}

.hm-legend {
  flex: none;
  display: flex;
  align-items: center;
  gap: 3px;
  margin: 0;
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
}

.hm-legend .hg-cell {
  width: 10px;
  height: 10px;
  flex: none;
}

.hm-state {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-2);
}

.hm-state-text {
  font-size: var(--desk-fs-body);
  color: var(--desk-text-3);
}

/* ── 右：统计 ─────────────────────────────────────────── */
.hm-side {
  flex: 0 0 240px;
  width: 240px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-3);
  padding: var(--desk-detail-pad) var(--desk-sp-3);
  overflow-y: auto;
}

.hm-side

/* 四个数字：2×2，数字在上、标签在下（同一基线） */
.hm-figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--desk-sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hm-figure {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  padding: var(--desk-sp-2) 0;
  border-top: 1px solid var(--desk-stroke);
}

.hm-figure-num {
  font-size: var(--desk-fs-large);
  font-weight: var(--desk-fw-semibold);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.hm-recent {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  min-height: 0;
}

.hm-recent-title {
  margin: 0;
  font-size: var(--desk-fs-caption);
  font-weight: var(--desk-fw-semibold);
  color: var(--desk-text-3);
  letter-spacing: 0.06em;
}

.hm-recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1h);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hm-recent-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--desk-sp-2);
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-2);
  font-variant-numeric: tabular-nums;
}

.hm-recent-date {
  white-space: nowrap;
}

.hm-recent-bar {
  height: 5px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-text) 7%, transparent);
  overflow: hidden;
}

.hm-recent-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: color-mix(in srgb, var(--desk-accent) 72%, var(--desk-surface));
}

.hm-recent-num {
  color: var(--desk-text);
  min-width: 3ch;
  text-align: right;
}

/* ── 窄屏（<720px）：上下两段，统计挤到下面 ───────────── */
@container (max-width: 720px) {
  .hm-body {
    flex-direction: column;
    overflow-y: auto;
  }

  .hm-main {
    flex: 0 0 auto;
    padding: var(--desk-detail-pad) var(--desk-sp-3);
  }

  .hm-side {
    flex: 0 0 auto;
    width: auto;
    border-left: 0;
    border-top: 1px solid var(--desk-stroke);
    padding: var(--desk-sp-3);
  }
}
</style>
