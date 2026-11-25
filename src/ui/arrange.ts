import { computed, ref, type Ref } from "vue"
import { getCard, type CardConstrain } from "@/core/registry"
import { PANEL_TOOLS, appearance, computeGrid, desk, setDeskDims } from "@/core/store"

type Edge = "n" | "s" | "e" | "w"

interface Drag {
  index: number
  resize: Edge | null
  /** 起始指针位置 */
  sx: number
  sy: number
  /** 起始格坐标与尺寸 */
  bx: number
  by: number
  bw: number
  bh: number
}

/**
 * 尺寸约束的唯一实现：谁改尺寸都过这一关（拖动 / 整理 / 补位）
 *
 *   step   → 段落式：落到 step 的倍数上（5×5 直接跳成 6×6）
 *   min/max→ 边长夹取
 */
export function fitDims(lim: CardConstrain | undefined, w: number, h: number) {
  const min = lim?.min ?? 1
  const max = lim?.max ?? 16
  const step = lim?.step || 1
  const fit = (n: number) => Math.min(max, Math.max(min, step, Math.round(n / step) * step))
  return { w: fit(w), h: fit(h) }
}

/**
 * 整理时把每张卡按它自己的段落/范围归位（修好历史遗留的越界或半格尺寸）。
 */
export function normalizeSizes() {
  for (const card of desk.cards) {
    const lim = getCard(card.cardId)?.constrain
    if (!lim) continue
    const next = fitDims(lim, card.w, card.h)
    if (next.w !== card.w || next.h !== card.h) {
      card.w = next.w
      card.h = next.h
    }
  }
}

/**
 * 桌面拖拽的唯一实现。
 *
 * 几何（列数 / 单格）只由「视口宽 + 目标单格」决定，与卡片内容、拖拽过程无关，
 * 所以拖动不会触发重排，不存在任何反馈回路。
 *
 * 干涉：吸附整格；x 钳在 [0, cols−w]、y ≥ 0；允许重叠、允许堆叠（不做任何避让）。
 */
export function useDeskGrid(viewport: Ref<number>) {
  const arranging = ref(false)
  const grid = computed(() => computeGrid(desk.cards, viewport.value, appearance.cell))
  const drag = ref<Drag | null>(null)

  function grab(index: number, e: PointerEvent, resize: Edge | null = null) {
    if (!arranging.value || e.button !== 0 || !e.isPrimary || drag.value) return
    const card = desk.cards[index]
    if (!card) return
    /* 一旦手动拖动/缩放，位置就交还给用户（面板不再自动居中 / 靠右） */
    if (card.auto) card.auto = false
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.value = {
      index,
      resize,
      sx: e.clientX,
      sy: e.clientY,
      bx: card.x,
      by: card.y,
      bw: card.w,
      bh: card.h,
    }
    e.preventDefault()
  }

  function onMove(e: PointerEvent) {
    const d = drag.value
    if (!d) return
    const card = desk.cards[d.index]
    const dx = Math.round((e.clientX - d.sx) / grid.value.unit)
    const dy = Math.round((e.clientY - d.sy) / grid.value.unit)

    if (d.resize) {
      /* 四边缩放：拖哪边改哪边，对角保持不动 */
      const left = d.resize === "w"
      const right = d.resize === "e"
      const top = d.resize === "n"
      const bottom = d.resize === "s"
      let w = left ? d.bw - dx : right ? d.bw + dx : d.bw
      let h = top ? d.bh - dy : bottom ? d.bh + dy : d.bh

      const lim = getCard(card.cardId)?.constrain
      if (lim) {
        const fit = fitDims(lim, w, h)
        w = fit.w
        h = fit.h
      }

      const nx = left ? d.bx + (d.bw - w) : d.bx
      const ny = top ? d.by + (d.bh - h) : d.by
      if (w !== card.w || h !== card.h) setDeskDims(card.uid, w, h)
      if (nx !== card.x || ny !== card.y) {
        card.x = Math.max(0, nx)
        card.y = Math.max(0, ny)
      }
      return
    }

    const nx = Math.min(Math.max(0, d.bx + dx), Math.max(0, grid.value.cols - card.w))
    const ny = Math.max(0, d.by + dy)
    if (nx !== card.x || ny !== card.y) {
      card.x = nx
      card.y = ny
    }
  }

  function endMove() {
    drag.value = null
  }

  function toggle(on?: boolean) {
    arranging.value = on ?? !arranging.value
    if (!arranging.value) drag.value = null
  }

  /** 指针与键盘共用尺寸约束；方向表不在每次按键时重新创建。 */
  const arrows: Record<string, { x: number; y: number }> = {
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  }

  function arrangeKey(index: number, e: KeyboardEvent) {
    const delta = arrows[e.key]
    if (!arranging.value || drag.value || e.target !== e.currentTarget || !delta) return
    e.preventDefault()
    e.stopPropagation()
    const c = desk.cards[index]
    const lim = getCard(c.cardId)?.constrain
    if (e.shiftKey && c.cardId !== PANEL_TOOLS) {
      const step = lim?.step || 1
      Object.assign(c, fitDims(lim, c.w + delta.x * step, c.h + delta.y * step))
    } else {
      c.x = Math.max(0, Math.min(Math.max(0, grid.value.cols - c.w), c.x + delta.x))
      c.y = Math.max(0, c.y + delta.y)
    }
    c.auto = false
  }

  function resizeKey(index: number, edge: Edge, e: KeyboardEvent) {
    const delta = arrows[e.key]
    if (!arranging.value || drag.value || !delta) return
    e.preventDefault()
    const c = desk.cards[index]
    const lim = getCard(c.cardId)?.constrain
    const step = lim?.step || 1
    const next = fitDims(lim,
      c.w + (edge === "e" ? delta.x : edge === "w" ? -delta.x : 0) * step,
      c.h + (edge === "s" ? delta.y : edge === "n" ? -delta.y : 0) * step)
    if (edge === "w") c.x = Math.max(0, c.x + c.w - next.w)
    if (edge === "n") c.y = Math.max(0, c.y + c.h - next.h)
    Object.assign(c, next)
    c.auto = false
  }

  return { arranging, grid, drag, grab, onMove, endMove, toggle, arrangeKey, resizeKey }
}
