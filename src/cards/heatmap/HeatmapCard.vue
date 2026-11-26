<template>
  <div class="hc-card">
    <div class="hc-body">
      <div v-if="counts" class="hc-grid">
        <template v-for="(week, wi) in grid.weeks" :key="wi">
          <span
            v-for="day in week"
            :key="day.date"
            class="hc-cell"
            :class="`is-${day.level}`"
            :title="t('card.heatmap.cell', { date: day.date, count: day.count })"
          />
        </template>
      </div>
      <div v-else class="hc-state">{{ error || t("common.loading") }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 写作热力图卡片（只画格子）
 *
 * 一格 = 一天，深浅 = 当天新增/修改的块数（内核 SQL，和 siyuan-dashboard 同一条路）。
 * 卡片不写任何文字：只有网格，因此任何尺寸都不会出现文字挤压或月份标签错位；
 * 周数按卡片形状自适应，只显示最近一部分。取数与分档在 `./heatmap.ts`。
 */
import { computed } from "vue"
import { t } from "@/core/i18n"
import { buildGrid, useHeatmap } from "./heatmap"

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number }>(), { size: "2x2", w: 4, h: 2 })

/** 列数 = 7 × 宽/高：7 行铺满高度，列数让格子接近正方形；夹在 6~26 周 */
const weeks = computed(() => {
  const w = props.w ?? 4
  const h = props.h ?? 2
  return Math.max(6, Math.min(26, Math.round((7 * w) / h)))
})

const { counts, error } = useHeatmap(weeks.value)
const grid = computed(() => buildGrid(counts.value ?? new Map(), weeks.value))
</script>

<style scoped>
/* 卡片只有网格（类名 hc-*，与详情的 .hg-* 完全隔离，互不影响） */
.hc-card {
  container-type: size;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.hc-body {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  padding: 3cqmin;
}

.hc-grid {
  flex: 1 1 0;
  display: grid;
  grid-template-rows: repeat(7, minmax(0, 1fr));
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 2px;
  width: 100%;
  min-width: 0;
  height: 100%;
}

.hc-cell {
  border-radius: 2px;
  background: color-mix(in srgb, var(--desk-text) 8%, transparent);
}

.hc-cell.is-1 { background: color-mix(in srgb, var(--desk-accent) 26%, transparent); }
.hc-cell.is-2 { background: color-mix(in srgb, var(--desk-accent) 46%, transparent); }
.hc-cell.is-3 { background: color-mix(in srgb, var(--desk-accent) 68%, transparent); }
.hc-cell.is-4 { background: var(--desk-accent); }

.hc-state {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: clamp(9px, 8cqmin, 14px);
  color: var(--desk-text-3);
}
</style>
