<template>
  <div class="hm-card" :class="`is-${size}`">
    <div class="hm-body desk-seq">
      <template v-if="counts">
        <header v-if="plan.caption" class="hm-head">
          <span class="hm-title">写作热力图</span>
          <span class="hm-range">近 {{ weeks }} 周</span>
        </header>

        <div class="hm-chart">
          <div class="hg" :class="{ 'is-split': rows.length > 1 }">
            <div v-for="(row, ri) in rows" :key="ri" class="hg-row">
              <div v-if="plan.months" class="hg-months" :style="{ '--weeks': row.weeks.length }">
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
                    v-for="day in week"
                    :key="day.date"
                    class="hg-cell"
                    :class="`is-${day.level}`"
                    :title="`${day.date} · ${day.count} 块`"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ul v-if="plan.figures" class="hm-figures">
          <li class="hm-figure">
            <b>{{ stats.longest }}</b>
            <span>最长连续</span>
          </li>
          <li class="hm-figure">
            <b>{{ stats.busiest?.count ?? 0 }}</b>
            <span>单日最多</span>
          </li>
          <li class="hm-figure">
            <b>{{ stats.total }}</b>
            <span>块合计</span>
          </li>
        </ul>

        <footer class="hm-foot">
          <span class="hm-stat"><b>{{ stats.active }}</b> 天有写</span>
          <span class="hm-stat"><b>{{ stats.current }}</b> 天连续</span>
          <span v-if="plan.legend" class="hm-legend">
            <em>少</em><i class="hg-cell is-0" /><i class="hg-cell is-1" /><i class="hg-cell is-2" /><i class="hg-cell is-3" /><i class="hg-cell is-4" /><em>多</em>
          </span>
        </footer>
      </template>

      <div v-else class="hm-state">
        <span class="hm-state-text">{{ error ? "读取写作记录失败" : "读取中" }}</span>
        <button v-if="error" class="hm-retry" type="button" @click.stop="reload">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 写作热力图卡片
 *
 * 只画内容：一格 = 一天，深浅 = 当天新增/修改的块数（取 SiYuan 内核 SQL，和 siyuan-dashboard 同一条路）。
 * 取数、分档、统计都在 `./heatmap.ts`，外框/尺寸/菜单/详情由框架给。
 *
 * 按 Apple 的绘图规范（charting-data / charts / typography）：
 *   - 一张图只说一件事（哪天写了多少），细节（具体日期与块数）放到 hover 的 tooltip 与详情里；
 *   - 颜色只用主色的 5 档（0 档用文字色 8% 的底），不靠颜色单独传达信息 —— 底部同时给「N 天有写」的数字；
 *   - 深浅分档按四分位，不是线性映射，避免个别高产日把整张图压暗。
 *
 *   1x1  12 周网格
 *   2x1  26 周网格 + 一句统计
 *   2x2  26 周网格 + 标题 + 两句统计
 *   4x2  53 周网格（一年）+ 月份标签 + 图例
 *   2x4  26 周网格 + 标题 + 月份标签 + 两句统计
 */
import { computed } from "vue"
import { sizeTier } from "@/core/sizes"
import { buildGrid, buildStats, splitGrid, useHeatmap } from "./heatmap"
import "./styles.css"

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number }>(), { size: "2x2", w: 4, h: 2 })

interface Plan {
  weeks: number
  caption: boolean
  months: boolean
  legend: boolean
  /** 网格下面那排数字（有写 / 连续之外的三项） */
  figures: boolean
}

/** 版式：形状档只决定「显示哪些块」，其余字段沿用默认 */
const PLAN_BASE: Plan = { weeks: 53, caption: true, months: true, legend: true, figures: true }

const plan = computed<Plan>(() => {
  const tier = sizeTier(props.w ?? 4, props.h ?? 2)
  const base: Plan = { ...PLAN_BASE }
  if (tier === "wide") return { ...base, weeks: 26, months: false }
  if (tier === "tall") return { ...base, months: true, figures: true }
  if (tier === "mini") return { ...base, weeks: 13, months: false, legend: false, figures: false, caption: false }
  return { ...base, months: true }
})

const weeks = computed(() => plan.value.weeks)

const { counts, error, reload } = useHeatmap(weeks.value)

