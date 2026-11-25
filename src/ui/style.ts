/**
 * 当前材质风格（ui 层只读）
 *
 * 控件需要知道用我们自己的 DOM 还是思源的 `.b3-*` 组件，但 `ui/controls` 不许依赖 core，
 * 所以由 core 写一个全局值、界面层同步到这个 ref，控件只读它。
 */
import { ref } from "vue"

export type DeskStyle = "liquid" | "native" | "md3"

export const deskStyle = ref<DeskStyle>(((globalThis as Record<string, unknown>).__deskStyle as DeskStyle) || "liquid")

/** 原生风格：控件直接用思源组件（b3-button / b3-switch / b3-slider / b3-chip …） */
export const isNative = () => deskStyle.value === "native"

export function syncDeskStyle(value: DeskStyle) {
  deskStyle.value = value
}
