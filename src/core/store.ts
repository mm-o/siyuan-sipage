import { reactive, watch } from "vue"
import { LunarDay } from "tyme4ts"
import { listFavs, removeFav, saveFav } from "@/core/image"
import { pad } from "@/core/util"

/* ════════════════════════════════════════════════════════════
 * 桌面状态与几何
 *
 * 几何的唯一规则：列数与单格只由「视口宽度」决定，绝不由内容反推。
 *   cols = round(视口宽 / 目标单格)
 *   unit = 视口宽 / cols          ← 精确值，整盘宽度恒等于视口宽
 *   width = cols × unit = 视口宽   ← 永远没有半格、没有黑边
 *
 * 卡片坐标 (x, y, w, h) 是唯一位置真源；拖动只改坐标，不改几何，
 * 因此不存在「拖动 → 列数变化 → 单格变化 → 再拖动」的反馈回路。
 * ════════════════════════════════════════════════════════════ */

interface StorageDriver {
  load: (key: string) => Promise<unknown>
  save: (key: string, value: unknown) => Promise<void>
}

const LS = {
  wallpaper: "wallpaper",
  desk: "desk",
  appearance: "appearance",
  weather: "weather",
  countdown: "countdown",
} as const

let driver: StorageDriver | null = null
let ready = false
const pending = new Map<string, number>()

export function useStorage(d: StorageDriver | null) {
  driver = d
}

async function read<T extends object>(key: string, fallback: T): Promise<T> {
  let saved: unknown
  try {
    saved = await driver?.load(key)
  } catch {
    saved = undefined
  }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return fallback
  return { ...fallback, ...(saved as object) } as T
}

function save(key: string, value: unknown) {
  if (!driver || !ready) return
  const timer = pending.get(key)
  if (timer) window.clearTimeout(timer)
  pending.set(
    key,
    window.setTimeout(() => {
      pending.delete(key)
      void driver?.save(key, JSON.parse(JSON.stringify(value)))
    }, 150),
  )
}

const G = globalThis as unknown as Record<string, any>

/* ── 壁纸 ─────────────────────────────────────────────── */
interface WallpaperState {
  /** theme = 跟随思源主题色；siyuan = 思源 assets 里的图 */
  type: "cover" | "solid" | "url" | "theme" | "siyuan"
  value: string
  source?: "cover" | "bing" | "picsum" | "gitee" | "random"
  resolved?: string
  blur: number
  mask: number
}

const DEFAULT_WALLPAPER: WallpaperState = {
  type: "cover",
  value: "/appearance/covers/cover_001.webp",
  source: "cover",
  blur: 0,
  mask: 0.18,
}

export const wallpaper: WallpaperState = (G.__deskWallpaper ||= reactive<WallpaperState>({ ...DEFAULT_WALLPAPER }))

/** 切换图片或来源时原子替换身份与运行时图像，显示参数保持不变。 */
export function setWallpaper(type: WallpaperState["type"], value = "", source?: WallpaperState["source"], resolved?: string) {
  Object.assign(wallpaper, { type, value, source, resolved })
}

/* ── 收藏 ──────────────────────────────────────────────── */
/**
 * 一条收藏就是公开文件夹里的一个文件名 —— 地址由 favUrl(name) 推出，
 * 所以这里只存名字，磁盘就是索引本身，没有第二份数据。
 */
export const favorites: string[] = (G.__deskFavorites ||= reactive<string[]>([]))

export const isFav = (name: string) => favorites.includes(name)

/** 收藏一张图：同名覆盖同一张，成功后就地前插（磁盘已是最新，无需回读） */
export async function addFavorite(value: string): Promise<string> {
  const name = await saveFav(value)
  const at = favorites.indexOf(name)
  if (at >= 0) favorites.splice(at, 1)
  favorites.unshift(name)
  return name
}

/** 磁盘删除成功后更新镜像，失败时保留收藏。 */
export async function dropFavorite(name: string): Promise<void> {
  await removeFav(name)
  const at = favorites.indexOf(name)
  if (at >= 0) favorites.splice(at, 1)
}

/** 收藏当前桌面壁纸；主题/纯色没有图片可存，直接返回 false */
export async function favoriteWallpaper(): Promise<boolean> {
  const { type, value } = wallpaper
  if (type === "theme" || type === "solid") return false
  await addFavorite(value)
  return true
}

