/**
 * 卡片注册表 —— 唯一的扩展点
 *
 * 加一张新卡片只需要：
 *   1. 在 src/cards/<id>/ 写一个普通 Vue 组件（只管自己内容，不用管外框/菜单/弹窗）
 *   2. 在下面的 CARDS 里加一行
 *
 * 外框、右键菜单、尺寸、弹窗、文档内嵌、持久化 —— 全部由框架统一处理。
 */
import type { Component } from "vue"
import { BarChart3, CalendarClock, CalendarDays, Clock, CloudSun, Boxes, FolderOpen, Grid3x3, History, Zap, Languages, Quote, ScrollText, StickyNote, Timer } from "lucide-vue-next"
import CalendarCard from "@/cards/calendar/CalendarCard.vue"
import CalendarPanel from "@/cards/calendar/CalendarPanel.vue"
import ClockCard from "@/cards/clock/ClockCard.vue"
import ClockPanel from "@/cards/clock/ClockPanel.vue"
import CountdownCard from "@/cards/countdown/CountdownCard.vue"
import CountdownPanel from "@/cards/countdown/CountdownPanel.vue"
import EnglishCard from "@/cards/english/EnglishCard.vue"
import HeatmapCard from "@/cards/heatmap/HeatmapCard.vue"
import HeatmapPanel from "@/cards/heatmap/HeatmapPanel.vue"
import DocStatsCard from "@/cards/docstats/DocStatsCard.vue"
import DocStatsPanel from "@/cards/docstats/DocStatsPanel.vue"
import MemoCard from "@/cards/memo/MemoCard.vue"
import MemoPanel from "@/cards/memo/MemoPanel.vue"
import PomodoroCard from "@/cards/pomodoro/PomodoroCard.vue"
import PomodoroPanel from "@/cards/pomodoro/PomodoroPanel.vue"
import QuickPickCard from "@/cards/quickpick/QuickPickCard.vue"
import QuickPickPanel from "@/cards/quickpick/QuickPickPanel.vue"
import RecentDocsCard from "@/cards/recent/RecentCard.vue"
import RecentPanel from "@/cards/recent/RecentPanel.vue"
import BlockCard from "@/cards/block/BlockCard.vue"
import BlockPanel from "@/cards/block/BlockPanel.vue"
import ShiciCard from "@/cards/shici/ShiciCard.vue"
import ShortcutCard from "@/cards/shortcut/ShortcutCard.vue"
import ShortcutPanel from "@/cards/shortcut/ShortcutPanel.vue"
import WeatherCard from "@/cards/weather/WeatherCard.vue"
import WeatherPanel from "@/cards/weather/WeatherPanel.vue"
import YiyanCard from "@/cards/yiyan/YiyanCard.vue"

/** 尺寸标识：桌面壳按实际格数算出来（如 "4x2"、"12x6"），卡片据此切版式 */
export type CardSize = `${number}x${number}`

interface CardDef {
/** 唯一 id，同时用于文档内嵌属性 data-desk-card */
  id: string
  name: string
  /** 一句话说明，卡片库里显示 */
  desc?: string
  /** 卡片组件：只负责内容渲染，props 会收到 { size } */
  component: Component
  /** 卡片的线性图标（对话框标题栏与卡片库共用） */
  icon?: Component
  /**
   * 卡片面材质：
   *   glass（默认）玻璃半透明，跟随外观里的不透明度
   *   solid        不透明纯色面，对齐 参考实现 的 --bg-card（浅 #fff / 深 #222）
   * 照片型卡片（一言/英语/诗词）必须是 glass——它们的内容本身就是一张照片。
   */
  surface?: "glass" | "solid"
  /**
   * 卡片右上角控件开关（默认全开）：
   *   expand 点击卡片打开详情   menu ⋯ 按钮   full 全屏按钮
   * 关闭后右键菜单仍在，不会丢失能力。
   */
  controls?: { expand?: boolean; menu?: boolean; full?: boolean }
  /**
   * 尺寸约束（可选）：square 拖动任一边保持正方形；min/max 边长范围（格）
   */
  constrain?: { square?: boolean; ratios?: number[]; min?: number; max?: number }
  /** 详情弹窗里用的组件（可选；没有则用 component 本身放大显示） */
  detail?: Component
  /**
   * 详情弹层的尺寸（可选；默认 `min(760px,86vw)` × `min(560px,78vh)`）。
   * 只有三栏这类需要横向空间的卡片才给，别在别处复制。
   */
  detailSize?: { width: string; height: string }
}

