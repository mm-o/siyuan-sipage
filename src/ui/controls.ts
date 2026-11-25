/**
 * 基础控件（原 ui/primitives/*.vue 六件合成这一处）
 *
 * 统一约定：只吃 props / 只发事件、无自带样式（外观全部来自 styles/index.css 与令牌）、
 * 图标一律 lucide（stroke 1.7），不自绘 SVG。
 */
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, Teleport, watch, type Component, type PropType, type Ref } from "vue"
import { isNative } from "@/ui/style"
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-vue-next"

/** 插件和验证页注册同一图形，各使用处只引用 iconDeskCards。 */
export const DESK_ICON = `<symbol id="iconDeskCards" viewBox="0 0 32 32"><g fill="currentColor">
  <rect x="3.5" y="3.5" width="11" height="11" rx="3"/>
  <rect x="17.5" y="3.5" width="11" height="11" rx="3" opacity=".55"/>
  <rect x="3.5" y="17.5" width="11" height="11" rx="3" opacity=".55"/>
  <rect x="17.5" y="17.5" width="11" height="11" rx="3"/>
</g></symbol>`

/**
 * 空态插图：一页纸 + 一颗星，颜色跟 `currentColor`。
 * 尺寸与间距交给 `.desk-empty`（列表/卡片用 `.is-tight`），这里只出图形。
 */
export const EmptyArt = defineComponent({
  name: "EmptyArt",
  render: () =>
    h("svg", {
      class: "desk-empty-art",
      viewBox: "0 0 64 64",
      fill: "none",
      stroke: "currentColor",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      innerHTML:
        '<path d="M10 18c7-3 14-2 22 4v30c-8-6-15-7-22-4z" opacity=".5" stroke-width="2"/>' +
        '<path d="M54 18c-7-3-14-2-22 4v30c8-6 15-7 22-4z" opacity=".5" stroke-width="2"/>' +
        '<path d="M32 22v30" opacity=".26" stroke-width="2"/>' +
        '<path d="M16 28c3-1 6-1 9 1M16 34c3-1 6-1 9 1M39 29c3-2 6-2 9-1M39 35c3-2 6-2 9-1" opacity=".3" stroke-width="1.6"/>' +
        '<path d="M50 5l1.9 4.6 4.6 1.9-4.6 1.9L50 18l-1.9-4.6L43.5 11.5l4.6-1.9z" opacity=".7" stroke-width="1.6"/>',
    }),
})
/* ── 液态玻璃：整页共用两张折射图，不逐按钮创建滤镜或观察器。 ── */
function ensureGlassFilters() {
  if (document.getElementById("desk-glass-filters")) return
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.id = "desk-glass-filters"
  svg.setAttribute("aria-hidden", "true")
  svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none"
  for (const [name, width, height, scale] of [["icon", 64, 64, 6], ["pill", 384, 128, 9]] as const) {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) continue
    const image = context.createImageData(width, height)
    const radius = height / 2
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const dx = x + .5 - Math.max(radius, Math.min(width - radius, x + .5))
      const dy = y + .5 - radius
      const distance = Math.hypot(dx, dy)
      const depth = radius - distance
      const strength = depth > 0 && depth < height / 6 ? Math.sin(Math.PI * depth / (height / 6)) * .82 : 0
      const i = (y * width + x) * 4
      image.data[i] = Math.round(128 + (distance ? dx / distance : 0) * strength * 127)
      image.data[i + 1] = Math.round(128 + (distance ? dy / distance : 0) * strength * 127)
      image.data[i + 2] = 128
      image.data[i + 3] = 255
    }
    context.putImageData(image, 0, 0)
    const filter = document.createElementNS(ns, "filter")
    for (const [key, value] of Object.entries({ id: `desk-glass-${name}`, x: "0%", y: "0%", width: "100%", height: "100%", "color-interpolation-filters": "sRGB" })) filter.setAttribute(key, value)
    const map = document.createElementNS(ns, "feImage")
    for (const [key, value] of Object.entries({ href: canvas.toDataURL(), width: "100%", height: "100%", preserveAspectRatio: "none", result: "map" })) map.setAttribute(key, value)
    const displacement = document.createElementNS(ns, "feDisplacementMap")
    for (const [key, value] of Object.entries({ in: "SourceGraphic", in2: "map", scale: String(scale), xChannelSelector: "R", yChannelSelector: "G" })) displacement.setAttribute(key, value)
    filter.append(map, displacement)
    svg.append(filter)
  }
  document.body.prepend(svg)
  for (const name of ["icon", "pill"]) document.documentElement.style.setProperty(`--dg-${name}-filter`, `url(${JSON.stringify(`${location.href.split("#")[0]}#desk-glass-${name}`)})`)
}

