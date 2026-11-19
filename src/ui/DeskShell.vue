<template>
  <div ref="rootRef" class="desk-root" :class="{ 'is-arrange': arranging }" @contextmenu.prevent="deskMenu">
    <!-- 壁纸（桌面窗口层，不随滚动条变化） -->
    <div class="desk-wallpaper" :style="wallpaperStyle" />
    <div class="desk-wallpaper-mask" :style="maskStyle" />

    <!-- 唯一画布：卡片 / 时钟 / 工具组同坐标系 -->
    <div ref="scrollRef" class="desk-scroll">
      <div class="desk-canvas" :style="canvasStyle">
        <div v-if="arranging" class="gridlines" :style="{ backgroundSize: `${grid.unit}px ${grid.unit}px` }" />

        <div
          v-for="(inst, i) in desk.cards"
          :key="inst.uid"
          class="item"
          :class="{ 'desk-enter': enterOn, 'is-panel': panel(inst), 'is-dragging': drag?.index === i }"
          :style="itemStyle(inst)"
          @pointerdown="grab(i, $event)"
          @pointermove="onMove"
          @pointerup="endMove"
          @pointercancel="endMove"
        >
          <!-- 面板：时钟 / 工具组 -->
          <template v-if="panel(inst)">
            <div v-if="inst.cardId === PANEL_CLOCK" class="clock">
              <div class="time">{{ timeText }}</div>
              <div class="date"><span>{{ dateText }}</span><span class="dot">·</span><span>参考实现 卡片</span></div>
            </div>
            <div v-else class="tools">
              <button
                class="brand"
                type="button"
                aria-label="设置"
                @pointerdown.stop
                @click.stop="openSettings('wallpaper', $event)"
              >
                <svg viewBox="0 0 32 32" width="26" height="26"><use xlink:href="#iconDeskCards" /></svg>
              </button>
              <div class="actions">
                <button
                  class="btn ariaLabel"
                  data-position="north"
                  data-tooltip-encoding="none"
                  aria-label="设置"
                  @pointerdown.stop
                  @click.stop="openSettings('wallpaper', $event)"
                >
                  <Settings :size="16" :stroke-width="1.9" />
                </button>
                <button
                  class="btn ariaLabel"
                  data-position="north"
                  data-tooltip-encoding="none"
                  aria-label="添加卡片"
                  @pointerdown.stop
                  @click.stop="openSettings('library', $event)"
                >
                  <Plus :size="17" :stroke-width="2.1" />
                </button>
                <button
                  class="btn ariaLabel"
                  data-position="north"
                  data-tooltip-encoding="none"
                  :aria-label="arranging ? '完成整理' : '整理桌面'"
                  @pointerdown.stop
                  @click.stop="toggle()"
                >
                  <Check v-if="arranging" :size="16" :stroke-width="2.2" />
                  <LayoutGrid v-else :size="15" :stroke-width="1.9" />
                </button>
              </div>
            </div>
          </template>

          <!-- 普通卡片 -->
          <CardFrame
            v-else
            :inert="arranging || undefined"
            :card-id="inst.cardId"
            :size="label(inst)"
            :w="inst.w"
            :h="inst.h"
            @expand="(r) => expand(inst, r)"
            @remove="removeFromDesk(inst.uid)"
            @refresh="refreshKey++"
            @fullscreen="openFull(inst)"
          >
            <component :is="cardOf(inst.cardId)" :key="refreshKey" :size="label(inst)" :w="inst.w" :h="inst.h" />
          </CardFrame>

          <!-- 四边缩放：只在整理模式出现；到达尺寸上限/下限的那一侧变灰不可拖 -->
          <template v-if="arranging && !panel(inst)">
            <span
              v-for="e in EDGES"
              :key="e.id"
              :class="['edge', `is-${e.id}`, { 'is-off': !canResize(inst, e.id) }]"
              :aria-label="canResize(inst, e.id) ? `向${e.label}拉伸` : `已到尺寸边界`"
              @pointerdown.stop="canResize(inst, e.id) && grab(i, $event, e.id)"
              @pointermove="onMove"
              @pointerup="endMove"
              @pointercancel="endMove"
            >
              <component :is="e.icon" :size="14" :stroke-width="1.8" />
            </span>
            <span class="handle"><Move :size="18" :stroke-width="1.8" /></span>
          </template>
        </div>

      </div>

      <div v-if="!hasCards" class="empty">
        <p>桌面还是空的</p>
        <button class="desk-btn" @click="openSettings('library', $event)">添加第一张卡片</button>
      </div>
    </div>

    <!-- 全屏 -->
    <Teleport v-if="full.open" to="body">
      <div class="desk-full">
        <div class="desk-full-inner"><component :is="cardOf(full.cardId!)" :size="full.size" /></div>
        <GlassButton class="desk-full-close" :icon="Minimize2" label="退出全屏（Esc）" @click="full.open = false" />
      </div>
    </Teleport>

    <!-- 详情 -->
    <Sheet
      v-model:open="expanded.open"
      :origin="expanded.origin"
      :title="detailDef?.name"
      :icon="detailDef?.icon"
      :width="detailSize?.width || 'min(760px, 86vw)'"
      :height="detailSize?.height || 'min(560px, 78vh)'"
    >
      <template #actions>
        <GlassButton :icon="Maximize2" label="全屏" @click="fullFromDetail" />
      </template>
      <div v-if="expanded.open" class="desk-expanded desk-enter" :class="{ 'desk-pane is-solo': !detailDef?.detail }">
        <component :is="expanded.component" :key="expandKey" mode="detail" />
      </div>
    </Sheet>

    <SettingsSheet v-model:open="settingsOpen" :tab="settingsTab" :origin="settingsOrigin" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from "vue"
