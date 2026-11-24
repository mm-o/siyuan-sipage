/**
 * 写作热力图的数据层
 *
 * 取数方式与 siyuan-dashboard 一致：走思源内核的 SQL（`/api/query/sql`），
 * `blocks.created / blocks.updated` 都是 `YYYYMMDDHHmmss` 字符串，按前 8 位归到「天」。
 * 这里统计的是**当天新增或修改过的块数**（同一天里 created 与 updated 去重），
 * 比只数文档更接近「写了多少」。
 *
 * 只做纯计算与一次查询，不碰 DOM、不落盘。
 */
import { onMounted, ref } from "vue"
import { BODY_TYPES, pad, sql } from "@/core/util"

/* ── 日期键（本地时区，避免 toISOString 把日期挪一天）── */
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}


interface HeatDay {
  /** YYYY-MM-DD */
  date: string
  /** 当天新增/修改的块数 */
  count: number
  /** 0–4（0 = 没写） */
  level: number
}

interface HeatGrid {
  /** 每列一周（周一开始），共 weeks 列 */
  weeks: HeatDay[][]
  /** 顶部月份标签：放在第几列 */
  months: { label: string; col: number }[]
  /** 窗口内的峰值 */
  max: number
}

interface HeatStats {
  /** 有写东西的天数 */
  active: number
  /** 当前连续天数（今天没写就从上一天往前数） */
  current: number
  /** 最长连续天数 */
  longest: number
  /** 最活跃的一天 */
  busiest: { date: string; count: number } | null
  /** 窗口内块数合计（同一天里 created/updated 已去重，跨天会重复计数） */
  total: number
}

/** 一年 53 周（GitHub 同款窗口） */
export const WEEKS_YEAR = 53

const keyOfYmd = (ymd: string) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
const ymdOf = (date: string) => date.replace(/-/g, "")

/** 窗口起点：从「今天所在周的周日」往前推 weeks 周 */
function windowStart(weeks: number, today = new Date().toLocaleDateString("sv-SE")) {
  const end = parseDay(today)
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1))
  end.setDate(end.getDate() - (weeks * 7 - 1))
  return dayKey(end)
}

/**
 * 读「最近 weeks 周每天的块数」。
 *
 * SiYuan 没有 `/api/stats/*` 这类聚合接口（kernel/router.go 里只有 `getTreeStat` 这种单文档统计），
 * 官方的聚合入口就是 `/api/query/sql`，所以这条 SQL 就是标准做法。三个要点：
 *   1. `union all` + `count(distinct id)` 比 `union` + `count(*)` 省一次去重物化（同一库实测 72ms → 62ms），
 *      语义仍是「当天新增或修改过的块数」。
 *   2. **必须写 `limit`**：思源 SQL 接口默认只返回 **64 行**（实测 `select id from blocks` → 64 行，
 *      带 `limit 100000` → 13625 行）。不写的话活跃日超过 64 天的库会被静默截断，热力图只剩前半段。
 *   3. 扫描是 `SCAN blocks`（`created/updated` 没有索引），所以窗口只取需要的那些天，返回 ≤ weeks*7 行。
 */
async function loadHeatmap(weeks = WEEKS_YEAR): Promise<Map<string, number>> {
  const since = ymdOf(windowStart(weeks))
  const stmt = `select day, count(distinct id) as n from (
  select substr(created, 1, 8) as day, id from blocks where created >= '${since}' and type in ${BODY_TYPES}
  union all
  select substr(updated, 1, 8) as day, id from blocks where updated >= '${since}' and type in ${BODY_TYPES}
) group by day order by day limit ${weeks * 7 + 7}`
  const rows = (await sql(stmt)) as { day: string; n: number }[]

  const counts = new Map<string, number>()
  for (const row of rows) {
    const day = String(row.day || "")
    if (day.length !== 8) continue
    counts.set(keyOfYmd(day), Number(row.n) || 0)
  }
  return counts
}

/** 分档：按有写的那些天做四分位，0 单独一档（对齐 GitHub 的五档） */
function levelsOf(counts: Map<string, number>) {
  const positives = [...counts.values()].filter((n) => n > 0).sort((a, b) => a - b)
  if (!positives.length) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
  const at = (q: number) => positives[Math.min(positives.length - 1, Math.floor(positives.length * q))]
  return [at(0.25), at(0.5), at(0.75), Number.MAX_SAFE_INTEGER]
}

function levelOf(count: number, cuts: number[]) {
  if (count <= 0) return 0
  if (count <= cuts[0]) return 1
  if (count <= cuts[1]) return 2
  if (count <= cuts[2]) return 3
  return 4
}

const MONTH_LABEL = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]

