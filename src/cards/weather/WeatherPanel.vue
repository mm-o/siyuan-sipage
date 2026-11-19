<template>
  <div class="wx-panel desk-seq">
    <div class="wx-panel-inner desk-seq">
      <!-- 左：天气（结构对齐 参考实现 的 Content.vue：头 → 大温度 → 指标 → 天气状况 → 7日） -->
      <section class="wx-main desk-pane is-left" :style="{ backgroundImage: sky }">
        <header class="wx-head">
          <p class="wx-main-place">
            <span v-if="place?.admin1" class="wx-main-region">{{ place.admin1 }} · </span>{{ place?.name }}
            <span class="wx-head-cond">{{ data ? cond.label : "" }}</span>
            <span class="wx-head-time">{{ data ? `发布于:${data.now.time.replace("T", " ")}` : "" }}</span>
          </p>
          <button class="wx-manage" type="button" @click="showPlaces = !showPlaces">
            {{ showPlaces ? "收起地点" : "管理地点" }}
          </button>
        </header>

        <div v-if="!data" class="wx-main-state">
          <span class="wx-main-state-text">{{ error || "加载中" }}</span>
          <button v-if="error" class="wx-btn" type="button" @click="reload">重试</button>
        </div>

        <template v-else>
          <section class="wx-now">
            <span class="wx-main-temp">{{ data.now.temp }}°</span>
            <div class="wx-now-side">
              <p class="wx-now-cond">
                <component :is="cond.icon" :size="18" :stroke-width="1.6" />
                <span>{{ cond.label }}</span>
                <span class="wx-now-wind">{{ data.now.wind }} km/h</span>
              </p>
              <p class="wx-now-feel">体感 {{ data.now.feels }}° · 湿度 {{ data.now.humidity }}%</p>
            </div>
          </section>

          <ul class="wx-meta">
            <li>温度 {{ today.min }}°~{{ today.max }}°</li>
            <li>湿度 {{ data.now.humidity }}%</li>
            <li>风速 {{ data.now.wind }} km/h</li>
            <li>体感 {{ data.now.feels }}°</li>
            <li>日出 {{ today.sunrise }}</li>
            <li>日落 {{ today.sunset }}</li>
          </ul>

          <!-- 天气状况：24 小时（横向可滚） -->
          <section v-if="data.hours.length" class="wx-block">
            <h3 class="wx-block-title">天气状况</h3>
            <ul class="wx-hours desk-seq">
              <li v-for="hour in data.hours" :key="hour.time" class="wx-hour">
                <span class="wx-hour-time">{{ hour.time.slice(11, 16) }}</span>
                <component :is="describe(hour.code).icon" :size="20" :stroke-width="1.6" />
                <span class="wx-hour-temp">{{ hour.temp }}°</span>
              </li>
            </ul>
          </section>

          <!-- 7 日天气预报：7 列 + 一条最高温折线 -->
          <section class="wx-block wx-daily">
            <h3 class="wx-block-title">7日天气预报</h3>
            <ul class="wx-daily-list">
              <li v-for="(day, i) in data.days" :key="day.date" class="wx-main-day">
                <span class="wx-main-day-week">{{ dayLabel(day.date, i) }}</span>
                <span class="wx-main-day-date">{{ day.date.slice(5).replace("-", "/") }}</span>
                <span class="wx-main-day-line">
                  <component :is="describe(day.code).icon" :size="18" :stroke-width="1.6" />
                  <span class="wx-main-day-text">{{ describe(day.code).label }}</span>
                </span>
                <span class="wx-main-day-temp">{{ day.max }}°<i>{{ day.min }}°</i></span>
              </li>
            </ul>
            <svg class="wx-daily-chart" viewBox="0 0 700 60" preserveAspectRatio="none" aria-hidden="true">
              <polyline :points="chart.max" fill="none" stroke="rgb(255 255 255 / 70%)" stroke-width="2" vector-effect="non-scaling-stroke" />
              <polyline :points="chart.min" fill="none" stroke="rgb(255 255 255 / 32%)" stroke-width="2" vector-effect="non-scaling-stroke" />
            </svg>
          </section>
        </template>
      </section>

      <!-- 右：天气列表（对齐 参考实现 的 weather-list.vue：240px 竖栏，当前项高亮，hover 出删除） -->
              <PlacesDrawer
          :places="locations"
          :active-id="activeId"
          :metas="metas"
          :sky="sky"
          :cond-of="condOf"
        />

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 天气详情（两段式，结构与配色对齐 参考实现 的天气详情）
 *
 * 左「天气」：地点/省份 + 描述 + 发布时间 → 80px 温度 + 描述/风/体感 → 指标行 →
 *            天气状况（24 小时）→ 7日天气预报（7 列 + 最高/最低温折线）。
 * 右「天气列表」：240px 竖栏（`w-60`），搜索（防抖 300ms）→ 候选 → 已保存地点卡片
 *            （名称 / 天气 / 22px 温度 / 最高最低，当前项高亮，hover 出删除）。
 * 窄屏（<720px）：上下两段，右栏收进「管理地点」。
 */
