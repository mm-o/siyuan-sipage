<template>
  <div ref="rootRef" class="desk-root" :class="{ 'is-arrange': arranging, 'is-manipulating': !!drag }" @contextmenu.prevent="deskMenu">
    <!-- 壁纸（桌面窗口层，不随滚动条变化） -->
    <div class="desk-wallpaper" :style="wallpaperStyle" />
    <div class="desk-wallpaper-mask" :style="maskStyle" />
    <div class="arrange-veil" aria-hidden="true" />

    <!-- 唯一画布：卡片 / 时钟 / 工具组同坐标系 -->
    <div ref="scrollRef" class="desk-scroll">
      <div class="desk-canvas" :style="canvasStyle">
        <Transition name="desk-fade">
          <div v-if="arranging" class="gridlines" :style="{ '--arrange-unit': `${grid.unit}px` }" aria-hidden="true" />
        </Transition>
        <div v-if="drag" class="arrange-origin" :style="originStyle" aria-hidden="true" />

        <div
          v-for="(inst, i) in desk.cards"
          :key="inst.uid"
          class="item"
          :class="{ 'desk-enter': enterOn && !arranging, 'is-panel': panel(inst), 'is-dragging': drag?.index === i }"
          :style="itemStyle(inst)"
          :tabindex="arranging ? 0 : undefined"
          :role="arranging ? 'group' : undefined"
          :aria-label="arranging ? `${itemName(inst)}，${inst.w} 列 ${inst.h} 行。方向键移动，Shift 加方向键调整尺寸` : undefined"
          @keydown="arrangeKey(i, $event)"
          @pointerdown="grab(i, $event)"
          @pointermove="onMove"
          @pointerup="endMove"
          @pointercancel="endMove"
        >
          <!-- 面板：时钟 / 工具组 -->
          <template v-if="panel(inst)">
            <DeskClock v-if="inst.cardId === PANEL_CLOCK" />
            <div v-else class="tools">
              <button
                class="brand gb on-photo"
                type="button"
                aria-label="设置"
                @pointerdown.stop
                @click.stop="openSettings('wallpaper', $event)"
              >
                <span class="gb-lens" aria-hidden="true" />
                <svg viewBox="0 0 32 32" width="26" height="26"><use xlink:href="#iconDeskCards" /></svg>
              </button>
              <div class="actions">
                <GlassButton :icon="Settings" label="设置" tone="photo" @pointerdown.stop @click.stop="openSettings('wallpaper', $event)" />
                <GlassButton :icon="Plus" label="添加卡片" tone="photo" @pointerdown.stop @click.stop="openSettings('library', $event)" />
                <GlassButton :icon="arranging ? Check : LayoutGrid" :label="arranging ? '完成整理' : '整理桌面'" tone="photo" @pointerdown.stop @click.stop="toggle()" />
              </div>
            </div>
          </template>

          <!-- 普通卡片 -->
          <CardFrame
            v-else
            :inert="arranging || undefined"
            :card-id="inst.cardId"
            :w="inst.w"
            :h="inst.h"
            @expand="(r) => expand(inst, r)"
            @remove="removeFromDesk(inst.uid)"
            @refresh="refreshKey++"
            @fullscreen="openFull(inst)"
          >
            <component :is="cardOf(inst.cardId)" :key="refreshKey" :size="label(inst)" :w="inst.w" :h="inst.h" />
          </CardFrame>

          <!-- 四边缩放：只在整理模式出现。到边界的手柄只变淡（仍可抓着往回收），夹取在 arrange.ts 里做 -->
          <template v-if="arranging && !panel(inst)">
            <GlassButton
              v-for="e in EDGES"
              :key="e.id"
              :icon="e.icon"
              :class="['edge', `is-${e.id}`, { 'is-off': !canResize(inst, e.id) }]"
              :label="`调整${itemName(inst)}${e.label}边尺寸`"
              @pointerdown.stop="grab(i, $event, e.id)"
              @pointermove.stop="onMove"
              @pointerup.stop="endMove"
              @pointercancel.stop="endMove"
              @keydown.stop="resizeKey(i, e.id, $event)"
            />
            <span class="handle" aria-hidden="true"><Move :size="16" :stroke-width="1.8" /></span>
          </template>
          <span v-if="arranging" class="arrange-caption" aria-hidden="true">{{ itemName(inst) }}<span>{{ inst.w }} × {{ inst.h }}</span></span>
        </div>

      </div>

      <div v-if="!cardCount" class="empty">
        <p>桌面还是空的</p>
        <GlassButton text variant="primary" :icon="Plus" label="添加第一张卡片" @click="openSettings('library', $event)" />
      </div>
    </div>

    <Transition name="arrange-bar">
      <div v-if="arranging" class="arrange-toolbar" role="toolbar" aria-label="整理桌面" @pointerdown.stop @contextmenu.stop.prevent>
        <div class="arrange-toolbar-info">
          <LayoutGrid :size="18" :stroke-width="1.8" aria-hidden="true" />
          <div>
            <strong>整理桌面<span class="arrange-count">{{ cardCount }} 张卡片</span></strong>
            <span class="arrange-hint" role="status" aria-live="polite">{{ arrangeHint }}</span>
          </div>
        </div>
        <div class="arrange-toolbar-actions">
          <GlassButton class="arrange-action" text :icon="LayoutGrid" label="一键整理" :disabled="!!drag" @click="tidyDesk" />
          <GlassButton class="arrange-action" text variant="primary" :icon="Check" label="完成" @click="toggle(false)" />
        </div>
      </div>
    </Transition>

    <!-- 全屏 -->
    <Teleport v-if="full.open" to="body">
      <div class="desk-full">
        <div class="desk-full-inner"><component :is="cardOf(full.cardId!)" :size="full.size" /></div>
        <GlassButton class="desk-full-close" :icon="Minimize2" label="退出全屏（Esc）" @click="full.open = false" />
      </div>
    </Teleport>

    <!-- 详情：每张卡一个弹窗；钉住的留在原地，可以同时钉住多个 -->
    <Sheet
      v-for="s in sheets"
      :key="s.key"
      v-model:open="s.open"
      v-model:pinned="s.pinned"
      :origin="s.origin"
      :title="defOf(s)?.name"
      :icon="defOf(s)?.icon"
      :width="sizeOf(s)?.width || 'min(760px, 86vw)'"
      :height="sizeOf(s)?.height || 'min(560px, 78vh)'"
    >
      <template #actions>
        <GlassButton :icon="Maximize2" label="全屏" @click="fullFromDetail(s)" />
      </template>
      <div v-if="s.open" class="desk-expanded desk-enter" :class="{ 'desk-pane is-solo': !defOf(s)?.detail }">
        <component :is="defOf(s)?.detail || defOf(s)?.component" :key="`${s.key}-${s.cardId}`" mode="detail" />
      </div>
    </Sheet>

    <SettingsSheet v-model:open="settingsOpen" :tab="settingsTab" :origin="settingsOrigin" />
  </div>
