import type { Component } from "vue"
import {
  ArrowLeft, ArrowRight, Blocks, Bookmark, CalendarPlus, CheckSquare, Cloud, Compass,
  Database, Ellipsis, Eye, FileText, Inbox, Layers, LayoutGrid, Link, List, Maximize,
  Menu, Network, PanelLeft, RefreshCw, ScrollText, Search, Settings, Sun, Tag, Terminal, ZoomIn,
} from "lucide-vue-next"
import { persisted } from "@/core/persist"

/**
 * 快捷方式：优先复用思源图标 sprite（`#iconXxx`）与它自己的按钮，
 * 但 sprite 在 Shadow DOM / iframe 里取不到，所以每个动作都带一个 lucide 兜底图标。
 */
export type ShortcutGroup = "导航" | "文档" | "视图" | "数据" | "系统"

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
  void fetch("/api/ui/reloadUI", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
}

const fullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen().catch(() => {})
}

const SHORTCUTS: Shortcut[] = [
  { id: "search", label: "全局搜索", icon: "iconSearch", fallback: Search, group: "导航", bar: "barSearch" },
  { id: "command", label: "命令面板", icon: "iconTerminal", fallback: Terminal, group: "导航", bar: "barCommand" },
  { id: "back", label: "后退", icon: "iconBack", fallback: ArrowLeft, group: "导航", bar: "barBack" },
  { id: "forward", label: "前进", icon: "iconForward", fallback: ArrowRight, group: "导航", bar: "barForward" },
  { id: "outline", label: "大纲", icon: "iconOutline", fallback: List, group: "导航", dock: "outline" },
  { id: "graph", label: "关系图", icon: "iconGraph", fallback: Network, group: "导航", dock: "graph" },
  { id: "bookmark", label: "书签", icon: "iconBookmark", fallback: Bookmark, group: "导航", dock: "bookmark" },
  { id: "tag", label: "标签", icon: "iconTag", fallback: Tag, group: "导航", dock: "tag" },
  { id: "backlink", label: "反链", icon: "iconLink", fallback: Link, group: "导航", dock: "backlink" },

  { id: "daily", label: "日记", icon: "iconCalendarPlus", fallback: CalendarPlus, group: "文档", bar: "barDailyNote" },
  { id: "riff", label: "闪卡", icon: "iconRiffCard", fallback: Layers, group: "文档", bar: "barRiffCard" },
  { id: "filetree", label: "文档树", icon: "iconFiles", fallback: FileText, group: "文档", dock: "file" },
  { id: "inbox", label: "收集箱", icon: "iconInbox", fallback: Inbox, group: "文档", dock: "inbox" },
  { id: "memo", label: "备忘录", icon: "iconMemo", fallback: ScrollText, group: "文档" },

  { id: "mode", label: "外观模式", icon: "iconDark", fallback: Sun, group: "视图", bar: "barMode" },
  { id: "dock", label: "停靠栏", icon: "iconHideDock", fallback: PanelLeft, group: "视图", bar: "barDock" },
  { id: "zoom", label: "缩放", icon: "iconZoomOut", fallback: ZoomIn, group: "视图", bar: "barZoom" },
  { id: "fullscreen", label: "全屏", icon: "iconFullscreen", fallback: Maximize, group: "视图", run: fullscreen },
  { id: "layout", label: "布局", icon: "iconLayout", fallback: LayoutGrid, group: "视图", bar: "barWorkspace" },

  { id: "sync", label: "同步", icon: "iconCloudOff", fallback: Cloud, group: "数据", bar: "barSync" },
  { id: "refresh", label: "刷新界面", icon: "iconRefresh", fallback: RefreshCw, group: "数据", run: reload },
  { id: "plugins", label: "插件", icon: "iconPlugin", fallback: Blocks, group: "数据", bar: "barPlugins" },

  { id: "workspace", label: "主菜单", icon: "iconDown", fallback: Menu, group: "系统", bar: "barWorkspace" },
  { id: "more", label: "更多", icon: "iconMore", fallback: Ellipsis, group: "系统", bar: "barMore" },
  { id: "check", label: "检查数据", icon: "iconCheck", fallback: CheckSquare, group: "系统", bar: "barCommand" },
]

export const GROUPS: ShortcutGroup[] = ["导航", "文档", "视图", "数据", "系统"]

export const shortcutState = persisted("desk:shortcut", {
  /* 默认 8 个：搜索 / 命令面板 / 日记 / 外观 / 后退 / 前进 / 刷新 / 停靠栏 */
  enabled: ["search", "command", "daily", "mode", "back", "forward", "refresh", "dock"],
})

/** 思源 sprite 是否可用（Shadow DOM / iframe 里不可用） */
export const useSprite = () => typeof document !== "undefined" && !!document.getElementById("iconSearch")

export const enabledShortcuts = () =>
  shortcutState.enabled.map((id) => SHORTCUTS.find((s) => s.id === id)).filter((s): s is Shortcut => !!s)

export const byGroup = (g: ShortcutGroup) => SHORTCUTS.filter((s) => s.group === g)

export function runShortcut(s: Shortcut) {
  if (s.bar) return click(document.querySelector(`#${s.bar}`))
  if (s.dock) return click(document.querySelector(`#dockLeft .dock__item[data-type="${s.dock}"]`))
  s.run?.()
}

export function toggleShortcut(id: string) {
  const list = shortcutState.enabled
  shortcutState.enabled = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

/** 追加到启用列表末尾（中间栏的「＋」） */
export function addShortcut(id: string) {
  if (shortcutState.enabled.includes(id)) return
  shortcutState.enabled = [...shortcutState.enabled, id]
}

/** 分类配色：卡片与弹窗共用（图标块 = 同色 14% 浅底 + 同色图标） */
export const GROUP_STYLE: Record<ShortcutGroup, { color: string; soft: string; icon: Component }> = {
  导航: { color: "hsl(212 90% 56%)", soft: "color-mix(in srgb, hsl(212 90% 56%) 14%, transparent)", icon: Compass },
  文档: { color: "hsl(160 74% 42%)", soft: "color-mix(in srgb, hsl(160 74% 42%) 14%, transparent)", icon: FileText },
  视图: { color: "hsl(262 84% 62%)", soft: "color-mix(in srgb, hsl(262 84% 62%) 14%, transparent)", icon: Eye },
  数据: { color: "hsl(36 92% 52%)", soft: "color-mix(in srgb, hsl(36 92% 52%) 14%, transparent)", icon: Database },
  系统: { color: "hsl(330 78% 60%)", soft: "color-mix(in srgb, hsl(330 78% 60%) 14%, transparent)", icon: Settings },
}

/** 拖拽排序：把 from 位置移到 to 位置 */
export function reorderShortcut(from: number, to: number) {
  const list = [...shortcutState.enabled]
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  shortcutState.enabled = list
}
