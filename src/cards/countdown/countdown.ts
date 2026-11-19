/**
 * 倒数日的数据与算法（卡片与详情共用）
 *
 * 取值对齐 参考实现 的 daysMatter：分类名/颜色、还剩·已经 的文案、日/周/月/年 四种单位、
 * 「不重复 / 每年」两种重复方式。这里只做「事件 → 显示数字」的纯计算，不碰 DOM、不发请求。
 */
import { Briefcase, Flag, Gift, Heart, House, LayoutGrid, Target, type Component } from "lucide-vue-next"
import { COVERS } from "@/core/image"
import { dayDiff, lunarParts, nextLunarKey, nextSolarKey, parseDay, todayKey } from "@/core/dates"
import type { CountdownCategory, CountdownEvent } from "@/core/store"

/** 分类（`all` 只用于筛选，不写进事件） */
interface CountdownCategoryDef {
  id: "all" | CountdownCategory
  name: string
  /** 分类色（取 参考实现 的取值） */
  color: string
  icon: Component
}

export const CATEGORIES: CountdownCategoryDef[] = [
  { id: "all", name: "全部分类", color: "", icon: LayoutGrid },
  { id: "anniversary", name: "纪念日", color: "#ef4444", icon: Heart },
  { id: "holiday", name: "节日", color: "#f59e0b", icon: Gift },
  { id: "life", name: "生活", color: "#8b5cf6", icon: House },
  { id: "work", name: "工作", color: "#3b82f6", icon: Briefcase },
  { id: "goal", name: "目标", color: "#22c55e", icon: Target },
  { id: "other", name: "其他", color: "#6b7280", icon: Flag },
]

/** 事件分类（不含 all） */
export const EVENT_CATEGORIES = CATEGORIES.filter((c): c is CountdownCategoryDef & { id: CountdownCategory } => c.id !== "all")

export const categoryOf = (id: CountdownCategory) => EVENT_CATEGORIES.find((c) => c.id === id) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1]

/** 单位：日 / 周 / 月 / 年（详情里的分段控件） */
export type CountdownUnit = "day" | "week" | "month" | "year"

export const UNITS: { label: string; value: CountdownUnit }[] = [
  { label: "日", value: "day" },
  { label: "周", value: "week" },
  { label: "月", value: "month" },
  { label: "年", value: "year" },
]

/** 列表筛选：全部 / 即将到来 / 已过去 */
export type CountdownFilter = "all" | "upcoming" | "past"

export const FILTERS: { label: string; value: CountdownFilter }[] = [
  { label: "全部", value: "all" },
  { label: "即将到来", value: "upcoming" },
  { label: "已过去", value: "past" },
]

export const REPEAT_LABEL: Record<CountdownEvent["repeat"], string> = { none: "不重复", year: "每年" }

/** 重复文案：农历重复要说明，不然「每年」看不出按的是阴历 */
export function repeatText(event: CountdownEvent) {
  if (event.repeat === "none") return REPEAT_LABEL.none
  return event.lunar ? "每年（农历）" : REPEAT_LABEL.year
}

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

