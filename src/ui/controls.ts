/**
 * 基础控件（原 ui/primitives/*.vue 六件合成这一处）
 *
 * 统一约定：只吃 props / 只发事件、无自带样式（外观全部来自 styles/index.css 与令牌）、
 * 图标一律 lucide（stroke 1.7），不自绘 SVG。
 */
import { computed, h, onBeforeUnmount, onMounted, ref, type Component, type Ref } from "vue"
import { ChevronLeft, ChevronRight } from "lucide-vue-next"

/* ── 圆形毛玻璃按钮（全项目唯一的圆形控件，只有 28 一档） ── */
export const GlassButton = (props: { icon?: Component; label: string; active?: boolean }) =>
  h(
    "button",
    {
      class: ["gb", "ariaLabel", { "is-on": props.active }],
      type: "button",
      "data-position": "north",
      "data-tooltip-encoding": "none",
      "aria-label": props.label,
    },
    props.icon ? [h(props.icon, { size: 14, "stroke-width": 1.7 })] : [],
  )
GlassButton.props = ["icon", "label", "active"]

/* ── 序列翻页组（上一条 / 下一条） ── */
export const SeriesNav = (props: { series: { step: (dir: "prev" | "next") => Promise<void> } }) =>
  h("div", { class: "desk-fab" }, [
    h(GlassButton, { icon: ChevronLeft, label: "上一条", onClick: () => void props.series.step("prev") }),
    h(GlassButton, { icon: ChevronRight, label: "下一条", onClick: () => void props.series.step("next") }),
  ])
SeriesNav.props = ["series"]

/* ── 分段控件（等宽单选，≤4 项用它） ── */
export interface SegOption {
  label: string
  value: string
}

type Emit = { "onUpdate:modelValue"?: (v: any) => void; onChange?: (v: any) => void }
const emit = (props: Emit) => props["onUpdate:modelValue"] ?? props.onChange ?? (() => {})

export const Segmented = (props: { modelValue: string; options: SegOption[] } & Emit) =>
  h(
    "div",
    { class: "seg", role: "tablist" },
    props.options.map((opt) =>
      h(
        "button",
        {
          key: opt.value,
          class: ["seg-item", { active: props.modelValue === opt.value }],
          role: "tab",
          "aria-selected": props.modelValue === opt.value,
          type: "button",
          onClick: () => emit(props)(opt.value),
        },
        opt.label,
      ),
    ),
  )
Segmented.props = ["modelValue", "options", "onUpdate:modelValue", "onChange"]

/* ── 标签选择（多项、可换行） ── */
export interface ChipOption {
  label: string
  value: string | number
}

export const Chips = (props: {
  modelValue: string | number
  options: ChipOption[]
  tone?: "plain" | "on-photo"
} & Emit) =>
  h(
    "div",
    { class: "chips" },
    props.options.map((opt) =>
      h(
        "button",
        {
          key: String(opt.value),
          class: ["chip", { active: props.modelValue === opt.value, "on-photo": (props.tone ?? "plain") === "on-photo" }],
          type: "button",
          onClick: () => emit(props)(opt.value),
        },
        opt.label,
      ),
    ),
  )
Chips.props = ["modelValue", "options", "tone", "onUpdate:modelValue", "onChange"]

/* ═══ 纯 DOM 工具（原 ui/view.ts：提示条 / 复制 / 文档配色与排行） ═══ */
/* ── 照片型卡片背景 ───────────────────────────────────── */
/** 封面为空时退回内置题头图 */
export function photoBg(cover: string) {
  return { backgroundImage: `url(${cover || "/appearance/covers/cover_001.webp"})` }
}

/* ── 主题探测 ─────────────────────────────────────────── */
type Theme = "light" | "dark"

const current = ref<Theme>("light")
let observer: MutationObserver | null = null
let listeners = 0

/** 思源在 <body> 上切换 `.body--dark` 表示深色外观 */
function sync() {
  current.value = document.body.classList.contains("body--dark") ? "dark" : "light"
}