</template>

<script setup lang="ts">
import { GlassButton, toast } from "@/ui/controls"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { Check, LayoutGrid, Maximize2, Minimize2, Move, MoveHorizontal, MoveVertical, Plus, Settings } from "lucide-vue-next"
import { Menu } from "siyuan"
import { getCard, type CardSize } from "@/core/registry"
import { PANEL_CLOCK, desk, favoriteWallpaper, flowDesk, removeFromDesk, wallpaper } from "@/core/store"
import { wallpaperBg } from "@/core/image"
import { useDeskGrid, normalizeSizes } from "./arrange"
import DeskClock from "./DeskClock.vue"
import CardFrame from "./CardFrame.vue"
import Sheet from "./Sheet.vue"
import SettingsSheet from "./SettingsSheet.vue"

/** 四条边：图标与文案在同一张表里（都是 Move 家族，和中心手柄一致） */
const EDGES = [
  { id: "n", icon: MoveVertical, label: "上" },
  { id: "s", icon: MoveVertical, label: "下" },
  { id: "e", icon: MoveHorizontal, label: "右" },
  { id: "w", icon: MoveHorizontal, label: "左" },
] as const

/* 壁纸：三种形态（图片 / 纯色 / 跟随思源）由 wallpaperBg 统一给出 */
const wallpaperStyle = computed(() => ({
  ...wallpaperBg(wallpaper),
  filter: wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined,
  transform: wallpaper.blur ? "scale(1.04)" : undefined,
}))
const maskStyle = computed(() => ({ background: `rgba(4, 8, 16, ${wallpaper.mask})` }))

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
const { arranging, grid, drag, grab, onMove, endMove, toggle, arrangeKey, resizeKey } = useDeskGrid(viewport)

