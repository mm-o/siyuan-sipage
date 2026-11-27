/**
 * 快速记录 —— 一行文字追加到目标文档末尾
 *
 * 目标默认是「今天的日记」：**写入时才解析**，所以跨零点、以及今天还没有日记的情况都正确；
 * 也可以钉在任意一篇文档上（指定后长期有效，直到改回）。
 *
 * 写入走内核 `/api/block/appendBlock`（dataType = markdown），目标必须是容器块，
 * 文档块 id 就是这个容器；失败原样抛出，由卡片提示，不吞异常。
 */
import { stateOf } from "@/core/store"
import { ensureDaily } from "@/core/dailyNote"
import { pad, post } from "@/core/util"

/** 写入格式：纯文本 / 待办 / 带时间戳 */
export type NoteFormat = "text" | "todo" | "stamp"

export interface NoteTarget {
  id: string
  title: string
}

export interface NoteRecord {
  /** 写入时刻（毫秒），也是列表的 key */
  at: number
  /** 实际写进文档的那段 markdown（已含格式前缀） */
  text: string
  /** 写到哪篇文档（标题，便于识别） */
  title: string
  id: string
}

interface QuickNoteState {
  /** 钉住的目标文档；null = 今天的日记 */
  target: NoteTarget | null
  format: NoteFormat
  /** 本卡最近写入：只做"我刚才记了什么"的提示，最多 8 条 */
  history: NoteRecord[]
}

const HISTORY_MAX = 8

/** 每张卡一份：目标、格式、最近写入各卡各的 */
export function quickNoteOf(uid: string): QuickNoteState {
  return stateOf<QuickNoteState>(uid, { target: null, format: "text", history: [] })
}

/** 解析写入目标：钉住的文档，或者今天的日记（没有就建一个） */
export async function noteTarget(state: QuickNoteState): Promise<NoteTarget> {
  if (state.target?.id) return state.target
  const daily = await ensureDaily(new Date())
  return { id: daily.id, title: daily.title }
}

/** 按格式把一行文字拼成 markdown 片段 */
export function composeNote(text: string, format: NoteFormat): string {
  const body = text.trim()
  if (!body) return ""
  if (format === "todo") return `- [ ] ${body}`
  if (format === "stamp") {
    const now = new Date()
    return `- ${pad(now.getHours())}:${pad(now.getMinutes())} ${body}`
  }
  return body
}

/** 追加一条并记账；返回写到的目标文档 */
export async function appendNote(state: QuickNoteState, text: string): Promise<NoteTarget> {
  const body = composeNote(text, state.format)
  if (!body) throw new Error("empty")
  const target = await noteTarget(state)
  await post("/api/block/appendBlock", { parentID: target.id, dataType: "markdown", data: body })
  state.history = [{ at: Date.now(), text: body, title: target.title, id: target.id }, ...state.history].slice(0, HISTORY_MAX)
  return target
}

export function clearHistory(state: QuickNoteState) {
  state.history = []
}

/** 今天记了几条（历史里按本地日期算） */
export function todayCount(state: QuickNoteState): number {
  const today = new Date().toDateString()
  return state.history.filter((r) => new Date(r.at).toDateString() === today).length
}
