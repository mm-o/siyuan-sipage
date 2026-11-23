import { computed } from "vue"
import { persisted } from "@/core/store"
import { pad, sql } from "@/core/util"

interface Bar {
  label: string
  value: number
}

interface Ring {
  label: string
  words: number
  children: { label: string; words: number }[]
}

interface DocStats {
  docs: number
  words: number
  today: number
  week: number
  month: number
  notebooks: Bar[]
  top: Bar[]
  /** 旭日图：笔记本 → 一级路径，权重 = 字数 */
  tree: Ring[]
  updatedAt: number
}

export const docstats = persisted("desk:docstats", { cache: null as DocStats | null })
export const stats = computed(() => docstats.cache)

const CACHE_MS = 5 * 60_000

const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

/**
 * 四个维度一次取完（每条都显式 limit：思源 SQL 默认只回 64 行）：
 *   总量 / 笔记本分布 / 近 14 天新增 / 字数分布 + 字数 Top
 */
export async function loadDocStats(force = false): Promise<DocStats> {
  const cached = docstats.cache
  if (!force && cached && Date.now() - cached.updatedAt < CACHE_MS) return cached

  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86_400_000)
  const d30 = new Date(now.getTime() - 30 * 86_400_000)
  const where = "type = 'd'"

  const [sum] = await sql(
    `select count(*) as docs, sum(length) as words,
       sum(case when substr(created,1,8) >= '${ymd(now)}' then 1 else 0 end) as today,
       sum(case when substr(created,1,8) >= '${ymd(d7)}' then 1 else 0 end) as week,
       sum(case when substr(created,1,8) >= '${ymd(d30)}' then 1 else 0 end) as month
     from blocks where ${where} limit 1`,
  )

  const nbRows = await sql(
    `select box, count(*) as docs, sum(length) as words from blocks where ${where} group by box order by docs desc limit 10`,
  )
  const names = new Map<string, string>()
  try {
    for (const n of await sql(`select id, name from notebooks limit 64`)) {
      names.set(String(n.id), String(n.name || ""))
    }
  } catch {
    /* 无 notebooks 表：用 box id 前 6 位 */
  }

  const pathRows = await sql(
    `select box, hpath, sum(length) as words from blocks where ${where} group by box, hpath order by words desc limit 400`,
  )

  const tree = (() => {
    const byBox = new Map<string, Ring>()
    for (const r of pathRows) {
      const box = String(r.box || "")
      const label = names.get(box) || box.slice(0, 6)
      const words = Number(r.words) || 0
      const node = byBox.get(box) || { label, words: 0, children: [] }
      node.words += words
      /* hpath 形如 /笔记本/一级/二级：取一级做外环 */
      const seg = String(r.hpath || "/").split("/").filter(Boolean)
      const child = seg.length > 1 ? seg[1] : seg[0] || "根"
      const hit = node.children.find((c) => c.label === child)
      if (hit) hit.words += words
      else node.children.push({ label: child, words })
      byBox.set(box, node)
    }
    return [...byBox.values()].sort((a, b) => b.words - a.words).slice(0, 6).map((n) => ({
      ...n,
      children: n.children.sort((a, b) => b.words - a.words).slice(0, 5),
    }))
  })()

  const topRows = await sql(
    `select content as title, length from blocks where ${where} order by length desc limit 5`,
  )

  const data: DocStats = {
    docs: Number(sum?.docs) || 0,
    words: Number(sum?.words) || 0,
    today: Number(sum?.today) || 0,
    week: Number(sum?.week) || 0,
    month: Number(sum?.month) || 0,
    notebooks: nbRows.map((r) => ({
      label: names.get(String(r.box)) || String(r.box || "").slice(0, 6),
      value: Number(r.docs) || 0,
    })),
    tree,
    top: topRows.map((r) => ({ label: String(r.title || "未命名"), value: Number(r.length) || 0 })),
    updatedAt: Date.now(),
  }
  docstats.cache = data
  return data
}

/** 万/千分位 */
export function compact(n: number) {
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}万`
  return String(n)
}

/** 五维雷达：给定值返回多边形点串与归一化比例（卡片与弹窗共用） */
export const RADAR_LABELS = ["文档", "字数", "近7天", "近30天", "笔记本"]

export function radarOf(values: number[]) {
  const max = Math.max(1, ...values)
  const points = values.map((x, i) => {
    const a = (Math.PI * 2 * i) / values.length - Math.PI / 2
    const r = 0.18 + 0.82 * (x / max)
    return [50 + Math.cos(a) * r * 42, 50 + Math.sin(a) * r * 42] as const
  })
  return {
    poly: points.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" "),
    dots: points.map((p) => [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))]),
  }
}

/** 卡片用：从 stats 取五个维度 */
export function radarValuesOf(s: DocStats | null) {
  return [s?.docs ?? 0, s?.words ?? 0, s?.week ?? 0, s?.month ?? 0, s?.notebooks.length ?? 0]
}
