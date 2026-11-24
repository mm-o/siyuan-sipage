/**
 * 日程 + 备忘（同一份数据，两种身份）
 *
 * 一条 `PlanItem` 就是「一件要做的事」，`date` 决定它是哪一种：
 *   date 有值 → 日程：占日历上的那一天，日历格子、当天清单、卡片都要它
 *   date 为空 → 备忘：待在收件箱，随时可以「安排」到某一天
 *
 * 所以两者不是两张表、不是两套存储，而是同一张表上「有日期 / 没日期」。
 * 勾掉、备注、时间、跨天移动都落在同一个对象上，日历与卡片读的是同一份索引，
 * 不存在「写进日记就再也看不见」的第二份数据。
 *
 * 存储：`persisted()`（本地存储，随插件页面走），老版备忘录 `desk:memo` 自动迁移。
 */
import { computed, ref } from "vue"
import { persisted } from "@/core/store"
import { pad, post } from "@/core/util"

export interface PlanItem {
  id: string
  /** 一行标题 */
  text: string
  /** 备注（详情右栏的多行文本，卡片与日历不显示） */
  note: string
  /** YYYY-MM-DD；空字符串 = 收件箱（只作备忘） */
  date: string
  /** HH:mm；空 = 全天 */
  time: string
  done: boolean
  /** 勾掉的时间；没勾掉是 0 */
  doneAt: number
  /** 创建时间 */
  at: number
  /** 最近一次写入日记的时间；0 = 没写过 */
  syncedAt: number
}

/** 详情的五个分组：今天 / 逾期 / 即将 / 收件箱 / 已完成 */
export type PlanGroup = "today" | "late" | "upcoming" | "inbox" | "done"

interface AgendaState {
  items: PlanItem[]
  /** 详情左栏上次停留的分组（重新打开还在这里） */
  group: PlanGroup
  /** 首次运行种过示例没有 */
  seeded: boolean
}

export const agenda: AgendaState = persisted<AgendaState>("desk:agenda", {
  items: [],
  group: "today",
  seeded: false,
})

/* ── 日期键：一律 YYYY-MM-DD 字符串，比较用字符串比较 ──────── */

export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const todayKey = () => dateKey(new Date())

/** 以某天为基准前后挪几天；跨月跨年由 Date 自己算 */
export function dayKey(offset: number, base = todayKey()) {
  const [y, m, d] = base.split("-").map(Number)
  return dateKey(new Date(y, m - 1, d + offset))
}

/** 已过零点：分组、逾期与「今天」都跟着它重算，长时间挂着的卡片不会停在昨天 */
const tick = ref(0)
if (typeof window !== "undefined") window.setInterval(() => { tick.value += 1 }, 60_000)

const WEEK = ["日", "一", "二", "三", "四", "五", "六"]
const parts = (key: string) => key.split("-").map(Number)

export function weekdayOf(key: string) {
  const [y, m, d] = parts(key)
  return `周${WEEK[new Date(y, m - 1, d).getDay()]}`
}

/** 人类可读的日期：今天 / 明天 / 昨天 / 12月5日 / 2027年1月1日 */
export function dayLabel(key: string) {
  if (key === todayKey()) return "今天"
  if (key === dayKey(1)) return "明天"
  if (key === dayKey(-1)) return "昨天"
  const [y, m, d] = parts(key)
  return y === new Date().getFullYear() ? `${m}月${d}日` : `${y}年${m}月${d}日`
}

/* ── 排序：未完成在前；同状态按时间（全天在前），再按创建顺序 ── */

const clock = (item: PlanItem) => item.time || "00:00"

function compare(a: PlanItem, b: PlanItem) {
  return Number(a.done) - Number(b.done) || clock(a).localeCompare(clock(b)) || a.at - b.at
}

const EMPTY: PlanItem[] = []

/* ── 按日期索引：日历、卡片、详情共用这一份 ───────────────── */

