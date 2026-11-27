/**
 * 天气模块（一个文件装完：形状 / 码表 / 取数 / 定位 / 钩子）
 *
 * 两条数据通路：
 *   国内（有 9 位 AREAID）→ 国内天气接口（当前 + 逐时 24 + 7 日）
 *   其它（有坐标）        → Open-Meteo（当前 + 逐时 24 + 7 日）
 * 定位只有一条：同一家的 /api/getLocation（服务端按 IP 查区县库）。
 * 缓存：内存 10 分钟 + localStorage（core/store 的 cacheGet/cacheSet）。
 */
import type { Component } from "vue"
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue"
import { API_BASE } from "@/core/api"
import { t } from "@/core/i18n"
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Cloudy, Moon, Sun } from "lucide-vue-next"
import { cacheGet, cacheSet, placeId, weather, type WeatherPlace } from "@/core/store"
import { COVERS, forwardProxy } from "@/core/image"

/* ══ 1. 数据形状 ══════════════════════════════════════════ */
interface WeatherHour {
  /** 当地时刻 YYYY-MM-DDTHH:mm */
  time: string
  code: number
  temp: number
}

interface WeatherDay {
  /** 当地日期 YYYY-MM-DD */
  date: string
  code: number
  max: number
  min: number
  /** 当地时刻 HH:mm */
  sunrise: string
  sunset: string
}

interface WeatherNow {
  temp: number
  /** 体感温度 */
  feels: number
  humidity: number
  /** 风速 km/h */
  wind: number
  code: number
  isDay: boolean
  /** 当地观测时刻 YYYY-MM-DDTHH:mm */
  time: string
}

export interface WeatherData {
  now: WeatherNow
  hours: WeatherHour[]
  days: WeatherDay[]
}

/* ══ 2. 天气码 → 描述 / 图标 / 天空渐变 ═════════════════════ */
const WMO: Record<number, { label: string; icon: Component; night?: Component }> = {
  0: { label: t("card.weather.cond.clear"), icon: Sun, night: Moon },
  1: { label: t("card.weather.cond.partly"), icon: CloudSun, night: CloudMoon },
  2: { label: t("card.weather.cond.cloudy"), icon: CloudSun, night: CloudMoon },
  3: { label: t("card.weather.cond.overcast"), icon: Cloudy },
  45: { label: t("card.weather.cond.fog"), icon: CloudFog },
  48: { label: t("card.weather.cond.freezingFog"), icon: CloudFog },
  51: { label: t("card.weather.cond.drizzleLight"), icon: CloudDrizzle },
  53: { label: t("card.weather.cond.drizzle"), icon: CloudDrizzle },
  55: { label: t("card.weather.cond.drizzleHeavy"), icon: CloudDrizzle },
  56: { label: t("card.weather.cond.freezingDrizzle"), icon: CloudDrizzle },
  57: { label: t("card.weather.cond.freezingDrizzleHeavy"), icon: CloudDrizzle },
  61: { label: t("card.weather.cond.rainLight"), icon: CloudRain },
  63: { label: t("card.weather.cond.rainModerate"), icon: CloudRain },
  65: { label: t("card.weather.cond.rainHeavy"), icon: CloudRain },
  66: { label: t("card.weather.cond.freezingRain"), icon: CloudRain },
  67: { label: t("card.weather.cond.freezingRainHeavy"), icon: CloudRain },
  71: { label: t("card.weather.cond.snowLight"), icon: CloudSnow },
  73: { label: t("card.weather.cond.snowModerate"), icon: CloudSnow },
  75: { label: t("card.weather.cond.snowHeavy"), icon: CloudSnow },
  77: { label: t("card.weather.cond.snowGrains"), icon: CloudSnow },
  80: { label: t("card.weather.cond.showersLight"), icon: CloudRain },
  81: { label: t("card.weather.cond.showers"), icon: CloudRain },
  82: { label: t("card.weather.cond.showersHeavy"), icon: CloudRain },
  85: { label: t("card.weather.cond.snowShowersLight"), icon: CloudSnow },
  86: { label: t("card.weather.cond.snowShowersHeavy"), icon: CloudSnow },
  95: { label: t("card.weather.cond.thunder"), icon: CloudLightning },
  96: { label: t("card.weather.cond.thunderHail"), icon: CloudLightning },
  99: { label: t("card.weather.cond.thunderHailHeavy"), icon: CloudLightning },
}

