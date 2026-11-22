/**
 * 图片（唯一入口）：思源头图清单 + 壁纸来源 + 直连/内核代理兜底
 *
 * 原来拆成三个文件（covers / wallpapers / imageProxy），实际都是同一件事的不同侧面：
 * 「一张图从哪儿来、拿不到怎么办」。合成一个文件后只有一条代理出口，不会各写一份。
 *
 * 三条约定：
 *   1. 所有跨域请求都走 `/api/network/forwardProxy`（思源内核代取）：渲染进程直连会被
 *      CORS / 防盗链拦掉，这是必应每日之前不显示的根因。
 *   2. 本地资源（`/appearance/**`、`data:`）直接返回，不绕代理。
 *   3. 清单/接口都有缓存，重复调用不产生额外请求；拿不到就退回内置兜底，保证离线可用。
 */
import { post } from "@/core/util"

/* ── 内核转发（唯一出口）────────────────────────────────── */

/**
 * 通过思源内核取数据；`encoding: "text"` 取文本，`"base64"` 取 data URL。
 * 图片和天气接口共用这一个出口：渲染进程直连会被 CORS 挡掉，凡是跨域都在这里过一遍。
 */
export async function forwardProxy(
  url: string,
  encoding: "text" | "base64",
  timeout = 12_000,
  headers: [string, string][] = [],
): Promise<string> {
  const data = await post<{ body?: string; contentType?: string; msg?: string }>("/api/network/forwardProxy", {
    url,
    method: "GET",
    timeout,
    contentType: "",
    headers,
    payload: "",
    payloadEncoding: "text",
    responseEncoding: encoding,
  })
  if (!data?.body) throw new Error("proxy failed")
  if (encoding === "text") return String(data.body)
  const mime = String(data.contentType || "").split(";")[0].trim()
  // 接口挂了常返一张 200 + text/html 的错误页，只认真正的图
  if (!mime.startsWith("image/")) throw new Error(`not an image: ${mime || "empty"}`)
  return `data:${mime};base64,${data.body}`
}

/* ── 思源头图（题头图）清单 ──────────────────────────────── */

export interface CoverItem {
  file: string
  category: string
  photographer?: string
  photographer_url?: string
  pexels_url?: string
}

export interface CoverGroup {
  key: string
  label: string
  items: CoverItem[]
}

/** 思源的分类 key → 中文名（取自 SiYuan 的 i18n 词条） */
const CATEGORY_LABEL: Record<string, string> = {
  coverNature: "自然",
  coverCityNight: "城市夜景",
  coverMistyMorning: "晨雾",
  coverCountryside: "田园",
  coverDesert: "沙漠",
  coverAurora: "极光",
  coverTeaCeremony: "茶道",
  coverInkWashLandscape: "水墨山水",
  coverWildlife: "野生动物",
  coverStillWater: "静水",
  coverChineseGarden: "中式园林",
  coverClassicalArchitecture: "古典建筑",
  coverReadingNook: "阅读角",
  coverZenMinimal: "禅意极简",
  coverAutumnLeaves: "秋叶",
  coverNeonNights: "霓虹夜色",
  coverLightGeometry: "光影几何",
  coverRoadAhead: "前路",
}

/** 内置兜底（manifest 拿不到时用，保证离线也能用） */
export const COVERS = [
  "/appearance/covers/cover_001.webp",
  "/appearance/covers/cover_002.webp",
  "/appearance/covers/cover_003.webp",
  "/appearance/covers/cover_004.webp",
  "/appearance/covers/cover_005.webp",
  "/appearance/covers/cover_006.webp",
]

export const coverUrl = (file: string) => `/appearance/covers/${file}`

let groupCache: CoverGroup[] | null = null
let groupLoading: Promise<CoverGroup[]> | null = null

