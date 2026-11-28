/**
 * 快速记录：目标文档的读取与刷新（卡片与详情共用）
 *
 * 只回答两个问题：**写到哪篇文档**、**写完怎么让 Protyle 读到新内容**。
 * - 钉住了就用钉住的那篇；否则只"查"今天有没有日记（`peekDaily`，不创建）。
 * - 刷新靠换 key 重挂：appendBlock 之后 Protyle 手里的块是旧的，重挂最省事也最可靠。
 */
import { ref } from "vue"
import { peekDaily } from "@/core/dailyNote"
import { quickNoteOf } from "./quicknote"

export function useNoteDoc(uid: string) {
  const state = quickNoteOf(uid)
  const docId = ref("")
  const renderKey = ref(0)

  async function resolve() {
    if (state.target?.id) {
      docId.value = state.target.id
      return
    }
    try {
      docId.value = (await peekDaily(new Date()))?.id || ""
    } catch {
      docId.value = ""
    }
  }

  /** 写完 / 换目标之后调用：重新解析目标并触发 Protyle 重挂 */
  async function refresh() {
    await resolve()
    renderKey.value += 1
  }

  void resolve()

  return { state, docId, renderKey, refresh }
}
