/**
 * 天气模块汇总出口（对外只暴露这一个路径）
 *
 * 内部按职责拆开：
 *   types.ts    数据形状
 *   codes.ts    天气码 → 描述 / 图标 / 天空渐变 + 中文描述转码
 *   net.ts      内存 + 落盘缓存，两个后端，loadWeather 调度
 *   locate.ts   区县级精确定位、国内区县索引、国际地理编码
 *   hooks.ts    useWeather / usePlaceWeather
 */
export type { WeatherData, WeatherDay, WeatherHour, WeatherNow } from "./types"
export { cnCode, describe, skyBackdrop } from "./codes"
export { loadWeather } from "./net"
export { preciseLocate, searchPlaces } from "./locate"
export { usePlaceWeather, useWeather } from "./hooks"