/** 读取并按分类分组（带缓存，重复调用无网络开销） */
export async function loadCoverGroups(): Promise<CoverGroup[]> {
  if (groupCache) return groupCache
  if (groupLoading) return groupLoading

  groupLoading = (async () => {
    try {
      const res = await fetch("/appearance/covers/manifest.json", { cache: "no-cache" })
      if (!res.ok) throw new Error(String(res.status))
      const list = (await res.json()) as CoverItem[]
      if (!Array.isArray(list) || !list.length) throw new Error("empty")

      const map = new Map<string, CoverItem[]>()
      for (const item of list) {
        const key = item.category || "coverNature"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(item)
      }

      groupCache = [...map.entries()].map(([key, items]) => ({
        key,
        label: CATEGORY_LABEL[key] || key.replace(/^cover/, ""),
        items,
      }))
      return groupCache
    } catch {
      groupCache = [{ key: "fallback", label: "内置", items: COVERS.map((f) => ({ file: f.split("/").pop()!, category: "fallback" })) }]
      return groupCache
    } finally {
      groupLoading = null
    }
  })()

  return groupLoading
}

/* ── 壁纸来源 ────────────────────────────────────────────── */

export type WallSource = "theme" | "siyuan" | "cover" | "bing" | "gitee" | "picsum" | "random" | "solid" | "url"

export const SOURCE_LABEL: Record<WallSource, string> = {
  theme: "跟随思源",
  siyuan: "思源资源",
  cover: "思源头图",
  bing: "必应每日",
  gitee: "国内图源",
  picsum: "Picsum 随机",
  random: "本地随机",
  solid: "纯色",
  url: "图片链接",
}

/**
 * 跟随思源：底色不写死，直接吃主题变量。
 * 主题一换，变量一变，壁纸跟着变，不需要任何 JS 监听。
 */
export const THEME_BG =
  "radial-gradient(120% 88% at 20% 0%, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 38%, var(--b3-theme-background, #12161f)) 0%, transparent 58%), var(--b3-theme-background, #12161f)"

/**
 * 思源资源：直接用笔记本 assets 里的图，内核按 /assets/... 直给，
 * 零网络、零转发；value 为空时退到题头图首张。
 */
const SIYUAN_FALLBACK_BG = 'url("/appearance/covers/cover_001.webp")'

/** 壁纸状态 → 背景样式（唯一出口：桌面、设置预览、组件设置预览都用它） */
export function wallpaperBg(w: { type: string; value: string; resolved?: string }): Record<string, string> {
  if (w.type === "theme") return { background: THEME_BG }
  if (w.type === "siyuan") return { backgroundImage: w.value ? `url(${w.value})` : SIYUAN_FALLBACK_BG }
  if (w.type === "solid") return { background: w.value }
  return { backgroundImage: `url(${w.resolved || w.value})` }
}

/** 壁纸状态 → 来源（面板高亮与右栏文案共用同一套推导） */
export function wallSource(w: { type: string; source?: string }): WallSource {
  if (w.type === "theme") return "theme"
  if (w.type === "siyuan") return "siyuan"
  if (w.type === "solid") return "solid"
  if (w.type === "url") return "url"
  return (w.source as WallSource) || "cover"
}

const BING_API = "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN"
/** 官方接口挂掉时的备用图（思桌用的就是它） */
const BING_FALLBACK = "https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN"
const BING_TTL = 6 * 3600 * 1000

let bingCache: { at: number; list: BingImage[] } | null = null

export interface BingImage {
  url: string
  date: string
  title: string
}

export async function loadBingImages(): Promise<BingImage[]> {
  if (bingCache && Date.now() - bingCache.at < BING_TTL) return bingCache.list
  try {
    // 必须走内核转发：cn.bing.com 不返回 Access-Control-Allow-Origin
    const json = JSON.parse(await forwardProxy(BING_API, "text"))
    const list: BingImage[] = (json?.images || []).map((it: any) => ({
      url: `https://cn.bing.com${it.url}`,
      date: String(it.startdate || ""),
      title: String(it.copyright || it.title || ""),
    }))
    if (!list.length) throw new Error("empty")
    bingCache = { at: Date.now(), list }
    return list
  } catch {
    // 官方接口不可用：退回备用单图（图片本身可直接 <img> 加载）
    bingCache = null
    return [{ url: BING_FALLBACK, date: "", title: "必应每日" }]
  }
}