function glassPointer(e: PointerEvent) {
  if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const button = e.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  button.style.setProperty("--dg-light-x", `${Math.round((e.clientX - rect.left) / rect.width * 100)}%`)
  button.style.setProperty("--dg-light-y", `${Math.round((e.clientY - rect.top) / rect.height * 100)}%`)
}

export const GlassButton = defineComponent({
  props: {
    icon: { type: [Object, Function] as PropType<Component> },
    label: { type: String, required: true },
    active: { type: Boolean, default: undefined },
    text: Boolean,
    disabled: Boolean,
    variant: { type: String as PropType<"default" | "primary" | "danger">, default: "default" },
    tone: { type: String as PropType<"auto" | "photo">, default: "auto" },
    type: { type: String as PropType<"button" | "submit" | "reset">, default: "button" },
  },
  setup(props) {
    onMounted(ensureGlassFilters)
    return () => {
      /* 原生风格：直接用思源的按钮组件——图标按钮 block__icon，文字按钮 b3-button */
      if (isNative()) {
        const look = props.variant === "primary" ? "" : props.variant === "danger" ? " b3-button--cancel" : " b3-button--outline"
        return h(
          "button",
          {
            class: props.text || props.variant !== "default" ? `b3-button${look}` : "block__icon block__icon--show desk-native-icon",
            type: props.type,
            disabled: props.disabled,
            "aria-label": props.label,
            "aria-pressed": props.active,
            style: props.variant === "danger" ? { color: "var(--b3-theme-error)" } : undefined,
          },
          [
            props.icon ? h(props.icon, { size: props.text ? 14 : 16, "stroke-width": 1.7, "aria-hidden": "true" }) : null,
            props.text ? h("span", { class: "gb-label" }, props.label) : null,
          ],
        )
      }
      return h("button", {
        class: ["gb", { "gb-text": props.text, "is-on": props.active, "on-photo": props.tone === "photo", "is-primary": props.variant === "primary", "is-danger": props.variant === "danger", ariaLabel: !props.text }],
        type: props.type,
        disabled: props.disabled,
        "data-position": "north",
        "data-tooltip-encoding": "none",
        "aria-label": props.label,
        "aria-pressed": props.active,
        onPointermove: glassPointer,
        onPointerleave: (e: PointerEvent) => {
          const button = e.currentTarget as HTMLElement
          button.style.removeProperty("--dg-light-x")
          button.style.removeProperty("--dg-light-y")
        },
      }, [
        h("span", { class: "gb-lens", "aria-hidden": "true" }),
        props.icon ? h(props.icon, { size: 14, "stroke-width": 1.7, "aria-hidden": "true" }) : null,
        props.text ? h("span", { class: "gb-label" }, props.label) : null,
      ])
    }
  },
})

/* ── 原生表单控件：一个字段组件覆盖文本、多行与下拉，不复制业务状态。 ── */
export const GlassField = defineComponent({
  props: {
    modelValue: [String, Number],
    as: { type: String as PropType<"input" | "textarea">, default: "input" },
    type: { type: String, default: "text" },
    label: String,
    tone: { type: String as PropType<"auto" | "photo">, default: "auto" },
    disabled: Boolean,
    invalid: Boolean,
    modelModifiers: { type: Object as PropType<{ number?: boolean; trim?: boolean }>, default: () => ({}) },
  },
  emits: ["update:modelValue", "input"],
  setup(props, { emit }) {
    const update = (event: Event) => {
      if ((event.target as HTMLInputElement & { composing?: boolean }).composing) return
      let value: string | number = (event.target as HTMLInputElement).value
      if (props.modelModifiers.trim) value = value.trim()
      if (props.modelModifiers.number && value !== "" && Number.isFinite(Number(value))) value = Number(value)
      emit("update:modelValue", value)
      emit("input", event)
    }
    return () => h(props.as, {
      /* 原生风格：直接吃思源的输入框样式 */
      class: isNative()
        ? ["b3-text-field", "gf", { "is-multiline": props.as === "textarea", "is-invalid": props.invalid }]
        : ["desk-field", "gf", "desk-input", { "is-multiline": props.as === "textarea", "is-invalid": props.invalid, "on-photo": props.tone === "photo" }],
      type: props.as === "input" ? props.type : undefined,
      value: props.modelValue,
      disabled: props.disabled,
      "aria-label": props.label,
      "aria-invalid": props.invalid || undefined,
      onInput: update,
      onCompositionstart: (event: CompositionEvent) => { (event.target as HTMLInputElement & { composing?: boolean }).composing = true },
      onCompositionend: (event: CompositionEvent) => { (event.target as HTMLInputElement & { composing?: boolean }).composing = false; update(event) },
    })
  },
})