import { computed, onBeforeUnmount, ref } from "vue"
import { Pin, Trash2 } from "lucide-vue-next"
import {
  addWeatherPlace,
  pinWeatherPlace, removeWeatherPlace,
  selectWeatherPlace,
  weather,
  type WeatherPlace,
} from "@/core/store"
import PlacesDrawer from "./PlacesDrawer.vue"
import { describe, preciseLocate, searchPlaces, skyBackdrop, usePlaceWeather, useWeather } from "./weather"

const { place, data, error, reload } = useWeather()

const locations = computed(() => weather.locations)
const activeId = computed(() => weather.activeId)

/** 每个已存地点的天气（右侧列表用它显示各自温度；命中缓存就不发请求） */
const metas = usePlaceWeather()
const condOf = (id: string) => describe(metas[id]?.now.code ?? -1, !metas[id]?.now.isDay)

const cond = computed(() => describe(data.value?.now.code ?? -1, !data.value?.now.isDay))
/** 整个详情铺当前天气的天空渐变（和卡片同一套） */
const sky = computed(() => skyBackdrop(data.value?.now.code ?? 2, data.value?.now.isDay ?? true))

const today = computed(() => data.value?.days[0] ?? { date: "", code: 0, max: 0, min: 0, sunrise: "", sunset: "" })

/** 7 日最高/最低温折线：x 按列均分，y 按 7 天区间归一 */
const chart = computed(() => {
  const days = data.value?.days ?? []
  if (!days.length) return { max: "", min: "" }
  const max = days.map((d) => d.max)
  const min = days.map((d) => d.min)
  const lo = Math.min(...min)
  const hi = Math.max(...max)
  const span = hi - lo || 1
  const line = (values: number[]) =>
    values.map((v, i) => `${(i + 0.5) * (700 / values.length)},${52 - ((v - lo) / span) * 40}`).join(" ")
  return { max: line(max), min: line(min) }
})

/* ── 搜索（防抖 300ms）────────────────────────────────── */

/** 请求代号：只有最后一次搜索的结果能落到界面上 */

/** 定位：系统定位优先，拿不到就用 IP 定位（区县级精度靠系统定位） */
/** 加入并切换到该地点，搜索框与候选清空（避免重复加入） */


/* ── 窄屏：右栏收成「管理地点」按钮 ───────────────────── */
const showPlaces = ref(false)

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function dayLabel(date: string, index: number) {
  if (index < 2) return index === 0 ? "今天" : "明天"
  const [y, m, d] = date.split("-").map(Number)
  return WEEK[new Date(y, m - 1, d).getDay()]
}
</script>