import { Check, LayoutGrid, Maximize2, Minimize2, Move, MoveHorizontal, MoveVertical, Plus, Settings } from "lucide-vue-next"
import { Menu } from "siyuan"
import { getCard, type CardSize } from "@/core/registry"
import { PANEL_CLOCK, desk, flowDesk, removeFromDesk, wallpaper } from "@/core/store"
import { useDeskGrid, normalizeRatios } from "./arrange"
import CardFrame from "./CardFrame.vue"
import GlassButton from "./primitives/GlassButton.vue"
import Sheet from "./Sheet.vue"
import SettingsSheet from "./SettingsSheet.vue"
import "@/styles/index.css"
import "@/ui/ui.css"

/** 四条边：图标与文案在同一张表里（都是 Move 家族，和中心手柄一致） */
const EDGES = [
  { id: "n", icon: MoveVertical, label: "上" },
  { id: "s", icon: MoveVertical, label: "下" },
  { id: "e", icon: MoveHorizontal, label: "右" },
  { id: "w", icon: MoveHorizontal, label: "左" },
] as const

/* 壁纸 */
const wallpaperStyle = computed(() => {
  const blur = wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined
  const transform = wallpaper.blur ? "scale(1.04)" : undefined
  if (wallpaper.type === "solid") return { background: wallpaper.value, filter: blur, transform }
  return { backgroundImage: `url(${wallpaper.resolved || wallpaper.value})`, filter: blur, transform }
})
const maskStyle = computed(() => ({ background: `rgba(4, 8, 16, ${wallpaper.mask})` }))

/* 时间 */
const now = ref(new Date())
let timer = 0
const timeText = computed(() => `${String(now.value.getHours()).padStart(2, "0")}:${String(now.value.getMinutes()).padStart(2, "0")}`)
const dateText = computed(() => `${now.value.getMonth() + 1}月${now.value.getDate()}日 星期${"日一二三四五六"[now.value.getDay()]}`)

/* 网格 */
const rootRef = ref<HTMLElement>()
const scrollRef = ref<HTMLElement>()
const viewport = ref(0)
/** 入场动效开关：失活一帧再激活 = 重放动画 */
const enterOn = ref(false)
let enterRaf = 0
function replayEnter() {
  enterOn.value = false
  cancelAnimationFrame(enterRaf)
  enterRaf = requestAnimationFrame(() => {
    enterRaf = requestAnimationFrame(() => (enterOn.value = true))
  })
}
const { arranging, grid, drag, grab, onMove, endMove, toggle } = useDeskGrid(viewport)