/* ── 外网图：统一走内核 POST 转发，取回 base64 后转 data URL ── */

/**
 * 取一张外网图，返回可直接放进 url() 的 data URL。
 * 内核的 GET?url= 形式对二进制返 0 字节，只有 POST JSON 那个口能拿到 body，
 * 所以任何外网图都必须经过这里 —— 这是全项目唯一的取图口。
 */
export const fetchImage = (url: string) => forwardProxy(url, "base64")

/**
 * 外网图统一一种形状：
 *   url   原图地址，进状态、进收藏、壁纸用它 —— 短、可复现、能落盘
 *   thumb 网格缩略（data URL）—— 只活内存，12 张一起渲染也不压内存
 * 点选时才按 url 取一张原图，所以清晰度和开销互不拖累。
 */
export interface WebImage {
  seed: string
  url: string
  thumb: string
}

/** 壁纸原图：1920×1080，实测单张 355KB / 1.5s，和 480 的耗时几乎一样 */
const picsumUrl = (seed: string) => `https://picsum.photos/seed/${seed}/1920/1080`

/** 网格缩略：640×360，足够铺满小格，单张约 60KB */
const picsumThumb = (seed: string) => `https://picsum.photos/seed/${seed}/640/360`

function randSeed() {
  return Math.random().toString(36).slice(2, 8)
}

/** 首批固定，打开面板立刻有图；「换一批」才随机 */
const PICSUM_SEEDS = ["grain", "ridge", "harbor", "dune", "fern", "lumen", "ember", "vista", "ash", "tide", "nimbus", "quarry"]

const picsumBatch = (seeds: string[]): Promise<WebImage[]> =>
  Promise.all(
    seeds.map(async (seed) => ({ seed, url: picsumUrl(seed), thumb: await fetchImage(picsumThumb(seed)) })),
  )

export const picsumFirst = () => picsumBatch(PICSUM_SEEDS)
export const picsumShuffle = () => picsumBatch(Array.from({ length: 12 }, randSeed))

/** 国内图源：alcy.cc 单次直出原图 webp，实测 0.7s，国内可直连 */
const ALCY_API = "https://t.alcy.cc/pc"

const alcyWallpaper = () => fetchImage(ALCY_API)

/** 接口每次随机、拿不到可复现地址，所以 data 本身就是这张图的身份 */
export async function alcyBatch(count = 12): Promise<WebImage[]> {
  const time = Date.now().toString(36)
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const data = await alcyWallpaper()
      return { seed: `a${time}${i}`, url: data, thumb: data }
    }),
  )
}

/** 从思源题头图里随机一张 */
export async function randomCoverUrl(): Promise<string> {
  const all = (await loadCoverGroups()).flatMap((g) => g.items)
  if (!all.length) return COVERS[0]
  return coverUrl(all[Math.floor(Math.random() * all.length)].file)
}

/* ── 思源资源：直接用笔记本里已有的图片 ───────────────────── */

export interface AssetImage {
  path: string
  url: string
}

let assetCache: AssetImage[] | null = null
let assetLoading: Promise<AssetImage[]> | null = null

/** 思源插图资产（assets/ 下的图片），内核直接给，零网络 */
export function loadAssets(): Promise<AssetImage[]> {
  if (assetCache) return Promise.resolve(assetCache)
  assetLoading ??= (async () => {
    const data = await post<{ path?: string }[] | null>("/api/search/searchAsset", { k: "image" })
    const raw = Array.isArray(data) ? data : []
    assetCache = raw
      .map((it: any) => String(it?.path || ""))
      .filter((p: string) => /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(p))
      .map((p: string) => ({ path: p, url: `/${p}` }))
    return assetCache
  })().finally(() => { assetLoading = null })
  return assetLoading
}

