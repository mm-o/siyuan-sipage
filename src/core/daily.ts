/**
 * 每日内容序列（每日一言 / 每日英语 / 每日诗词共用）
 *
 * 卡片与详情是同一个组件的两个实例：共享同一份内容与同一张背景，
 * 打开详情不会换句换图；「上一条 / 下一条」在同一个序列上移动，**背景跟着换**；
 * 想自己挑一张就点「换一张背景」（只影响当前这一条）。
 *
 * 每张卡只提供「按偏移量取一条」的 loader：
 *   一言   offset 只是缓存槽位，每次都随机取一条
 *   英语   offset 0 = 今天接口给的句子，其余在本地句库循环
 *   诗词   offset = 距今天的天数，按日期请求（接口支持 ?date=）
 */
import { ref, type Ref } from "vue"
import { randomCoverUrl } from "./image"

/**
 * 每日内容的接口主机
 *
 * 这是 iTab 的官方服务（`base.itab.link`）——**外部域名，不能跟着插件改名**，
 * 改了就是 DNS 失败（`base.desk.link` 根本不存在）。下面各卡的路径同理，
 * 例如英语接口的 `/itab/todayEnglish` 里，`itab` 是它的路由前缀，不是我们的名字。
 */
export const DAILY_API = "https://base.itab.link"

interface DailySeries<T> {
  /** 当前内容（卡片与详情共享） */
  item: Ref<T>
  /** 当前这一条的背景（跟着内容走，可手动换） */
  cover: Ref<string>
  step(dir: "prev" | "next"): Promise<void>
  shuffleCover(): Promise<void>
}

interface SeriesOptions<T> {
  initial: T
  /** 取第 offset 条；返回 null 表示这条不存在（停在原地） */
  load(offset: number): Promise<T | null>
}

const registry = new Map<string, DailySeries<unknown>>()

export function dailySeries<T extends object>(key: string, options: SeriesOptions<T>): DailySeries<T> {
  const cached = registry.get(key)
  if (cached) return cached as DailySeries<T>

  const item = ref({ ...options.initial }) as Ref<T>
  const cover = ref("")
  const items = new Map<number, T>()
  /** 每条内容对应一张背景：回退时拿到同一张 */
  const covers = new Map<number, string>()
  let cursor = 0
  /** 快速连点时只认最后一次请求，避免旧结果覆盖新内容 */
  let seq = 0

  async function coverOf(offset: number): Promise<string> {
    const hit = covers.get(offset)
    if (hit) return hit
    const url = await randomCoverUrl()
    covers.set(offset, url)
    return url
  }

  async function go(offset: number) {
    const mine = ++seq
    const hit = items.get(offset)
    if (!hit) {
      const value = await options.load(offset)
      if (!value) return
      items.set(offset, value)
    }
    const url = await coverOf(offset)
    if (mine !== seq) return
    cursor = offset
    Object.assign(item.value, items.get(offset)!)
    cover.value = url
  }

  const api: DailySeries<T> = {
    item,
    cover,
    step: (dir) => go(cursor + (dir === "next" ? 1 : -1)),
    /** 换一张背景：只重掷当前这一条 */
    shuffleCover: async () => {
      covers.delete(cursor)
      const url = await coverOf(cursor)
      cover.value = url
    },
  }

  // 首屏：第 0 条 + 它的背景（两个实例只会跑一次）
  void go(0)

  registry.set(key, api as DailySeries<unknown>)
  return api
}
