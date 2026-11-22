<template>
  <Teleport to="body">
    <Transition name="desk-fade" appear>
      <div v-if="open" ref="maskRef" class="desk-sheet-mask" :class="{ 'is-pinned': pinned }" @mousedown.self="!pinned && close()">
        <section
          ref="panelRef"
          class="desk-sheet desk-enter"
          :class="{ 'is-pinned': pinned }"
          :style="panelStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="title || '对话框'"
          tabindex="-1"
        >
          <!-- 顶部标题栏：图标 + 标题 + 右侧动作（钉住 / 全屏 / 关闭），自己一块 pane -->
          <header class="desk-sheet-head desk-pane is-top" @pointerdown="startDrag" @dblclick="box = null">
            <span v-if="icon" class="desk-sheet-head-icon">
              <component :is="icon" :size="18" :stroke-width="1.8" />
            </span>
            <strong class="desk-sheet-head-title">{{ title }}</strong>
            <div class="desk-sheet-actions">
              <GlassButton
                :icon="pinned ? PinOff : Pin"
                :label="pinned ? '取消钉住' : '钉住（看到背景）'"
                :active="pinned"
                @click="togglePin"
              />
              <slot name="actions" />
              <GlassButton class="desk-sheet-close" :icon="X" label="关闭" @click="close" />
            </div>
          </header>

          <div class="desk-sheet-body">
            <slot />
          </div>

          <!-- 四角缩放：只有热区，不出图形 -->
          <b v-for="g in GRIPS" :key="g" class="desk-sheet-grip" :class="`is-${g}`" aria-hidden="true" @pointerdown="startResize($event, g)" />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/** 统一弹层：标题栏、功能按钮和内容面板；origin 用于 FLIP 展开与关闭。 */
import { GlassButton } from "@/ui/controls"
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from "vue"
import { Pin, PinOff, X } from "lucide-vue-next"

const props = defineProps<{
  width?: string | number
  height?: string | number
  title?: string
  icon?: Component
  origin?: DOMRect | null
  /** 钉住由调用方持有：一个桌面可以同时钉住多张弹窗，谁被钉住只有调用方知道。 */
  pinned?: boolean
}>()
const emit = defineEmits<{ "update:pinned": [boolean] }>()
const open = defineModel<boolean>("open", { required: true })

const panelRef = ref<HTMLElement>()
const maskRef = ref<HTMLElement>()
const closing = ref(false)
/** 钉住：遮罩不压暗、不模糊、放行指针；点外部不关 */
const pinned = ref(props.pinned ?? false)
watch(() => props.pinned, (value) => { if (value !== undefined) pinned.value = value })

function togglePin() {
  pinned.value = !pinned.value
  emit("update:pinned", pinned.value)
}

/** 多弹窗共存时，Esc 与 Tab 只作用于最上面那一层（DOM 末尾的遮罩）。 */
function onTop() {
  const all = document.querySelectorAll(".desk-sheet-mask")
  return all[all.length - 1] === maskRef.value
}

/**
 * 拖动 / 缩放：第一次交互时把「居中矩形」冻结成绝对盒，之后只改这一个值。
 * 未交互前仍走 mask 的居中布局，打开动画与关闭回缩都不受影响。
 */
const MIN_W = 380
const MIN_H = 260
const GRIPS = ["nw", "ne", "sw", "se"] as const
const box = ref<{ l: number; t: number; w: number; h: number } | null>(null)

const panelStyle = computed(() => {
  const b = box.value
  if (!b) {
    const w = typeof props.width === "number" ? `${props.width}px` : props.width || "min(920px, 90vw)"
    const h = typeof props.height === "number" ? `${props.height}px` : props.height || "min(620px, 82vh)"
    return { width: w, height: h }
  }
  return { position: "fixed" as const, left: `${b.l}px`, top: `${b.t}px`, width: `${b.w}px`, height: `${b.h}px`, maxHeight: "none", margin: "0" }
})

