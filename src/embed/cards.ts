import { Menu } from "siyuan"
import { CARDS, getCard, type CardSize } from "@/core/registry"
import { t } from "@/core/i18n"
import { post } from "@/core/util"
import { toast } from "@/ui/controls"
import { createApp, h, type App } from "vue"
/**
 * 文档内嵌：让卡片能插进文档，而且是「活的」
 *
 * 做法：
 *   1. 插入占位元素：<div data-desk-card="yiyan" data-size="2x2"></div>
 *   2. 启动时扫描 DOM，把每个占位挂载成真实卡片
 *   3. MutationObserver 监听后续新增/移除（切文档、粘贴、撤销都能覆盖）
 */
const ATTR = "data-desk-card"
const SIZES = new Set(["1x1", "1x2", "2x1", "2x2", "2x4", "4x2"])
const mounted = new Map<HTMLElement, App>()

/** 占位高度：1x1 用矮的，其余用标准高度 */
const heightOf = (size: string) => (size === "1x1" ? 220 : 320)

/** 扫描并挂载某个根节点下的所有占位 */
export function hydrateCards(root: ParentNode = document) {
  const elements = [...root.querySelectorAll<HTMLElement>(`[${ATTR}]`)]
  if (root instanceof HTMLElement && root.hasAttribute(ATTR)) elements.unshift(root)
  elements.forEach((el) => {
    if (mounted.has(el)) return
    const cardId = el.getAttribute(ATTR) || ""
    if (!cardId) return

    const raw = el.getAttribute("data-size") || ""
    const size = (SIZES.has(raw) ? raw : "2x2") as CardSize
    el.classList.add("desk-embed-card")
    el.style.width = el.style.width || "100%"
    el.style.height = el.style.height || `${heightOf(size)}px`

    const [w, h] = size.split("x").map(Number)
    /* 文档内嵌也按实例算：用宿主块 id 当 uid，同一块里的卡片共享一份状态 */
    const host = el.closest("[data-node-id]")?.getAttribute("data-node-id") || cardId
    const m = mountCard(el, cardId, { size, w, h, uid: `embed-${host}` })
    if (m) mounted.set(el, m)
  })
}

/** 卸载某个根节点下的卡片（节点被移除时调用） */
function dehydrateCards(root: ParentNode) {
  for (const [el, app] of mounted) {
    if (el === root || root.contains(el)) {
      app.unmount()
      mounted.delete(el)
    }
  }
}

let observer: MutationObserver | null = null

/** 开始监听 DOM 变化（插件 onload 调用一次） */
export function startCardObserver() {
  if (observer) return
  observer = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return
        const el = n as HTMLElement
        if (el.isConnected) hydrateCards(el)
      })
      // 被移除的节点：清理 Vue 实例，避免泄漏
      r.removedNodes.forEach((n) => {
        if (n.nodeType !== 1) return
        const el = n as HTMLElement
        if (!el.isConnected) dehydrateCards(el)
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

/** 停止监听 + 卸载所有内嵌卡片 */
export function stopCardObserver() {
  observer?.disconnect()
  observer = null
  for (const app of mounted.values()) app.unmount()
  mounted.clear()
}

/** 挂一张卡片到指定元素。 */
function mountCard(
  el: HTMLElement,
  cardId: string,
  props: Record<string, unknown> = {},
): App | null {
  const def = getCard(cardId)
  if (!def) {
    el.textContent = t("embed.unknownCard", { id: cardId })
    return null
  }

  const app = createApp({ render: () => h(def.component as never, props) })

  app.config.errorHandler = (err) => {
    console.error(`[siyuan-sipage] ${cardId} 渲染失败`, err) // i18n-keep
    el.textContent = t("embed.renderFailed", { msg: String((err as Error)?.message || err) })
  }

  app.mount(el)

  return app
}
function cardBlockHtml(cardId: string, size = "2x2") {
  return `<div ${ATTR}="${cardId}" data-size="${size}" class="desk-embed-card" style="height:${heightOf(size)}px"></div>`
}


/* ── 插入卡片命令（原 embed/insert.ts）───────────────────── */
/**
 * 把卡片插进文档（命令实现）
 *
 * 入口只负责注册命令；「插哪、怎么插、提示什么」属于内嵌能力。
 */

/** 弹出卡片选择菜单，插到当前光标处 */
export async function pickCardToInsert() {
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
    toast(t("embed.needDocument"))
    return
  }

  try {
    await post("/api/block/insertBlock", {
      dataType: "htmlblock",
      data: cardBlockHtml(cardId, "2x2"),
      previousID: currentBlockId(),
    })
    toast(t("embed.inserted"))
  } catch {
    toast(t("embed.insertFailed"))
    return
  }
  // 插入后立即挂载（不等 MutationObserver）
  window.setTimeout(() => hydrateCards(document), 60)
}
