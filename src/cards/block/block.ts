import { stateOf, takeLegacy } from "@/core/store"
import { sql } from "@/core/util"

export { mountProtyle } from "@/ui/protyle"

/** 卡片/弹窗共用：只记「显示哪个块」和它的标题 */
interface BlockState {
  id: string
  title: string
}

/** 每张卡一份：第一次取时认领旧版那一个块，之后各显示各的 */
export function blockOf(uid: string): BlockState {
  const legacy = takeLegacy<Partial<BlockState>>("desk:block")
  return stateOf<BlockState>(uid, { id: String(legacy?.id || ""), title: String(legacy?.title || "") })
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
