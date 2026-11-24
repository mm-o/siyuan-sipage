/**
 * 日历实例状态（每张日历卡一份）
 *
 *   weekBegin   一周从周一还是周日开始
 *   mirrorDaily 新建今天的日程时，是否顺手写进今天的日记（默认关，日记不是数据源）
 *   month       这张卡固定显示的月份（YYYY-MM，空 = 今天所在月）
 *
 * 同一张卡可以放多张、各看各的月份，所以这些都按实例 uid 存。
 */
import { stateOf } from "@/core/store"

interface CalendarState {
  weekBegin: "mon" | "sun"
  mirrorDaily: boolean
  month: string
}

const DEFAULTS: CalendarState = { weekBegin: "mon", mirrorDaily: false, month: "" }

/** 旧版只有一份偏好：第一次取用时认领，之后各卡各的 */
function claimLegacy(state: CalendarState) {
  let raw: string | null = null
  try {
    raw = localStorage.getItem("desk:calendar")
  } catch {
    return
  }
  if (!raw) return
  try {
    const box = JSON.parse(raw) as Partial<CalendarState>
    if (box.weekBegin === "sun") state.weekBegin = "sun"
    if (box.mirrorDaily) state.mirrorDaily = true
    localStorage.removeItem("desk:calendar")
  } catch {
    /* 旧键坏了就当没有 */
  }
}

/** 每张卡一份：按实例 uid 取 */
export function calendarOf(uid: string): CalendarState {
  const state = stateOf<CalendarState>(uid, DEFAULTS)
  claimLegacy(state)
  return state
}