/** 组件内使用：自动订阅 body 的 class 变化 */
export function useTheme(): Ref<Theme> {
  onMounted(() => {
    sync()
    listeners += 1
    if (!observer) {
      observer = new MutationObserver(sync)
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })
    }
  })
  onBeforeUnmount(() => {
    listeners -= 1
    if (listeners <= 0 && observer) {
      observer.disconnect()
      observer = null
    }
  })
  return current
}

/* ── 自由尺寸卡片的槽位几何 ───────────────────────────── */
/**
 * 每「2 格 × 2 格」= 1 个元素（快捷方式 / 最近文档 / 快捷打开共用）。
 *   2×2 → 1 个；4×4 → 4 个；6×6 → 9 个；任意尺寸按 floor(w/2) × floor(h/2)。
 */
/**
 * 槽位网格：**一个图标至少占 2×2 格**（再小就点不准也看不清）。
 *   8×4 → 4 列 × 2 行 = 8 个；4×2 → 2 列 × 1 行 = 2 个；2×2 → 1 个。
 * 上限 12 个。
 */
export function slotGrid(w = 2, h = 2) {
  const cols = Math.max(1, Math.floor(w / 2))
  const rows = Math.max(1, Math.floor(h / 2))
  return { cols, rows, count: Math.min(12, cols * rows) }
}

/* ── 文档列表配色（移植 Neo 1.8.3 的「彩色」取色法）────────────
   源码：Neo/styles/element/heading.scss
     --_element-heading-colored-base: oklch(from var(--b3-theme-base) clamp(0.55, l, 0.68) max(c, 0.2) h);
     --_element-heading-colored-c: 0.08;               // 默认；soft 0.05 / vivid 0.2
     色相步进：calc(initial-hue + (level - 1) * 50)     // 每级 +50°
     outline-l: l - 0.05（浅色）/ l + 0.05（深色）
   也就是“中亮度 + 低彩度 + 50° 色相步进”，颜色是叠上去的淡色、文字用同族深色。 */
const HUE_BASE = 265   // Neo 默认 base #6a85e3 的色相
const HUE_STEP = 50    // 每行 +50°
const DOC_L = 0.82     // 亮而有色
const DOC_C = 0.14     // 稍艳一点：认得出来、不过分

/** 第 i 行的叠加底色 / 描边 / 文字色（同族） */
export function docColor(i: number) {
  const h = (HUE_BASE + i * HUE_STEP) % 360
  return {
    bg: `oklch(${DOC_L} ${DOC_C} ${h} / 0.46)`,      // 稍厚一点点的色块
    line: `oklch(${DOC_L - 0.08} ${DOC_C} ${h} / 0.55)`,
    ink: `oklch(0.4 ${DOC_C} ${h})`,                  // 同族深文字
  }
}

/* ── 文档列表卡的公共逻辑 ──────────────────────────────── */
/**
 * 行 = 文档 + 末尾一行「更多」；没有文档时只剩「更多」一行。
 * 行数上限 = 卡片高度格数（每行 1 格）。
 */
export function docRows(list: Ref<{ id?: string; title: string }[]>, h: Ref<number | undefined>) {
  return computed(() => {
    const max = Math.max(1, Math.floor(h.value ?? 2))
    const docs = list.value.slice(0, Math.max(0, max - 1))
    return [...docs, undefined] as ({ id?: string; title: string } | undefined)[]
  })
}

/* ── 轻量 DOM 反馈 ────────────────────────────────────── */

/** 屏幕顶部的一行提示（不依赖思源 showMessage） */
export function toast(message: string, duration = 2200) {
  const el = document.createElement("div")
  el.textContent = message
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:16px",
    "transform:translateX(-50%)",
    "z-index:99999",
    "padding:6px 14px",
    "border-radius:8px",
    "background:#1f2937",
    "color:#fff",
    "font-size:12px",
    "pointer-events:none",
  ].join(";")
  document.body.append(el)
  window.setTimeout(() => el.remove(), duration)
}

/** 复制文本：Clipboard API 不可用时退回 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.append(ta)
      ta.select()
      document.execCommand("copy")
      ta.remove()
      return true
    } catch {
      return false
    }
  }
}