/* ── 收藏：真图字节存进思源公开文件夹 /data/public，用 /public/ 直接访问 ── */
const FAV_DIR = "siyuan-desk-cards"

const FAV_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i

/** 收藏图的公开地址：/data/public 由内核以静态文件直出，不需要任何鉴权 */
export const favUrl = (name: string) => `/public/${FAV_DIR}/${name}`

/** 短哈希：同一张图永远同一个名字，这是图标能点亮的前提 */
const shortHash = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/**
 * 名字只由 value 决定，纯函数、无时间戳 —— 渲染时算的和落盘时写的是同一个名字。
 * 有扩展名就用原名，没有（Picsum、alcy 这类）用短哈希兜底。
 */
export function favName(value: string): string {
  if (value.startsWith("data:")) {
    const ext = (value.slice(5, value.indexOf(";")).split("/")[1] || "png").replace("jpeg", "jpg")
    /* 头部字节所有 JPEG 都一样，用长度 + 尾部才能区分开 */
    return `${shortHash(`${value.length}:${value.slice(-96)}`)}.${ext}`
  }
  const base = value.split(/[?#]/)[0].split("/").pop() || ""
  return FAV_EXT.test(base) ? base : `${shortHash(value)}.jpg`
}

/** data URL → 真字节 */
function dataUrlBytes(dataUrl: string): Blob {
  const [, meta = "", body = ""] = dataUrl.match(/^data:([^,]*),(.*)$/s) || []
  const type = meta.split(";")[0] || "image/png"
  if (!/;base64/i.test(meta)) return new Blob([decodeURIComponent(body)], { type })
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** 把任意壁纸值还原成真实图片字节：data URL 直接拆，外部地址走唯一取图口 */
async function imageBytes(value: string): Promise<Blob> {
  if (value.startsWith("data:")) return dataUrlBytes(value)
  const url = new URL(value, location.origin)
  if (url.origin === location.origin) {
    const res = await fetch(url)
    if (!res.ok) throw new Error("read image failed")
    return await res.blob()
  }
  return dataUrlBytes(await fetchImage(url.href))
}

/** multipart 上传：建目录与写文件共用（JSON 出口 post 不适用于 FormData）。 */
async function putFile(path: string, file?: File) {
  const fd = new FormData()
  fd.append("path", path)
  fd.append("isDir", file ? "false" : "true")
  if (file) fd.append("file", file)
  const res = await fetch("/api/file/putFile", { method: "POST", body: fd })
  const json = await res.json().catch(() => null)
  if (json?.code !== 0) throw new Error(json?.msg || "写文件失败")
}

async function ensureFavDir() {
  await putFile(`/data/public/${FAV_DIR}`)
}

/**
 * 收藏：把当前壁纸的**真实图片字节**写进 /data/public/siyuan-desk-cards，
 * 返回文件名。写的是字节而不是地址 —— 这样 /public/ 下就是一张能直接打开的图，
 * 内核自己按 mime 供给，重装插件不影响，也不占用插件目录。
 */
export async function saveFav(value: string): Promise<string> {
  const blob = await imageBytes(value)
  const name = favName(value)
  await ensureFavDir()
  await putFile(`/data/public/${FAV_DIR}/${name}`, new File([blob], name))
  return name
}

/** 删掉公开文件夹里的一张收藏 */
export async function removeFav(name: string): Promise<void> {
  await post("/api/file/removeFile", { path: `/data/public/${FAV_DIR}/${name}` })
}

/** 扫公开文件夹：收藏的唯一真相在磁盘上，状态只是它的镜像 */
export async function listFavs(): Promise<string[]> {
  const data = await post<{ name?: string; isDir?: boolean }[] | null>("/api/file/readDir", { path: `/data/public/${FAV_DIR}` })
  const raw = Array.isArray(data) ? data : []
  return raw
    .filter((it: any) => it?.isDir !== true)
    .map((it: any) => String(it?.name || ""))
    .filter((n: string) => FAV_EXT.test(n))
}
