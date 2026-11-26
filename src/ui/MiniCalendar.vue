<template>
  <div class="mc">
    <header v-if="nav" class="mc-head">
      <GlassButton :icon="ChevronLeft" :label="t('ui.mini.prevMonth')" @click="shift(-1)" />
      <span class="mc-title">{{ title }}</span>
      <GlassButton :icon="ChevronRight" :label="t('ui.mini.nextMonth')" @click="shift(1)" />
      <GlassButton v-if="today" text :label="t('common.today')" @click="goToday" />
    </header>

    <ul class="mc-week">
      <li v-for="w in head" :key="w" :class="{ 'is-end': w === t('ui.mini.wdSat') || w === t('ui.mini.wdSun') }">{{ w }}</li>
    </ul>

    <ul class="mc-grid">
      <li v-for="cell in cells" :key="cell.key">
        <button
          class="mc-cell"
          type="button"
          :class="{ 'is-today': cell.isToday, 'is-selected': cell.isSelected, 'is-other': !cell.inMonth }"
          :aria-label="cell.key"
          :aria-current="cell.isSelected ? 'date' : undefined"
          @click="pick(cell)"
        >
          <span class="mc-day">{{ cell.day }}</span>
          <i v-if="dots" class="mc-dots" aria-hidden="true">
            <b v-for="(dot, i) in cell.dots" :key="i" class="mc-dot" :class="`is-${dot}`" />
          </i>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * 小日历（可复用）：月份标题 + 周首 + 6×7 网格，可选日程点
 *
 * 尺寸全部用 em，宿主给一个 font-size 就能换档：日记详情用正文字号，
 * 桌面日历卡用容器单位，同一份组件两处复用，不再各写一套月格。
 */
import { computed, ref, watch } from "vue"
import { ChevronLeft, ChevronRight } from "lucide-vue-next"
import { GlassButton } from "@/ui/controls"
import { t } from "@/core/i18n"
import { dateKey, dayDots, todayKey } from "@/core/agenda"

const props = withDefaults(defineProps<{
  /** 选中的哪一天 YYYY-MM-DD */
  modelValue?: string
  /** 只看哪个月 YYYY-MM（缺省跟随选中日） */
  month?: string
  weekBegin?: "mon" | "sun"
  /** 顶部月份切换 */
  nav?: boolean
  /** 格子上的日程点 */
  dots?: boolean
  /** 头部「今天」按钮：跳回本月并选中今天 */
  today?: boolean
}>(), { modelValue: "", month: "", weekBegin: "mon", nav: false, dots: true, today: false })

const emit = defineEmits<{ "update:modelValue": [string] }>()

const WEEK = [t("ui.mini.wdMon"), t("ui.mini.wdTue"), t("ui.mini.wdWed"), t("ui.mini.wdThu"), t("ui.mini.wdFri"), t("ui.mini.wdSat"), t("ui.mini.wdSun")]
const head = computed(() => (props.weekBegin === "mon" ? WEEK : [t("ui.mini.wdSun"), ...WEEK.slice(0, 6)]))

const parse = (key: string) => {
  const [y, m, d] = key.split("-").map(Number)
  return y && m && d ? new Date(y, m - 1, d) : new Date()
}

/** 看的是哪个月：外部可钉，内部翻月只改视图 */
const month = ref(props.month || props.modelValue || todayKey())
watch(() => [props.month, props.modelValue], ([pin, key]) => {
  if (pin) month.value = pin
  else if (key) month.value = key
})

const title = computed(() => {
  const d = parse(month.value)
  return t("ui.mini.monthTitle", { year: d.getFullYear(), month: d.getMonth() + 1 })
})

const cells = computed(() => {
  const base = parse(month.value)
  const y = base.getFullYear()
  const m = base.getMonth()
  const lead = (new Date(y, m, 1).getDay() + (props.weekBegin === "mon" ? 6 : 0)) % 7
  const start = new Date(y, m, 1 - lead)
  const selected = props.modelValue || todayKey()
  const today = todayKey()
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = dateKey(d)
    return {
      key,
      date: d,
      day: d.getDate(),
      inMonth: d.getMonth() === m,
      isToday: key === today,
      isSelected: key === selected,
      dots: props.dots ? dayDots(key) : [],
    }
  })
})

function pick(cell: { key: string; date: Date; inMonth: boolean }) {
  month.value = cell.key
  emit("update:modelValue", cell.key)
}

function goToday() {
  const key = todayKey()
  month.value = key
  emit("update:modelValue", key)
}

function shift(delta: number) {
  const d = parse(month.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  month.value = dateKey(d)
}
</script>

<style scoped>
.mc {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  min-width: 0;
  color: var(--desk-text);
}

.mc-head {
  display: flex;
  align-items: center;
  gap: 0.15em;
}

.mc-title {
  font-size: 0.95em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.mc-week,
.mc-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.1em;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mc-week {
  color: var(--desk-text-3);
  font-size: 0.72em;
  text-align: center;
}

.mc-week .is-end {
  color: var(--desk-danger);
}

.mc-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15em;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--desk-r-control);
  background: transparent;
  color: var(--desk-text);
  font: inherit;
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background var(--desk-dur-fast) var(--desk-ease), border-color var(--desk-dur-fast) var(--desk-ease);
}

.mc-cell:hover {
  background: color-mix(in srgb, var(--desk-text) 7%, transparent);
}

.mc-cell:focus-visible {
  outline: var(--desk-ring);
  outline-offset: 2px;
}

.mc-cell.is-other {
  color: var(--desk-text-3);
}

.mc-cell.is-today .mc-day {
  color: var(--desk-accent);
  font-weight: var(--desk-fw-semibold);
}

.mc-cell.is-selected {
  border-color: color-mix(in srgb, var(--desk-accent) 45%, transparent);
  background: color-mix(in srgb, var(--desk-accent) 12%, transparent);
}

.mc-dots {
  display: flex;
  gap: 0.12em;
}

.mc-dot {
  width: 0.28em;
  height: 0.28em;
  border-radius: 50%;
  background: var(--desk-text-3);
}

.mc-dot.is-open {
  background: var(--desk-accent);
}

.mc-dot.is-late {
  background: var(--desk-danger);
}

.mc-dot.is-done {
  background: color-mix(in srgb, var(--desk-text-3) 60%, transparent);
}
</style>
