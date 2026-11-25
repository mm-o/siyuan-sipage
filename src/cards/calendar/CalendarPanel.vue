<template>
  <div class="cal-panel desk-seq">
    <div class="cal-body desk-panel-row">
      <!-- 左：选中日的黄历 -->
      <aside class="cal-side desk-pane is-left">
        <header class="cal-day">
          <b class="cal-day-num">{{ detail.day }}</b>
          <span class="cal-day-date">{{ detail.date }} 周{{ detail.week }}</span>
          <span class="cal-day-lunar">{{ detail.lunar }} · {{ detail.ganzhi }}</span>
          <span class="desk-note">第{{ detail.weekOfYear }}周 · 第{{ detail.dayOfYear }}天<template v-if="detail.diff"> · {{ detail.diff > 0 ? "还有" : "已过" }} {{ Math.abs(detail.diff) }} 天</template></span>
        </header>

        <ul class="cal-facts mm-scroll">
          <li v-for="fact in facts" :key="fact.label" class="cal-fact">
            <span class="cal-tag" :class="{ 'is-weak': !fact.strong }">{{ fact.label }}</span>
            <span class="cal-fact-text">{{ fact.text }}</span>
          </li>
        </ul>

        <div class="cal-week">
          <span class="desk-note">一周开始</span>
          <Segmented v-model="weekBegin" :options="WEEK_OPTIONS" />
        </div>
      </aside>

      <!-- 中：月视图 -->
      <section class="cal-main desk-pane is-mid">
        <div class="cal-toolbar">
          <GlassSelect v-model.number="viewYear" class="cal-select" label="年份" :options="yearChoices" />
          <GlassButton :icon="ChevronLeft" label="上个月" @click="shift(-1)" />
          <GlassSelect v-model.number="viewMonth" class="cal-select" label="月份" :options="monthChoices" />
          <GlassButton :icon="ChevronRight" label="下个月" @click="shift(1)" />
          <GlassSelect v-model="viewFestival" class="cal-select" label="节假日" :options="festivalChoices" />
          <GlassButton text label="今天" :disabled="isToday" @click="picked(new Date())" />
        </div>

        <ul class="cal-head">
          <li v-for="label in headLabels" :key="label" :class="{ 'is-weekend': label === '六' || label === '日' }">
            {{ label }}
          </li>
        </ul>

        <ul class="cal-grid" @wheel.prevent="onWheel">
          <li v-for="cell in cells" :key="cell.key" @click="picked(cell.date)">
            <div
              class="cal-cell"
              :class="{
                'is-today': cell.isToday,
                'is-selected': cell.isSelected,
                'is-other': cell.isOther,
                'is-weekend': cell.isWeekend,
                'is-festival': cell.isFestival,
              }"
            >
              <span class="cal-cell-day">{{ cell.day }}</span>
              <span class="cal-cell-lunar ariaLabel" data-position="north" data-tooltip-encoding="none" :aria-label="cell.lunar">{{ cell.lunar }}</span>
              <span v-if="cell.dots.length" class="cal-dots" aria-hidden="true">
                <i v-for="(dot, index) in cell.dots" :key="index" class="cal-dot" :class="`is-${dot}`" />
              </span>
            </div>
          </li>
        </ul>
      </section>

      <!-- 右：这一天的日程 + 日记（日程与备忘卡同一份数据，日记与日记卡同一份取数） -->
      <aside class="cal-agenda desk-pane is-right">
        <section class="desk-block">
          <header class="desk-block-head">
            <b>日程</b>
            <span class="desk-badge" :class="{ 'is-on': openOnDay > 0 }">{{ openOnDay }}/{{ dayItems.length }}</span>
            <span class="desk-block-grow" />
          </header>

          <ul class="desk-block-list mm-scroll">
            <li v-for="item in dayItems" :key="item.id" class="mm-row mm-line" :class="{ 'is-done': item.done }">
              <button
                class="mm-dot"
                type="button"
                role="checkbox"
                :aria-checked="item.done"
                :aria-label="item.done ? '标记未完成' : '标记完成'"
                @click="toggleItem(item.id)"
              />
              <span v-if="item.time" class="mm-time">{{ item.time }}</span>
              <span class="mm-text">{{ item.text }}</span>
            </li>
            <li v-if="!dayItems.length" class="desk-empty is-tight"><EmptyArt /><span>这一天还没有安排</span></li>
          </ul>

          <form class="desk-form-row" @submit.prevent="addToDay">
            <GlassField v-model="draft" class="cal-new-field" label="新日程" placeholder="回车加到这一天" />
            <GlassButton :icon="Plus" label="添加" variant="primary" :disabled="!draft.trim()" @click="addToDay" />
          </form>
        </section>

        <section class="desk-block cal-day-diary">
          <header class="desk-block-head">
            <b>日记</b>
            <span v-if="diary">· {{ diary.words }} 字</span>
            <span class="desk-block-grow" />
            <GlassButton text :icon="NotebookPen" :label="diary ? '打开' : '写这天的日记'" @click="diary ? openDiary() : createDiary()" />
          </header>
          <div v-if="diary" class="cal-diary-body">
            <ProtyleView :id="diary.id" />
          </div>
          <div v-else class="desk-empty is-tight">
            <EmptyArt />
            <span>{{ onToday ? "今天还没写" : "这天还没有日记" }}</span>
            <GlassButton text :icon="NotebookPen" label="写这天的日记" @click="createDiary" />
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 日历详情：左黄历 / 中月历 / 右日程
 *
 * 三栏回答三件事：这天是什么日子（节气、宜忌）、这个月怎么排、这天要做什么。
 * 日程与备忘是同一份数据（`core/agenda`），右栏勾选、新增立刻反映到桌面卡片和备忘详情；
 * 写日记只是可选出口（默认关、只对今天），失败只提示，不动本地条目。
 */
