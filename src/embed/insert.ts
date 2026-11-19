/**
 * 把卡片插进文档（命令实现）
 *
 * 入口只负责注册命令；「插哪、怎么插、提示什么」属于内嵌能力。
 */
import { Menu } from "siyuan"
import { CARDS } from "@/core/registry"
import { toast } from "@/ui/view"
import { cardBlockHtml, hydrateCards } from "./cards"

/** 弹出卡片选择菜单，插到当前光标处 */
export function pickCardToInsert() {
  const menu = new Menu("desk-insert-card")
  for (const def of CARDS) {
    menu.addItem({ icon: "iconImage", label: def.name, click: () => void insertCardBlock(def.id) })
  }
  menu.open({ x: cursorRect()?.left ?? 200, y: cursorRect()?.bottom ?? 200 })
}

/** 光标位置（拿不到就交给菜单默认位置） */
function cursorRect(): DOMRect | undefined {
  try {
    return window.getSelection()?.getRangeAt(0)?.getBoundingClientRect()
  } catch {
    return undefined
  }
}

/** 光标所在块 id（插入位置的锚点） */
function currentBlockId(): string {
  const node = window.getSelection()?.anchorNode
  const el = (node?.nodeType === 1 ? (node as Element) : node?.parentElement)?.closest?.("[data-node-id]")
  return (el as HTMLElement | null)?.dataset?.nodeId || ""
}

/** 真正写入文档：思源 htmlblock */
async function insertCardBlock(cardId: string) {
  if (!document.querySelector(".protyle-wysiwyg")) {
    toast("请先打开一个文档")
    return
  }

  const res = await fetch("/api/block/insertBlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataType: "htmlblock",
      data: cardBlockHtml(cardId, "2x2"),
      previousID: currentBlockId(),
    }),
  })
  const json = await res.json().catch(() => null)
  if (json?.code !== 0) {
    toast("插入失败，可在文档里用 /htmlblock 手动粘贴")
    return
  }
  // 插入后立即挂载（不等 MutationObserver）
  window.setTimeout(() => hydrateCards(document), 60)
}
