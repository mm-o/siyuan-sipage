/**
 * 验证页用的 siyuan 模块替身。
 *
 * `Menu` 不画界面（真实菜单由思源渲染），只把调用记到 `globalThis.__siyuanMenus`，
 * 让 tools/verify/*.mjs 能断言「卡片右键菜单到底加了哪几项、用了哪个图标、在哪儿弹出」。
 */
interface StubMenuRecord {
  id: string
  items: any[]
  at: { x: number; y: number } | null
  opened: boolean
}

const records: StubMenuRecord[] = ((globalThis as any).__siyuanMenus ||= [])

export class Menu {
  private rec: StubMenuRecord

  constructor(id?: string) {
    this.rec = { id: id || "", items: [], at: null, opened: false }
    records.push(this.rec)
  }

  addItem(item: any) {
    this.rec.items.push(item)
    return this.rec as any
  }

  addSeparator() {
    this.rec.items.push({ type: "separator" })
    return this.rec as any
  }

  open(at?: { x: number; y: number }) {
    this.rec.at = at ?? null
    this.rec.opened = true
  }

  fullscreen() {}

  close() {
    this.rec.opened = false
  }
}

export const getFrontend = () => "desktop"
export const openTab = () => {}
export class Plugin {}
/** 仅验证页占位：真实思源块渲染必须在思源内验证。 */
export class Protyle {
  private placeholder: HTMLElement
  constructor(_app: unknown, element: HTMLElement, _options: unknown) {
    this.placeholder = document.createElement("p")
    this.placeholder.textContent = "思源块预览请在思源中查看"
    element.append(this.placeholder)
  }
  destroy() { this.placeholder.remove() }
}
export default { Menu, getFrontend, openTab, Plugin, Protyle }
