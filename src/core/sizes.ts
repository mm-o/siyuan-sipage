/**
 * 尺寸语义层 —— 卡片版式只认形状，不认精确格数。
 *
 * 之前卡片用 `.is-4x2` 这类按格数写死的选择器，卡片一旦被拖成 8x4 就再也不命中，
 * 版式退回默认（"拖大之后样式没跟上"的根因）。这里把实际格数折算成四个形状档：
 *
 *   mini    极小区（面积 ≤ 2 格，如 1x1 / 2x1 的窄条）
 *   wide    横卡（宽高比 ≥ 1.6）
 *   tall    竖卡（高宽比 ≥ 1.6）
 *   square  接近正方形
 *
 * 再叠加 `big`：面积 ≥ 8 格（4x2 / 2x4 / 4x4 / 8x4 / 12x6 …），用来放大字号、加行数。
 */
export type SizeTier = "mini" | "wide" | "tall" | "square"

export function sizeTier(w: number, h: number): SizeTier {
  if (!w || !h) return "square"
  const area = w * h
  const ratio = w / h
  if (area <= 2) return "mini"
  if (ratio >= 1.6) return "wide"
  if (ratio <= 0.625) return "tall"
  return "square"
}

/** 大卡：面积 ≥ 8 格 */
export const isBig = (w: number, h: number) => w * h >= 8