/* ── 外观 ─────────────────────────────────────────────── */
interface Appearance {
  /** 目标单格宽度（真实单格 = 视口宽 / 列数，被钳制在 [CELL_MIN, CELL_MAX]） */
  cell: number
  radius: number
  blur: number
  opacity: number
  shadow: number
  lift: number
  paneOpacity: number
  /* 动效 */
  motion: boolean
  motionDur: number      /* 入场时长 ms */
  motionStagger: number  /* 逐块阶梯 ms */
  motionChar: number     /* 逐字间隔 ms */
}

export const DEFAULT_APPEARANCE: Appearance = {
  cell: 27,
  radius: 18,
  blur: 18,
  opacity: 0.62,
  shadow: 0.34,
  lift: 2,
  paneOpacity: 0.8,
  motion: true,
  motionDur: 620,
  motionStagger: 40,
  motionChar: 30,
}

export const appearance: Appearance = (G.__deskAppearance ||= reactive<Appearance>({ ...DEFAULT_APPEARANCE }))

/** 设置是唯一来源；桌面、卡片、预览与 Teleport 弹层消费同一套 CSS 变量。 */
function applyAppearanceVars() {
  const style = document.documentElement.style
  const vars = {
    "--desk-r-card": `${appearance.radius}px`,
    "--desk-blur-regular": `${appearance.blur}px`,
    "--desk-card-opacity": String(appearance.opacity),
    "--desk-card-shadow": String(appearance.shadow),
    "--desk-lift": `${-appearance.lift}px`,
    "--desk-pane-opacity": String(appearance.paneOpacity),
    "--desk-enter-dur": appearance.motion ? `${appearance.motionDur}ms` : "0ms",
    "--desk-char-step": appearance.motion ? `${appearance.motionChar}ms` : "0ms",
    "--desk-seq-step": appearance.motion ? `${appearance.motionStagger}ms` : "0ms",
  }
  for (const [name, value] of Object.entries(vars)) style.setProperty(name, value)
}

export function resetAppearance() {
  Object.assign(appearance, DEFAULT_APPEARANCE)
}

/* ── 桌面 ─────────────────────────────────────────────── */
interface CardInstance {
  uid: string
  cardId: string
  /** 占格数（列 × 行） */
  w: number
  h: number
  /** 格坐标（左上角） */
  x: number
  y: number
  /** true = 位置由布局自动决定（时钟居中 / 工具组最右）；用户拖动后置 false */
  auto?: boolean
}

interface DeskState {
  cards: CardInstance[]
}

/** 单格宽度区间：只有这个范围参与列数计算 */
export const CELL_MIN = 24
export const CELL_MAX = 36
const DEFAULT_CELL = 27
export const PANEL_CLOCK = "@clock"
const PANEL_TOOLS = "@tools"

export const desk: DeskState = (G.__deskDesk ||= reactive<DeskState>({ cards: [] }))

/* 新卡默认尺寸：与桌面现有卡片一致（6×6） */
const ADD_W = 6
const ADD_H = 6

let seq = 0

/** 同一张卡可以重复添加：每次生成独立 uid，互不影响 */
export function addToDesk(cardId: string, w = ADD_W, h = ADD_H) {
  /* 新卡追加到最下面一行，不搜索、不避让（用户自己拖到位） */
  const y = desk.cards.reduce((m, c) => Math.max(m, c.y + c.h), 0)
  desk.cards.push({ uid: `${cardId}-${Date.now().toString(36)}-${(seq++).toString(36)}`, cardId, w, h, x: 0, y })
}

/** 某张卡当前在桌面上有几个实例 */
export function countOnDesk(cardId: string) {
  return desk.cards.reduce((n, c) => (c.cardId === cardId ? n + 1 : n), 0)
}

/** 同一张卡允许重复添加，所以按 uid 单独移除 */
export function removeFromDesk(uid: string) {
  const i = desk.cards.findIndex((c) => c.uid === uid)
  if (i >= 0) desk.cards.splice(i, 1)
}

/** 改尺寸（格）：只钳制范围，不做任何避让（自由摆放） */
export function setDeskDims(uid: string, w: number, h: number) {
  const card = desk.cards.find((c) => c.uid === uid)
  if (!card) return
  card.w = Math.max(1, Math.min(16, Math.round(w)))
  card.h = Math.max(1, Math.min(16, Math.round(h)))
}

export function resetDesk() {
  desk.cards = []
}

/* ── 几何：纯函数，输入只有「卡片 + 视口宽 + 目标单格」 ── */
interface DeskGrid {
  cols: number
  rows: number
  unit: number
  width: number
  height: number
}

