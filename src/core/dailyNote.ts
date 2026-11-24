/**
 * 日记（卡片与详情共用）
 *
 * 思源的日记就是一篇文档，标识在 `attributes` 里：`custom-dailynote-YYYYMMDD = root_id`。
 * 所以「找某天的日记」是一条 SQL，「新建今天的日记」走内核 `/api/filetree/createDailyNote`。
 *
 * 卡片只读预览（前几行 + 字数/块数 + 未勾掉的待办），详情用 Protyle 只读渲染全文；
 * 两者都按实例偏移找日期，多张日记卡可以各看各的那一天。
 */
import { BODY_TYPES, pad, post, sql } from "@/core/util"

export interface DailyNote {
  id: string
  title: string
}

export interface DailyLine {
  type: string
  text: string
}

export interface DailyTodo {
  text: string
  done: boolean
}

export interface DailyPreview extends DailyNote {
  words: number
  blocks: number
  lines: DailyLine[]
  todos: DailyTodo[]
  updated: string
}

/** 日期键（本地时区）YYYY-MM-DD */
export const dateKeyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** 相对今天偏移几天 */
export function dayOf(offset: number, base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset)
}

export function labelOf(date: Date) {
  const today = dateKeyOf(new Date())
  const key = dateKeyOf(date)
  const weekday = `周${"日一二三四五六"[date.getDay()]}`
  return key === today ? `今天 · ${weekday}` : `${date.getMonth() + 1}月${date.getDate()}日 · ${weekday}`
}

const attrOf = (date: Date) => `custom-dailynote-${dateKeyOf(date).replace(/-/g, "")}`

/** 找某天的日记文档；没有就返回 null */
export async function findDaily(date: Date): Promise<DailyNote | null> {
  const rows = await sql(
    `select root_id as id from attributes where type = 'b' and name = '${attrOf(date)}' limit 1`,
  ).catch(() => [])
  const id = String((rows[0] as { id?: string } | undefined)?.id || "")
  if (!id) return null
  const docs = await sql(`select content as title from blocks where id = '${id}' limit 1`).catch(() => [])
  return { id, title: String((docs[0] as { title?: string } | undefined)?.title || dateKeyOf(date)) }
}

/** 今天的日记：没有就让内核建一个（只对今天：日记文档的日期由内核按「今天」决定） */
export async function ensureToday(): Promise<DailyNote> {
  const hit = await findDaily(new Date())
  if (hit) return hit
  const books = await post<{ notebooks?: { id: string }[] }>("/api/notebook/lsNotebooks")
  const notebook = books?.notebooks?.[0]?.id
  if (!notebook) throw new Error("未找到笔记本")
  const doc = await post<{ id: string }>("/api/filetree/createDailyNote", { notebook, app: "" })
  if (!doc?.id) throw new Error("创建日记失败")
  return { id: doc.id, title: dateKeyOf(new Date()) }
}

/** 日记预览：字数 / 块数 / 前几行 / 未勾掉的待办 */
export async function loadDaily(date: Date): Promise<DailyPreview | null> {
  const note = await findDaily(date)
  if (!note) return null

  const [stat] = await sql(
    `select coalesce(sum(length), 0) as words, count(*) as blocks from blocks
     where root_id = '${note.id}' and type in ${BODY_TYPES} limit 1`,
  ).catch(() => [])
  const rows = await sql(
    `select type, content, updated from blocks
     where root_id = '${note.id}' and type in ('p','h','i','c','m','t','callout','q','s') and content != ''
     order by sort asc limit 40`,
  ).catch(() => [])

  const lines: DailyLine[] = []
  const todos: DailyTodo[] = []
  for (const row of rows as { type?: string; content?: string; updated?: string }[]) {
    /* 段落 content 可能带换行：卡片只取第一行，剩下的留给详情 */
    const text = String(row.content || "").split("\n").map((line) => line.trim()).find(Boolean) || ""
    if (!text) continue
    const type = String(row.type || "")
    if (type === "i") {
      const todo = /^\[([ xX])\]\s*(.+)$/.exec(text)
      if (todo) {
        todos.push({ text: todo[2], done: todo[1] !== " " })
        continue
      }
    }
    if (lines.length < 8) lines.push({ type, text })
  }

  return {
    ...note,
    words: Number((stat as { words?: number } | undefined)?.words) || 0,
    blocks: Number((stat as { blocks?: number } | undefined)?.blocks) || 0,
    lines,
    todos,
    updated: String((rows[0] as { updated?: string } | undefined)?.updated || ""),
  }
}

/** 打开日记文档（在本页签里打开） */
export async function openDaily(id: string) {
  const { openDoc } = await import("@/core/quickdocs")
  await openDoc(id)
}
