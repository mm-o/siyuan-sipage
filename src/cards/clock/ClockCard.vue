<template>
  <div class="clock" :class="{ tall }">
    <!-- 长条竖版：上「时」、下「分」 -->
    <template v-if="tall">
      <div class="row"><span class="unit"><span class="roll" :key="`h${hh}`">{{ hh }}</span></span></div>
      <div class="row"><span class="unit"><span class="roll" :key="`m${mm}`">{{ mm }}</span></span></div>
      <div class="date">{{ monthDay }}</div>
      <div class="week">{{ week }}</div>
    </template>

    <!-- 其它比例：一行时间（够宽就带秒），下面日期 -->
    <template v-else>
      <div class="time">
        <span class="unit"><span class="roll" :key="`h${hh}`">{{ hh }}</span></span>
        <em>:</em>
        <span class="unit"><span class="roll" :key="`m${mm}`">{{ mm }}</span></span>
        <template v-if="withSec">
          <em>:</em>
          <span class="unit"><span class="roll" :key="`s${ss}`">{{ ss }}</span></span>
        </template>
      </div>
      <div class="date">{{ monthDay }} {{ week }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 时钟卡：大号时间与日期，表面由框架统一提供。
 *
 * 三种自适配布局（只看宽高比）：
 *   竖长条（≤0.75）  时 / 分 上下两行，日期在下面分两行
 *   横条（≥1.4）     一行 HH:MM:SS（秒与主数字同字号）
 *   方形             一行 HH:MM + 日期
 * 数字变化时用「滚动」：旧值向上滚出、新值从下方滚入（各自 overflow 裁剪）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { pad } from "@/core/util"

const props = defineProps<{ size?: string; w?: number; h?: number }>()

const now = ref(new Date())
let timer = 0

onMounted(() => {
  timer = window.setInterval(() => (now.value = new Date()), 1000)
})

onBeforeUnmount(() => window.clearInterval(timer))

const ratio = computed(() => (props.w ?? 1) / Math.max(1, props.h ?? 1))
/** 竖长条：时/分 上下排 */
const tall = computed(() => ratio.value <= 0.75)
/** 横条：显示秒 */
const withSec = computed(() => ratio.value >= 1.4)

const hh = computed(() => pad(now.value.getHours()))
const mm = computed(() => pad(now.value.getMinutes()))
const ss = computed(() => pad(now.value.getSeconds()))

const monthDay = computed(() => {
  const d = now.value
  return `${d.getMonth() + 1}/${d.getDate()}`
})
const week = computed(() => `周${"日一二三四五六"[now.value.getDay()]}`)
</script>

<style scoped>
.clock {
  container-type: size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3cqh;
  width: 100%;
  height: 100%;
  padding: 4cqh 3cqw;
  color: var(--desk-text);
  overflow: hidden;
}

/* 一行时间：三段数字 + 两个冒号 */
.time {
  display: flex;
  align-items: baseline;
  gap: 0.06em;
  font-size: clamp(26px, 52cqh, 132px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.time em {
  font-style: normal;
  transform: translateY(-0.04em);
}

/* 每个数字段：裁剪窗口 + 滚动体 */
.unit {
  display: inline-block;
  overflow: hidden;
  height: 1em;
  line-height: 1;
}

.roll {
  display: block;
  animation: roll 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes roll {
  from {
    transform: translateY(100%);
    opacity: 0.35;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 竖长条：时分各占一行，日期两行 */
.tall .row {
  display: flex;
  justify-content: center;
  font-size: clamp(24px, 30cqh, 96px);
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.tall .date {
  margin-top: 1cqh;
  font-size: clamp(12px, 11cqh, 26px);
  font-weight: 500;
  color: var(--desk-text-2);
}

.tall .week {
  font-size: clamp(11px, 11cqh, 28px);
  font-weight: 500;
  color: var(--desk-text-2);
}

/* 常规：日期一行 */
.date {
  font-size: clamp(12px, 11cqh, 26px);
  font-weight: 500;
  color: var(--desk-text-2);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .roll {
    animation: none;
  }
}
</style>