export function computeGrid(cards: CardInstance[], viewport: number, cell = DEFAULT_CELL): DeskGrid {
  const target = Math.min(CELL_MAX, Math.max(CELL_MIN, cell))
  const cols = viewport > 0 ? Math.max(1, Math.round(viewport / target)) : 1
  const unit = viewport > 0 ? viewport / cols : target
  const rows = cards.reduce((m, c) => Math.max(m, c.y + c.h), 1)
  return { cols, rows, unit, width: viewport, height: rows * unit }
}

/* ── 默认桌面 ─────────────────────────────────────────── */

/** 默认版式：用户调好的布局（坐标为细分后格子），面板位置自动 */
const SEED: [string, number, number, number, number][] = [
  ["clock", 6, 6, 11, 20],
  ["calendar", 4, 2, 2, 6],
  ["english", 8, 6, 18, 20],
  ["yiyan", 10, 6, 13, 6],
  ["shici", 8, 6, 31, 6],
  ["weather", 8, 4, 27, 20],
  ["countdown", 7, 6, 9, 13],
  ["heatmap", 8, 6, 40, 6],
  ["pomodoro", 6, 6, 35, 13],
  ["memo", 8, 6, 26, 13],
  ["docstats", 6, 6, 2, 13],
  ["quickopen", 8, 6, 2, 20],
  ["recent", 6, 6, 42, 13],
  ["shortcut", 6, 6, 24, 6],
  ["block", 8, 6, 17, 13],
]

function seedDefaultDesk() {
  if (desk.cards.length) return
  desk.cards = [
    { uid: "panel-clock", cardId: PANEL_CLOCK, w: 12, h: 6, x: 0, y: 0, auto: true },
    { uid: "panel-tools", cardId: PANEL_TOOLS, w: 2, h: 2, x: 0, y: 0, auto: true },
    ...SEED.map(([cardId, w, h, x, y]) => ({ uid: `${cardId}-seed`, cardId, w, h, x, y })),
  ]
}

/** 按当前列数摆放「自动」面板：时钟居中、工具组最右（幂等，随时可调） */
/**
 * 一键整理 / 自动补位（对齐 参考实现 的 findFitPosition）。
 *
 * 规则：
 *   时钟（顶部）那一整块下方空 2 格，卡片从这里开始，逐行逐列找第一个空矩形；
 *   卡片横向 / 纵向各留 1 格间距；左边留 1 格、右边留 1 格；
 *   小卡片自然填补空隙，视觉始终补满；卡片尺寸保持不变。
 */
export function flowDesk(cols: number) {
  if (cols <= 0) return
  alignPanels(cols, true)


  /* 大卡先放、小卡后补：小卡才有机会塞进大卡留下的空隙 */
  const cards = desk.cards.filter((c) => !c.cardId.startsWith("@")).sort((a, b) => b.w * b.h - a.w * a.h)
  if (!cards.length) return

  /* 时钟底部再空 2 格，卡片从这里开始排 */
  const clock = desk.cards.find((c) => c.cardId === PANEL_CLOCK)
  const top = (clock ? clock.y + clock.h : 0) + 2

  const overlap = (x: number, y: number, w: number, h: number, o: { x: number; y: number; w: number; h: number }) =>
    x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h

  /* 当前矩形四周各扩 1 格后仍不与已放置卡片重叠 → 卡片间至少 1 格间距 */
  const isEmpty = (x: number, y: number, w: number, h: number) =>
    !cards.some((c) => c.x >= 0 && overlap(x - 1, y - 1, w + 2, h + 2, c))

  for (const card of cards) {
    card.x = -1
    card.y = -1
    const w = Math.min(card.w, cols - 1)
    const maxX = cols - w
    outer: for (let y = top; ; y++) {
      for (let x = 1; x <= maxX; x++) {
        if (isEmpty(x, y, w, card.h)) {
          card.x = x
          card.y = y
          break outer
        }
      }
    }
  }
}

function alignPanels(cols: number, force = false) {
  if (cols <= 0) return
  for (const c of desk.cards) {
    if (!c.auto && !force) continue
    /* 顶部留 1 格；时钟居中，工具组贴右（右侧留 1 格） */
    if (c.cardId === PANEL_CLOCK) c.x = Math.max(0, Math.floor((cols - c.w) / 2))
    else c.x = Math.max(0, cols - c.w - 1)
    c.y = 1
  }
}


