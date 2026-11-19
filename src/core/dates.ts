/**
 * 日期换算（倒数日与它的默认节日共用）
 *
 * 只做三件事：本地日期键、天数差、公历/农历节日的「下一次」。
 * 农历换算走 tyme4ts（和日历卡同一个库），这里不重复实现历法。
 */
import { LunarDay, SolarDay } from "tyme4ts"

const pad = (n: number) => String(n).padStart(2, "0")

/** Date → 本地日期键 YYYY-MM-DD（不用 toISOString，避免时区把日期挪一天） */
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const todayKey = () => dayKey(new Date())

/** YYYY-MM-DD → 本地零点 Date */
export function parseDay(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** 天数差（目标 − 起点，未来为正）：本地零点相减再取整，绕开夏令时 */
export function dayDiff(target: string, from = todayKey()) {
  const ms = parseDay(target).getTime() - parseDay(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** 公历固定日（如 10-01）：今年没过就今年，过了就明年 */
export function nextSolarKey(month: number, day: number, from = todayKey()) {
  const year = parseDay(from).getFullYear()
  const thisYear = `${year}-${pad(month)}-${pad(day)}`
  return thisYear >= from ? thisYear : `${year + 1}-${pad(month)}-${pad(day)}`
}

/** 农历固定日（如 正月初一）：今年没过就今年，过了就明年（多试一年兜住腊月跨年） */
export function nextLunarKey(month: number, day: number, from = todayKey()) {
  const year = parseDay(from).getFullYear()
  let best = ""
  for (const y of [year, year + 1, year + 2]) {
    const solar = LunarDay.fromYmd(y, month, day).getSolarDay()
    const key = `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())}`
    if (key >= from && (!best || key < best)) best = key
  }
  return best
}

/** 公历日期 → 它的农历月/日（「每年按农历重复」用） */
export function lunarParts(solarKey: string) {
  const [y, m, d] = solarKey.split("-").map(Number)
  const lunar = SolarDay.fromYmd(y, m, d).getLunarDay()
  return { month: lunar.getMonth(), day: lunar.getDay() }
}