/** 指针拖拽通用壳：点下冻结、移动回调、抬手解绑 */
function pointerDrag(e: PointerEvent, onMove: (dx: number, dy: number, from: NonNullable<typeof box.value>) => void) {
  if (e.button !== 0) return
  const el = e.currentTarget as HTMLElement
  if (!box.value) {
    const r = panelRef.value?.getBoundingClientRect()
    if (!r) return
    box.value = { l: r.left, t: r.top, w: r.width, h: r.height }
  }
  const from = { ...box.value }
  const x0 = e.clientX
  const y0 = e.clientY
  e.preventDefault()
  el.setPointerCapture(e.pointerId)
  const move = (ev: PointerEvent) => onMove(ev.clientX - x0, ev.clientY - y0, from)
  const end = () => {
    el.removeEventListener("pointermove", move)
    el.removeEventListener("pointerup", end)
    el.removeEventListener("pointercancel", end)
  }
  el.addEventListener("pointermove", move)
  el.addEventListener("pointerup", end)
  el.addEventListener("pointercancel", end)
}

/** 顶栏平移：至少留 120px 横向与 48px 顶栏在视口内 */
function startDrag(e: PointerEvent) {
  if ((e.target as HTMLElement).closest("button, a, input, textarea")) return
  pointerDrag(e, (dx, dy, from) => {
    box.value = {
      ...from,
      l: Math.min(Math.max(from.l + dx, 120 - from.w), window.innerWidth - 120),
      t: Math.min(Math.max(from.t + dy, 0), window.innerHeight - 48),
    }
  })
}

/** 四角缩放：对边固定，到下限后不再反向移动 */
function startResize(e: PointerEvent, dir: string) {
  pointerDrag(e, (dx, dy, from) => {
    let { l, t, w, h } = from
    if (dir.includes("e")) w = from.w + dx
    if (dir.includes("s")) h = from.h + dy
    if (dir.includes("w")) { w = from.w - dx; l = from.l + dx }
    if (dir.includes("n")) { h = from.h - dy; t = from.t + dy }
    if (w < MIN_W) { if (dir.includes("w")) l -= MIN_W - w; w = MIN_W }
    if (h < MIN_H) { if (dir.includes("n")) t -= MIN_H - h; h = MIN_H }
    box.value = { l, t, w, h }
  })
}

/** 从触发元素矩形算出的起始变换 */
function flipFrom(origin: DOMRect, panel: DOMRect) {
  const sx = origin.width / panel.width
  const sy = origin.height / panel.height
  const dx = origin.left + origin.width / 2 - (panel.left + panel.width / 2)
  const dy = origin.top + origin.height / 2 - (panel.top + panel.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
}

async function playOpen() {
  if (!props.origin || matchMedia("(prefers-reduced-motion: reduce)").matches) return
  await nextTick()
  const panel = panelRef.value
  if (!panel) return
  const from = flipFrom(props.origin, panel.getBoundingClientRect())
  panel.animate(
    [
      { transform: from, opacity: 0.65, borderRadius: "14px" },
      { transform: "none", opacity: 1, borderRadius: "18px" },
    ],
    { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "none" },
  )
}

/** 关闭：先缩回触发点，再真正卸载 */
async function close() {
  if (closing.value) return
  const panel = panelRef.value
  if (props.origin && panel && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    closing.value = true
    const to = flipFrom(props.origin, panel.getBoundingClientRect())
    const anim = panel.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: to, opacity: 0.5 },
      ],
      { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
    )
    try {
      await anim.finished
    } catch {}
    closing.value = false
  }
  open.value = false
}

let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (!open.value || e.defaultPrevented || !onTop()) return
  /* 下拉弹层开着时，Esc 先交给它自己关闭。 */
  if (e.key === "Escape" && document.querySelector(".desk-pop")) return
  if (e.key === "Escape") {
    e.preventDefault()
    e.stopPropagation()
    void close()
  } else if (e.key === "Tab" && panelRef.value) {
    const elements = [...panelRef.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length)
    const first = elements[0] || panelRef.value
    const last = elements[elements.length - 1] || first
    if (!panelRef.value.contains(document.activeElement) || e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    }
  }
}

