/**
 * 日历自己的偏好（卡片与详情共用一份）
 *
 * 只放「跟日历有关、别的卡片不关心」的两项：
 *   weekBegin   一周从周一还是周日开始
 *   mirrorDaily 新建今天的日程时，是否顺手写进今天的日记（默认关，日记不是数据源）
 */
import { persisted } from "@/core/store"
import { markOf } from "@/core/agenda"

export interface CalendarPrefs {
  weekBegin: "mon" | "sun"
  mirrorDaily: boolean
}

export const calendarPrefs: CalendarPrefs = persisted<CalendarPrefs>("desk:calendar", {
  weekBegin: "mon",
  mirrorDaily: false,
})

/** 一格上的日程点：卡片月历与详情月历共用同一套取法 */
export type DayDot = "open" | "done" | "late"

const NO_DOTS: DayDot[] = []

/** 最多三个点：没做完的排在前面（逾期算红点）；全做完了只剩弱色点 */
export function dayDots(key: string): DayDot[] {
  const mark = markOf(key)
  if (!mark) return NO_DOTS
  const dots: DayDot[] = []
  for (let i = 0; i < Math.min(3, mark.open); i += 1) dots.push(mark.late ? "late" : "open")
  if (!dots.length) for (let i = 0; i < Math.min(3, mark.done); i += 1) dots.push("done")
  return dots
}
