/**
 * 定位与地点搜索：区县级精确定位 + 国内区县索引 + 国际地理编码
 */
import { cacheGet, cacheSet } from "@/core/store"
import { forwardProxy } from "@/core/image"
import { placeId, type WeatherPlace } from "@/core/store"

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
 * 精确定位：iTab 的定位接口（服务端按 IP 走区县级地理库，返回区县名 + 经纬度 + 天气 ID）。
 * 比 ip-api 准得多：同一个 IP，ip-api 给「广州」，它给「海原」。
 */
export async function preciseLocate(): Promise<WeatherPlace> {
  const raw = await forwardProxy("https://base.itab.link/api/getLocation?lang=cn", "text", 10_000, [
    ["mode", "itab"],
    ["version", "1.8.3"],
    ["lang", "cn"],
  ])
  const json = JSON.parse(raw)
  const d = json?.data
  if (json?.code !== 200 || !d?.name) throw new Error("定位服务不可用")
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
