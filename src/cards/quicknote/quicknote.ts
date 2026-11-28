/**
 * 快速记录 —— 一行文字追加到目标文档末尾
 *
 * 目标默认是「今天的日记」：**写入时才解析**，所以跨零点、今天还没有日记都正确；
 * 也可以钉在任意文档上（长期有效，直到改回）。
 *
 * 写入走内核 `/api/block/appendBlock`（dataType = markdown），目标必须是容器块（文档块 id 就是）；
 * 失败原样抛出，由 UI 提示，不吞异常。
 */
import { stateOf } from "@/core/store"
import { ensureDaily } from "@/core/dailyNote"
import { pad, post } from "@/core/util"

/** 写入写法：纯文本 / 待办 / 带时间戳 */
export type NoteFormat = "text" | "todo" | "stamp"

export interface NoteTarget {
  id: string
  title: string
}

interface QuickNoteState {
  /** 钉住的目标文档；null = 今天的日记 */
  target: NoteTarget | null
  /** 上一次用过的写法：回车与按钮高亮都跟着它 */
  format: NoteFormat
  /** 每写一条记一个时刻，只用来算「今天几条」 */
  marks: number[]
}

/** 只留最近这些条的时刻：卡片只显示今天的计数，不需要长期日志 */
const MARKS_MAX = 40

/** 每张卡一份：目标、写法、计数各卡各的 */
export function quickNoteOf(uid: string): QuickNoteState {
  return stateOf<QuickNoteState>(uid, { target: null, format: "text", marks: [] })
}

/** 按写法把一行文字拼成 markdown 片段 */
function compose(text: string, format: NoteFormat): string {
  const body = text.trim()
  if (!body) return ""
  if (format === "todo") return `- [ ] ${body}`
  if (format === "stamp") {
    const now = new Date()
    return `- ${pad(now.getHours())}:${pad(now.getMinutes())} ${body}`
  }
  return body
}

/** 追加一条并记账；`format` 缺省沿用上次用过的写法 */
export async function appendNote(state: QuickNoteState, text: string, format: NoteFormat = state.format): Promise<NoteTarget> {
  const body = compose(text, format)
  if (!body) throw new Error("empty")
  const target = state.target?.id ? state.target : await ensureDaily(new Date())
  await post("/api/block/appendBlock", { parentID: target.id, dataType: "markdown", data: body })
  state.format = format
  state.marks = [...state.marks, Date.now()].slice(-MARKS_MAX)
  return target
}

/** 今天记了几条（按本地日期） */
export function todayCount(state: QuickNoteState): number {
  const today = new Date().toDateString()
  return state.marks.filter((at) => new Date(at).toDateString() === today).length
}