/* 底部多留一屏：滚到底不会贴住最后一张卡 */
const canvasStyle = computed(() => ({
  width: `${grid.value.width}px`,
  height: `${grid.value.height + grid.value.unit * 6}px`,
}))
const panel = (c: { cardId: string }) => c.cardId.startsWith("@")
const hasCards = computed(() => desk.cards.some((c) => !panel(c)))

function itemStyle(c: { x: number; y: number; w: number; h: number }) {
  const u = grid.value.unit
  return { left: `${c.x * u}px`, top: `${c.y * u}px`, width: `${c.w * u}px`, height: `${c.h * u}px` }
}

const label = (c: { w: number; h: number }) => `${c.w}x${c.h}` as CardSize
const cardOf = (id: string) => getCard(id)?.component



/* 详情 / 全屏 */
const expanded = ref<{ open: boolean; component?: Component; origin: DOMRect | null; cardId: string; size: CardSize | "" }>({ open: false, origin: null, cardId: "", size: "" })
const full = ref<{ open: boolean; component?: Component; cardId: string; size: CardSize | "" }>({ open: false, cardId: "", size: "" })
const refreshKey = ref(0)
/** 详情每次打开都换 key → 重新挂载，入场动效必定从“点开那一刻”开始 */
const expandKey = ref(0)
const detailDef = computed(() => getCard(expanded.value.cardId || ""))
const detailSize = computed(() => detailDef.value?.detailSize)

function openFull(inst: { cardId: string; w: number; h: number }) {
  const def = getCard(inst.cardId)
  if (!def) return
  full.value = { open: true, component: def.detail || def.component, cardId: inst.cardId, size: label(inst) }
  expanded.value.open = false
}

function expand(inst: { cardId: string; w: number; h: number }, origin?: DOMRect) {
  if (arranging.value) return
  const def = getCard(inst.cardId)
  expandKey.value += 1
  expanded.value = { open: true, component: def?.detail || def?.component, origin: origin || null, cardId: inst.cardId, size: label(inst) }
}

function fullFromDetail() {
  const { cardId, size } = expanded.value
  if (!cardId || !size) return
  expanded.value.open = false
  openFull({ cardId, size })
}

/* 设置 */
const settingsOpen = ref(false)
const settingsTab = ref("wallpaper")
const settingsOrigin = ref<DOMRect | null>(null)

/** 桌面空白处右键：添加卡片 / 设置 / 整理桌面（卡片自己的右键菜单已 stop，不会走到这里） */
function deskMenu(e: MouseEvent) {
  const menu = new Menu("desk-surface")
  menu.addItem({
    icon: "iconAdd",
    label: "添加卡片",
    click: () => openSettings("library"),
  })
  menu.addItem({
    icon: "iconSettings",
    label: "设置",
    click: () => openSettings("wallpaper"),
  })
  menu.addSeparator()
  menu.addItem({
    icon: "iconGrid",
    label: "一键整理",
    click: () => {
      normalizeRatios()
      flowDesk(grid.value.cols)
    },
  })
  menu.addItem({
    icon: "iconLayout",
    label: arranging.value ? "完成整理" : "整理桌面",
    click: () => toggle(),
  })
  menu.open({ x: e.clientX, y: e.clientY })
}

function openSettings(tab: "wallpaper" | "cards" | "library" | "about", e?: MouseEvent) {
  settingsOrigin.value = (e?.currentTarget as HTMLElement | null)?.getBoundingClientRect() ?? null
  settingsTab.value = tab
  settingsOpen.value = true
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return
  if (full.value.open) full.value.open = false
  else expanded.value.open = false
}

/* 视口测量：量滚动层可用宽（已扣滚动条），去抖后写入 */
let observer: ResizeObserver | null = null
let raf = 0

/**
 * 这一侧还能不能继续拉伸？
 *   带 constrain 的卡片按 min/max 判断；其它卡片按 1..16 判断。
 *   外扩方向（右/下）看有没有到上限，内收方向（左/上）看有没有到下限。
 */
function canResize(inst: { cardId: string; w: number; h: number }, edge: string) {
  const lim = getCard(inst.cardId)?.constrain
  const span = lim?.square ? inst.w : edge === "n" || edge === "s" ? inst.h : inst.w
  const outward = edge === "e" || edge === "s"
  return outward ? span < (lim?.max ?? 16) : span > (lim?.min ?? 1)
}

