<template>
  <div class="cal-panel desk-seq" :class="theme">
    <!-- 左：月视图 -->
    <section class="cal-main desk-pane is-left">
      <div class="cal-toolbar">
        <div class="cal-toolbar-group">
          <select v-model.number="viewYear" class="cal-select" aria-label="年份">
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
          </select>
          <button class="cal-icon ariaLabel" data-position="north" data-tooltip-encoding="none" type="button" aria-label="上个月" @click="shift(-1)">
            <ChevronLeft :size="15" :stroke-width="1.9" />
          </button>
          <select v-model.number="viewMonth" class="cal-select cal-select--month" aria-label="月份">
            <option v-for="month in 12" :key="month" :value="month - 1">{{ month }}月</option>
          </select>
          <button class="cal-icon ariaLabel" data-position="north" data-tooltip-encoding="none" type="button" aria-label="下个月" @click="shift(1)">
            <ChevronRight :size="15" :stroke-width="1.9" />
          </button>
        </div>

        <div class="cal-toolbar-group">
          <select v-model="viewFestival" class="cal-select cal-select--festival" aria-label="节假日">
            <option value="">节假日</option>
            <option v-for="item in festivals" :key="item.name" :value="item.name">{{ item.name }}</option>
          </select>
          <button class="cal-today" type="button" :disabled="isToday" @click="selected = new Date()">
            今天
          </button>
        </div>
      </div>

      <ul class="cal-grid-week">
        <li v-for="label in headLabels" :key="label" :class="{ 'is-weekend': label === '六' || label === '日' }">
          {{ label }}
        </li>
      </ul>

      <ul class="cal-grid" @wheel.prevent="onWheel">
        <li v-for="cell in cells" :key="cell.key" @click="selected = cell.date">
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
          </div>
        </li>
      </ul>
    </section>

    <!-- 右：选中日详情 -->
    <aside class="cal-aside desk-pane is-right">
      <div class="cal-aside-head">
        <div class="cal-aside-badge">{{ detail.day }}</div>
        <p class="cal-aside-date">{{ detail.date }} 周{{ detail.week }}</p>
        <p class="cal-aside-lunar">{{ detail.lunar }} · {{ detail.ganzhi }}</p>
        <p class="cal-aside-weak">本年第{{ detail.weekOfYear }}周，第{{ detail.dayOfYear }}天</p>
        <p v-if="detail.diff !== 0" class="cal-aside-weak">
          距今天{{ detail.diff > 0 ? "还有" : "已过去" }} {{ Math.abs(detail.diff) }} 天
        </p>
      </div>

      <ul class="cal-detail-list">
        <li v-if="detail.festival" class="cal-detail-row">
          <span class="cal-detail-tag">节日</span>
          <span class="cal-detail-text">{{ detail.festival }}</span>
        </li>
        <li v-if="detail.term" class="cal-detail-row">
          <span class="cal-detail-tag cal-detail-tag--weak">节气</span>
          <span class="cal-detail-text">{{ detail.term }}{{ detail.termDay ? ` · ${detail.termDay}` : "" }}</span>
        </li>
        <li class="cal-detail-row">
          <span class="cal-detail-tag">生肖</span>
          <span class="cal-detail-text">{{ detail.zodiac }}</span>
        </li>
        <li class="cal-detail-row">
          <span class="cal-detail-tag">星座</span>
          <span class="cal-detail-text">{{ detail.constellation }}座</span>
        </li>
        <li class="cal-detail-row">
          <span class="cal-detail-tag cal-detail-tag--weak">月相</span>
          <span class="cal-detail-text">{{ detail.moon }}</span>
        </li>
        <li v-if="detail.duty" class="cal-detail-row">
          <span class="cal-detail-tag cal-detail-tag--weak">建除</span>
          <span class="cal-detail-text">{{ detail.duty }}日 · {{ detail.twelveStar }} · {{ detail.nineStar }}</span>
        </li>
        <li v-if="detail.star28" class="cal-detail-row">
          <span class="cal-detail-tag cal-detail-tag--weak">星宿</span>
          <span class="cal-detail-text">{{ detail.star28 }}宿 · 纳音 {{ detail.sound }}</span>
        </li>
        <li v-if="detail.recommends.length" class="cal-detail-row">
          <span class="cal-detail-tag">宜</span>
          <span class="cal-detail-text">{{ detail.recommends.join(" ") }}</span>
        </li>
        <li v-if="detail.avoids.length" class="cal-detail-row">
          <span class="cal-detail-tag cal-detail-tag--weak">忌</span>
          <span class="cal-detail-text">{{ detail.avoids.join(" ") }}</span>
        </li>
      </ul>

      <!-- 底部：一周开始（两个等价选项 → Segmented）+ 唯一动作 -->
      <div class="cal-week-row">
        <span>一周开始</span>
        <Segmented v-model="weekBegin" :options="WEEK_OPTIONS" class="cal-week-seg" />
      </div>

      <div class="cal-actions">
        <button class="desk-btn cal-add ariaLabel" data-position="north" data-tooltip-encoding="none" type="button" aria-label="在今日日记里新建一条待办" @click="createEvent">
          <Plus :size="14" :stroke-width="1.9" />
          新建日程
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { Segmented } from "@/ui/controls"
import { computed, ref, watch } from "vue"
import { ChevronLeft, ChevronRight, Plus } from "lucide-vue-next"
import { toast } from "@/ui/controls"
import { useTheme } from "@/ui/controls"
import { EarthBranch, SolarDay, SolarMonth, SolarYear, Zodiac } from "tyme4ts"
import "./styles.css"

