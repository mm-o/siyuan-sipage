import "@/styles/index.css"
import { Plugin, openTab } from "siyuan"
import { createApp, type App } from "vue"
import { DESK_ICON } from "@/ui/controls"
import { bootStore, useStorage } from "@/core/store"
import DeskShell from "@/ui/DeskShell.vue"
import { hydrateCards, startCardObserver, stopCardObserver, pickCardToInsert } from "@/embed/cards"
import { setApp } from "@/core/quickdocs"

const TAB_TYPE = "deskcards"

/** 插件入口只注册存储、页签、顶栏与命令。 */
export default class DeskCardsPlugin extends Plugin {
  async onload() {
    setApp(this.app)
    // 状态存思源的插件存储（petal 目录），重启后卡片与尺寸都还在
    useStorage({
      load: (key) => this.loadData(key),
      save: (key, value) => this.saveData(key, value),
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

    this.addIcons(DESK_ICON)
    this.addTopBar({
      icon: "iconDeskCards",
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
      custom: { id: `${this.name}${TAB_TYPE}`, icon: "iconDeskCards", title: "桌面卡片", data: {} },
    })
  }
}