/* ── 倒数日 ───────────────────────────────────────────── */
export type CountdownCategory = "anniversary" | "holiday" | "life" | "work" | "goal" | "other"

export interface CountdownEvent {
  id: string
  title: string
  date: string
  category: CountdownCategory
  repeat: "none" | "year"
  lunar: boolean
  pinned: boolean
}

interface CountdownState {
  events: CountdownEvent[]
  seeded: boolean
}

export const countdown: CountdownState = (G.__deskCountdown ||= reactive<CountdownState>({ events: [], seeded: false }))

/** 新增事件：id 由 store 生成，调用方只给内容 */
let countdownSeq = 0

export function addCountdownEvent(event: Omit<CountdownEvent, "id">) {
  /* 同一毫秒批量创建（例如首次种示例）也不能撞 id，所以带自增序号 */
  const created = { ...event, id: `cd-${Date.now().toString(36)}-${(countdownSeq++).toString(36)}` } as CountdownEvent
  countdown.events.push(created)
  return created.id
}

/** 局部更新：只改传进来的字段 */
export function updateCountdownEvent(id: string, patch: Partial<CountdownEvent>) {
  const hit = countdown.events.find((e) => e.id === id)
  if (hit) Object.assign(hit, patch)
}

export function removeCountdownEvent(id: string) {
  const i = countdown.events.findIndex((e) => e.id === id)
  if (i >= 0) countdown.events.splice(i, 1)
}

/**
 * 内置示例倒数日：首次启动种 4 条，让空白面板有东西可看。
 * 公历用「今年没过就今年」，农历用 tyme4ts 的 LunarDay 推下一次。
 */
function seedCountdown() {
  if (countdown.seeded || countdown.events.length) return
  const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = key(new Date())

  /** 公历固定日：今年过了就明年 */
  const nextSolar = (month: number, day: number) => {
    const y = new Date().getFullYear()
    const thisYear = `${y}-${pad(month)}-${pad(day)}`
    return thisYear >= today ? thisYear : `${y + 1}-${pad(month)}-${pad(day)}`
  }

  /** 农历固定日：往后找最近的匹配（多试两年兜住腊月跨年） */
  const nextLunar = (month: number, day: number) => {
    const y = new Date().getFullYear()
    const hits: string[] = []
    for (const yy of [y, y + 1, y + 2]) {
      const solar = LunarDay.fromYmd(yy, month, day).getSolarDay()
      hits.push(`${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())}`)
    }
    return hits.filter((k) => k >= today).sort()[0] ?? hits[0]
  }

  const samples: Omit<CountdownEvent, "id">[] = [
    { title: "元旦", date: nextSolar(1, 1), category: "holiday", repeat: "year", lunar: false, pinned: false },
    { title: "春节", date: nextLunar(1, 1), category: "holiday", repeat: "year", lunar: true, pinned: false },
    { title: "中秋节", date: nextLunar(8, 15), category: "holiday", repeat: "year", lunar: true, pinned: false },
    { title: "相识纪念日", date: key(new Date(Date.now() + 100 * 86_400_000)), category: "anniversary", repeat: "none", lunar: false, pinned: false },
  ]
  for (const item of samples) addCountdownEvent(item)
}

/* ── 天气 ─────────────────────────────────────────────── */
export interface WeatherPlace {
  id: string
  name: string
  lat: number
  lon: number
  /** 行政区划（省 / 市 / 区县），县级定位靠它区分同名地点 */
  admin?: string
  /** 国内区县的 AREAID（中国天气网），有它就优先走国内源 */
  code?: string
}

interface WeatherState {
  locations: WeatherPlace[]
  activeId: string
}

