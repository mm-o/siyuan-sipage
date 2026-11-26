import { computed } from "vue"
import { isZh, t } from "@/core/i18n"
import { persisted } from "@/core/store"
import { BODY_TYPES, pad, sql } from "@/core/util"

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

export const docstats = persisted("docstats", { cache: null as DocStats | null })
export const stats = computed(() => docstats.cache)

const CACHE_MS = 5 * 60_000

const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

/**
 * 四个维度一次取完（每条都显式 limit：思源 SQL 默认只回 64 行）：
 *   总量 / 笔记本分布 / 字数构成 / 字数 Top
 *
 * 口径（和思源自己一致）：**字数只数正文块**（`BODY_TYPES`）；文档块（type='d'）的
 * length 是标题本身，混进来就会出现「745 字 / 62 篇」这种数字。
 */
export async function loadDocStats(force = false): Promise<DocStats> {
  const cached = docstats.cache
  if (!force && cached && Date.now() - cached.updatedAt < CACHE_MS) return cached

  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86_400_000)
  const d30 = new Date(now.getTime() - 30 * 86_400_000)

  const [sum] = await sql(
    `select
       (select count(*) from blocks where type = 'd') as docs,
       (select coalesce(sum(length), 0) from blocks where type in ${BODY_TYPES}) as words,
       (select count(*) from blocks where type = 'd' and substr(created, 1, 8) >= '${ymd(now)}') as today,
       (select count(*) from blocks where type = 'd' and substr(created, 1, 8) >= '${ymd(d7)}') as week,
       (select count(*) from blocks where type = 'd' and substr(created, 1, 8) >= '${ymd(d30)}') as month
     limit 1`,
  )

  const nbRows = await sql(
    `select box,
       sum(case when type = 'd' then 1 else 0 end) as docs,
       sum(case when type in ${BODY_TYPES} then length else 0 end) as words
     from blocks group by box having docs > 0 order by docs desc limit 10`,
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
    `select box, hpath, sum(length) as words from blocks
     where type in ${BODY_TYPES} group by box, hpath order by words desc limit 400`,
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
      const child = seg.length > 1 ? seg[1] : seg[0] || t("card.docstats.root")
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
    `select b.content as title, sum(x.length) as words
     from blocks x join blocks b on b.id = x.root_id
     where x.type in ${BODY_TYPES} and b.type = 'd'
     group by x.root_id order by words desc limit 5`,
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
    top: topRows.map((r) => ({ label: String(r.title || t("card.docstats.untitled")), value: Number(r.words) || 0 })),
    updatedAt: Date.now(),
  }
  docstats.cache = data
  return data
}

/** 万/千分位；英文按 K / M 收（同一套阈值，只是单位换了） */
export function compact(n: number) {
  if (!isZh) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
    return String(n)
  }
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}万` // i18n-keep
  return String(n)
}

/** 五维雷达：给定值返回多边形点串与归一化比例（卡片与弹窗共用） */
export const RADAR_LABELS = [
  t("card.docstats.radar.docs"),
  t("card.docstats.radar.words"),
  t("card.docstats.radar.week"),
  t("card.docstats.radar.month"),
  t("card.docstats.radar.notebooks"),
]

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