export const CARDS: CardDef[] = [
  {
    id: "clock",
    name: "时钟",
    desc: "点阵 / 翻页两种形态，拖动自动横竖排",
    component: ClockCard,
    detail: ClockPanel,
    icon: Clock,
    constrain: { min: 3, max: 16 },
    surface: "solid",
  },
  {
    id: "calendar",
    name: "日历",
    desc: "今日 / 月历 / 农历节气，点开是完整月视图",
    component: CalendarCard,
    icon: CalendarDays,
    detail: CalendarPanel,
    constrain: { ratios: [2, 1], min: 2, max: 16 },
    // 参考实现 的日历是白卡（--bg-card: #fff / #222），不是玻璃
    surface: "solid",
  },
  {
    id: "english",
    name: "每日英语",
    desc: "一句英文 + 中文释义，可朗读",
    component: EnglishCard,
    icon: Languages,
  },
  {
    id: "yiyan",
    name: "每日一言",
    desc: "每天一句话，附赠一张壁纸",
    component: YiyanCard,
    icon: Quote,
  },
  {
    id: "shici",
    name: "每日诗词",
    desc: "一首古诗，含全文、译文、注释",
    component: ShiciCard,
    icon: ScrollText,
  },
  {
    id: "weather",
    name: "天气",
    desc: "实时天气与 7 日预报，详情里管理地点",
    component: WeatherCard,
    icon: CloudSun,
    detail: WeatherPanel,
    constrain: { ratios: [2, 1], min: 2, max: 16 },
  },
  {
    id: "countdown",
    name: "倒数日",
    desc: "纪念日与目标日，详情里按分类管理",
    component: CountdownCard,
    icon: CalendarClock,
    detail: CountdownPanel,
    // 详情是三栏（200 / 自适应 / 300），要宽一点才站得住
    detailSize: { width: "min(1080px, 92vw)", height: "min(680px, 86vh)" },
    // 对齐 参考实现 的倒数日：白卡片面，不是玻璃
    surface: "solid",
  },
  {
    id: "heatmap",
    name: "写作热力图",
    desc: "按天看写作量，详情里是一整年",
    component: HeatmapCard,
    icon: Grid3x3,
    detail: HeatmapPanel,
    // 一年 53 周 + 右侧统计栏，弹层要宽、别太高（格子高度按宽度推）
    detailSize: { width: "min(820px, 92vw)", height: "min(520px, 82vh)" },
    // 和日历一样是纯色卡面
    surface: "solid",
  },
  {
    id: "pomodoro",
    name: "番茄钟",
    desc: "25 分钟专注 + 5 分钟休息，eters 逐秒走",
    component: PomodoroCard,
    icon: Timer,
    detail: PomodoroPanel,
    detailSize: { width: "min(820px, 92vw)", height: "min(520px, 82vh)" },
    surface: "solid",
  },
  {
    id: "memo",
    name: "备忘录",
    desc: "一行一条待办，点圆点勾掉",
    component: MemoCard,
    icon: StickyNote,
    detail: MemoPanel,
    detailSize: { width: "min(900px, 92vw)", height: "min(560px, 84vh)" },
    surface: "solid",
  },
  {
    id: "docstats",
    name: "文档统计",
    desc: "文档数 / 字数 / 今日新建，按笔记本分组",
    component: DocStatsCard,
    icon: BarChart3,
    detail: DocStatsPanel,
    detailSize: { width: "min(980px, 93vw)", height: "min(560px, 84vh)" },
    constrain: { min: 3, max: 12 },
    surface: "solid",
  },
  {
    id: "quickopen",
    name: "快捷打开",
    desc: "一格一个文档，点开就在页签里打开",
    component: QuickPickCard,
    icon: FolderOpen,
    detail: QuickPickPanel,
    controls: { menu: false, full: false },
    detailSize: { width: "min(560px, 92vw)", height: "min(520px, 82vh)" },
    surface: "solid",
  },
  {
    id: "recent",
    name: "最近文档",
    desc: "最近更新的 1–8 篇，点击直接打开",
    component: RecentDocsCard,
    icon: History,
    detail: RecentPanel,
    controls: { menu: false, full: false },
    detailSize: { width: "min(760px, 92vw)", height: "min(620px, 86vh)" },
    surface: "solid",
  },
  {
    id: "shortcut",
    name: "快捷方式",
    desc: "复用思源工具栏的常用动作，一格一个",
    component: ShortcutCard,
    icon: Zap,
    detail: ShortcutPanel,
    controls: { menu: false, full: false },
    detailSize: { width: "min(720px, 92vw)", height: "min(520px, 82vh)" },
    surface: "solid",
  },
  {
    id: "block",
    name: "思源块",
    desc: "原样显示任意思源块（文档块 / 自定义块）",
    component: BlockCard,
    icon: Boxes,
    detail: BlockPanel,
    detailSize: { width: "min(760px, 92vw)", height: "min(620px, 86vh)" },
    surface: "solid",
  },
]

export function getCard(id: string): CardDef | undefined {
  return CARDS.find((c) => c.id === id)
}