import { EmptyArt, GlassButton, GlassField, GlassSelect, Segmented, toast } from "@/ui/controls"
import ProtyleView from "@/ui/ProtyleView.vue"
import { computed, ref, watch } from "vue"
import { ChevronLeft, ChevronRight, NotebookPen, Plus } from "lucide-vue-next"
import { EarthBranch, SolarDay, SolarMonth, SolarYear, Zodiac } from "tyme4ts"
import { addItem, dateKey, dayDots, itemsOf, todayKey, toggleItem } from "@/core/agenda"
import { ensureDaily, loadDaily, openDaily, previewOf, type DailyPreview } from "@/core/dailyNote"
import { calendarOf } from "./calendar"
import "./styles.css"

const WEEK_NAMES = ["日", "一", "二", "三", "四", "五", "六"] as const
const MONDAY_FIRST = [...WEEK_NAMES.slice(1), WEEK_NAMES[0]]
const WEEK_OPTIONS = [
  { label: "一", value: "mon" },
  { label: "日", value: "sun" },
]

/** 每张日历卡一份：一周开端、写日记开关、固定月份都按实例 uid 存 */
const props = defineProps<{ mode?: string; uid?: string }>()
const state = calendarOf(props.uid || "calendar")

/** 一周开始日：两个等价选项 → Segmented；写进这张卡的偏好，重开还是这个 */
const weekBegin = computed({
  get: () => state.weekBegin,
  set: (value: string) => {
    state.weekBegin = value === "sun" ? "sun" : "mon"
  },
})
const mondayFirst = computed(() => weekBegin.value === "mon")
const headLabels = computed(() => (mondayFirst.value ? MONDAY_FIRST : [...WEEK_NAMES]))

/** 这张卡上次看的月份（YYYY-MM）；没有就从今天开始 */
/** 打开就落在今天：钉的月份就是这个月时选今天，钉在别的月才落到 1 号 */
const startDay = (() => {
  const today = new Date()
  const pin = state.month
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  if (!pin || pin === key) return today
  const [year, month] = pin.split("-").map(Number)
  return year && month ? new Date(year, month - 1, 1, 12) : today
})()
const selected = ref<Date>(startDay)

/** 选日期，同时把「这张卡看的月份」记下来：多张日历卡各看各的月 */
function picked(date: Date) {
  selected.value = date
  state.month = dateKey(date).slice(0, 7)
}
const today = new Date()

/* ── 黄历一律直接问库（tyme4ts），这里只有三个转换小函数 ── */

/** Date → SolarDay */
const solarOf = (date: Date) => SolarDay.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
/** 日期键：YYYYMMDD 数字，用来比较/查表，不做字符串格式化 */
const keyOf = (date: Date) => {
  const s = solarOf(date)
  return s.getYear() * 10000 + s.getMonth() * 100 + s.getDay()
}
/** 节气日：「清明第1天」→ { name: "清明", day: 1 } */
function termDayOf(date: Date): { name: string; day: number } {
  const matched = /^(.+?)第(\d+)天$/.exec(solarOf(date).getTermDay().toString())
  return matched ? { name: matched[1], day: Number(matched[2]) } : { name: "", day: 0 }
}