/** 未知天气码：描述给「—」，图标给中性云 */
const UNKNOWN: { label: string; icon: Component } = { label: "—", icon: Cloud }

export function describe(code: number, night = false) {
  const hit = WMO[code]
  if (!hit) return UNKNOWN
  return { label: hit.label, icon: night && hit.night ? hit.night : hit.icon }
}

/* ── 天空底（卡片与详情的背景）────────────────────────── */
/**
 * 天气状况 → 一套白天/夜间渐变。
 *
 * 数值取自 iTab 的 `.weather-*`（sunny / cloudy / yin / foggy 是它的原渐变）；
 * 它把 rain / snow / thunder 做成 webp 贴图，这里按同一套深蓝-灰蓝色系改成渐变，
 * 不额外引图片资源。
 */
type Sky = "sunny" | "cloudy" | "yin" | "foggy" | "rain" | "snow" | "thunder"

const SKY: Record<Sky, { day: string; night: string }> = {
  sunny: {
    day: "linear-gradient(35deg, #154280 30%, #335693 70%, #a8b3d2)",
    night: "linear-gradient(45deg, #000012 20%, #29334e)",
  },
  cloudy: {
    day: "linear-gradient(35deg, #054989 30%, #72ade0)",
    night: "linear-gradient(35deg, #191a2e 30%, #4c5f7f)",
  },
  yin: {
    day: "linear-gradient(35deg, #354564 30%, #4c5f7f 65%, #8b9bb8)",
    night: "linear-gradient(45deg, #211e22 20%, #383a3e)",
  },
  foggy: {
    day: "linear-gradient(45deg, #789fb8 20%, #6386a3)",
    night: "linear-gradient(45deg, #6c7682 20%, #535d69)",
  },
  rain: {
    day: "linear-gradient(45deg, #123a63 20%, #3f6e97)",
    night: "linear-gradient(45deg, #0b1626 20%, #2c4055)",
  },
  snow: {
    day: "linear-gradient(45deg, #24486a 20%, #93a9bd)",
    night: "linear-gradient(45deg, #101b2a 20%, #3b4d61)",
  },
  thunder: {
    day: "linear-gradient(45deg, #1b2743 20%, #46577a)",
    night: "linear-gradient(45deg, #0a0f1a 20%, #2a3550)",
  },
}

function skyGroup(code: number): Sky {
  if (code <= 1) return "sunny"
  if (code === 2) return "cloudy"
  if (code === 3) return "yin"
  if (code === 45 || code === 48) return "foggy"
  if (code >= 51 && code <= 67) return "rain"
  if (code >= 71 && code <= 77) return "snow"
  if (code >= 80 && code <= 82) return "rain"
  if (code === 85 || code === 86) return "snow"
  if (code >= 95) return "thunder"
  return "cloudy"
}

/** 当前天气的天空渐变（未知码按多云处理） */
function skyOf(code: number, isDay: boolean) {
  const sky = SKY[skyGroup(code)]
  return isDay ? sky.day : sky.night
}

/** 天气底图：按天气码稳定挑一张思源题头图，叠在渐变下面（不额外引图片资源） */
function skyCover(code: number) {
  return COVERS[Math.abs(Math.round(Number(code) || 0)) % COVERS.length]
}

/** 天气卡 / 详情左栏的完整背景：同色系渐变压在图上面，昼夜与天气状况都看得出来 */
export function skyBackdrop(code: number, isDay: boolean) {
  return `${skyOf(code, isDay)}, url(${skyCover(code)})`
}

/* ── 接口 ──────────────────────────────────────────────── */

/** 中文天气描述 → WMO 码（判断顺序：雪 → 雨 → 其它） */
function cnCode(text: string): number {
  const s = String(text || "")
  if (/雷/.test(s)) return 95
  if (/雪/.test(s)) return /大/.test(s) ? 75 : /中/.test(s) ? 73 : 71
  if (/暴雨|大雨/.test(s)) return 65
  if (/中雨/.test(s)) return 63
  if (/雨/.test(s)) return 61
  if (/雾|霾|沙|尘/.test(s)) return 45
  if (/阴/.test(s)) return 3
  if (/云/.test(s)) return 2
  return 0
}

