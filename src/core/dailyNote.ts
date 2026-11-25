/**
 * 日记（卡片与详情共用）
 *
 * 思源的日记就是一篇文档，标识在 `attributes` 里：`custom-dailynote-YYYYMMDD = root_id`。
 * 所以「找某天的日记」是一条 SQL，「新建今天的日记」走内核 `/api/filetree/createDailyNote`。
 *
 * 卡片给「字数 / 待办 / 前几行」，详情用 Protyle 就地编辑；
 * 两者都按实例偏移找日期，多张日记卡可以各看各的那一天。
 */
import { dateKey } from "@/core/agenda"
import { BODY_TYPES, post, sql } from "@/core/util"

interface DailyNote {
  id: string
  title: string
}

interface DailyTodo {
  /** 待办块的 id：点一下能滚到正文那一行 */
  id: string
  text: string
  done: boolean
}

export interface DailyPreview extends DailyNote {
  words: number
  blocks: number
  todos: DailyTodo[]
}

/** 相对今天偏移几天 */
export function dayOf(offset: number, base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset)
}

const attrOf = (date: Date) => `custom-dailynote-${dateKey(date).replace(/-/g, "")}`

/** 找某天的日记文档；没有就返回 null */
export async function findDaily(date: Date): Promise<DailyNote | null> {
  const rows = await sql(
    `select root_id as id from attributes where type = 'b' and name = '${attrOf(date)}' limit 1`,
  ).catch(() => [])
  const id = String((rows[0] as { id?: string } | undefined)?.id || "")
  if (!id) return null
  const docs = await sql(`select content as title from blocks where id = '${id}' limit 1`).catch(() => [])
  return { id, title: String((docs[0] as { title?: string } | undefined)?.title || dateKey(date)) }
}

/** 日记该建在哪个笔记本：优先用最近一篇日记所在的库，没有才退到第一个 */
async function dailyNotebook(): Promise<string> {
  const rows = await sql(`select box from attributes where name like 'custom-dailynote-%' order by name desc limit 1`).catch(() => [])
  const box = String((rows[0] as { box?: string } | undefined)?.box || "")
  if (box) return box
  const books = await post<{ notebooks?: { id: string }[] }>("/api/notebook/lsNotebooks")
  return books?.notebooks?.[0]?.id || ""
}

/** 最近一篇日记所在的笔记本与目录：新建别的日期时放在同样的位置 */
async function dailySeed(): Promise<{ box: string; dir: string }> {
  const rows = await sql(`select b.box as box, b.path as path from attributes a join blocks b on b.id = a.block_id
    where a.name like 'custom-dailynote-%' order by a.name desc limit 1`).catch(() => [])
  const row = (rows[0] || {}) as { box?: string; path?: string }
  const dir = String(row.path || "").replace(/\/[^/]+$/, "")
  return { box: String(row.box || ""), dir }
}

/**
 * 取某天的日记，没有就建一个
 *
 * 今天交给内核（它会按日记模板建）；别的日期在「最近一篇日记」的同一个笔记本、同一层目录下建，
 * 建完补上 `custom-dailynote-YYYYMMDD` 属性，之后 findDaily 就能找到它。
 */
export async function ensureDaily(date: Date): Promise<DailyNote> {
  const hit = await findDaily(date)
  if (hit) return hit
  const key = dateKey(date)
  const notebook = await dailyNotebook()
  if (!notebook) throw new Error("未找到笔记本")
  if (key === dateKey(new Date())) {
    const doc = await post<{ id: string }>("/api/filetree/createDailyNote", { notebook, app: "" })
    if (!doc?.id) throw new Error("创建日记失败")
    return { id: doc.id, title: key }
  }
  const seed = await dailySeed()
  /* 这个接口的 data 直接是文档 id（字符串），跟 createDailyNote 的 { id } 不一样 */
  const created = await post<string | { id?: string }>("/api/filetree/createDocWithMd", {
    notebook,
    path: `${seed.dir}/${key}`,
    markdown: "",
  })
  const id = typeof created === "string" ? created : created?.id || ""
  if (!id) throw new Error("创建日记失败")
  await post("/api/attr/setBlockAttrs", {
    id,
    attrs: { [`custom-dailynote-${key.replace(/-/g, "")}`]: "" },
  })
  return { id, title: key }
}

/** 某篇日记的字数与块数（编辑时就地刷新统计，不重挂 Protyle） */
export async function dailyStat(id: string): Promise<{ words: number; blocks: number }> {
  const [row] = await sql(
    `select coalesce(sum(length), 0) as words, count(*) as blocks from blocks
     where root_id = '${id}' and type in ${BODY_TYPES} limit 1`,
  ).catch(() => [])
  const hit = (row || {}) as { words?: number; blocks?: number }
  return { words: Number(hit.words) || 0, blocks: Number(hit.blocks) || 0 }
}

/** 日记里的待办（单独查：不受正文行数限制，编辑时可单独刷新） */
export async function dailyTodos(id: string): Promise<DailyTodo[]> {
  const rows = await sql(
    `select id, content from blocks
     where root_id = '${id}' and type = 'i' and content != '' order by sort asc limit 60`,
  ).catch(() => [])
  const out: DailyTodo[] = []
  for (const row of rows as { id?: string; content?: string }[]) {
    const text = String(row.content || "").split("\n").map((line) => line.trim()).find(Boolean) || ""
    const todo = /^\[([ xX])\]\s*(.+)$/.exec(text)
    if (todo) out.push({ id: String(row.id || ""), text: todo[2], done: todo[1] !== " " })
  }
  return out
}

/** 已知文档时直接取摘要：新建的日记不必等属性索引刷新 */
export async function previewOf(note: DailyNote): Promise<DailyPreview> {
  const [stat, todos] = await Promise.all([dailyStat(note.id), dailyTodos(note.id)])
  return { ...note, words: stat.words, blocks: stat.blocks, todos }
}

/** 某天的日记摘要（找不到就是 null；正文由 Protyle 直接渲染） */
export async function loadDaily(date: Date): Promise<DailyPreview | null> {
  const note = await findDaily(date)
  return note ? previewOf(note) : null
}

/** 打开日记文档（在本页签里打开） */
export async function openDaily(id: string) {
  const { openDoc } = await import("@/core/quickdocs")
  await openDoc(id)
}
