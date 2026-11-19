import { Protyle } from "siyuan"

/** 用思源 Protyle 渲染块：插件自定义块只有它能挂载（knote 也是 require("siyuan") 拿 Protyle） */
export function mountProtyle(app: unknown, element: HTMLElement, blockId: string) {
  /* 关键：自定义块（思播等）是插件往 plugin.customBlockRenders 注册的渲染器，
     preview 模式不会调用它们，只能用 wysiwyg 渲染后再把可编辑关掉。 */
  const editor = new Protyle(app as never, element, {
    blockId,
    mode: "wysiwyg",
    action: ["cb-get-all"],
    render: { background: false, title: false, gutter: false, scroll: false, breadcrumb: false },
  } as never)
  /* 只读化：去掉 contenteditable，卡片里不可编辑但渲染完整 */
  setTimeout(() => {
    element.querySelectorAll<HTMLElement>("[contenteditable]").forEach((el) => {
      el.setAttribute("contenteditable", "false")
    })
  }, 0)

  return {
    destroy() {
      try {
        ;(editor as unknown as { destroy?: () => void }).destroy?.()
      } catch {
        /* 已回收 */
      }
    },
  }
}

import { persisted } from "@/core/store"

/** 卡片/弹窗共用：只记「显示哪个块」和它的标题 */
export const blockState = persisted("desk:block", { id: "", title: "" })

export function setId(id: string, title = "") {
  blockState.id = id.trim()
  blockState.title = title
}

/** 块标题（文档块取 content，其他块取首行，超长截断） */
export async function blockTitle(id: string): Promise<string> {
  const res = await fetch("/api/query/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stmt: `select content as c from blocks where id = '${id}' limit 1` }),
  })
  const json = await res.json()
  const text = String(((json?.data || [])[0] as { c?: string } | undefined)?.c || "").trim()
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}