/** 视口宽度只读一次；之后的尺寸变化全部由 ResizeObserver 事件驱动，不轮询 */
let lastCols = 0

function measure() {
  const w = Math.round(scrollRef.value?.clientWidth ?? 0)
  if (!w) return
  if (Math.abs(w - viewport.value) > 2) viewport.value = w
  /* 列数没变就不动卡片坐标：避免无谓的响应式写入与落盘 */
  if (!enterOn.value) replayEnter()
  if (grid.value.cols !== lastCols) {
    lastCols = grid.value.cols
    /* 列数变了（开关侧栏、改窗口宽）→ 自动补位：卡片保持尺寸、按行重排 */
    normalizeRatios()
    flowDesk(lastCols)
  }
}

onMounted(() => {
  now.value = new Date()
  /* 对齐到整分钟再起 60s 定时器：唤醒次数从每 10 秒一次降到每分钟一次 */
  timer = window.setTimeout(() => {
    now.value = new Date()
    timer = window.setInterval(() => (now.value = new Date()), 60_000)
  }, 60_000 - (Date.now() % 60_000))
  document.addEventListener("keydown", onKey)
  measure()
  /* 窗口拖拽时 ResizeObserver 会连续回调：合并到每帧一次，避免重复重排 */
  /* 桌面进入视口时重播入场动效（切回标签页也能看到） */
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) replayEnter()
  })
  if (rootRef.value) io.observe(rootRef.value)

  observer = new ResizeObserver(() => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      measure()
    })
  })
  if (scrollRef.value) observer.observe(scrollRef.value)
})

onBeforeUnmount(() => {
  window.clearTimeout(timer)
  window.clearInterval(timer)
  io.disconnect()
  observer?.disconnect()
  observer = null
  if (raf) cancelAnimationFrame(raf)
  window.clearTimeout(measureTimer)
  document.removeEventListener("keydown", onKey)
})
</script>

<style scoped>
/* 滚动层：壁纸在它之外，滚动条不显示也不占位 */
.desk-scroll { position: absolute; inset: 0; overflow: auto; overflow-anchor: none; scrollbar-width: none; }
.desk-scroll::-webkit-scrollbar { width: 0; height: 0; }
.desk-canvas { position: relative; }
/* ── 物件：卡片 / 时钟 / 工具组同一落位 ── */
/* 位置变化交给 CSS 过渡：整理/补位变成滑动动画，JS 只负责写坐标 */
.item {
  position: absolute;
  min-width: 0;
  min-height: 0;
  contain: layout style;
  transition:
    left var(--desk-dur) var(--desk-ease-out),
    top var(--desk-dur) var(--desk-ease-out),
    width var(--desk-dur) var(--desk-ease-out),
    height var(--desk-dur) var(--desk-ease-out);
}

/* 手动拖动 / 整理模式下不要过渡，否则跟手会黏 */
.is-arrange .item,
.item.is-dragging { transition: none; }

.item.is-panel { overflow: visible; }
.is-arrange .item { cursor: grab; touch-action: none; user-select: none; }
.item.is-dragging { z-index: 5; cursor: grabbing; filter: drop-shadow(0 8px 20px rgb(0 0 0 / 28%)); }
.item.is-dragging :deep(.frame),
.item.is-dragging :deep(.frame *) { pointer-events: none; }
.item.is-panel { z-index: 6; }
.is-arrange .item.is-panel { outline: 1px dashed color-mix(in srgb, var(--desk-text) 55%, transparent); border-radius: var(--desk-r-xs); }
/* ── 参考线 ── */
/* 整理模式：一格一格的圆角方块（白色描边平铺，随单格等比缩放） */
.gridlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><rect x='1' y='1' width='38' height='38' rx='9' fill='none' stroke='rgba(255,255,255,0.30)' stroke-width='1.4'/></svg>");
  background-repeat: repeat;
}

