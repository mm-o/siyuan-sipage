/**
 * 日历实例状态（每张日历卡一份）
 *
 *   weekBegin   一周从周一还是周日开始
 *   month       这张卡固定显示的月份（YYYY-MM，空 = 今天所在月）
 *
 * 同一张卡可以放多张、各看各的月份，所以这些都按实例 uid 存。
 */
import { stateOf, takeLegacy } from "@/core/store"

interface CalendarState {
  weekBegin: "mon" | "sun"
  month: string
}

/** 每张卡一份：第一次取时认领旧版偏好，之后各卡各的 */
export function calendarOf(uid: string): CalendarState {
  const legacy = takeLegacy<Partial<CalendarState>>("desk:calendar")
  return stateOf<CalendarState>(uid, {
    weekBegin: legacy?.weekBegin === "sun" ? "sun" : "mon",
    month: "",
  })
}