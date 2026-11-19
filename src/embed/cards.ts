import { createApp, h, type App } from "vue"
/**
 * 文档内嵌：让卡片能插进文档，而且是「活的」
 *
 * 做法：
 *   1. 插入占位元素：<div data-desk-card="yiyan" data-size="2x2"></div>
 *   2. 启动时扫描 DOM，把每个占位挂载成真实卡片
 *   3. MutationObserver 监听后续新增/移除（切文档、粘贴、撤销都能覆盖）
 */
import type { CardSize } from "@/core/registry"

const ATTR = "data-desk-card"
const SIZES = new Set(["1x1", "1x2", "2x1", "2x2", "2x4", "4x2"])
const mounted = new WeakMap<HTMLElement, Mounted>()

/** 占位高度：1x1 用矮的，其余用标准高度 */
const heightOf = (size: string) => (size === "1x1" ? 220 : 320)

/** 扫描并挂载某个根节点下的所有占位 */
export function hydrateCards(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(`[${ATTR}]`).forEach((el) => {
    if (mounted.has(el)) return
    const cardId = el.getAttribute(ATTR) || ""
    if (!cardId) return

    const raw = el.getAttribute("data-size") || ""
    const size = (SIZES.has(raw) ? raw : "2x2") as CardSize
    el.classList.add("desk-embed-card")
    el.style.width = el.style.width || "100%"
    el.style.height = el.style.height || `${heightOf(size)}px`

    const m = mountCard(el, cardId, { size })
    if (m) mounted.set(el, m)
  })
}

/** 卸载某个根节点下的卡片（节点被移除时调用） */
function dehydrateCards(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(`[${ATTR}]`).forEach((el) => {
    mounted.get(el)?.destroy()
    mounted.delete(el)
  })
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
        if (el.matches?.(`[${ATTR}]`)) hydrateCards(el.parentElement || document)
        else if (el.querySelector?.(`[${ATTR}]`)) hydrateCards(el)
      })
      // 被移除的节点：清理 Vue 实例，避免泄漏
      r.removedNodes.forEach((n) => {
        if (n.nodeType !== 1) return
        const el = n as HTMLElement
        if (el.matches?.(`[${ATTR}]`)) {
          mounted.get(el)?.destroy()
          mounted.delete(el)
        }
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

/** 停止监听 + 卸载所有内嵌卡片 */
export function stopCardObserver() {
  observer?.disconnect()
  observer = null
  dehydrateCards(document)
}

/** 生成文档内嵌用的片段（插入文档时用） */

import { getCard } from "@/core/registry"

interface Mounted {
  app: App
  el: HTMLElement
  destroy: () => void
}

/** 挂一张卡片到指定元素 */
function mountCard(
  el: HTMLElement,
  cardId: string,
  props: Record<string, unknown> = {},
): Mounted | null {
  const def = getCard(cardId)
  if (!def) {
    el.textContent = `未注册的卡片：${cardId}`
    return null
  }

  const app = createApp({ render: () => h(def.component as never, props) })

  app.config.errorHandler = (err) => {
    console.error(`[desk-cards] ${cardId} 渲染失败`, err)
    el.textContent = `卡片出错：${(err as Error)?.message || err}`
  }

  app.mount(el)

  return {
    app,
    el,
    destroy: () => {
      try {
        app.unmount()
      } catch {}
    },
  }
}
export function cardBlockHtml(cardId: string, size = "2x2") {
  return `<div ${ATTR}="${cardId}" data-size="${size}" class="desk-embed-card" style="height:${heightOf(size)}px"></div>`
}