const isToday = computed(() => keyOf(selected.value) === keyOf(today))

const currentYear = computed(() => selected.value.getFullYear())
const currentMonth = computed(() => selected.value.getMonth())

const yearOptions = computed(() => {
  const base = currentYear.value
  return Array.from({ length: 21 }, (_, index) => base - 10 + index)
})
const yearChoices = computed(() => yearOptions.value.map((year) => ({ label: `${year}年`, value: year })))
const monthChoices = Array.from({ length: 12 }, (_, index) => ({ label: `${index + 1}月`, value: index }))

/* ── 节日导航（扫库的节日表，按年缓存；只有这个面板用）── */

/** 与 参考实现 一致的 7 个导航节日（顺序即下拉顺序） */
const NAV_FESTIVALS = ["元旦", "春节", "清明节", "劳动节", "端午节", "中秋节", "国庆节"] as const
const festivalCache = new Map<number, Array<{ name: string; key: number }>>()

function festivalList(year: number) {
  const cached = festivalCache.get(year)
  if (cached) return cached
  const found = new Map<string, number>()
  for (const month of SolarYear.fromYear(year).getMonths()) {
    for (const day of month.getDays()) {
      const name = day.getFestival()?.getName() || day.getLunarDay().getFestival()?.getName()
      if (!name || !NAV_FESTIVALS.includes(name as (typeof NAV_FESTIVALS)[number])) continue
      if (!found.has(name)) found.set(name, day.getYear() * 10000 + day.getMonth() * 100 + day.getDay())
    }
  }
  const list = NAV_FESTIVALS.filter((name) => found.has(name)).map((name) => ({ name, key: found.get(name)! }))
  festivalCache.set(year, list)
  return list
}

const festivals = computed(() => festivalList(currentYear.value))
const festivalChoices = computed(() => [
  { label: "节假日", value: "" },
  ...festivals.value.map((item) => ({ label: item.name, value: item.name })),
])
const festivalIndex = computed(() => new Map(festivals.value.map((item) => [item.key, item.name])))

const viewYear = computed({
  get: () => currentYear.value,
  set: (year: number) => {
    const next = new Date(selected.value)
    next.setFullYear(year)
    if (!Number.isNaN(next.getTime())) picked(next)
  },
})

const viewMonth = computed({
  get: () => currentMonth.value,
  set: (month: number) => {
    const next = new Date(selected.value)
    next.setDate(1)
    next.setMonth(month)
    picked(next)
  },
})

const viewFestival = computed({
  get: () => festivalIndex.value.get(keyOf(selected.value)) || "",
  set: (name: string) => {
    const item = festivals.value.find((festival) => festival.name === name)
    if (!item) return
    const year = Math.floor(item.key / 10000)
    const month = Math.floor(item.key / 100) % 100
    const day = item.key % 100
    selected.value = new Date(year, month - 1, day, 12)
  },
})

/** 单元格副标题：节气 > 节日 > 农历初一（显示月名）> 农历日名。 */
function lunarLabel(date: Date): { text: string; isFestival: boolean } {
  const term = termDayOf(date)
  if (term.day === 1) return { text: term.name, isFestival: true }

  const festival = festivalIndex.value.get(keyOf(date))
  if (festival) return { text: festival, isFestival: true }

  const lunar = solarOf(date).getLunarDay()
  return { text: lunar.getName() === "初一" ? lunar.getLunarMonth().getName() : lunar.getName(), isFestival: false }
}

/* ── 日程：同一天最多三个点，没做完的排在前面 ────────────── */

const selectedKey = computed(() => dateKey(selected.value))
const dayItems = computed(() => itemsOf(selectedKey.value))

/** 这天的日记摘要：跟着选中日加载，三行封顶 */
const diary = ref<DailyPreview | null>(null)

function loadDiary() {
  loadDaily(selected.value)
    .then((hit) => (diary.value = hit))
    .catch(() => (diary.value = null))
}

watch(selectedKey, loadDiary, { immediate: true })
const openOnDay = computed(() => dayItems.value.filter((item) => !item.done).length)
const onToday = computed(() => selectedKey.value === todayKey())

