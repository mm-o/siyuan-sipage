<template>
  <div class="cal">
    <!-- 今日格（iTab CalendarDay）：日号 + 农历 + 星期 + 班/休 -->
    <div class="day">
      <i v-if="v.rest" class="mark">休</i>
      <b class="num" :class="`wk${v.wk}`">{{ v.day }}</b>
      <span class="lunar">{{ v.lunar }}</span>
      <span class="week">{{ v.week }}</span>
    </div>

    <!-- 整月网格（iTab widget-calendar）：够宽才出，等比放大后是同一套版式 -->
    <div class="month">
      <ul class="row head">
        <li v-for="(w, i) in WEEK" :key="w" :class="{ 'is-end': i >= 5 }">{{ w }}</li>
      </ul>
      <ul v-for="(week, wi) in month" :key="wi" class="row">
        <li
          v-for="(cell, ci) in week"
          :key="ci"
          class="cell"
          :class="{ 'is-other': !cell.inMonth, 'is-today': cell.today, 'is-end': ci >= 5 }"
        >
          {{ cell.day }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 日历卡（对齐 iTab：CalendarDay + widget-calendar）
 * 字号全部 cqmin → 8x4 / 10x5 / 12x6 等比例放大时是同一套版式。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { SolarDay } from "tyme4ts"

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

/** 当月 6×7（周一开头），今天标蓝 */
const month = computed(() => {
  void tick.value
  const base = new Date()
  const y = base.getFullYear()
  const m = base.getMonth()
  const start = new Date(y, m, 1 - ((new Date(y, m, 1).getDay() + 6) % 7))
  return Array.from({ length: 6 }, (_, wi) =>
    Array.from({ length: 7 }, (_, ci) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + wi * 7 + ci)
      return {
        day: d.getDate(),
        inMonth: d.getMonth() === m,
        today: d.getDate() === base.getDate() && d.getMonth() === m && d.getFullYear() === y,
      }
    }),
  )
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
  background: #fff;
  color: #1c1c1e;
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
  color: #fa595c;
}

.num.wk6 {
  font-weight: 400;
}

.lunar {
  font-size: 10cqmin;
  color: #9a9a9e;
  white-space: nowrap;
}

.week {
  font-size: 9cqmin;
  color: #9a9a9e;
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
  background: #eb3333;
}

/* 月历：够宽才显示（8x4 起，等比放大同版式） */
.month {
  display: none;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: center;
  gap: 1cqmin;
  min-width: 0;
  height: 100%;
}

.row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.head {
  flex: 0 0 9%;
}

.head li {
  text-align: center;
  font-size: 5.4cqmin;
  color: #9a9a9e;
}

.head li.is-end {
  color: #fa595c;
}

.row:not(.head) {
  flex: 1 1 0;
}

.cell {
  display: grid;
  place-items: center;
  font-size: 7cqmin;
  line-height: 1;
}

.cell.is-other {
  color: #c7c7cc;
}

.cell.is-end {
  color: #fa595c;
}

.cell.is-today {
  width: 1.9em;
  height: 1.9em;
  justify-self: center;
  border-radius: 50%;
  background: #367df1;
  color: #fff;
}

@container (min-width: 200px) {
  .day {
    flex: 0 0 34%;
    max-width: 34%;
    gap: 0.1em;
  }

  .week {
    font-size: 9cqmin;
    color: #6b6b70;
  }

  .month {
    display: flex;
  }
}
</style>
