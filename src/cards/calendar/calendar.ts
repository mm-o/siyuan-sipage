/**
 * 日历实例状态（每张日历卡一份）
 *
 *   weekBegin   一周从周一还是周日开始
 *   month       这张卡固定显示的月份（YYYY-MM，空 = 今天所在月）
 *
 * 同一张卡可以放多张、各看各的月份，所以这些都按实例 uid 存。
 */
import { stateOf } from "@/core/store"

interface CalendarState {
  weekBegin: "mon" | "sun"
  month: string
}

/** 每张卡一份：各卡各的周首与月份 */
export function calendarOf(uid: string): CalendarState {
  return stateOf<CalendarState>(uid, { weekBegin: "mon", month: "" })
}