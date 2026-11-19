/**
 * 视图层公共小工具（卡片与弹层共用）
 *
 * 只做「纯样式 / 纯 DOM / 主题探测」，不碰数据、不发请求，因此属于 ui/。
 */
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from "vue"

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
export function slotGrid(w = 2, h = 2) {
  const cols = Math.max(1, Math.floor(w / 2))
  const rows = Math.max(1, Math.floor(h / 2))
  return { cols, rows, count: cols * rows }
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