const props = defineProps<{
  data?: Record<string, any>
  theme?: "light" | "dark"
  api?: { setData?: (patch: Record<string, any>) => void; save?: () => void }
}>()

const detected = useTheme()
const theme = computed(() => props.theme || detected.value)

const WEEK_NAMES = ["日", "一", "二", "三", "四", "五", "六"] as const
const MONDAY_FIRST = ["一", "二", "三", "四", "五", "六", "日"]
const WEEK_OPTIONS = [
  { label: "一", value: "mon" },
  { label: "日", value: "sun" },
]

/** 一周开始日：两个等价选项，用 Segmented（设计规则） */
const weekBegin = ref(props.data?.weekBegin1 === false ? "sun" : "mon")
const mondayFirst = computed(() => weekBegin.value === "mon")
const headLabels = computed(() => (mondayFirst.value ? MONDAY_FIRST : [...WEEK_NAMES]))

/** 选择写回宿主（文档内嵌时 api 才存在；桌面卡片只存本地） */
watch(weekBegin, (v) => {
  props.api?.setData?.({ weekBegin1: v === "mon" })
  props.api?.save?.()
})

const selected = ref<Date>(new Date())
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
const festivalIndex = computed(() => new Map(festivals.value.map((item) => [item.key, item.name])))

const viewYear = computed({
  get: () => currentYear.value,
  set: (year: number) => {
    const next = new Date(selected.value)
    next.setFullYear(year)
    if (!Number.isNaN(next.getTime())) selected.value = next
  },
})

const viewMonth = computed({
  get: () => currentMonth.value,
  set: (month: number) => {
    const next = new Date(selected.value)
    next.setDate(1)
    next.setMonth(month)
    selected.value = next
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

function shift(delta: number) {
  const next = new Date(selected.value)
  next.setDate(1)
  next.setMonth(next.getMonth() + delta)
  selected.value = next
}

let wheelLock = false
function onWheel(event: WheelEvent) {
  if (wheelLock) return
  shift(event.deltaY < 0 ? -1 : 1)
}

/**
 * 新建日程
 *
 * 思源没有独立的「日程」对象，最贴近的做法是写进今天的日记：
 *   1. /api/notebook/lsNotebooks 取笔记本
 *   2. /api/filetree/createDailyNote 建/取今天日记
 *   3. /api/block/appendBlock 追加一条待办
 * 这样日程就变成可勾选的任务，和其他待办在同一个体系里。
 */
async function createEvent() {
  const title = window.prompt("新建日程（写入今天的日记）", "日程：")
  if (!title) return

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return r.json()
  }

  try {
    const nb = await post("/api/notebook/lsNotebooks", {})
    const notebook = nb?.data?.notebooks?.[0]?.id
    if (!notebook) throw new Error("未找到笔记本")

    const daily = await post("/api/filetree/createDailyNote", { notebook, app: "" })
    const docId = daily?.data?.id
    if (!docId) throw new Error(daily?.msg || "创建日记失败")

    const res = await post("/api/block/appendBlock", {
      dataType: "markdown",
      data: `- [ ] ${title}`,
      parentID: docId,
    })
    if (res?.code !== 0) throw new Error(res?.msg || "写入失败")

    toast("已写入今天的日记")
  } catch (e) {
    toast(`新建日程失败：${(e as Error).message}`, 3000)
  }
}
</script>
