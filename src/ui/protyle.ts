/**
 * Protyle 挂载（思源块卡 / 日记卡共用）
 *
 * 自定义块（思播等）是插件往 plugin.customBlockRenders 注册的渲染器，preview 模式不会调用，
 * 只能用 wysiwyg 渲染；`editable` 决定是只读展示还是就地编辑（日记卡用它直接写）：
 *   - 只读：渲染后去掉 contenteditable，卡片里不可编辑但排版完整
 *   - 可编辑：交给 Protyle 自己处理输入与保存，外部只订阅 input 做统计刷新
 */
import { Protyle } from "siyuan"

interface MountOptions {
  /** 就地编辑（默认只读） */
  editable?: boolean
  /** 完整功能：保留标题、面包屑、块图标与工具栏（默认极简渲染） */
  full?: boolean
  /** 编辑时的输入回调（防抖由调用方决定） */
  onInput?: () => void
}

export function mountProtyle(app: unknown, element: HTMLElement, blockId: string, options: MountOptions = {}) {
  const editor = new Protyle(app as never, element, {
    blockId,
    mode: "wysiwyg",
    action: ["cb-get-all"],
    ...(options.full ? {} : { render: { background: false, title: false, gutter: false, scroll: false, breadcrumb: false } }),
  } as never)

  let timer = 0
  const onEdit = () => {
    if (timer) return
    timer = window.setTimeout(() => {
      timer = 0
      options.onInput?.()
    }, 800)
  }

  if (options.editable) {
    element.addEventListener("input", onEdit, true)
  } else {
    /* 只读化：渲染完再去掉 contenteditable，不改 Protyle 自己的排版 */
    setTimeout(() => {
      element.querySelectorAll<HTMLElement>("[contenteditable]").forEach((el) => {
        el.setAttribute("contenteditable", "false")
      })
    }, 0)
  }

  return {
    destroy() {
      if (timer) window.clearTimeout(timer)
      element.removeEventListener("input", onEdit, true)
      try {
        ;(editor as unknown as { destroy?: () => void }).destroy?.()
      } catch {
        /* 已回收 */
      }
    },
  }
}