/* 底部多留一屏：滚到底不会贴住最后一张卡 */
const canvasStyle = computed(() => ({
  width: `${grid.value.width}px`,
  height: `${grid.value.height + grid.value.unit * 6}px`,
}))
const panel = (c: { cardId: string }) => c.cardId.startsWith("@")
const cardCount = computed(() => desk.cards.filter((c) => !panel(c)).length)
const itemName = (c: { cardId: string }) => c.cardId === PANEL_CLOCK ? "桌面时钟" : panel(c) ? "桌面工具" : getCard(c.cardId)?.name || "卡片"
const arrangeFeedback = ref("")
let feedbackTimer = 0
const arrangeHint = computed(() => {
  const active = drag.value && desk.cards[drag.value.index]
  return active ? `${drag.value?.resize ? '调整尺寸' : '移动'} · ${itemName(active)} · ${active.w} × ${active.h}` : arrangeFeedback.value || "拖动卡片移动 · 拖动边缘缩放 · Esc 完成"
})
const originStyle = computed(() => {
  const d = drag.value
  return d ? itemStyle({ x: d.bx, y: d.by, w: d.bw, h: d.bh }) : {}
})

function tidyDesk() {
  endMove()
  normalizeSizes()
  flowDesk(grid.value.cols)
  const message = `已整理 ${cardCount.value} 张卡片`
  if (arranging.value) {
    arrangeFeedback.value = message
    window.clearTimeout(feedbackTimer)
    feedbackTimer = window.setTimeout(() => (arrangeFeedback.value = ""), 2200)
  } else toast(message)
}

function itemStyle(c: { x: number; y: number; w: number; h: number }) {
  const u = grid.value.unit
  return { left: `${c.x * u}px`, top: `${c.y * u}px`, width: `${c.w * u}px`, height: `${c.h * u}px` }
}

const label = (c: { w: number; h: number }) => `${c.w}x${c.h}` as CardSize
const cardOf = (id: string) => getCard(id)?.component



/* 详情 / 全屏：每张卡一个独立弹窗。钉住的那个不被顶替，可以同时钉住多个。 */
interface DetailSheet {
  key: number
  cardId: string
  origin: DOMRect | null
  size: CardSize | ""
  open: boolean
  pinned: boolean
}
const sheets = ref<DetailSheet[]>([])
let sheetSeq = 0

const full = ref<{ open: boolean; cardId: string; size: CardSize | "" }>({ open: false, cardId: "", size: "" })
const refreshKey = ref(0)
const defOf = (s: DetailSheet) => getCard(s.cardId)
const sizeOf = (s: DetailSheet) => defOf(s)?.detailSize

const dropSheet = (s: DetailSheet) => { sheets.value = sheets.value.filter((item) => item !== s) }

function openFull(inst: { cardId: string; w: number; h: number }) {
  if (!getCard(inst.cardId)) return
  full.value = { open: true, cardId: inst.cardId, size: label(inst) }
  sheets.value = sheets.value.filter((s) => s.cardId !== inst.cardId)
}

function expand(inst: { cardId: string; w: number; h: number }, origin?: DOMRect) {
  if (arranging.value || !getCard(inst.cardId)) return
  /* 先清掉上一轮关掉的：只有还开着的弹窗参与下面两条判断。 */
  sheets.value = sheets.value.filter((s) => s.open)
  const same = sheets.value.find((s) => s.cardId === inst.cardId)
  if (same) {
    same.origin = origin || null
    same.size = label(inst)
    return
  }
  /* 只顶替未钉住的那一个；钉住的一个都不动，于是可以同时留多个。 */
  const spare = sheets.value.find((s) => !s.pinned)
  if (spare) Object.assign(spare, { cardId: inst.cardId, origin: origin || null, size: label(inst) })
  else sheets.value.push({ key: ++sheetSeq, cardId: inst.cardId, origin: origin || null, size: label(inst), open: true, pinned: false })
}

