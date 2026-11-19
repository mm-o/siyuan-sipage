<template>
  <div class="cd-card" :class="`is-${size}`">
    <div class="cd-body">
      <template v-if="hero">
        <!-- 主事件：封面 + 标题 + 还剩/已经 + 大数字（对齐 参考实现 的 .dma-hero） -->
        <article class="cd-hero" :style="{ backgroundImage: coverStyleOf(hero.event) }">
          <p class="cd-hero-title">
            {{ hero.event.title }}<span class="cd-hero-prefix">{{ hero.prefix }}</span>
          </p>
          <p class="cd-hero-days">
            <b>{{ hero.value }}</b><em>{{ hero.unit }}</em>
          </p>
          <p v-if="plan.date" class="cd-hero-date">{{ hero.dateText }}</p>
        </article>

        <!-- 其余事件：图标块 + 标题 + 日期 + 数字（对齐 .dma-row） -->
        <ul v-if="plan.rows" class="cd-rows desk-seq">
          <li v-for="item in rows" :key="item.event.id" class="cd-row">
            <span class="cd-tile" :style="{ background: softOf(categoryOf(item.event.category).color), color: categoryOf(item.event.category).color }">
              <component :is="categoryOf(item.event.category).icon" :size="18" :stroke-width="1.9" />
            </span>
            <span class="cd-row-main">
              <span class="cd-row-title">{{ item.event.title }}</span>
              <span class="cd-row-date">{{ item.dateText }}</span>
            </span>
            <span class="cd-row-days">
              <em>{{ item.prefix }}</em><b>{{ item.value }}</b><em>{{ item.unit }}</em>
            </span>
          </li>
        </ul>
      </template>

      <div v-else class="cd-empty">
        <p>还没有倒数日</p>
        <p class="cd-empty-hint">点开卡片新建一个</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 倒数日卡片
 *
 * 视觉对齐 参考实现 的 daysMatter：封面压暗 + 白字的主事件块（标题 / 还剩·已经 / 大数字 / 目标日），
 * 其余事件是「图标块 + 标题日期 + 数字」的列表行。卡面是实色卡（`surface: "solid"`），
 * 按尺寸裁块，不缩外框。
 *
 *   1x1  主事件：标题 + 数字
 *   2x1  主事件横排：标题 + 数字 + 日期
 *   2x2  主事件 + 2 行
 *   4x2  左侧主事件、右侧 3 行
 *   2x4  主事件 + 5 行
 */
import { computed } from "vue"
import type { CardSize } from "@/core/registry"
import { countdown } from "@/core/store"
import { categoryOf, coverStyleOf, sortViews, softOf } from "./countdown"

const props = withDefaults(defineProps<{ size?: CardSize }>(), { size: "2x2" })

interface Plan {
  /** 显示目标日 */
  date: boolean
  /** 列表最多几行（0 = 不显示列表） */
  rows: number
}

const PLAN: { [K in CardSize]?: Plan } = {
  "1x1": { date: false, rows: 0 },
  "2x1": { date: true, rows: 0 },
  "2x2": { date: true, rows: 2 },
  "4x2": { date: true, rows: 3 },
  "2x4": { date: true, rows: 5 },
}

const plan = computed(() => PLAN[props.size] ?? PLAN["2x2"]!)

const ordered = computed(() => sortViews(countdown.events))
const hero = computed(() => ordered.value[0] ?? null)
const rows = computed(() => (plan.value.rows ? ordered.value.slice(1, 1 + plan.value.rows) : []))
</script>

<style scoped>
/* 实色卡：和日历一样是「纸面」，不吃外观的玻璃底色。
   卡片不留外圈留白 —— 主事件直接铺满，白的只出现在块与块的缝隙里（iTab 的 widget 也是这样）。 */
.cd-card {
  container-type: size;
  position: relative;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
  background: var(--desk-surface);
  overflow: hidden;
}

.cd-body {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(3px, 1.4cqh, 8px);
  height: 100%;
  min-height: 0;
}

/* ── 主事件块 ─────────────────────────────────────────── */
.cd-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(2px, 1.4cqh, 8px);
  min-height: 0;
  padding: clamp(10px, 6cqh, 22px) clamp(12px, 5cqw, 20px);
  border-radius: 0;
  color: #fff;
  background-color: #0f172a;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.cd-hero-title {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-1h);
  margin: 0;
  font-size: var(--desk-fs-card-title);
  font-weight: var(--desk-fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-hero-prefix {
  font-size: var(--desk-fs-card-meta);
  font-weight: 400;
  color: rgb(255 255 255 / 80%);
}

/* 大数字：按卡片高度缩放，上限只在这里给 */
.cd-hero-days {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-0);
  margin: 0;
  line-height: 1;
  white-space: nowrap;
}