const grid = computed(() => buildGrid(counts.value ?? new Map(), weeks.value))
/** 超过 26 周就拆两段，别拉成一条长带 */
const rows = computed(() => splitGrid(grid.value, weeks.value > 30 ? Math.ceil(weeks.value / 2) : weeks.value))
const stats = computed(() => buildStats(counts.value ?? new Map(), weeks.value))
</script>

<style scoped>
/* 卡面：玻璃（信息可视化，跟随外观不透明度），格子用主色 5 档 */
.hm-card {
  container-type: size;
  position: relative;
  height: 100%;
  min-height: 0;
  padding: var(--desk-card-pad-y) var(--desk-card-pad-x);
  color: var(--desk-text);
  overflow: hidden;
}

.hm-body {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 2cqh, 10px);
  height: 100%;
  min-height: 0;
}

.hm-head {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-2);
  min-width: 0;
}

.hm-title {
  font-size: var(--desk-fs-card-title);
  font-weight: var(--desk-fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hm-range {
  font-size: var(--desk-fs-card-meta);
  color: var(--desk-text-3);
  white-space: nowrap;
}

.hm-chart {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--desk-sp-0);
}

.hm-chart .hg.is-split {
  width: 100%;
  height: 100%;
}

/* 图例里的小方块（网格本体在 heatmap.css 的 .hg-* 里） */
.hm-legend .hg-cell {
  width: clamp(6px, 2.6cqh, 10px);
  height: clamp(6px, 2.6cqh, 10px);
  flex: none;
}

/* 网格下面那排数字：三个，等宽，数字在上标签在下 */
.hm-figures {
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(6px, 2cqw, 14px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hm-figure {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding-top: clamp(4px, 1.6cqh, 8px);
  border-top: 1px solid var(--desk-stroke);
}

.hm-figure b {
  font-size: clamp(14px, 7cqh, 26px);
  font-weight: var(--desk-fw-semibold);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hm-figure span {
  font-size: var(--desk-fs-card-meta);
  color: var(--desk-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hm-foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: clamp(6px, 2cqw, 14px);
  font-size: var(--desk-fs-card-meta);
  color: var(--desk-text-2);
  min-width: 0;
}

.hm-stat b {
  color: var(--desk-text);
  font-weight: var(--desk-fw-semibold);
}

.hm-legend {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--desk-text-3);
}

.hm-legend .hm-cell {
  width: clamp(6px, 2.6cqh, 10px);
  height: clamp(6px, 2.6cqh, 10px);
  flex: none;
}

.hm-legend em {
  font-style: normal;
}

/* ── 加载 / 失败 ──────────────────────────────────────── */
.hm-state {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-2);
  text-align: center;
}

.hm-state-text {
  font-size: var(--desk-fs-card-meta);
  color: var(--desk-text-3);
}

.hm-retry {
  padding: 1px 10px;
  border-radius: var(--desk-r-pill);
  border: 1px solid var(--desk-stroke);
  background: var(--desk-glass-clear);
  color: var(--desk-text);
  font: inherit;
  font-size: var(--desk-fs-card-meta);
  cursor: pointer;
}

/* ── 尺寸版式 ─────────────────────────────────────────── */
.is-wide:not(.is-big) .hm-body {
  justify-content: center;
}

.is-tall .hm-chart {
  flex: 0 0 auto;
  height: 56%;
}

.is-tall .hm-foot {
  flex-wrap: wrap;
  align-content: flex-start;
}

/* ── 按实际像素再降档 ─────────────────────────────────── */
/* 尺寸档只说明「几格」：桌面卡片多的时候单格只有 ~70px，2x2 实际 152×152 ——
   三个数字会被挤成「12… 13…」，所以小块先把数字收掉，再小就只留网格。 */
@container (max-width: 260px) {
  .hm-figures {
    display: none;
  }
}

/* 矮卡片（2x1 实测 73px 高）：只留网格，统计行放不下；网格改为填满（格子会扁一点，但不撑高） */
@container (max-height: 120px) {
  .hm-foot {
    display: none;
  }

  .hm-chart > .hg {
    height: 100%;
    min-height: 0;
  }

  .hm-chart .hg-weeks {
    height: 100%;
  }
}

/* 窄卡片：标题旁的「近 N 周」让位，免得标题被省略号切断 */
@container (max-width: 200px) {
  .hm-range {
    display: none;
  }
}
</style>
