/**
 * Protyle 只读挂载（思源块卡 / 日记详情共用）
 *
 * 自定义块（思播等）是插件往 plugin.customBlockRenders 注册的渲染器，preview 模式不会调用，
 * 只能用 wysiwyg 渲染后再把可编辑关掉；这是全项目唯一一处「在卡片里渲染思源内容」的实现。
 */
import { Protyle } from "siyuan"

export function mountProtyle(app: unknown, element: HTMLElement, blockId: string) {
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