const cells = computed(() => {
  const year = selected.value.getFullYear()
  const month = selected.value.getMonth() + 1
  return SolarMonth.fromYm(year, month)
    .getWeeks(mondayFirst.value ? 1 : 0)
    .flatMap((week) => week.getDays())
    .map((solar) => {
      const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
      const key = solar.getYear() * 10000 + solar.getMonth() * 100 + solar.getDay()
      const label = lunarLabel(date)
      return {
        key,
        date,
        day: date.getDate(),
        lunar: label.text,
        dots: dayDots(dateKey(date)),
        isFestival: label.isFestival,
        isToday: key === keyOf(today),
        isSelected: key === keyOf(selected.value),
        isOther: solar.getMonth() !== month,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      }
    })
})

const detail = computed(() => {
  const date = selected.value
  const solar = solarOf(date)
  const lunar = solar.getLunarDay()
  const yearCycle = lunar.getYearSixtyCycle()
  const branch = EarthBranch.NAMES.indexOf(yearCycle.getEarthBranch().getName())
  const term = termDayOf(date)
  const key = keyOf(date)

  return {
    date: solar.toString().replace("年", "-").replace("月", "-").replace("日", ""),
    week: solar.getWeek().getName(),
    day: date.getDate(),
    lunar: `${lunar.getLunarMonth().getName()}${lunar.getName()}`,
    ganzhi: `${yearCycle.getName()}年 ${lunar.getSixtyCycle().getName()}日`,
    zodiac: branch >= 0 ? Zodiac.fromIndex(branch).getName() : "",
    constellation: solar.getConstellation().getName(),
    moon: lunar.getPhase().getName(),
    duty: lunar.getDuty().getName(),
    star28: lunar.getTwentyEightStar().getName(),
    twelveStar: lunar.getTwelveStar().getName(),
    nineStar: lunar.getNineStar().toString(),
    sound: lunar.getSixtyCycle().getSound().getName(),
    recommends: lunar.getRecommends().map((x) => x.getName()),
    avoids: lunar.getAvoids().map((x) => x.getName()),
    weekOfYear: solar.getSolarWeek(mondayFirst.value ? 1 : 0).getIndexInYear() + 1,
    dayOfYear: solar.getIndexInYear() + 1,
    diff: Math.round(solar.getJulianDay().getDay() - solarOf(today).getJulianDay().getDay()),
    festival: festivalIndex.value.get(key) || solar.getFestival()?.getName() || lunar.getFestival()?.getName() || "",
    term: term.name,
    termDay: term.day ? `第 ${term.day} 天` : "",
  }
})

/** 左栏只摆「这一天是什么日子」：标签 + 内容，空的整行不出现 */
const facts = computed(() => {
  const d = detail.value
  return [
    { label: "节日", text: d.festival, strong: true },
    { label: "节气", text: d.term ? `${d.term}${d.termDay ? ` · ${d.termDay}` : ""}` : "", strong: false },
    { label: "生肖", text: d.zodiac, strong: true },
    { label: "星座", text: d.constellation ? `${d.constellation}座` : "", strong: true },
    { label: "月相", text: d.moon, strong: false },
    { label: "建除", text: d.duty ? `${d.duty}日 · ${d.twelveStar} · ${d.nineStar}` : "", strong: false },
    { label: "星宿", text: d.star28 ? `${d.star28}宿 · 纳音 ${d.sound}` : "", strong: false },
    { label: "宜", text: d.recommends.join(" "), strong: true },
    { label: "忌", text: d.avoids.join(" "), strong: true },
  ].filter((fact) => fact.text)
})

function shift(delta: number) {
  const next = new Date(selected.value)
  next.setDate(1)
  next.setMonth(next.getMonth() + delta)
  picked(next)
}

let wheelLock = false
function onWheel(event: WheelEvent) {
  if (wheelLock) return
  shift(event.deltaY < 0 ? -1 : 1)
}

/* ── 这一天的日程：内联添加 + 手写日记 ─────────────────── */

const draft = ref("")
async function addToDay() {
  const item = addItem({ text: draft.value, date: selectedKey.value })
  if (!item) return
  draft.value = ""
}

/** 创建这天的日记并就地显示（建的是真正的日记文档，带 custom-dailynote 属性） */
async function createDiary() {
  try {
    /* 用返回的文档直接生成摘要：属性索引有延迟，不能立刻靠日期反查 */
    diary.value = await previewOf(await ensureDaily(selected.value))
  } catch (e) {
    toast(`创建日记失败：${(e as Error).message}`, 3000)
  }
}

async function openDiary() {
  try {
    const note = await ensureDaily(selected.value)
    if (!note) {
      toast("这天没有日记", 2000)
      return
    }
    await openDaily(note.id)
  } catch (e) {
    toast(`打开日记失败：${(e as Error).message}`, 3000)
  }
}

</script>
