/** 框架验证页：桌面壳 + 文档内嵌卡片（存储走 localStorage 版 petal，与插件同一套读写路径） */
import "@/styles/index.css"
import { createApp } from "vue"
import { bootStore, useStorage } from "@/core/store"
import DeskShell from "@/ui/DeskShell.vue"
import { hydrateCards, startCardObserver } from "@/embed/cards"
import { SIPAGE_ICON } from "@/ui/controls"

// 与真实插件使用同一份 symbol。
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${SIPAGE_ICON}</svg>`)

/* 验证页专用 driver：把 petal 落在 localStorage 的一个前缀下。
   插件本体用思源的 loadData/saveData，这里换成 localStorage，读写路径与键名完全一致，
   截图脚本因此可以直接预置 `siyuan-sipage-petal:desk` 这类键。 */
const PETAL = "siyuan-sipage-petal:"
useStorage({
  load: async (key) => JSON.parse(localStorage.getItem(PETAL + key) || "null"),
  save: async (key, value) => localStorage.setItem(PETAL + key, JSON.stringify(value)),
})

await bootStore()

createApp(DeskShell).mount("#app")

// 文档内嵌演示：挂载占位里的卡片
hydrateCards(document)
startCardObserver()
