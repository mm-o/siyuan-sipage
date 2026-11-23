<template>
  <article
    ref="frameRef"
    class="frame desk-surface"
    :class="[`is-${tier}`, { 'is-big': big, 'is-solid': solid }]"
    @click.stop="onClick"
    @contextmenu.prevent.stop="openMenu($event)"
  >
    <!-- 内容铺满整张卡片（无标题栏） -->
    <div class="body">
      <slot />
    </div>

    <!-- 悬浮控件：全屏 / 更多，按注册表开关决定是否渲染（hover 才出现） -->
    <GlassButton v-if="can.full" class="fs" :icon="Maximize2" label="全屏" :tone="solid ? 'auto' : 'photo'" @click.stop="emit('fullscreen')" />
    <GlassButton v-if="can.menu" class="more" :icon="MoreHorizontal" label="更多" :tone="solid ? 'auto' : 'photo'" @click.stop="openMenu" />
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
import { getCard } from "@/core/registry"

/** preview=true 时只做静态展示（设置里的卡片预览用），不渲染悬浮控件、不弹菜单 */
const props = defineProps<{ cardId: string; w: number; h: number; preview?: boolean }>()

const emit = defineEmits<{
  expand: [DOMRect]
  refresh: []
  remove: []
  /** 全屏（框架能力：任何卡片都能放大到整屏，卡片自己不用实现） */
  fullscreen: []
}>()

const def = computed(() => getCard(props.cardId))
/**
 * 形状档：宽高比决定 wide / tall / square，面积 ≤2 格算 mini。
 * 只此一处，不再单开一个 sizes 模块。
 */
const tier = computed(() => {
  const { w, h } = props
  if (w * h <= 2) return "mini"
  const ratio = w / h
  if (ratio >= 1.6) return "wide"
  if (ratio <= 0.625) return "tall"
  return "square"
})
const big = computed(() => props.w * props.h >= 8)
/** 信息卡使用较厚的玻璃面，保留文字对比度。 */
const solid = computed(() => def.value?.surface === "solid")
/** 控件开关：注册表没写就当全开。 */
const can = computed(() => ({
  expand: !props.preview && def.value?.controls?.expand !== false,
  menu: !props.preview && def.value?.controls?.menu !== false,
  full: !props.preview && def.value?.controls?.full !== false,
}))
const frameRef = ref<HTMLElement>()

const rect = (): DOMRect | undefined => frameRef.value?.getBoundingClientRect()

function onClick() {
  if (!can.value.expand) return
  emit("expand", rect() as DOMRect)
}

/** 右键与「⋯」共用一套菜单：打开 / 刷新 / 移除（尺寸改由整理模式拖动） */
function openMenu(e: MouseEvent) {
  if (props.preview) return
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
  --dg-surface-radius: var(--desk-r-card);
  --dg-surface-fill: var(--dg-card-fill);
  --dg-surface-blur: var(--desk-blur-regular);
  --dg-surface-shadow: 0 6px 18px rgb(12 28 48 / calc(var(--desk-card-shadow, .34) * .5));
}

.body {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
}

/* 信息卡使用同一材质的高可读变体。 */
.frame.is-solid { --dg-surface-fill: var(--dg-card-regular); }

/* 框架约定：卡槽里的卡片必须铺满（第三方/搬来的卡片常忘记写 100%） */
.body > * {
  width: 100%;
  height: 100%;
}

/* 更多：默认隐形，hover/键盘聚焦出现（外观由 GlassButton 提供） */
.more,
.fs {
  position: absolute;
  top: var(--desk-sp-2);
  z-index: 2;
  opacity: 0;
  transition: opacity var(--desk-dur) var(--desk-ease);
}
.more { right: var(--desk-sp-2); }
.fs { left: var(--desk-sp-2); }

.frame:hover .more,
.frame:hover .fs,
.more:focus-visible,
.fs:focus-visible {
  opacity: 0.92;
}

</style>