function fullFromDetail(s: DetailSheet) {
  full.value = { open: true, cardId: s.cardId, size: s.size }
  dropSheet(s)
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
  if (wallpaper.type !== "theme" && wallpaper.type !== "solid") {
    menu.addItem({
      icon: "iconImage",
      label: "收藏当前壁纸",
      click: async () => {
        try {
          toast((await favoriteWallpaper()) ? "已收藏到思源 public" : "当前壁纸没有图片可收藏")
        } catch (err) {
          toast(`收藏失败：${(err as Error)?.message || "未知"}`)
        }
      },
    })
  }
  menu.addSeparator()
  menu.addItem({
    icon: "iconLayoutGrid",
    label: "一键整理",
    click: tidyDesk,
  })
  menu.addItem({
    icon: "iconLayout",
    label: arranging.value ? "完成整理" : "整理桌面",
    click: () => toggle(),
  })
  menu.open({ x: e.clientX, y: e.clientY })
}

function openSettings(tab: "wallpaper" | "cards" | "about" | "library", e?: MouseEvent) {
  settingsOrigin.value = (e?.currentTarget as HTMLElement | null)?.getBoundingClientRect() ?? null
  settingsTab.value = tab
  settingsOpen.value = true
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || e.defaultPrevented) return
  /* 下拉弹层开着时，Esc 只关闭它自己。 */
  if (document.querySelector(".desk-pop")) return
  if (full.value.open) full.value.open = false
  else if (!settingsOpen.value && arranging.value) {
    toggle(false)
    e.preventDefault()
    e.stopPropagation()
  }
}

/* 视口测量：量滚动层可用宽（已扣滚动条），去抖后写入 */
let observer: ResizeObserver | null = null
/** 卡片可见性观察（入场动效重播） */
let io: IntersectionObserver
let raf = 0

/**
 * 这一侧到没到边界？只用于手柄变淡与提示文案（夹取在 arrange.ts 里做）。
 */
function canResize(inst: { cardId: string; w: number; h: number }, edge: string) {
  const lim = getCard(inst.cardId)?.constrain
  const span = edge === "n" || edge === "s" ? inst.h : inst.w
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
    normalizeSizes()
    flowDesk(lastCols)
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKey)
  measure()
  /* 窗口拖拽时 ResizeObserver 会连续回调：合并到每帧一次，避免重复重排 */
  /* 桌面进入视口时重播入场动效（切回标签页也能看到） */
  io = new IntersectionObserver((entries) => {
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
  cancelAnimationFrame(enterRaf)
  io.disconnect()
  observer?.disconnect()
  observer = null
  if (raf) cancelAnimationFrame(raf)
  window.clearTimeout(feedbackTimer)
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

/* 整理模式的材质、网格与操作控件统一由 styles/index.css 提供。 */
.item.is-panel { overflow: visible; z-index: 6; }
.item.is-dragging :deep(.frame),
.item.is-dragging :deep(.frame *) { pointer-events: none; }

/* 工具组：品牌标常驻，悬停时向左展开操作按钮。 */
.tools { position: relative; display: grid; place-items: center; width: 100%; height: 100%; --tool: 44px; --mini: 30px; }
.brand { width: var(--tool); height: var(--tool); }
.brand svg { fill: currentColor; stroke: none; }
.actions { position: absolute; top: 50%; right: calc(var(--tool) + 6px); display: none; width: max-content; transform: translateY(-50%); gap: var(--desk-sp-1); }
.tools:hover .actions, .tools:focus-within .actions { display: flex; }
/* ── 空态 ── */
.empty { padding: 40px 20px 80px; text-align: center; color: rgb(255 255 255 / 70%); }
</style>
