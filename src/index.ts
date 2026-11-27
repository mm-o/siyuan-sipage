import "@/styles/index.css"
import { Plugin, openTab } from "siyuan"
import { createApp, type App } from "vue"
import { SIPAGE_ICON } from "@/ui/controls"
import { bootStore, useStorage } from "@/core/store"
import DeskShell from "@/ui/DeskShell.vue"
import { hydrateCards, startCardObserver, stopCardObserver, pickCardToInsert } from "@/embed/cards"
import { t } from "@/core/i18n"
import { setApp } from "@/core/quickdocs"

const TAB_TYPE = "sipage"

/** 插件入口只注册存储、页签、顶栏与命令。 */
export default class SiPagePlugin extends Plugin {
  async onload() {
    setApp(this.app)
    // 状态存思源的插件存储（petal 目录），重启后卡片与尺寸都还在
    useStorage({
      load: (key) => this.loadData(key),
      save: (key, value) => this.saveData(key, value),
    })
    /* 存储失败不能连累插件：拿不到已保存的状态就用默认值，
       否则 onload 抛错 → 页签类型没注册 → 刷新后思源会把恢复的页签标成「不可用」 */
    try {
      await bootStore()
    } catch (error) {
      console.error("[siyuan-sipage] 读取插件状态失败，改用默认值", error) // i18n-keep
    }

    // 页签：往 this.element 挂载 DeskShell（思源的标准约定）
    this.addTab({
      type: TAB_TYPE,
      init(this: any) {
        const el: HTMLElement = this.element
        if (!el) return
        el.classList.add("desk-tab-root")
        const app: App = createApp(DeskShell)
        app.mount(el)
        this.__sipageApp = app
      },
      destroy(this: any) {
        try {
          this.__sipageApp?.unmount()
        } catch {}
        this.__sipageApp = undefined
      },
    })

    // 文档内嵌：先挂载已有占位，再持续监听
    hydrateCards(document)
    startCardObserver()

    this.addIcons(SIPAGE_ICON)
    this.addTopBar({
      icon: "iconSiPage",
      title: t("ui.app.title"),
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
      custom: { id: `${this.name}${TAB_TYPE}`, icon: "iconSiPage", title: t("ui.app.title"), data: {} },
    })
  }
}
