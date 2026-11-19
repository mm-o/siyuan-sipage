/**
 * 取数：内存缓存 + 落盘缓存 + 两个后端（国内 AREAID / 国际坐标）
 *
 * 只有这里发请求；卡片、详情、定位都从 useWeather() 拿数据。
 */
import { cacheGet, cacheSet } from "@/core/store"
import { forwardProxy } from "@/core/image"
import type { WeatherPlace } from "@/core/store"
import { cnCode } from "./codes"
import type { WeatherData, WeatherDay, WeatherHour } from "./types"

const TTL = 10 * 60 * 1000
/**
 * 内核代理的超时（毫秒）。
 *
 * `forwardProxy` 默认 12s，实测在本机对 open-meteo 的**冷连接**不够用：
 * 12s 时连续 5 次全部 `TLS handshake timeout`（每次卡在 10.04s），
 * 30s 时连续 5 次全成功（冷启动 5.2s，热连接 1.5s）。宁可多等，不要一开机就显示失败。
 */
const TIMEOUT = 12_000
/** 备用源超时（同一个代理，给短一点，两源加起来不超过一次手动重试的耐心） */
const cache = new Map<string, { at: number; data: WeatherData }>()
const inflight = new Map<string, Promise<WeatherData>>()

const round = (n: unknown) => Math.round(Number(n) || 0)
/** 当地时刻只留 HH:mm（接口给的是 2026-11-15T06:59） */
const hhmm = (iso: unknown) => String(iso || "").slice(11, 16)

/** 内核代理把整串 Go 错误丢回来（含 URL），卡片上只放得下一句人话 */
export function shortError(e: unknown) {
  const raw = String((e as Error)?.message || "")
  if (/handshake timeout|timeout|deadline|no such host/i.test(raw)) return "网络超时，稍后重试"
  if (/code":\s*[45]\d\d/.test(raw)) return "天气服务暂不可用"
  return "天气加载失败"
}

function parse(body: string): WeatherData {
  const json = JSON.parse(body)
  const cur = json?.current
  const daily = json?.daily
  if (!cur || !daily?.time?.length) throw new Error("天气数据为空")

  const days: WeatherDay[] = daily.time.map((date: string, i: number) => ({
    date: String(date),
    code: Number(daily.weather_code[i]),
    max: round(daily.temperature_2m_max[i]),
    min: round(daily.temperature_2m_min[i]),
    sunrise: hhmm(daily.sunrise?.[i]),
    sunset: hhmm(daily.sunset?.[i]),
  }))

  // 小时预报：从「当前时刻」往后的 24 条（接口按整点给，当前这小时也算在内）
  const hourly = json?.hourly
  const times: string[] = hourly?.time || []
  const start = Math.max(0, times.findIndex((t) => t >= String(cur.time)))
  const hours: WeatherHour[] = times.slice(start, start + 24).map((time, k) => ({
    time,
    code: Number(hourly.weather_code[start + k]),
    temp: round(hourly.temperature_2m[start + k]),
  }))

  return {
    now: {
      temp: round(cur.temperature_2m),
      feels: round(cur.apparent_temperature),
      humidity: round(cur.relative_humidity_2m),
      wind: round(cur.wind_speed_10m),
      code: Number(cur.weather_code),
      isDay: cur.is_day !== 0,
      time: String(cur.time || ""),
    },
    hours,
    days,
  }
}

/** 主源：open-meteo（1 次请求拿 当前 + 逐时 + 7 日） */
async function loadOpenMeteo(place: WeatherPlace): Promise<WeatherData> {
  const url =
    "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${place.lat}&longitude=${place.lon}`
    + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m"
    + "&hourly=temperature_2m,weather_code"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset"
    + "&timezone=auto&forecast_days=7"
  return parse(await forwardProxy(url, "text", TIMEOUT))
}

/** 国内源（iTab 天气接口）：当前 + 24 小时 + 7 日，区县级可用 */
async function loadCn(code: string): Promise<WeatherData> {
  const head: [string, string][] = [["mode", "itab"], ["version", "1.8.3"], ["lang", "cn"]]
  const [nowRaw, hourRaw] = await Promise.all([
    forwardProxy(`https://base.itab.link/api/getWeather?location=${code}&lang=cn`, "text", TIMEOUT, head),
    forwardProxy(`https://base.itab.link/api/weather/24?location=${code}&unit=m&lang=cn`, "text", TIMEOUT, head),
  ])

  const now = JSON.parse(nowRaw)?.data
  const hourly = (JSON.parse(hourRaw)?.data?.hourly ?? []) as Record<string, unknown>[]
  if (now?.status !== "ok" || !now?.now) throw new Error("国内源数据为空")

  const n = now.now
  const num = (v: unknown) => Math.round(Number(v) || 0)
  const list = (now.daily_forecast ?? []) as Record<string, unknown>[]

  const days: WeatherDay[] = list.slice(0, 7).map((f) => ({
    date: String(f.date),
    code: cnCode(String(f.cond_txt_d ?? "")),
    max: num(f.tmp_max),
    min: num(f.tmp_min),
    sunrise: String(now.sun?.rise ?? ""),
    sunset: String(now.sun?.set ?? ""),
  }))

  /* "11-19 13:00" → 2026-11-19T13:00（跨年按当前年推） */
  const year = new Date().getFullYear()
  const hours: WeatherHour[] = hourly.slice(0, 24).map((h) => {
    const m = String(h.fxTime ?? "").match(/(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
    return {
      time: m ? `${year}-${m[1]}-${m[2]}T${m[3]}:${m[4]}` : String(h.fxTime ?? ""),
      code: cnCode(String(h.text ?? "")),
      temp: num(h.temp),
    }
  })

  /* 风力「3-4」级 → km/h 近似 */
  const LEVEL = [0, 2, 6, 12, 20, 29, 39, 50, 62, 75, 89]
  const level = Number(String(n.wind_sc ?? "").match(/\d+/)?.[0] ?? 0)

  return {
    now: {
      temp: num(n.tmp),
      feels: num(n.tmp),
      humidity: num(n.hum),
      wind: LEVEL[Math.min(level, 10)],
      code: cnCode(String(n.cond_txt ?? "")),
      isDay: true,
      time: new Date().toISOString().slice(0, 16),
    },
    hours,
    days,
  }
}

/** 某个地点的当前天气 + 24 小时 + 7 日（10 分钟内直接吃缓存） */
export async function loadWeather(place: WeatherPlace): Promise<WeatherData> {
  const key = place.id
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data

  const running = inflight.get(key)
  if (running) return running

  const task = (async () => {
    /* 两条通路：有国内 AREAID 走国内源（区县级），否则按坐标走国际源 */
    const chain: (() => Promise<WeatherData>)[] = place.code
      ? [() => loadCn(place.code as string)]
      : [() => loadOpenMeteo(place)]
    for (const attempt of chain) {
      try {
        const data = await attempt()
        cache.set(key, { at: Date.now(), data })
        cacheSet("weather:" + key, data)
        return data
      } catch {
        /* 换下一个源 */
      }
    }
    /* 都挂了：内存或磁盘里的上一份仍可用（重启后也有） */
    const disk = cacheGet<WeatherData>("weather:" + key)
    /* 内存里可能已有同 key 的旧数据；磁盘那份额外的兜底交给 core/cache */
    const stale = hit ?? (disk ? { at: Date.now(), data: disk } : undefined)
    if (stale) {
      cache.set(key, stale)
      return stale.data
    }
    throw new Error("天气加载失败")
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}

/** 城市名 → 候选地点（中文名、省份、国家、坐标、时区） */
