/** 品牌标：线性四个圆角方块（顶栏 / 页签 / 桌面壳共用） */
/**
 * 插件图标（顶栏 / 页签 / 桌面壳右上角共用）
 *
 * 四个圆角方块拼成的「整页」标：左上与右下实心、右上与左下半透明，
 * 一眼能看出「一屏卡片」。填充色用 currentColor，跟随思源的顶栏/页签前景色。
 */
const MARK = `<g fill="currentColor">
    <rect x="3.5" y="3.5" width="11" height="11" rx="3"/>
    <rect x="17.5" y="3.5" width="11" height="11" rx="3" opacity=".55"/>
    <rect x="3.5" y="17.5" width="11" height="11" rx="3" opacity=".55"/>
    <rect x="17.5" y="17.5" width="11" height="11" rx="3"/>
  </g>`

/** addTopBar 用：内联 <svg> */
const PLUGIN_ICON_SVG = `<svg viewBox="0 0 32 32" width="16" height="16">${MARK}</svg>`

/** addIcons 注册的 symbol id：页签、桌面壳右上角用 <use href="#…"> */
const PLUGIN_ICON_ID = "iconDeskCards"

const PLUGIN_ICONS = `<symbol id="${PLUGIN_ICON_ID}" viewBox="0 0 32 32">${MARK}</symbol>`

import "@/styles/index.css"
import { Plugin, getFrontend, openTab } from "siyuan"
import { createApp, type App } from "vue"
import PluginInfoString from "@/../plugin.json"
import { bootStore, useStorage } from "@/core/store"
import DeskShell from "@/ui/DeskShell.vue"
import { hydrateCards, startCardObserver, stopCardObserver, pickCardToInsert } from "@/embed/cards"
import { setApp } from "@/core/quickdocs"

let PluginInfo = { version: "" }
try {
  PluginInfo = PluginInfoString as any
} catch (err) {
  console.log("Plugin info parse error: ", err)
}
const { version } = PluginInfo

const TAB_TYPE = "deskcards"

/**
 * 桌面卡片 for SiYuan —— 入口只做注册
 *
 * 具体能力各自归位：
 *   页签桌面   → ui/DeskShell.vue
 *   文档内嵌   → embed/cards.ts（自动挂载）
 *   插入命令   → embed/insert.ts
 */
export default class DeskCardsPlugin extends Plugin {
  public isMobile: boolean
  public isBrowser: boolean
  public isLocal: boolean
  public isElectron: boolean
  public isInWindow: boolean
  public platform: ReturnType<typeof getFrontend>
  public readonly version = version

  async onload() {
    setApp(this.app)
    const frontEnd = getFrontend() as any
    this.platform = frontEnd
    this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile"
    this.isBrowser = frontEnd.includes("browser")
    this.isLocal = this.isBrowser && location.hostname === "127.0.0.1"
    this.isElectron = frontEnd.includes("desktop")
    this.isInWindow = location.pathname.includes("window.html")

    // 状态存思源的插件存储（petal 目录），重启后卡片与尺寸都还在
    useStorage({
      load: (key) => this.loadData(key),
      save: (key, value) => void this.saveData(key, value),
    })
    await bootStore()

    // 页签：往 this.element 挂载 DeskShell（思源的标准约定）
    this.addTab({
      type: TAB_TYPE,
      init(this: any) {
        const el: HTMLElement = this.element
        if (!el) return
        el.classList.add("desk-tab-root")
        const app: App = createApp(DeskShell)
        app.mount(el)
        this.__deskApp = app
      },
      destroy(this: any) {
        try {
          this.__deskApp?.unmount()
        } catch {}
        this.__deskApp = undefined
      },
    })

    // 文档内嵌：先挂载已有占位，再持续监听
    hydrateCards(document)
    startCardObserver()

    this.addIcons(PLUGIN_ICONS)
    this.addTopBar({
      icon: PLUGIN_ICON_SVG,
      title: "桌面卡片",
      position: "right",
      callback: () => this.openDeskTab(),
    })

    this.addCommand({ langKey: "openDesk", hotkey: "", callback: () => this.openDeskTab() })
    this.addCommand({ langKey: "insertDeskCard", hotkey: "", callback: () => pickCardToInsert() })
  }

  onunload() {
    stopCardObserver()
  }

  /** 打开页签；已开着就聚焦 */
  private openDeskTab() {
    const existing = this.getOpenedTab()[TAB_TYPE] || []
    if (existing.length) {
      const first = existing[0]
      existing.slice(1).forEach((t) => {
        try {
          ;(t.tab as any)?.parent?.removeTab((t.tab as any).id, false, true, false)
        } catch {}
      })
      try {
        ;(first.tab as any)?.parent?.switchTab((first.tab as any).headElement, true)
      } catch {}
      return
    }
    openTab({
      app: this.app,
      custom: { id: `${this.name}${TAB_TYPE}`, icon: PLUGIN_ICON_ID, title: "桌面卡片", data: {} },
    })
  }
}
