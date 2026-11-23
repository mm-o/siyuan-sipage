/** 框架验证页：桌面壳 + 文档内嵌卡片 */
import "@/styles/index.css"
import { createApp } from "vue"
import { appearance, bootStore, countdown, desk } from "@/core/store"
import DeskShell from "@/ui/DeskShell.vue"
import { hydrateCards, startCardObserver } from "@/embed/cards"
import { DESK_ICON } from "@/ui/controls"

// 与真实插件使用同一份 symbol。
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DESK_ICON}</svg>`)

// 验证页专用：插件本体只读思源的插件存储，这里用 localStorage 预置一份桌面给截图脚本
await bootStore()
const seed = localStorage.getItem("desk-cards:desk")
if (seed) {
  try {
    const parsed = JSON.parse(seed) as { cards?: typeof desk.cards }
    if (Array.isArray(parsed.cards)) desk.cards = parsed.cards
  } catch {}
}
// 外观同理（排版相关的 宽度 / 单格 / 间距 要能被脚本改）
const seedAppearance = localStorage.getItem("desk-cards:appearance")
if (seedAppearance) {
  try {
    Object.assign(appearance, JSON.parse(seedAppearance))
  } catch {}
}
// 倒数日事件同理（验证脚本要能预置几条，才能截到有内容的卡片）
const seedCountdown = localStorage.getItem("desk-cards:countdown")
if (seedCountdown) {
  try {
    const parsed = JSON.parse(seedCountdown) as { events?: typeof countdown.events }
    if (Array.isArray(parsed.events)) countdown.events = parsed.events
  } catch {}
}

createApp(DeskShell).mount("#app")

// 文档内嵌演示：挂载占位里的卡片
hydrateCards(document)
startCardObserver()
