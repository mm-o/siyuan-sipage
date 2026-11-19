/**
 * 尺寸语义层：卡片版式只认形状，不认精确格数（拖成 8x4 也不会退回默认样式）。
 */
export type SizeTier = "mini" | "wide" | "tall" | "square"

export function sizeTier(w: number, h: number): SizeTier {
  const ratio = w / h
  if (w * h <= 2) return "mini"
  if (ratio >= 1.6) return "wide"
  if (ratio <= 0.625) return "tall"
  return "square"
}

/** 大卡：面积 ≥ 8 格（放大字号、加行数） */
export const isBig = (w: number, h: number) => w * h >= 8
