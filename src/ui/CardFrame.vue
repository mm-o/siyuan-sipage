<template>
  <article
    ref="frameRef"
    class="frame"
    :class="[`is-${tier}`, { 'is-big': big, pressed, 'is-solid': solid }]"
    @mousedown="pressed = true"
    @mouseup="pressed = false"
    @mouseleave="pressed = false"
    @click="onClick"
    @contextmenu.prevent.stop="openMenu($event)"
  >
    <!-- 内容铺满整张卡片（无标题栏） -->
    <div class="body">
      <slot />
    </div>

    <!-- 悬浮控件：全屏 / 更多，按注册表开关决定是否渲染（hover 才出现） -->
    <GlassButton v-if="can.full" class="fs" :icon="Maximize2" label="全屏" @click="emit('fullscreen')" />
    <GlassButton v-if="can.menu" class="more" :icon="MoreHorizontal" label="更多" @click="openMenu" />
  </article>
</template>

<script setup lang="ts">
/**
 * 卡片外框（无标题栏）
 *
 * 设计要点（apple-design-skill）：
 *   - 「内容优先」：卡片本身就是内容，不加标题栏（HIG 的 widget 惯例）
 *   - 控件克制：只留一个 hover 出现的「⋯」，命中区 28pt（liquid-glass.md）
 *   - 材质统一：圆角/模糊/不透明度/阴影全部来自 CSS 变量（styles/index.css）
 *   - 菜单直接用思源原生 Menu：样式、图标、键盘、点外关闭全部跟思源一致，
 *     也不会有「图标被思源全局 svg{fill:currentColor} 填实」的问题（自绘菜单会被 Teleport 到 body 之外）。
 */
import { GlassButton } from "@/ui/controls"
import { computed, ref } from "vue"
import { Maximize2, MoreHorizontal } from "lucide-vue-next"
import { Menu } from "siyuan"
import { getCard, type CardSize } from "@/core/registry"
import { isBig, sizeTier } from "@/ui/sizes"

const props = defineProps<{ cardId: string; size: string; w: number; h: number }>()

const emit = defineEmits<{
  expand: [DOMRect]
  refresh: []
  remove: []
  /** 全屏（框架能力：任何卡片都能放大到整屏，卡片自己不用实现） */
  fullscreen: []
}>()

const def = getCard(props.cardId)
/** 形状档（卡片靠它切版式，任何拖拽尺寸都能命中） */
const tier = computed(() => sizeTier(props.w, props.h))
const big = computed(() => isBig(props.w, props.h))
/** 纯色面：信息型卡片（日历）对齐 参考实现 的白卡，不吃外观里的不透明度 */
const solid = def?.surface === "solid"
/** 控件开关：注册表没写就当全开 */
const can = {
  expand: def?.controls?.expand !== false,
  menu: def?.controls?.menu !== false,
  full: def?.controls?.full !== false,
}
const pressed = ref(false)
const frameRef = ref<HTMLElement>()

const rect = (): DOMRect | undefined => frameRef.value?.getBoundingClientRect()

function onClick() {
  if (!can.expand) return
  emit("expand", rect() as DOMRect)
}

/** 右键与「⋯」共用一套菜单：打开 / 刷新 / 移除（尺寸改由整理模式拖动） */
function openMenu(e: MouseEvent) {
  const menu = new Menu("desk-card")
  menu.addItem({ icon: "iconOpen", label: "打开", click: () => emit("expand", rect() as DOMRect) })
  menu.addItem({ icon: "iconRefresh", label: "刷新", click: () => emit("refresh") })
  menu.addSeparator()
  menu.addItem({ icon: "iconTrashcan", label: "移除", click: () => emit("remove") })

  // 「⋯」是按钮触发，鼠标没动过时 clientX/Y 为 0，落到按钮左下角
  menu.open(e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : anchorOf(e.currentTarget))
}

function anchorOf(target: EventTarget | null) {
  const r = (target as HTMLElement | null)?.getBoundingClientRect?.()
  return r ? { x: Math.round(r.left), y: Math.round(r.bottom) + 4 } : { x: 200, y: 200 }
}
</script>

<style scoped>
.frame {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  cursor: pointer;
  border-radius: var(--desk-r-card, 16px);
  background: color-mix(in srgb, var(--desk-glass-fill) calc(var(--desk-card-opacity, 0.62) * 100%), transparent);
  backdrop-filter: blur(var(--desk-blur-regular, 24px)) saturate(var(--desk-saturate, 1.4));
  -webkit-backdrop-filter: blur(var(--desk-blur-regular, 24px)) saturate(var(--desk-saturate, 1.4));
  border: 1px solid var(--desk-stroke);
  box-shadow: 0 10px 30px rgb(0 0 0 / var(--desk-card-shadow, 0.34));
}

.body {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
}

/* 纯色面（surface: "solid"）：不透明、不模糊，阴影换成 参考实现 的轻投影
   —— 白卡压在壁纸上靠的是细边和浅影，不是玻璃。 */
.frame.is-solid {
  background: var(--desk-surface);
  border-color: var(--desk-surface-stroke);
  box-shadow: var(--desk-surface-shadow);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* 框架约定：卡槽里的卡片必须铺满（第三方/搬来的卡片常忘记写 100%） */
.body > * {
  width: 100%;
  height: 100%;
}

/* 更多：默认隐形，hover/键盘聚焦出现（外观由 GlassButton 提供） */
.more {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  opacity: 0;
  transition: opacity var(--desk-dur) var(--desk-ease);
}

/* 全屏：左上角，和「更多」成对角 */
.fs {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  opacity: 0;
  transition: opacity var(--desk-dur) var(--desk-ease);
}

.frame:hover .more,
.frame:hover .fs,
.more:focus-visible,
.fs:focus-visible {
  opacity: 0.92;
}

/* 纯色面上的两个按钮：默认那层 32% 黑在纯色底上会糊掉，换成按材质给的一层 */
.frame.is-solid .more,
.frame.is-solid .fs {
  border-color: var(--desk-surface-ctl-stroke);
  background: var(--desk-surface-ctl);
}
</style>