export const placeId = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`

export const weather: WeatherState = (G.__deskWeather ||= reactive<WeatherState>({ locations: [], activeId: "" }))

export function addWeatherPlace(place: WeatherPlace) {
  if (!weather.locations.some((p) => p.id === place.id)) weather.locations.push(place)
  weather.activeId = place.id
}

export function removeWeatherPlace(id: string) {
  const i = weather.locations.findIndex((p) => p.id === id)
  if (i >= 0) weather.locations.splice(i, 1)
  if (weather.activeId === id) weather.activeId = weather.locations[0]?.id || ""
}

/** 置顶：把该地点挪到列表第一位 */
export function pinWeatherPlace(id: string) {
  const i = weather.locations.findIndex((p) => p.id === id)
  if (i > 0) weather.locations.unshift(weather.locations.splice(i, 1)[0])
}

export function selectWeatherPlace(id: string) {
  weather.activeId = id
}

/* ═══ 存储层（唯一入口）════════════════════════════════════
 * 用户状态 → 思源 petal（plugin.loadData/saveData）
 * 派生缓存 → localStorage（desk-cache: 命名空间，可丢可重建）
 * 旧键迁移 → 见下方 mergeLegacy
 */

/* ── 派生缓存（唯一允许落 localStorage 的地方）── */
const CACHE_NS = "desk-cache:"

export function cacheGet<T>(key: string, ttl = 0): T | null {
  try {
    const raw = localStorage.getItem(CACHE_NS + key)
    if (!raw) return null
    const box = JSON.parse(raw) as { at: number; v: T }
    if (ttl && Date.now() - box.at > ttl) return null
    return box.v
  } catch {
    return null
  }
}

export function cacheSet(key: string, value: unknown) {
  try {
    localStorage.setItem(CACHE_NS + key, JSON.stringify({ at: Date.now(), v: value }))
  } catch {
    /* 配额满就算了：缓存只是加速 */
  }
}

/* ── 旧键迁移（老的 localStorage 键 → petal，一次性）── */
/**
 * 卡片自己的持久化：一个 reactive 对象 + 自动落盘（100ms 合并由 storage 的写入节奏兜住）。
 * 只给「几张卡各自的偏好/清单」用；桌面布局、外观这些仍然在 `core/store.ts` 里。
 */
export function persisted<T extends object>(key: string, defaults: T): T {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ...defaults }
      const data = JSON.parse(raw) as Partial<T>
      return { ...defaults, ...data }
    } catch {
      return { ...defaults }
    }
  }

  const state = reactive(read()) as T
  let timer = 0
  watch(
    state,
    () => {
      if (timer) return
      timer = window.setTimeout(() => {
        timer = 0
        try {
          localStorage.setItem(key, JSON.stringify(state))
        } catch {
          /* 配额满了就算了，卡片还能用 */
        }
      }, 150)
    },
    { deep: true },
  )
  return state
}

/* ── 启动 ── */
export async function bootStore() {
  if (G.__deskBooted) return
  G.__deskBooted = true
  const [w, d, a, wx, cd] = await Promise.all([
    read(LS.wallpaper, DEFAULT_WALLPAPER),
    read<DeskState>(LS.desk, { cards: [] }),
    read(LS.appearance, DEFAULT_APPEARANCE),
    read<WeatherState>(LS.weather, { locations: [], activeId: "" }),
    read<CountdownState>(LS.countdown, { events: [], seeded: false }),
  ])
  Object.assign(wallpaper, w)
  Object.assign(appearance, a)
  /* 单格只允许落在细网格区间内，越界值直接归位到默认 */
  appearance.cell = Math.min(CELL_MAX, Math.max(CELL_MIN, appearance.cell || DEFAULT_CELL))
  desk.cards = Array.isArray(d.cards) ? d.cards : []
  /* 旧粗网格（单格 ≥40）→ 新细网格：坐标与尺寸整体翻倍，视觉位置不变 */
  if ((a.cell ?? 54) >= 40) {
    a.cell = DEFAULT_CELL
    for (const c of desk.cards) {
      c.x *= 2
      c.y *= 2
      c.w *= 2
      c.h *= 2
    }
  }
  weather.locations = Array.isArray(wx.locations) ? wx.locations : []
  weather.activeId = wx.activeId || weather.locations[0]?.id || ""
  countdown.events = Array.isArray(cd.events) ? cd.events : []
  /* 收藏没有第二份状态：公开文件夹里有什么，收藏就是什么 */
  favorites.splice(0, favorites.length, ...(await listFavs()))
  seedCountdown()
  countdown.seeded = true
  seedDefaultDesk()
  ready = true
}

/* ── 保存：状态一变就防抖写盘 ──
 * wallpaper 只写 value（地址），resolved 是运行时下载的 data URL，几百 KB，
 * 写进存储既慢又会撑爆配额，所以永远不落盘，重启后按 value 重新取。 */
function persistAll() {
  const { type, value, source, blur, mask } = wallpaper
  save(LS.wallpaper, { type, value, source, blur, mask })
  save(LS.desk, desk)
  save(LS.appearance, appearance)
  save(LS.weather, weather)
  save(LS.countdown, countdown)
}

watch([wallpaper, appearance, desk, weather, countdown], persistAll, { deep: true })
watch(appearance, applyAppearanceVars, { deep: true, immediate: true })
