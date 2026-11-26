import type { Component } from "vue"
import {
  ArrowLeft, ArrowRight, Blocks, Bookmark, CalendarPlus, CheckSquare, Cloud, Compass,
  Database, Ellipsis, Eye, FileText, Inbox, Layers, LayoutGrid, Link, List, Maximize,
  Menu, Network, PanelLeft, RefreshCw, ScrollText, Search, Settings, Sun, Tag, Terminal, ZoomIn,
} from "lucide-vue-next"
import { stateOf } from "@/core/store"
import { post } from "@/core/util"
import { t } from "@/core/i18n"

/**
 * 快捷方式：优先复用思源图标 sprite（`#iconXxx`）与它自己的按钮，
 * 但 sprite 在 Shadow DOM / iframe 里取不到，所以每个动作都带一个 lucide 兜底图标。
 */
export type ShortcutGroup = "导航" | "文档" | "视图" | "数据" | "系统" // i18n-keep

export interface Shortcut {
  id: string
  label: string
  /** 思源图标 id（sprite） */
  icon: string
  /** 兜底图标（sprite 不可用时） */
  fallback: Component
  group: ShortcutGroup
  bar?: string
  dock?: string
  run?: () => void
}

const click = (el: Element | null) => {
  if (el) el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
}

const reload = () => {
  void post("/api/ui/reloadUI").catch(() => {})
}

const fullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen().catch(() => {})
}

// i18n-keep-begin（group 是内部枚举值，显示走 groupLabel()）
const SHORTCUTS: Shortcut[] = [
  { id: "search", label: t("card.shortcut.globalSearch"), icon: "iconSearch", fallback: Search, group: "导航", bar: "barSearch" },
  { id: "command", label: t("card.shortcut.commandPalette"), icon: "iconTerminal", fallback: Terminal, group: "导航", bar: "barCommand" },
  { id: "back", label: t("card.shortcut.back"), icon: "iconBack", fallback: ArrowLeft, group: "导航", bar: "barBack" },
  { id: "forward", label: t("card.shortcut.forward"), icon: "iconForward", fallback: ArrowRight, group: "导航", bar: "barForward" },
  { id: "outline", label: t("card.shortcut.outline"), icon: "iconOutline", fallback: List, group: "导航", dock: "outline" },
  { id: "graph", label: t("card.shortcut.graph"), icon: "iconGraph", fallback: Network, group: "导航", dock: "graph" },
  { id: "bookmark", label: t("card.shortcut.bookmarks"), icon: "iconBookmark", fallback: Bookmark, group: "导航", dock: "bookmark" },
  { id: "tag", label: t("card.shortcut.tags"), icon: "iconTag", fallback: Tag, group: "导航", dock: "tag" },
  { id: "backlink", label: t("card.shortcut.backlinks"), icon: "iconLink", fallback: Link, group: "导航", dock: "backlink" },

  { id: "daily", label: t("card.shortcut.dailyNote"), icon: "iconCalendarPlus", fallback: CalendarPlus, group: "文档", bar: "barDailyNote" },
  { id: "riff", label: t("card.shortcut.flashcards"), icon: "iconRiffCard", fallback: Layers, group: "文档", bar: "barRiffCard" },
  { id: "filetree", label: t("card.shortcut.fileTree"), icon: "iconFiles", fallback: FileText, group: "文档", dock: "file" },
  { id: "inbox", label: t("card.shortcut.inbox"), icon: "iconInbox", fallback: Inbox, group: "文档", dock: "inbox" },
  { id: "memo", label: t("card.shortcut.memos"), icon: "iconMemo", fallback: ScrollText, group: "文档" },

  { id: "mode", label: t("card.shortcut.appearance"), icon: "iconDark", fallback: Sun, group: "视图", bar: "barMode" },
  { id: "dock", label: t("card.shortcut.dock"), icon: "iconHideDock", fallback: PanelLeft, group: "视图", bar: "barDock" },
  { id: "zoom", label: t("card.shortcut.zoom"), icon: "iconZoomOut", fallback: ZoomIn, group: "视图", bar: "barZoom" },
  { id: "fullscreen", label: t("common.fullscreen"), icon: "iconFullscreen", fallback: Maximize, group: "视图", run: fullscreen },
  { id: "layout", label: t("card.shortcut.layout"), icon: "iconLayout", fallback: LayoutGrid, group: "视图", bar: "barWorkspace" },

  { id: "sync", label: t("card.shortcut.sync"), icon: "iconCloudOff", fallback: Cloud, group: "数据", bar: "barSync" },
  { id: "refresh", label: t("card.shortcut.refreshUI"), icon: "iconRefresh", fallback: RefreshCw, group: "数据", run: reload },
  { id: "plugins", label: t("card.shortcut.plugins"), icon: "iconPlugin", fallback: Blocks, group: "数据", bar: "barPlugins" },

  { id: "workspace", label: t("card.shortcut.mainMenu"), icon: "iconDown", fallback: Menu, group: "系统", bar: "barWorkspace" },
  { id: "more", label: t("common.more"), icon: "iconMore", fallback: Ellipsis, group: "系统", bar: "barMore" },
  { id: "check", label: t("card.shortcut.checkData"), icon: "iconCheck", fallback: CheckSquare, group: "系统", bar: "barCommand" },
]
// i18n-keep-end