.cd-hero-days b {
  font-size: clamp(24px, 26cqh, 92px);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.cd-hero-days em {
  margin-left: var(--desk-sp-0);
  font-size: var(--desk-fs-card-meta);
  font-style: normal;
  color: rgb(255 255 255 / 84%);
}

.cd-hero-date {
  margin: 0;
  font-size: var(--desk-fs-card-meta);
  color: rgb(255 255 255 / 72%);
}

/* ── 列表行 ───────────────────────────────────────────── */
.cd-rows {
  display: grid;
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(3px, 1.4cqh, 8px);
  margin: 0;
  /* 行不贴死卡片边：白的只在这里露一圈，和 iTab 卡片里的行一致 */
  padding: 0 clamp(4px, 2cqw, 10px) clamp(4px, 2cqh, 10px);
  min-height: 0;
  list-style: none;
  overflow: hidden;
}

.cd-row {
  display: flex;
  align-items: center;
  gap: clamp(4px, 2cqw, 10px);
  min-height: 0;
  padding: clamp(4px, 1.6cqh, 10px) clamp(6px, 2.4cqw, 12px);
  border-radius: clamp(6px, 2.4cqh, 10px);
  border: 1px solid var(--desk-stroke);
  background: color-mix(in srgb, var(--desk-text) 4%, transparent);
  overflow: hidden;
}

.cd-tile {
  flex: none;
  display: grid;
  place-items: center;
  width: clamp(20px, 12cqh, 40px);
  height: clamp(20px, 12cqh, 40px);
  border-radius: var(--desk-r-control);
}

.cd-row-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cd-row-title {
  font-size: clamp(11px, 5.6cqh, 18px);
  font-weight: var(--desk-fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-row-date {
  font-size: var(--desk-fs-card-sub);
  color: var(--desk-text-3);
  white-space: nowrap;
}

.cd-row-days {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-0);
  white-space: nowrap;
}

.cd-row-days b {
  font-size: clamp(14px, 7.4cqh, 28px);
  font-weight: var(--desk-fw-semibold);
}

.cd-row-days em {
  font-size: var(--desk-fs-card-sub);
  font-style: normal;
  color: var(--desk-text-3);
}

/* ── 空状态 ───────────────────────────────────────────── */
.cd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-1);
  min-height: 0;
  text-align: center;
  color: var(--desk-text-2);
}

.cd-empty p {
  margin: 0;
  font-size: clamp(11px, 5.6cqh, 18px);
}

.cd-empty-hint {
  color: var(--desk-text-3);
  font-size: var(--desk-fs-card-sub);
}

/* ── 尺寸版式 ─────────────────────────────────────────── */
/* 1x1：只留标题 + 数字，垂直居中 */
.is-1x1 .cd-hero {
  justify-content: center;
}

/* 2x1：主事件横排（标题在上、数字在下，右侧日期） */
.is-2x1 .cd-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "title date"
    "days  date";
  align-content: center;
  column-gap: clamp(8px, 3cqw, 20px);
}
.is-2x1 .cd-hero-title {
  grid-area: title;
}
.is-2x1 .cd-hero-days {
  grid-area: days;
}
.is-2x1 .cd-hero-date {
  grid-area: date;
  align-self: center;
  text-align: right;
}

/* 4x2：左主事件、右 3 行 */
.is-4x2 .cd-body {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  grid-template-rows: minmax(0, 1fr);
  column-gap: clamp(6px, 2.4cqw, 14px);
}

/* 2x4：主事件在上、5 行在下 */
.is-2x4 .cd-body {
  grid-template-rows: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

/* ── 按实际像素再降档 ─────────────────────────────────── */
/* 尺寸档只说明「几格」，像素大小由桌面上的卡片数决定：6~7 张卡时单格只有 ~70px，
   2x2 实际 152×152 —— 再塞两行列表会把标题和数字挤重叠，所以小块只留主事件（等于 1x1 的信息量）。 */
@container (max-width: 259px) {
  .cd-rows {
    display: none;
  }
}

@container (max-height: 259px) {
  .is-2x2 .cd-rows,
  .is-4x2 .cd-rows {
    display: none;
  }
}
</style>
