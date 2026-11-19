<template>
  <div class="hm-card">
    <div class="hm-body">
      <template v-if="counts">
        <div class="hm-chart">
          <div class="hg">
            <template v-for="(week, wi) in grid.weeks" :key="wi">
              <span
                v-for="day in week"
                :key="day.date"
                class="hg-cell"
                :class="`is-${day.level}`"
                :title="`${day.date} · ${day.count} 块`"
              />
            </template>
          </div>
        </div>
      </template>
      <div v-else class="hm-state">
        <span>{{ error || "加载中…" }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
/**
 * 写作热力图卡片（只画格子）
 *
 * 一格 = 一天，深浅 = 当天新增/修改的块数（内核 SQL，和 siyuan-dashboard 同一条路）。
 * 卡片不写任何文字：只有网格，所以任何尺寸都不会出现"文字挤压/月份标签错位"；
 * 周数按卡片宽度自适应（格子保持接近正方形），只显示**最近一部分**。
 * 取数与分档在 `./heatmap.ts`；日期细节放 hover 的 title。
 */
import { computed } from "vue"
import { buildGrid, useHeatmap } from "./heatmap"
import "./styles.css"

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number }>(), { size: "2x2", w: 4, h: 2 })

/**
 * 周数：让格子接近正方形 —— 7 行铺满高度，列数 = 7 × 宽/高。
 * 卡片越宽给的周数越多；夹在 6~26 周（太少没趋势，太多格子就细了）。
 */
const weeks = computed(() => {
  const w = props.w ?? 4
  const h = props.h ?? 2
  return Math.max(6, Math.min(26, Math.round((7 * w) / h)))
})

const { counts, error } = useHeatmap(weeks.value)
const grid = computed(() => buildGrid(counts.value ?? new Map(), weeks.value))
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