/** 按日期索引：日历、卡片、详情共用这一份；对外只露 itemsOf / markOf */
const byDate = computed(() => {
  void tick.value
  const map = new Map<string, PlanItem[]>()
  for (const item of agenda.items) {
    if (!item.date) continue
    const list = map.get(item.date)
    if (list) list.push(item)
    else map.set(item.date, [item])
  }
  for (const list of map.values()) list.sort(compare)
  return map
})

/** 某一天的全部条目（未完成在前，已完成的也留着划线，勾错了还能勾回来） */
export function itemsOf(key: string): PlanItem[] {
  return byDate.value.get(key) || EMPTY
}

export const overdue = computed(() => {
  void tick.value
  const today = todayKey()
  return agenda.items
    .filter((item) => item.date && item.date < today && !item.done)
    .sort((a, b) => a.date.localeCompare(b.date) || compare(a, b))
})

export const upcoming = computed(() => {
  void tick.value
  const today = todayKey()
  return agenda.items
    .filter((item) => item.date > today && !item.done)
    .sort((a, b) => a.date.localeCompare(b.date) || compare(a, b))
})

/** 收件箱 = 没安排日期的备忘（最近记的在前） */
export const inbox = computed(() => {
  void tick.value
  return agenda.items.filter((item) => !item.date && !item.done).sort((a, b) => b.at - a.at)
})

export const doneList = computed(() => {
  void tick.value
  return agenda.items.filter((item) => item.done).sort((a, b) => b.doneAt - a.doneAt)
})

/* ── 日历格子上的标记 ─────────────────────────────────────── */

export interface DayMark {
  open: number
  done: number
  late: boolean
}

const marks = computed(() => {
  void tick.value
  const today = todayKey()
  const map = new Map<string, DayMark>()
  for (const item of agenda.items) {
    if (!item.date) continue
    const hit = map.get(item.date) || { open: 0, done: 0, late: false }
    if (item.done) {
      hit.done += 1
    } else {
      hit.open += 1
      if (item.date < today) hit.late = true
    }
    map.set(item.date, hit)
  }
  return map
})

export const markOf = (key: string) => marks.value.get(key)
/** 一格上的日程点：日历卡、日历详情、小日历共用 */
export type DayDot = "open" | "done" | "late"

const NO_DOTS: DayDot[] = []

export function dayDots(key: string): DayDot[] {
  const mark = markOf(key)
  if (!mark) return NO_DOTS
  const dots: DayDot[] = []
  for (let i = 0; i < Math.min(3, mark.open); i += 1) dots.push(mark.late ? "late" : "open")
  if (!dots.length) for (let i = 0; i < Math.min(3, mark.done); i += 1) dots.push("done")
  return dots
}

/** 五个分组各自的条数（左栏徽章） */
export const counts = computed<Record<PlanGroup, number>>(() => {
  void tick.value
  const today = todayKey()
  const out: Record<PlanGroup, number> = { today: 0, late: 0, upcoming: 0, inbox: 0, done: 0 }
  for (const item of agenda.items) {
    if (item.done) out.done += 1
    else if (!item.date) out.inbox += 1
    else if (item.date === today) out.today += 1
    else if (item.date < today) out.late += 1
    else out.upcoming += 1
  }
  return out
})

/** 卡片头部：今天的条数与还没做的条数（逾期 / 备忘直接复用分组计数） */
export const summary = computed(() => {
  const today = itemsOf(todayKey())
  return {
    todayTotal: today.length,
    todayOpen: today.filter((item) => !item.done).length,
    late: counts.value.late,
    inbox: counts.value.inbox,
  }
})

/* ── 写 ───────────────────────────────────────────────────── */

let seq = 0