<style scoped>
/**
 * 配色对齐 参考实现：天空渐变底 + 白字，内容区留白 pt-30 / pr-12 / pb-20 / pl-24，
 * 区块用 `rgb(255 255 255 / 8%)` 圆角块，右栏 `rgb(255 255 255 / 7%)` + 毛玻璃。
 * 这里不用 `--desk-*` 文字令牌：这张面板自己画背景（和照片卡同类），白字才可读。
 */
.wx-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  container-type: inline-size;
  color: #fff;
}

.wx-panel-inner {
  display: flex;
  gap: var(--desk-detail-gap);
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* ── 左：天气 ──────────────────────────────────────────── */
.wx-now {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-4);
  min-width: 0;
}

.wx-now-side {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  min-width: 0;
}

.wx-now-cond {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  margin: 0;
  font-size: var(--desk-fs-body);
  white-space: nowrap;
}

.wx-now-wind {
  color: rgb(255 255 255 / 72%);
}

.wx-now-feel {
  margin: 0;
  font-size: var(--desk-fs-sm);
  color: rgb(255 255 255 / 72%);
  white-space: nowrap;
}

.wx-main-temp {
  font-size: clamp(44px, 9cqh, 80px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* 指标：一行铺开，超宽自动换行（不会挤成一列） */
.wx-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--desk-sp-1) var(--desk-sp-4);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--desk-fs-body);
  color: rgb(255 255 255 / 88%);
}

.wx-meta li {
  white-space: nowrap;
}

.wx-hour-time {
  font-size: var(--desk-fs-caption);
  color: rgb(255 255 255 / 72%);
  white-space: nowrap;
}

.wx-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-3);
  padding: 26px 16px 18px 22px;
  background-color: #184482;
  background-size: cover;
  background-position: center;
  overflow-y: auto;
  scrollbar-width: none;
}

.wx-main::-webkit-scrollbar {
  display: none;
}

.wx-head {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-3);
  font-size: var(--desk-fs-sm);
}

.wx-main-place {
  margin: 0;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wx-main-region {
  color: rgb(255 255 255 / 82%);
}

.wx-head-cond {
  margin-left: var(--desk-sp-2);
}

.wx-head-time {
  margin-left: 20px;
  color: rgb(255 255 255 / 72%);
}

/* 只有窄屏才出现（容器查询里放开） */
.wx-locate {
  width: 100%;
  height: 26px;
  margin-top: 6px;
  border: 0;
  border-radius: 8px;
  background: rgb(255 255 255 / 14%);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.wx-locate:disabled { opacity: 0.6; cursor: default; }

.wx-manage {
  display: none;
  margin-left: auto;
  height: 24px;
  padding: 0 10px;
  border-radius: var(--desk-r-sm);
  border: 1px solid rgb(255 255 255 / 22%);
  background: rgb(255 255 255 / 16%);
  color: #fff;
  font: inherit;
  font-size: var(--desk-fs-sm);
  cursor: pointer;
}

.wx-main-state {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-2h);
}

.wx-main-state-text {
  font-size: var(--desk-fs-body);
  color: rgb(255 255 255 / 72%);
}

.wx-btn {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--desk-r-sm);
  border: 1px solid rgb(255 255 255 / 26%);
  background: rgb(255 255 255 / 18%);
  color: #fff;
  font: inherit;
  font-size: var(--desk-fs-sm);
  cursor: pointer;
}

/* 大温度区：80px 数字 + 右侧描述/风/体感（对齐 参考实现 的 section.wx-main-temp {
  font-size: 80px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
}

.wx-now-side {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2h);
  min-width: 0;
}

.wx-now-cond {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2h);
  margin: 0;
  font-size: var(--desk-fs-body);
}

.wx-now-wind {
  color: rgb(255 255 255 / 82%);
}

.wx-now-feel {
  margin: 0;
  font-size: var(--desk-fs-body);
  color: rgb(255 255 255 / 72%);
}

/* 指标行（参考实现的 ul/* 圆角块（参考实现：rounded-xl bg-white/8 px-3.5 py-3） */
.wx-block {
  padding: var(--desk-sp-3) 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 8%);
}