/* 整理模式：壁纸压暗（只压壁纸，卡片照常） */
.is-arrange .desk-wallpaper::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 46%);
}
/* ── 缩放手柄 ── */
.edge {
  position: absolute;
  z-index: 6;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  /* 与全屏 / 更多同一套毛玻璃按钮：深色半透 + 高光描边 + 清透模糊 */
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 50%;
  background: rgb(20 22 28 / 34%);
  backdrop-filter: blur(var(--desk-blur-clear, 12px)) saturate(var(--desk-saturate, 1.4));
  -webkit-backdrop-filter: blur(var(--desk-blur-clear, 12px)) saturate(var(--desk-saturate, 1.4));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 2px 8px rgb(0 0 0 / 22%);
  color: rgb(255 255 255 / 92%);
  /* 默认隐藏：整理模式 + 悬停卡片才淡入（动效在 styles/index.css） */
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--desk-dur-fast) var(--desk-ease),
    background var(--desk-dur-fast) var(--desk-ease),
    transform var(--desk-dur-fast) var(--desk-ease);
}

/* 四条边：按钮居中压在边上 */
.edge.is-n { top: -12px; left: 50%; margin-left: -12px; cursor: ns-resize; }
.edge.is-s { bottom: -12px; left: 50%; margin-left: -12px; cursor: ns-resize; }
.edge.is-w { left: -12px; top: 50%; margin-top: -12px; cursor: ew-resize; }
.edge.is-e { right: -12px; top: 50%; margin-top: -12px; cursor: ew-resize; }

/* 整理模式：可交互（显隐由悬停动效控制） */
.is-arrange .edge { pointer-events: auto; }
/* 到边界的一侧：灰掉且不可点 */
.edge.is-off {
  opacity: 0.32;
  filter: grayscale(1);
  pointer-events: none;
  cursor: default;
}
.is-arrange .edge:hover { background: rgb(20 22 28 / 58%); transform: scale(1.1); }
.is-arrange .edge:active { transform: scale(0.94); }

.handle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  z-index: 7;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  background: rgb(0 0 0 / 38%);
  opacity: 0;
  transition:
    opacity var(--desk-dur-fast) var(--desk-ease),
    transform var(--desk-dur-fast) var(--desk-ease);
  pointer-events: none;
}

/* 悬停卡片：手柄淡入并回弹到原尺寸 */
.item:hover .handle {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

/* ── 时钟 ── */
.clock { container-type: size; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; color: #fff; text-align: center; text-shadow: 0 4px 24px rgb(0 0 0 / 42%); }
.time { font-size: clamp(40px, 40cqh, 130px); font-weight: 300; line-height: 1; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.date { display: flex; gap: 0.5em; margin-top: clamp(6px, 6cqh, 18px); font-size: clamp(12px, 8cqh, 26px); color: rgb(255 255 255 / 78%); }
.dot { opacity: 0.4; }
/* ── 工具组：收起只剩大图标，悬停/整理向左展开 ── */
/* 工具组：所有按钮同一尺寸，收缩/展开只改可见性，几何不可能被拉伸 */
/* 工具组：品牌图标常驻不动；悬停/整理时三枚小按钮出现在它左侧 */
.tools { position: relative; display: grid; place-items: center; width: 100%; height: 100%; --tool: 44px; --mini: 30px; }
.brand {
  display: grid;
  place-items: center;
  width: var(--tool);
  height: var(--tool);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(255 255 255 / 72%);
  cursor: pointer;
}
.brand:hover { color: #fff; background: rgb(15 23 42 / 22%); }
.brand svg { fill: currentColor; stroke: none; }
.actions { position: absolute; top: 50%; right: calc(var(--tool) + 6px); display: none; width: max-content; transform: translateY(-50%); gap: var(--desk-sp-1); }
.tools:hover .actions, .is-arrange .actions { display: flex; }
.btn { flex: none; width: var(--mini); height: var(--mini); display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; color: rgb(255 255 255 / 66%); cursor: pointer; transition: color var(--desk-dur-fast) var(--desk-ease), background var(--desk-dur-fast) var(--desk-ease); }
.btn:hover { color: #fff; background: rgb(15 23 42 / 26%); }
.btn svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.btn svg { width: 62%; height: 62%; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
/* ── 空态 ── */
.empty { padding: 40px 20px 80px; text-align: center; color: rgb(255 255 255 / 70%); }
</style>
