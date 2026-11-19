<template>
  <Teleport to="body">
    <Transition name="desk-fade" appear>
      <div v-if="open" class="desk-sheet-mask" :class="{ 'is-pinned': pinned }" @mousedown.self="onMaskDown">
        <section
          v-if="open"
          ref="panelRef"
          class="desk-sheet desk-enter"
          :class="{ 'is-pinned': pinned }"
          :style="panelStyle"
          role="dialog"
          aria-modal="true"
        >
          <!-- 顶部标题栏：图标 + 标题 + 右侧动作（钉住 / 全屏 / 关闭），自己一块 pane -->
          <header class="desk-sheet-head desk-pane is-top">
            <span v-if="icon" class="desk-sheet-head-icon">
              <component :is="icon" :size="18" :stroke-width="1.8" />
            </span>
            <strong class="desk-sheet-head-title">{{ title }}</strong>
            <div class="desk-sheet-actions">
              <GlassButton
                :icon="pinned ? PinOff : Pin"
                :label="pinned ? '取消钉住' : '钉住（看到背景）'"
                :active="pinned"
                @click="pinned = !pinned"
              />
              <slot name="actions" />
              <GlassButton class="desk-sheet-close" :icon="X" :label="closeTitle" @click="close" />
            </div>
          </header>

          <div class="desk-sheet-body desk-enter">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="desk-sheet-foot">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 统一弹层（Sheet）—— 详情、设置、卡片库共用这一套
 *
 * 一套结构：一块玻璃面 + 右上角动作行（调用方的动作 + 关闭键，同一个 GlassButton）+ 内容自己排版。
 * 没有「标题栏」这种东西：标题属于内容（设置写在左栏顶部，详情由卡片自己给），
 * 否则弹窗就会出现两种长相。
 *
 * 一套展开方式：传入 origin（触发元素的矩形）后，面板从触发点放大到居中，
 * 关闭时缩回原处。实现用 Web Animations API，避免和 Vue 过渡打架。
 */
import { GlassButton } from "@/ui/controls"
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from "vue"
import { Pin, PinOff, X } from "lucide-vue-next"

const props = withDefaults(
  defineProps<{
    open: boolean
    width?: string | number
    height?: string | number
    closeTitle?: string
    maskClosable?: boolean
    /** 顶部标题栏文案与图标（所有弹窗统一有标题栏） */
    title?: string
    icon?: Component
    /** 触发元素的原位矩形，用于 FLIP 放大/缩回 */
    origin?: DOMRect | null
  }>(),
  { closeTitle: "关闭", maskClosable: true },
)

const emit = defineEmits<{ "update:open": [boolean]; closed: [] }>()

const panelRef = ref<HTMLElement>()
const closing = ref(false)
/** 钉住：遮罩不再压暗/模糊（能看清背景），点遮罩也不关 */
const pinned = ref(false)

watch(
  () => props.open,
  (v) => {
    if (!v) pinned.value = false
  },
)

const panelStyle = computed(() => {
  const w = typeof props.width === "number" ? `${props.width}px` : props.width || "min(920px, 90vw)"
  const h = typeof props.height === "number" ? `${props.height}px` : props.height || "min(620px, 82vh)"
  return { width: w, height: h }
})

/** 从触发元素矩形算出的起始变换 */
function flipFrom(origin: DOMRect, panel: DOMRect) {
  const sx = origin.width / panel.width
  const sy = origin.height / panel.height
  const dx = origin.left + origin.width / 2 - (panel.left + panel.width / 2)
  const dy = origin.top + origin.height / 2 - (panel.top + panel.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
}

async function playOpen() {
  if (!props.origin) return
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
  if (props.origin && panel) {
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
  emit("update:open", false)
  emit("closed")
}

function onMaskDown() {
  if (props.maskClosable && !pinned.value) void close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) {
    e.stopPropagation()
    void close()
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      document.addEventListener("keydown", onKeydown, true)
      void playOpen()
    } else {
      document.removeEventListener("keydown", onKeydown, true)
    }
  },
)

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
  background: rgb(2 6 23 / 42%);
  backdrop-filter: blur(8px) saturate(120%);
  transition:
    background var(--desk-dur) var(--desk-ease),
    backdrop-filter var(--desk-dur) var(--desk-ease);
}

/* 钉住：外部不再压暗、不再模糊，弹窗保持打开（点遮罩也不关） */
.desk-sheet-mask.is-pinned {
  background: transparent;
  backdrop-filter: none;
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
  border-bottom: 1px solid var(--desk-stroke);
}

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

.desk-sheet-foot {
  flex: 0 0 auto;
  padding: var(--desk-sp-2h) 14px;
  border-top: 1px solid var(--b3-border-color, rgb(60 60 67 / 12%));
  display: flex;
  justify-content: flex-end;
  gap: var(--desk-sp-2);
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
}
</style>