.wx-block-title {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1h);
  margin: 0 0 10px;
  font-size: var(--desk-fs-sm);
  font-weight: 500;
  color: rgb(255 255 255 / 65%);
}

/* 天气状况：24 小时横向滚动，每列 44px */
.wx-hours {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 44px;
  gap: 0;
  margin: 0;
  padding: 0 0 4px;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
  /* 右侧收个淡出，越界的下一列不会硬切 */
  mask-image: linear-gradient(to right, #000 92%, transparent);
}

.wx-hours::-webkit-scrollbar {
  display: none;
}

.wx-hour {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--desk-sp-2);
  font-size: var(--desk-fs-sm);
}

.wx-hour-temp {
  color: #fff;
}

/* 7 日：7 列 + 温度折线 */
.wx-daily {
  position: relative;
  padding-bottom: var(--desk-sp-3);
}

.wx-daily-list {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.wx-main-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--desk-sp-1h);
  min-width: 0;
  font-size: var(--desk-fs-sm);
  text-align: center;
}

.wx-main-day-week {
  font-size: var(--desk-fs-body);
}

.wx-main-day-date {
  font-size: var(--desk-fs-caption);
  color: rgb(255 255 255 / 60%);
}

.wx-main-day-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--desk-sp-0);
  max-width: 100%;
}

/* 7 列只有 ~64px 宽：「小毛毛雨」这类折两行，两行高度固定住，7 列的温度才对得齐 */
.wx-main-day-text {
  min-height: 28px;
  font-size: var(--desk-fs-caption);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.wx-main-day-temp {
  font-size: var(--desk-fs-body);
}

.wx-main-day-temp i {
  margin-left: var(--desk-sp-1h);
  font-style: normal;
  color: rgb(255 255 255 / 55%);
}

/* 折线铺在 7 列下面一条，只做趋势（参考实现那条用 echarts，这里不引图表库） */
.wx-daily-chart {
  display: block;
  width: 100%;
  height: 44px;
  margin-top: var(--desk-sp-1);
}

/* ── 右：天气列表（参考实现在 w-60 / bg-white-7 / p-4 pl-2）──── */
/* 右侧地点栏：与日历/倒计日一致的双栏结构（统一令牌，不是浮层） */


.wx-loc {
  position: relative;
  flex: 0 0 auto;
  border-radius: 12px;
  background: rgb(21 66 128 / 58%);
  border: 1px solid rgb(255 255 255 / 10%);
}

.wx-loc.is-active {
  background: rgb(21 66 128 / 82%);
  border-color: rgb(255 255 255 / 55%);
}

.wx-loc-pick {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--desk-sp-2);
  width: 100%;
  padding: var(--desk-sp-0) 12px 10px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  color: #d5d5d5;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.wx-loc-main {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  min-width: 0;
}

.wx-loc-name {
  font-size: var(--desk-fs-lg);
  line-height: 35px;
  color: #efefef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wx-loc-cond {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1);
  font-size: var(--desk-fs-sm);
}

.wx-loc-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--desk-sp-0);
  flex: 0 0 auto;
}

.wx-loc-deg {
  font-size: 22px;
  font-weight: 700;
  line-height: 35px;
}

.wx-loc-range {
  font-size: var(--desk-fs-caption);
  white-space: nowrap;
}

@container (max-width: 720px) {
  .wx-panel-inner {
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .wx-panel-inner::-webkit-scrollbar {
    display: none;
  }

  .wx-head {
    align-items: flex-start;
  }

  .wx-main {
    flex: 1 0 auto;
    padding: 24px 20px 16px;
    overflow: visible;
  }

  .wx-manage {
    display: inline-flex;
    align-items: center;
    margin-left: var(--desk-sp-2);
  }

  .wx-places {
    flex: 0 0 auto;
    width: auto;
    display: none;
    background: rgb(255 255 255 / 7%);
  }

  .wx-places.is-open {
    display: flex;
  }

  .wx-locs {
    flex: 0 0 auto;
  }
}
</style>
