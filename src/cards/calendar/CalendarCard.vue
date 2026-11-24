<template>
  <div class="cal">
    <!-- 今日格（参考实现 CalendarDay）：日号 + 农历 + 星期 + 班/休 -->
    <div class="day">
      <i v-if="v.rest" class="mark">休</i>
      <b class="num" :class="`wk${v.wk}`">{{ v.day }}</b>
      <span class="lunar">{{ v.lunar }}</span>
      <span class="week">{{ v.week }}</span>
      <span v-if="today.open" class="agenda">{{ today.open }} 项日程</span>
    </div>

    <!-- 整月网格：复用 ui/MiniCalendar，够宽才出 -->
    <MiniCalendar class="month" :week-begin="state.weekBegin" />
  </div>
</template>

<script setup lang="ts">
/**
 * 日历卡（对齐 参考实现：CalendarDay + widget-calendar）
 * 字号全部 cqmin → 8x4 / 10x5 / 12x6 等比例放大时是同一套版式。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { SolarDay } from "tyme4ts"
import { itemsOf, todayKey } from "@/core/agenda"
import MiniCalendar from "@/ui/MiniCalendar.vue"
import { calendarOf } from "./calendar"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

/* 每张日历卡一份：看哪个月、一周从哪天开始 */
const state = calendarOf(props.uid || "calendar")

const WEEK = ["一", "二", "三", "四", "五", "六", "日"]
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => (tick.value += 1), 60_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
})

const v = computed(() => {
  void tick.value
  const d = new Date()
  const solar = SolarDay.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const lunar = solar.getLunarDay()
  const wk = d.getDay() === 0 ? 6 : d.getDay() - 1 // 周一=0 .. 周日=6
  return {
    day: d.getDate(),
    wk,
    rest: wk >= 5,
    week: `周${WEEK[wk]}`,
    lunar: `${lunar.getLunarMonth().getName()}${lunar.getName()}`,
  }
})

/** 今天的日程：只报还没做的条数，做完了就不出声 */
const today = computed(() => {
  void tick.value
  const list = itemsOf(todayKey())
  return { total: list.length, open: list.filter((item) => !item.done).length }
})

</script>

<style scoped>
.cal {
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  padding: 5px;
  overflow: hidden;
  color: var(--desk-text);
  font-variant-numeric: tabular-nums;
}

/* 今日格 */
.day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15em;
  flex: 0 0 auto;
  line-height: 1.1;
}

.num {
  font-size: 38cqmin;
  font-weight: 700;
}

.num.wk5,
.num.wk6 {
  color: var(--desk-danger);
}

.num.wk6 {
  font-weight: 400;
}

.lunar {
  font-size: 10cqmin;
  color: var(--desk-text-2);
  white-space: nowrap;
}

.week {
  font-size: 9cqmin;
  color: var(--desk-text-2);
  white-space: nowrap;
}

.mark {
  position: absolute;
  right: -0.4em;
  top: -0.4em;
  padding: 0 0.15em;
  font-size: 9cqmin;
  font-style: normal;
  color: #fff;
  border-radius: 0.2em;
  background: var(--desk-danger);
}

/* 今天还有几条没做：数字格最下面一行，小字，不抢日号 */
.agenda {
  font-size: 8cqmin;
  color: var(--desk-accent);
  white-space: nowrap;
}

/* 月历：复用 ui/MiniCalendar，只给它一个字号（其余尺寸都是 em） */
.month {
  display: none;
  flex: 1 1 0;
  min-width: 0;
  font-size: 5.2cqmin;
}
@container (min-width: 200px) {
  .day {
    flex: 0 0 34%;
    max-width: 34%;
    gap: 0.1em;
  }

  .week {
    font-size: 9cqmin;
    color: var(--desk-text-2);
  }

  .month {
    display: block;
  }
}
</style>
