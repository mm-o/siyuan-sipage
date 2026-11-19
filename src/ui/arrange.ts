import { computed, ref, type Ref } from "vue"
import { getCard } from "@/core/registry"
import { appearance, computeGrid, desk, setDeskDims } from "@/core/store"

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
 * 把带固定比例的卡片拉回比例（整理时调用，顺手修好历史遗留的变形尺寸）。
 */
export function normalizeRatios() {
  for (const card of desk.cards) {
    const lim = getCard(card.cardId)?.constrain
    if (!lim?.ratios?.length) continue
    const ratio = lim.ratios.reduce(
      (a, r) => (Math.abs(r - card.w / card.h) < Math.abs(a - card.w / card.h) ? r : a),
      lim.ratios[0],
    )
    const max = lim.max ?? 16
    const min = lim.min ?? 2
    if (ratio >= 1) {
      card.w = Math.min(max, Math.max(min, card.w))
      card.h = Math.max(min, Math.round(card.w / ratio))
    } else {
      card.h = Math.min(max, Math.max(min, card.h))
      card.w = Math.max(min, Math.round(card.h * ratio))
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
    if (!arranging.value) return
    const card = desk.cards[index]
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

      /* constrain：固定比例（大卡不变形）/ 正方形 / 普通夹 min-max */
      const lim = getCard(card.cardId)?.constrain
      if (lim?.ratios?.length) {
        /* 比例取起始尺寸最接近的那个，拖动中锁死，宽高同步 */
        const ratio = lim.ratios.reduce(
          (a, r) => (Math.abs(r - d.bw / d.bh) < Math.abs(a - d.bw / d.bh) ? r : a),
          lim.ratios[0],
        )
        const grow = Math.abs(w - d.bw) >= Math.abs(h - d.bh)
        const clamp = (n: number) => Math.min(lim.max ?? 16, Math.max(lim.min ?? 2, n))
        if (ratio >= 1) {
          w = clamp(grow ? w : Math.round(h * ratio))
          h = Math.round(w / ratio)
        } else {
          h = clamp(grow ? Math.round(w / ratio) : h)
          w = Math.round(h * ratio)
        }
      } else if (lim?.square) {
        const span = Math.abs(w - d.bw) >= Math.abs(h - d.bh) ? w : h
        const n = Math.min(lim.max ?? 16, Math.max(lim.min ?? 1, span))
        w = n
        h = n
      } else if (lim) {
        w = Math.min(lim.max ?? 16, Math.max(lim.min ?? 1, w))
        h = Math.min(lim.max ?? 16, Math.max(lim.min ?? 1, h))
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

  return { arranging, grid, drag, grab, onMove, endMove, toggle }
}
