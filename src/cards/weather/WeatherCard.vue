<template>
  <div class="wx" :style="{ backgroundImage: sky }">
    <template v-if="data">
      <!-- 上：左「地名 + 温度」，右「天气 + 最高最低」 -->
      <div class="top">
        <div class="left">
          <span class="place"><MapPin :size="12" :stroke-width="2" />{{ place?.name }}</span>
          <b class="temp">{{ data.now.temp }}°</b>
        </div>
        <div class="right">
          <span class="desc">{{ cond.label }}<component :is="cond.icon" class="icon" :stroke-width="1.6" /></span>
          <span class="range">最低 {{ today.min }}° 最高 {{ today.max }}°</span>
        </div>
      </div>

      <!-- 中：逐时（卡片够高才出现，形态分界点，不另写一套逻辑） -->
      <ul class="hours">
        <li v-for="h in hours" :key="h.time">
          <span class="h-time">{{ h.time.slice(11, 16) }}</span>
          <component :is="describe(h.code).icon" class="h-icon" :stroke-width="1.6" />
          <span class="h-temp">{{ h.temp }}°</span>
        </li>
      </ul>

      <!-- 下：未来 6 天 -->
      <ul class="days">
        <li v-for="(day, i) in forecast" :key="day.date">
          <span class="d-week">{{ weekOf(day.date, i) }}</span>
          <component :is="describe(day.code).icon" class="d-icon" :stroke-width="1.6" />
          <span class="d-temp">{{ day.min }}~{{ day.max }}</span>
        </li>
      </ul>
    </template>

    <div v-else class="state">
      <span>{{ error || "加载中…" }}</span>
      <button v-if="error" type="button" @click.stop="reload">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 天气卡（对齐 iTab app-weather）
 * 上：地名 + 大温度 / 天气 + 高低温；下：未来 6 天。字号全部 cqmin，等比放大不变形。
 */
import { computed } from "vue"
import { MapPin } from "lucide-vue-next"
import { describe, skyBackdrop, useWeather } from "./weather"

const { place, data, error, reload } = useWeather()

const cond = computed(() => describe(data.value?.now.code ?? 0, false))
const sky = computed(() => skyBackdrop(data.value?.now.code ?? 0, data.value?.now.isDay ?? true))

const today = computed(() => data.value?.days?.[0] ?? { max: 0, min: 0 })
/** 接下来 4 个整点（够高的卡片才显示） */
const hours = computed(() => (data.value?.hours ?? []).slice(1, 5))

const forecast = computed(() => (data.value?.days ?? []).slice(1, 7))

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
function weekOf(date: string, i: number) {
  if (i === 0) return "明天"
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? `第${i + 1}天` : WEEK[d.getDay()]
}
</script>

<style scoped>
.wx {
  container-type: size;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2cqmin;
  width: 100%;
  height: 100%;
  padding: 6px;
  overflow: hidden;
  background-color: #184482;
  background-size: cover;
  background-position: center;
  color: #fff;
}

/* 上半：左右两栏 */
.top {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: space-between;
  gap: 3cqmin;
  min-width: 0;
  min-height: 0;
}

.left,
.right {
  display: flex;
  flex-direction: column;
  gap: 0.5cqmin;
  min-width: 0;
}

/* 左栏（地名 + 温度）优先占宽，右栏只拿它需要的宽度 */
.left {
  flex: 1 1 auto;
}

.right {
  flex: 0 0 auto;
}

.temp {
  flex: none;
}

.right {
  align-items: flex-end;
  text-align: right;
}

/* 所有文字单行，绝不溢出 */
.place,
.temp,
.desc,
.range,
.d-week,
.d-temp {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.place {
  display: inline-flex;
  align-items: center;
  gap: 0.5cqmin;
  font-size: min(11cqmin, 7cqh);
  font-weight: 500;
}

.temp {
  font-size: min(34cqmin, 26cqh);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.desc {
  display: inline-flex;
  align-items: center;
  gap: 0.4cqmin;
  font-size: min(11cqmin, 7cqh);
}

.icon {
  width: 1.15em;
  height: 1.15em;
  flex: none;
}

.range {
  display: none;
  font-size: min(9.5cqmin, 6cqh);
  opacity: 0.86;
}

/* 逐时：默认不显示，卡片够高才长出来 */
.hours {
  display: none;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 1cqmin;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hours li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4cqmin;
  min-width: 0;
  line-height: 1.15;
}

.h-time,
.h-temp {
  font-size: min(8.5cqmin, 5.5cqh);
  font-variant-numeric: tabular-nums;
}

.h-icon {
  width: min(9cqmin, 9cqh);
  height: min(9cqmin, 9cqh);
}

/* 下半：未来 6 天等分列 */
.days {
  display: none;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 1cqmin;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.days li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5cqmin;
  min-width: 0;
  line-height: 1.15;
}

.d-week {
  font-size: min(8.5cqmin, 5.5cqh);
}

.d-icon {
  width: min(9cqmin, 9cqh);
  height: min(9cqmin, 9cqh);
}

.d-temp {
  font-size: min(8.5cqmin, 5.5cqh);
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}

/* 形态：窄卡只给温度 → 够宽加地名与天气 → 再宽才加高低温与预报 */
@container (min-width: 120px) {
  .place,
  .desc {
    display: inline-flex;
  }
}

@container (min-width: 200px) {
  .range {
    display: inline-flex;
  }
}

@container (min-width: 200px) {
  .days {
    display: grid;
  }
}

/* 再高一档（≥460px）：逐时改竖排，一条一行，把高度用起来 */
@container (min-height: 460px) {
  .hours {
    grid-auto-flow: row;
    grid-auto-columns: auto;
    gap: 0.8cqmin;
  }

  .hours li {
    flex-direction: row;
    justify-content: space-between;
    gap: 1cqmin;
    padding-inline: 2cqmin;
  }
}

/* 形态分界点：够高（≥260px）才长逐时那一行，保证上/中/下三块都放得下 */
@container (min-height: 260px) {
  .hours {
    display: grid;
  }
}

.state {
  display: grid;
  place-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  font-size: 8cqmin;
  opacity: 0.9;
}
</style>