export function addItem(input: { text: string; date?: string; time?: string; note?: string }): PlanItem | null {
  const text = input.text.trim()
  if (!text) return null
  const item: PlanItem = {
    /* 同一毫秒批量创建也不能撞 id，所以带自增序号 */
    id: `ag-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    text,
    note: (input.note || "").trim(),
    date: input.date || "",
    time: input.time || "",
    done: false,
    doneAt: 0,
    at: Date.now(),
    syncedAt: 0,
  }
  agenda.items.push(item)
  return item
}

const findItem = (id: string) => agenda.items.find((item) => item.id === id)

/** 局部更新：只改传进来的字段；换日期会让「已写入日记」的标记失效 */
export function patchItem(id: string, patch: Partial<Pick<PlanItem, "text" | "note" | "date" | "time">>) {
  const item = findItem(id)
  if (!item) return
  Object.assign(item, patch)
  if (patch.date !== undefined) item.syncedAt = 0
}

export function toggleItem(id: string) {
  const item = findItem(id)
  if (!item) return
  item.done = !item.done
  item.doneAt = item.done ? Date.now() : 0
}

export function removeItem(id: string) {
  agenda.items = agenda.items.filter((item) => item.id !== id)
}

export function clearDone() {
  agenda.items = agenda.items.filter((item) => !item.done)
}

/** 安排到某一天；date 传空字符串就是收回收件箱 */
export function scheduleItem(id: string, date: string) {
  patchItem(id, { date })
}

/**
 * 写入今天的日记（可选桥接，不是数据源）
 *
 * 思源没有独立日程对象，日记里的待办块是最贴近的落点：一条一个 `- [ ]`。
 * 本地仍然是唯一真源，写日记只是把「今天还没做的」抄一份到文档里，
 * 失败时抛错由调用方提示，绝不因为写日记失败丢掉本地条目。
 */
export async function mirrorToDailyNote(items: PlanItem[]) {
  const pending = items.filter((item) => !item.done)
  if (!pending.length) throw new Error("没有未完成的条目")

  const books = await post<{ notebooks: Array<{ id: string }> }>("/api/notebook/lsNotebooks")
  const notebook = books?.notebooks?.[0]?.id
  if (!notebook) throw new Error("未找到笔记本")

  const doc = await post<{ id: string }>("/api/filetree/createDailyNote", { notebook, app: "" })
  if (!doc?.id) throw new Error("打开今天的日记失败")

  await post("/api/block/appendBlock", {
    dataType: "markdown",
    data: pending.map((item) => `- [ ] ${item.text}`).join("\n"),
    parentID: doc.id,
  })

  const at = Date.now()
  for (const item of pending) item.syncedAt = at
}

/* ── 迁移与示例 ───────────────────────────────────────────── */

/** 老版备忘录（desk:memo）：有日期就到日历，没日期就进收件箱 */
function migrateLegacy() {
  let raw: string | null = null
  try {
    raw = localStorage.getItem("desk:memo")
  } catch {
    return
  }
  if (!raw) return

  try {
    const box = JSON.parse(raw) as { items?: Array<{ id?: string; text?: string; done?: boolean; at?: number }> }
    for (const old of box.items || []) {
      const text = String(old.text || "").trim()
      if (!text) continue
      if (agenda.items.some((item) => item.text === text)) continue
      agenda.items.push({
        id: `ag-${old.id || Date.now().toString(36)}`,
        text,
        note: "",
        date: "",
        time: "",
        done: !!old.done,
        doneAt: old.done ? Date.now() : 0,
        at: Number(old.at) || Date.now(),
        syncedAt: 0,
      })
    }
    localStorage.removeItem("desk:memo")
  } catch {
    /* 旧键坏了就当没迁移过，不阻塞卡片 */
  }
}

/** 首次运行种两条示例：一条今天的日程，一条收件箱里的备忘 */
function seed() {
  if (agenda.seeded) return
  agenda.seeded = true
  if (agenda.items.length) return
  addItem({ text: "点左边的圆点勾掉这一条", date: todayKey() })
  addItem({ text: "备忘先放收件箱，点「今天」就排进今天" })
}

migrateLegacy()
seed()