/** 每年重复：按公历或农历取「下一次」；不重复就直接用存的日期 */
function effectiveDate(event: CountdownEvent, from = todayKey()) {
  if (event.repeat !== "year") return event.date
  const [y, m, d] = event.date.split("-").map(Number)
  if (event.lunar) {
    const lunar = lunarParts(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
    return nextLunarKey(lunar.month, lunar.day, from)
  }
  return nextSolarKey(m, d, from)
}

/** 月数差：两个日期的整月数（谁在前都行，返回非负） */
function monthDiff(a: Date, b: Date) {
  const [early, late] = a.getTime() <= b.getTime() ? [a, b] : [b, a]
  let months = (late.getFullYear() - early.getFullYear()) * 12 + (late.getMonth() - early.getMonth())
  if (late.getDate() < early.getDate()) months -= 1
  return Math.max(0, months)
}

/** 年数差：两个日期的整年数（谁在前都行，返回非负） */
function yearDiff(a: Date, b: Date) {
  const [early, late] = a.getTime() <= b.getTime() ? [a, b] : [b, a]
  let years = late.getFullYear() - early.getFullYear()
  const beforeAnniversary = late.getMonth() < early.getMonth()
    || (late.getMonth() === early.getMonth() && late.getDate() < early.getDate())
  if (beforeAnniversary) years -= 1
  return Math.max(0, years)
}

interface CountdownView {
  event: CountdownEvent
  /** 正=还剩，负=已经，0=今天 */
  days: number
  /** 「还剩」/「已经」/「今天」 */
  prefix: string
  /** 数字（单位换算后取绝对值） */
  value: number
  unit: string
  today: boolean
  /** 目标日显示：2026-12-15 周二 */
  dateText: string
}

/** 事件 → 显示数据；`unit` 只影响 value/unit，不影响 days 排序 */
export function viewOf(event: CountdownEvent, unit: CountdownUnit = "day"): CountdownView {
  const target = effectiveDate(event)
  const days = dayDiff(target)
  const targetDate = parseDay(target)
  const now = parseDay(todayKey())
  const abs = Math.abs(days)

  let value = abs
  let label = "天"
  if (unit === "week") {
    value = Math.floor(abs / 7)
    label = "周"
  } else if (unit === "month") {
    value = monthDiff(targetDate, now)
    label = "个月"
  } else if (unit === "year") {
    value = yearDiff(targetDate, now)
    label = "年"
  }

  return {
    event,
    days,
    prefix: days > 0 ? "还剩" : days < 0 ? "已经" : "今天",
    value,
    unit: label,
    today: days === 0,
    dateText: `${target} ${WEEK[targetDate.getDay()]}`,
  }
}

/** 列表排序：置顶先；再未来（近的在前）→ 今天 → 过去（近的在前） */
export function sortViews(events: CountdownEvent[]) {
  return events
    .map((event) => viewOf(event))
    .sort((a, b) => {
      if (a.event.pinned !== b.event.pinned) return a.event.pinned ? -1 : 1
      const rank = (v: CountdownView) => (v.days > 0 ? 0 : v.days === 0 ? 1 : 2)
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      return Math.abs(a.days) - Math.abs(b.days)
    })
}

/** 筛选后的列表（卡片与详情共用同一份排序） */
export function visibleViews(events: CountdownEvent[], filter: CountdownFilter) {
  const all = sortViews(events)
  if (filter === "upcoming") return all.filter((v) => v.days >= 0)
  if (filter === "past") return all.filter((v) => v.days < 0)
  return all
}

/** 事件封面：从思源题头图里按 id 稳定挑一张（不引入图片上传/存储） */
export function coverOf(event: CountdownEvent) {
  let hash = 0
  for (const ch of event.id) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return COVERS[hash % COVERS.length]
}

/**
 * 封面样式：主事件大卡用横向压暗（.dma-hero），详情封面头用纵向压暗（.dma-detail-head）。
 * 卡片与详情共用这一处，保证同一个事件在两边是同一张图。
 */
export function coverStyleOf(event: CountdownEvent, variant: "hero" | "head" = "hero") {
  const shade = variant === "head"
    ? "linear-gradient(180deg, transparent 40%, rgb(0 0 0 / 35%))"
    : "linear-gradient(270deg, rgb(15 23 42 / 12%), rgb(15 23 42 / 46%))"
  return `${shade}, url(${coverOf(event)})`
}

/** 分类计数（全部分类 = 事件总数） */
export function categoryCounts(events: CountdownEvent[]) {
  const counts: Record<string, number> = { all: events.length }
  for (const c of EVENT_CATEGORIES) counts[c.id] = 0
  for (const e of events) counts[e.category] = (counts[e.category] || 0) + 1
  return counts
}

/** 分类软色：分类色 12% 铺底（iTab 的 --cat-soft） */
export const softOf = (color: string) => (color ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent")

/** 空表单 */
export function blankDraft(category: CountdownCategory = "anniversary"): Omit<CountdownEvent, "id"> {
  return { title: "", date: todayKey(), category, repeat: "none", lunar: false, pinned: false }
}

/** 校验：标题必填、日期必须是 YYYY-MM-DD */
export function draftValid(draft: Omit<CountdownEvent, "id">) {
  return draft.title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
}