/* ══ 3. 取数：缓存 + 两个后端 + 调度 ═══════════════════════ */
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
function shortError(e: unknown) {
  const raw = String((e as Error)?.message || "")
  if (/handshake timeout|timeout|deadline|no such host/i.test(raw)) return t("card.weather.error.timeout")
  if (/code":\s*[45]\d\d/.test(raw)) return t("card.weather.error.service")
  return t("card.weather.error.load")
}

function parse(body: string): WeatherData {
  const json = JSON.parse(body)
  const cur = json?.current
  const daily = json?.daily
  if (!cur || !daily?.time?.length) throw new Error("天气数据为空") // i18n-keep

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
  const start = Math.max(0, times.findIndex((x) => x >= String(cur.time)))
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

/** 国内源（国内天气接口）：当前 + 24 小时 + 7 日，区县级可用 */
async function loadCn(code: string): Promise<WeatherData> {
  const head: [string, string][] = [["version", "1.8.3"], ["lang", "cn"]]
  const [nowRaw, hourRaw] = await Promise.all([
    forwardProxy(`${API_BASE}/api/getWeather?location=${code}&lang=cn`, "text", TIMEOUT, head),
    forwardProxy(`${API_BASE}/api/weather/24?location=${code}&unit=m&lang=cn`, "text", TIMEOUT, head),
  ])

  const now = JSON.parse(nowRaw)?.data
  const hourly = (JSON.parse(hourRaw)?.data?.hourly ?? []) as Record<string, unknown>[]
  if (now?.status !== "ok" || !now?.now) throw new Error("国内源数据为空") // i18n-keep

  const n = now.now
  const list = (now.daily_forecast ?? []) as Record<string, unknown>[]

  const days: WeatherDay[] = list.slice(0, 7).map((f) => ({
    date: String(f.date),
    code: cnCode(String(f.cond_txt_d ?? "")),
    max: round(f.tmp_max),
    min: round(f.tmp_min),
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
      temp: round(h.temp),
    }
  })

  /* 风力「3-4」级 → km/h 近似 */
  const LEVEL = [0, 2, 6, 12, 20, 29, 39, 50, 62, 75, 89]
  const level = Number(String(n.wind_sc ?? "").match(/\d+/)?.[0] ?? 0)

  return {
    now: {
      temp: round(n.tmp),
      feels: round(n.tmp),
      humidity: round(n.hum),
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
async function loadWeather(place: WeatherPlace): Promise<WeatherData> {
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
    throw new Error("天气加载失败") // i18n-keep
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}

/** 城市名 → 候选地点（中文名、省份、国家、坐标、时区） */

/* ══ 4. 定位与地点搜索 ════════════════════════════════════ */
export async function searchPlaces(name: string): Promise<WeatherPlace[]> {
  const q = name.trim()
  if (!q) return []

  /* 国内区县：本地索引（GeoNames 没有中文区县名，必须自带一份） */
  const cn = await searchCnPlaces(q)

  const url =
    "https://geocoding-api.open-meteo.com/v1/search"
    + `?name=${encodeURIComponent(q)}&count=20&language=zh&format=json`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as { results?: Record<string, unknown>[] }

  /** 区县级也会出现在结果里（feature_code 形如 PPLA3/ADM3），admin1/2/3 拼成完整行政区 */
  const abroad = (json.results ?? []).map((r) => {
    const admin = [r.admin1, r.admin2, r.admin3].filter(Boolean).map(String).join(" ")
    return {
      id: placeId(Number(r.latitude), Number(r.longitude)),
      name: String(r.name ?? ""),
      lat: Number(r.latitude),
      lon: Number(r.longitude),
      admin,
    }
  })

  /* 国内结果排前面，并按 code 去重 */
  const seen = new Set(cn.map((p) => p.id))
  return [...cn, ...abroad.filter((p) => !seen.has(p.id))]
}

/* ── 国内区县索引（中国天气网的全量省/市/区县 + AREAID） ──────────── */

interface CnCity {
  name: string
  admin: string
  code: string
}

let cnCities: CnCity[] | null = null
let cnLoading: Promise<CnCity[]> | null = null

/** city.js 里是 `var city_data = {…}`，剥掉前缀直接当 JSON 读 */
function parseCityJs(text: string): CnCity[] {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) return []
  const tree = JSON.parse(text.slice(start, end + 1)) as Record<string, Record<string, Record<string, { AREAID?: string; NAMECN?: string }>>>
  const list: CnCity[] = []
  for (const [province, cities] of Object.entries(tree)) {
    for (const [city, counties] of Object.entries(cities ?? {})) {
      for (const [county, info] of Object.entries(counties ?? {})) {
        const code = String(info?.AREAID ?? "")
        if (!/^\d{9}$/.test(code)) continue
        list.push({
          name: String(info?.NAMECN ?? county),
          admin: province === city ? province : `${province} ${city}`,
          code,
        })
      }
    }
  }
  return list
}

async function cityIndex(): Promise<CnCity[]> {
  if (cnCities) return cnCities
  if (cnLoading) return cnLoading

  cnLoading = (async () => {

    try {
      const text = await forwardProxy("https://j.i8tq.com/weather2020/search/city.js", "text", 20_000)
      const list = parseCityJs(text)
      if (list.length) {
        cnCities = list
        cacheSet("cn-cities", list)
        return list
      }
    } catch {
      /* 拿不到索引就只留境外结果 */
    }
    return []
  })()

  const list = await cnLoading
  cnLoading = null
  return list
}

async function searchCnPlaces(q: string): Promise<WeatherPlace[]> {
  const list = await cityIndex()
  const hits = list.filter((c) => c.name.includes(q) || c.admin.includes(q))
  return hits.slice(0, 20).map((c) => ({
    id: `cn:${c.code}`,
    name: c.name,
    lat: 0,
    lon: 0,
    admin: c.admin,
    code: c.code,
  }))
}

/**
 * 精确定位：该服务方的定位接口（服务端按 IP 走区县级地理库，返回区县名 + 经纬度 + 天气 ID）。
 * 比 ip-api 准得多：同一个 IP，ip-api 给「广州」，它给「海原」。
 */
export async function preciseLocate(): Promise<WeatherPlace> {
  const raw = await forwardProxy(`${API_BASE}/api/getLocation?lang=cn`, "text", 10_000, [
    ["version", "1.8.3"],
    ["lang", "cn"],
  ])
  const json = JSON.parse(raw)
  const d = json?.data
  if (json?.code !== 200 || !d?.name) throw new Error("定位服务不可用") // i18n-keep
  return {
    id: placeId(Number(d.lat), Number(d.lon)),
    name: String(d.name),
    lat: Number(d.lat),
    lon: Number(d.lon),
    admin: [d.adm1, d.adm2, d.adm3].filter(Boolean).join(" "),
    /* 有国内天气 ID 就直接走国内源，区县级数据一致 */
    code: /^\d{9}$/.test(String(d.id ?? "")) ? String(d.id) : undefined,
  }
}

/** 某个地点的当前天气 + 24 小时 + 7 日（10 分钟内直接吃缓存） */

/* ══ 5. Vue 钩子 ═════════════════════════════════════════ */
export function useWeather() {
  const place = computed(() => weather.locations.find((p) => p.id === weather.activeId) || weather.locations[0])
  const data = ref<WeatherData | null>(null)
  const error = ref("")
  const loading = ref(false)

  /** 请求代号：切地点时旧请求回来直接丢弃；卸载后 +1，任何迟到的结果都不再写状态 */
  let token = 0

  async function load() {
    const target = place.value
    if (!target) return
    const mine = ++token
    loading.value = true
    error.value = ""
    try {
      const next = await loadWeather(target)
      if (mine === token) data.value = next
    } catch (e) {
      if (mine === token) error.value = shortError(e)
    } finally {
      if (mine === token) loading.value = false
    }
  }

  watch(() => place.value?.id, () => void load(), { immediate: true })
  onBeforeUnmount(() => {
    token += 1
  })

  return { place, data, error, loading, reload: load }
}

/**
 * 每个已存地点的天气快照（详情右侧地点列表要显示各自的温度与最值）
 *
 * 命中 10 分钟缓存就不发请求；新加一个地点才补一次。
 */
export function usePlaceWeather() {
  const map = reactive<Record<string, WeatherData>>({})
  let alive = true

  async function fill() {
    // 并行取：命中缓存的那个地点当帧就能显示，不会被另一个地点的冷启动请求堵在后面
    await Promise.all(
      weather.locations.map(async (loc) => {
        if (map[loc.id]) return
        try {
          const data = await loadWeather(loc)
          if (alive) map[loc.id] = data
        } catch {}
      }),
    )
  }

  watch(
    () => weather.locations.map((p) => p.id).join(","),
    () => void fill(),
    { immediate: true },
  )
  onBeforeUnmount(() => {
    alive = false
  })

  return map
}
