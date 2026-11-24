import { stateOf } from "@/core/store"
import { sql } from "@/core/util"

export { mountProtyle } from "@/ui/protyle"

/** 卡片/弹窗共用：只记「显示哪个块」和它的标题 */
export interface BlockState {
  id: string
  title: string
}

/** 旧版只有一份：第一次取用时认领给第一张卡，之后各卡各的 */
function claimLegacy(state: BlockState) {
  let raw: string | null = null
  try {
    raw = localStorage.getItem("desk:block")
  } catch {
    return
  }
  if (!raw) return
  try {
    const box = JSON.parse(raw) as Partial<BlockState>
    if (!state.id && box.id) {
      state.id = String(box.id)
      state.title = String(box.title || "")
    }
    localStorage.removeItem("desk:block")
  } catch {
    /* 旧键坏了就当没有 */
  }
}

/** 每张卡一份：按实例 uid 取，第一次取时用空块建一份 */
export function blockOf(uid: string): BlockState {
  const state = stateOf<BlockState>(uid, { id: "", title: "" })
  claimLegacy(state)
  return state
}

export function setId(state: BlockState, id: string, title = "") {
  state.id = id.trim()
  state.title = title
}
/** 块标题（文档块取 content，其他块取首行，超长截断） */
export async function blockTitle(id: string): Promise<string> {
  const rows = await sql(`select content as c from blocks where id = '${id}' limit 1`).catch(() => [])
  const text = String((rows[0] as { c?: string } | undefined)?.c || "").trim()
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}