export const GlassSwitch = defineComponent({
  props: { modelValue: Boolean, label: { type: String, required: true }, disabled: Boolean },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () => {
      if (isNative()) {
        return h("input", {
          class: "b3-switch desk-native-switch",
          type: "checkbox",
          checked: props.modelValue,
          disabled: props.disabled,
          "aria-label": props.label,
          onChange: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).checked),
        })
      }
      return h("button", {
        class: ["desk-switch", "gs", { "is-on": props.modelValue }],
        type: "button",
        role: "switch",
        disabled: props.disabled,
        "aria-label": props.label,
        "aria-checked": props.modelValue,
        onClick: () => emit("update:modelValue", !props.modelValue),
      }, [h("span", { class: "gs-knob", "aria-hidden": "true" })])
    }
  },
})

/* ── 下拉：原生 select 的弹层无法自绘，这里用 listbox 保持同一套玻璃与键盘行为。 ── */
interface SelectOption { label: string; value: string | number }

export const GlassSelect = defineComponent({
  props: {
    modelValue: { type: [String, Number] as PropType<string | number>, default: "" },
    options: { type: Array as PropType<SelectOption[]>, required: true },
    label: { type: String, default: "" },
    disabled: Boolean,
    tone: { type: String as PropType<"auto" | "photo">, default: "auto" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const open = ref(false)
    const index = ref(0)
    const trigger = ref<HTMLButtonElement>()
    const menu = ref<HTMLElement>()
    const pos = ref<Record<string, string>>({})
    const currentLabel = computed(() => props.options.find(option => option.value === props.modelValue)?.label ?? "")

    function place() {
      const rect = trigger.value?.getBoundingClientRect()
      if (!rect) return
      const height = Math.min(320, props.options.length * 32 + 10)
      const below = window.innerHeight - rect.bottom - 16
      const top = below >= height ? rect.bottom + 6 : Math.max(16, rect.top - height - 6)
      pos.value = { left: `${Math.round(rect.left)}px`, top: `${Math.round(top)}px`, minWidth: `${Math.round(rect.width)}px`, maxHeight: `${height}px` }
    }

    function close(restore = true) {
      if (!open.value) return
      open.value = false
      if (restore) trigger.value?.focus({ preventScroll: true })
    }

    function reveal() {
      nextTick(() => {
        menu.value?.querySelectorAll<HTMLElement>('[role="option"]')[index.value]?.scrollIntoView({ block: "nearest" })
        menu.value?.focus({ preventScroll: true })
      })
    }

    function show() {
      if (props.disabled || open.value) return
      index.value = Math.max(0, props.options.findIndex(option => option.value === props.modelValue))
      open.value = true
      place()
      reveal()
    }

    function select(value: string | number) {
      emit("update:modelValue", value)
      close()
    }

    function move(delta: number) {
      const count = props.options.length
      if (!count) return
      index.value = (index.value + delta + count) % count
      menu.value?.querySelectorAll<HTMLElement>('[role="option"]')[index.value]?.scrollIntoView({ block: "nearest" })
    }

    function onTriggerKey(e: KeyboardEvent) {
      if (!["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) return
      e.preventDefault()
      show()
      if (e.key === "ArrowUp") {
        index.value = Math.max(0, props.options.length - 1)
        reveal()
      }
    }

    function onMenuKey(e: KeyboardEvent) {
      const handled: Record<string, () => void> = {
        Escape: () => close(),
        Tab: () => close(false),
        ArrowDown: () => move(1),
        ArrowUp: () => move(-1),
        Home: () => { index.value = 0; reveal() },
        End: () => { index.value = props.options.length - 1; reveal() },
        Enter: () => select(props.options[index.value].value),
        " ": () => select(props.options[index.value].value),
      }
      const action = handled[e.key]
      if (!action) return
      e.preventDefault()
      action()
    }

    function onOutside(e: PointerEvent) {
      const target = e.target as Node
      if (!menu.value?.contains(target) && !trigger.value?.contains(target)) close(false)
    }

    watch(open, (value) => {
      if (value) {
        document.addEventListener("pointerdown", onOutside, true)
        window.addEventListener("resize", place)
        window.addEventListener("scroll", place, true)
      } else {
        document.removeEventListener("pointerdown", onOutside, true)
        window.removeEventListener("resize", place)
        window.removeEventListener("scroll", place, true)
      }
    })
    onBeforeUnmount(() => {
      document.removeEventListener("pointerdown", onOutside, true)
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    })

    return () => h("div", { class: "gs-wrap" }, [
      h("button", {
        ref: trigger,
        class: ["desk-field", "gf", "gs-trigger", { "on-photo": props.tone === "photo", "is-open": open.value }],
        type: "button",
        disabled: props.disabled,
        "aria-label": props.label,
        "aria-haspopup": "listbox",
        "aria-expanded": open.value,
        onClick: () => (open.value ? close() : show()),
        onKeydown: onTriggerKey,
      }, [
        h("span", { class: "gs-value" }, currentLabel.value),
        h(ChevronDown, { class: "gs-arrow", size: 12, "stroke-width": 1.8, "aria-hidden": "true" }),
      ]),
      open.value && h(Teleport, { to: "body" }, [
        h("div", {
          ref: menu,
          class: ["desk-pop", { "on-photo": props.tone === "photo" }],
          role: "listbox",
          tabindex: -1,
          "aria-label": props.label,
          style: pos.value,
          onKeydown: onMenuKey,
        }, props.options.map((option, i) => h("button", {
          key: String(option.value),
          class: ["desk-pop-item", { "is-active": i === index.value, "is-current": option.value === props.modelValue }],
          type: "button",
          role: "option",
          "aria-selected": option.value === props.modelValue,
          onMouseenter: () => { index.value = i },
          onClick: () => select(option.value),
        }, [
          h("span", { class: "desk-pop-label" }, option.label),
          option.value === props.modelValue ? h(Check, { size: 12, "stroke-width": 2.2, "aria-hidden": "true" }) : null,
        ]))),
      ]),
    ])
  },
})

/* ── 序列翻页组（上一条 / 下一条） ── */
export const SeriesNav = (props: { series: { step: (dir: "prev" | "next") => Promise<void> } }) =>
  h("div", { class: "desk-fab" }, [
    h(GlassButton, { icon: ChevronLeft, label: "上一条", onClick: () => void props.series.step("prev") }),
    h(GlassButton, { icon: ChevronRight, label: "下一条", onClick: () => void props.series.step("next") }),
  ])
SeriesNav.props = ["series"]

/* ── 分段控件（等宽单选，≤4 项用它） ── */
interface SegOption {
  label: string
  value: string
}

type Emit = { "onUpdate:modelValue"?: (v: any) => void; onChange?: (v: any) => void }
const emit = (props: Emit) => props["onUpdate:modelValue"] ?? props.onChange ?? (() => {})

function segmentKey(e: KeyboardEvent, props: { modelValue: string; options: SegOption[] } & Emit) {
  const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
  if (!dir && e.key !== "Home" && e.key !== "End") return
  const count = props.options.length
  if (!count) return
  e.preventDefault()
  e.stopPropagation()
  const current = Math.max(0, props.options.findIndex(option => option.value === props.modelValue))
  const next = e.key === "Home" ? 0 : e.key === "End" ? count - 1 : (current + dir + count) % count
  emit(props)(props.options[next].value)
  ;(e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("button")[next]?.focus()
}

export const Segmented = (props: { modelValue: string; options: SegOption[] } & Emit) =>
  h(
    "div",
    { class: ["seg", { "desk-seg-native": isNative() }], role: "tablist", onKeydown: (e: KeyboardEvent) => segmentKey(e, props) },
    props.options.map((opt) =>
      h(
        "button",
        {
          key: opt.value,
          /* 原生风格没有分段组件：用一排思源描边按钮，选中借 b3 的浅色态 */
          class: isNative()
            ? `b3-button b3-button--outline desk-seg-native-item${props.modelValue === opt.value ? " is-active" : ""}`
            : ["seg-item", { active: props.modelValue === opt.value }],
          role: "tab",
          "aria-selected": props.modelValue === opt.value,
          tabindex: props.modelValue === opt.value ? 0 : -1,
          type: "button",
          onClick: () => emit(props)(opt.value),
        },
        opt.label,
      ),
    ),
  )
Segmented.props = ["modelValue", "options", "onUpdate:modelValue", "onChange"]

/* ── 标签选择（多项、可换行） ── */
interface ChipOption {
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
          class: isNative() ? `b3-chip b3-chip--small desk-native-chip${props.modelValue === opt.value ? " b3-chip--primary" : ""}` : ["chip", { active: props.modelValue === opt.value, "on-photo": (props.tone ?? "plain") === "on-photo" }],
          "aria-pressed": props.modelValue === opt.value,
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

/* ── 自由尺寸卡片的槽位几何 ───────────────────────────── */
/**
 * 每「2 格 × 2 格」= 1 个元素（快捷方式 / 最近文档 / 快捷打开共用）。
 *   2×2 → 1 个；4×4 → 4 个；6×6 → 9 个；任意尺寸按 floor(w/2) × floor(h/2)。
 */
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

/** 屏幕顶部的一行提示（不依赖思源 showMessage）：淡入 → 停留 → 淡出 */
export function toast(message: string, duration = 2200) {
  const el = document.createElement("div")
  el.className = "desk-toast"
  el.textContent = message
  document.body.append(el)
  window.setTimeout(() => el.classList.add("is-out"), Math.max(duration - 200, 0))
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