export const GROUPS: ShortcutGroup[] = ["导航", "文档", "视图", "数据", "系统"] // i18n-keep

// i18n-keep-begin（内部枚举 → 词条后缀，不显示）
const GROUP_KEY: Record<ShortcutGroup, string> = {
  导航: "nav",
  文档: "doc",
  视图: "view",
  数据: "data",
  系统: "system",
}
// i18n-keep-end

export const groupLabel = (g: ShortcutGroup) => t(`card.shortcut.group.${GROUP_KEY[g]}`)

interface ShortcutState {
  enabled: string[]
}

/* 默认 8 个：搜索 / 命令面板 / 日记 / 外观 / 后退 / 前进 / 刷新 / 停靠栏 */
const DEFAULT_ENABLED = ["search", "command", "daily", "mode", "back", "forward", "refresh", "dock"]

/** 每张卡一份：默认 8 个，各卡各的 */
export function shortcutOf(uid: string): ShortcutState {
  return stateOf<ShortcutState>(uid, { enabled: [...DEFAULT_ENABLED] })
}
/** 思源 sprite 是否可用（Shadow DOM / iframe 里不可用） */
export const useSprite = () => typeof document !== "undefined" && !!document.getElementById("iconSearch")

export const enabledShortcuts = (state: ShortcutState) =>
  state.enabled.map((id) => SHORTCUTS.find((s) => s.id === id)).filter((s): s is Shortcut => !!s)

export const byGroup = (g: ShortcutGroup) => SHORTCUTS.filter((s) => s.group === g)

export function runShortcut(s: Shortcut) {
  if (s.bar) return click(document.querySelector(`#${s.bar}`))
  if (s.dock) return click(document.querySelector(`#dockLeft .dock__item[data-type="${s.dock}"]`))
  s.run?.()
}

/** 追加到启用列表末尾：与卡片库一致，同一个动作可以重复添加。 */
export function addShortcut(state: ShortcutState, id: string) {
  state.enabled = [...state.enabled, id]
}

/** 移除指定位置的一次出现（右栏垃圾桶）。 */
export function removeShortcutAt(state: ShortcutState, index: number) {
  if (index < 0 || index >= state.enabled.length) return
  state.enabled = state.enabled.filter((_, i) => i !== index)
}

/** 分类配色：卡片与弹窗共用（图标块 = 同色 14% 浅底 + 同色图标） */
// i18n-keep-begin（同上：只配色，不显示）
export const GROUP_STYLE: Record<ShortcutGroup, { color: string; soft: string; icon: Component }> = {
  导航: { color: "hsl(212 90% 56%)", soft: "color-mix(in srgb, hsl(212 90% 56%) 14%, transparent)", icon: Compass },
  文档: { color: "hsl(160 74% 42%)", soft: "color-mix(in srgb, hsl(160 74% 42%) 14%, transparent)", icon: FileText },
  视图: { color: "hsl(262 84% 62%)", soft: "color-mix(in srgb, hsl(262 84% 62%) 14%, transparent)", icon: Eye },
  数据: { color: "hsl(36 92% 52%)", soft: "color-mix(in srgb, hsl(36 92% 52%) 14%, transparent)", icon: Database },
  系统: { color: "hsl(330 78% 60%)", soft: "color-mix(in srgb, hsl(330 78% 60%) 14%, transparent)", icon: Settings },
}
// i18n-keep-end

/** 拖拽排序：把 from 位置移到 to 位置 */
export function reorderShortcut(state: ShortcutState, from: number, to: number) {
  const list = [...state.enabled]
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  state.enabled = list
}