/** 拼成「weeks 列 × 7 天（周一开始）」的网格 + 顶部月份标签 */
export function buildGrid(counts: Map<string, number>, weeks: number, today = new Date().toLocaleDateString("sv-SE")): HeatGrid {
  const start = windowStart(weeks, today)
  const cuts = levelsOf(counts)
  const cursor = parseDay(start)
  const weeksOut: HeatDay[][] = []
  const months: { label: string; col: number }[] = []
  let lastMonth = -1

  for (let col = 0; col < weeks; col += 1) {
    const days: HeatDay[] = []
    for (let row = 0; row < 7; row += 1) {
      const key = dayKey(cursor)
      const count = counts.get(key) ?? 0
      days.push({ date: key, count, level: levelOf(count, cuts) })
      // 月份标签：每周第一天所在月份变了就放一个（首列除外，避免和左边标签打架）
      if (row === 0 && col > 0 && cursor.getMonth() !== lastMonth) {
        months.push({ label: MONTH_LABEL[cursor.getMonth()], col })
      }
      if (row === 0) lastMonth = cursor.getMonth()
      cursor.setDate(cursor.getDate() + 1)
    }
    weeksOut.push(days)
  }

  const max = [...counts.values()].reduce((m, n) => Math.max(m, n), 0)
  return { weeks: weeksOut, months, max }
}

/** 关键数字：活跃天数 / 当前连续 / 最长连续 / 最活跃的一天 */
export function buildStats(counts: Map<string, number>, weeks: number, today = new Date().toLocaleDateString("sv-SE")): HeatStats {
  const start = windowStart(weeks, today)
  const days: HeatDay[] = []
  const cursor = parseDay(start)
  const end = parseDay(today)
  while (cursor.getTime() <= end.getTime()) {
    const key = dayKey(cursor)
    days.push({ date: key, count: counts.get(key) ?? 0, level: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  let longest = 0
  let run = 0
  let total = 0
  let busiest: { date: string; count: number } | null = null
  for (const day of days) {
    total += day.count
    if (day.count > 0) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
    if (day.count > 0 && (!busiest || day.count > busiest.count)) busiest = { date: day.date, count: day.count }
  }

  // 当前连续：从今天（今天没写就从昨天）往前数
  let current = 0
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count > 0) {
      current += 1
    } else if (i === days.length - 1) {
      continue
    } else {
      break
    }
  }

  return { active: days.filter((d) => d.count > 0).length, current, longest, busiest, total }
}

/** 「最近活跃」：窗口内最后几条有写的日子（倒序） */
export function recentActive(counts: Map<string, number>, limit = 5) {
  return [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limit)
    .map(([date, count]) => ({ date, count }))
}

/**
 * 把一年拆成上下两段（每段 ≤ perRow 周），月份标签跟着段落重新定位。
 * 53 周排成一行会拉成一条很长的细带，拆两段后格子能大一圈、块面也更像「半年一张」。
 */
export function splitGrid(grid: HeatGrid, perRow = 27) {
  const rows: { weeks: HeatDay[][]; months: { label: string; col: number }[] }[] = []
  for (let start = 0; start < grid.weeks.length; start += perRow) {
    const weeks = grid.weeks.slice(start, start + perRow)
    const months = grid.months
      .filter((m) => m.col >= start && m.col < start + weeks.length)
      .map((m) => ({ label: m.label, col: m.col - start }))
    rows.push({ weeks, months })
  }
  return rows
}

/* ── 卡片 / 详情共用：一次查询 + 60 秒缓存 ─────────────── */
const TTL = 60 * 1000
const cache = new Map<number, { at: number; data: Map<string, number> }>()
const inflight = new Map<number, Promise<Map<string, number>>>()

async function loadCached(weeks: number) {
  const hit = cache.get(weeks)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  const running = inflight.get(weeks)
  if (running) return running
  const task = (async () => {
    const data = await loadHeatmap(weeks)
    cache.set(weeks, { at: Date.now(), data })
    return data
  })()
  inflight.set(weeks, task)
  try {
    return await task
  } finally {
    inflight.delete(weeks)
  }
}

/**
 * 读热力图数据（按周数缓存；卡片与详情共用同一次查询）。
 * 失败只留给用户手动重试，不自动重试。
 */
export function useHeatmap(weeks = WEEKS_YEAR) {
  const counts = ref<Map<string, number> | null>(null)
  const error = ref("")
  const loading = ref(false)
  let token = 0

  async function load() {
    const mine = ++token
    loading.value = true
    error.value = ""
    try {
      const data = await loadCached(weeks)
      if (mine === token) counts.value = data
    } catch (e) {
      if (mine === token) error.value = (e as Error)?.message || "读取失败"
    } finally {
      if (mine === token) loading.value = false
    }
  }

  onMounted(() => void load())
  return { counts, error, loading, reload: load }
}