watch(open, async (value) => {
  /* 每次开关都回到居中初始盒 */
  box.value = null
  if (value) {
    previousFocus = document.activeElement as HTMLElement | null
    document.addEventListener("keydown", onKeydown, true)
    await nextTick()
    if (!open.value) return
    panelRef.value?.focus({ preventScroll: true })
    void playOpen()
  } else {
    pinned.value = false
    emit("update:pinned", false)
    document.removeEventListener("keydown", onKeydown, true)
    await nextTick()
    if (!open.value && previousFocus?.isConnected && !document.querySelector(".desk-full")) previousFocus.focus({ preventScroll: true })
    previousFocus = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown, true)
})
</script>

<style scoped>
.desk-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: grid;
  place-items: center;
  padding: 24px;
  /* 遮罩轻一点：让卡片自己的背景成为视觉主体 */
  background: var(--dg-modal-veil);
  backdrop-filter: blur(4px) saturate(1.08);
  -webkit-backdrop-filter: blur(4px) saturate(1.08);
  transition: background var(--desk-dur) var(--desk-ease);
}

/* 钉住：不再压暗、不再模糊，也不再拦截指针——背后的桌面可以正常点击。
   弹窗自己恢复指针，避免被父级 none 带走。 */
.desk-sheet-mask.is-pinned {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  pointer-events: none;
}

.desk-sheet-mask.is-pinned .desk-sheet {
  pointer-events: auto;
}

/* 弹窗本身不再是一块大玻璃：壳透明，面下沉到内容的每一栏（`.desk-pane`）。
   这样「栏分开」、每栏对比够，玻璃只在栏上出现一次。 */
.desk-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 壳只是布局容器：面在每一栏上（同底色、同不透明度），块与块之间留缝 */
  max-height: min(86vh, 820px);
  padding: var(--desk-detail-inset);
  border-radius: var(--desk-r-sheet);
  overflow: visible;
  color: var(--desk-text);
  transform-origin: center center;
}

/* 顶部标题栏：自己一块 pane，和下面的内容栏分开 */
.desk-sheet-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  height: 48px;
  /* 标题离左边、按钮离右边都留出和栏内其他内容同一个内边距（20） */
  padding: 0 var(--desk-detail-pad);
  /* 和内容同处一块面：只有一条 1px 分隔线，不再自己画底色 */
  margin: 0 0 var(--desk-detail-gap);
  /* 顶栏即拖动把手 */
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.desk-sheet-head:active {
  cursor: grabbing;
}

/* 四角缩放手柄：只有热区，不出图形 */
.desk-sheet-grip {
  position: absolute;
  z-index: 3;
  width: 14px;
  height: 14px;
  touch-action: none;
}

.desk-sheet-grip.is-nw { left: -2px; top: -2px; cursor: nwse-resize; }
.desk-sheet-grip.is-ne { right: -2px; top: -2px; cursor: nesw-resize; }
.desk-sheet-grip.is-sw { left: -2px; bottom: -2px; cursor: nesw-resize; }
.desk-sheet-grip.is-se { right: -2px; bottom: -2px; cursor: nwse-resize; }

.desk-sheet-head-icon {
  flex: none;
  display: grid;
  place-items: center;
  color: var(--desk-text-2);
}

.desk-sheet-head-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--desk-text);
  font-size: var(--desk-fs-title);
  font-weight: var(--desk-fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desk-sheet-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
}


/* 内容铺满：留白由内容自己决定（详情 = 卡片本身，设置 = 左栏 + 右栏各 20） */
.desk-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.desk-sheet-body::-webkit-scrollbar {
  display: none;
}

/* 壳不存在：不画底、不描边、不投影、不模糊，只当布局容器。
   屏幕上只有每一栏那块面，缝里直接透出模态背景。 */
.desk-sheet.desk-sheet {
  background: none;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  overflow: visible;
  /* 聚焦兜底：思源全局会给 tabindex 元素画主题色 focus 环，弹窗壳不需要 */
  outline: none;
}
</style>
