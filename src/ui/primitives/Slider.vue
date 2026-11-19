<template>
  <label class="slider ariaLabel" data-position="north" data-tooltip-encoding="none" :aria-label="`双击回到默认值 ${defText}`">
    <span class="slider-label">{{ label }}</span>
    <input
      class="slider-input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="onInput"
      @dblclick="reset"
    />
    <span class="slider-value" :class="{ changed }">{{ display }}</span>
  </label>
</template>

<script setup lang="ts">
/**
 * 滑块（基础组件 · 极限精简）
 *
 * 一行三列：标签 80px · 滑轨 自适应 · 数值 48px 右对齐。
 * 只有一个控件、一段样式、一个事件；没有步进器、没有副标题、没有刻度。
 * 默认值通过「双击滑轨」恢复，改了值数值会变亮作为唯一提示。
 */
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min?: number
    max?: number
    step?: number
    suffix?: string
    /** 显示倍率：0.18 → 18% */
    scale?: number
    defaultValue?: number
  }>(),
  { min: 0, max: 100, step: 1, suffix: "", scale: 1 },
)

const emit = defineEmits<{ "update:modelValue": [number] }>()

const fmt = (v: number) => `${Math.round(v * props.scale)}${props.suffix}`
const display = computed(() => fmt(props.modelValue))
const defText = computed(() => (props.defaultValue === undefined ? "" : fmt(props.defaultValue)))
const changed = computed(
  () => props.defaultValue !== undefined && Math.abs(props.modelValue - props.defaultValue) > 1e-6,
)

const onInput = (e: Event) => emit("update:modelValue", Number((e.target as HTMLInputElement).value))
const reset = () => props.defaultValue !== undefined && emit("update:modelValue", props.defaultValue)
</script>

<style scoped>
.slider {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 48px;
  align-items: center;
  gap: var(--desk-sp-2);
  height: 28px;
  cursor: default;
}

.slider-label {
  font-size: var(--desk-fs-body);
  color: var(--desk-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slider-value {
  font-size: var(--desk-fs-caption);
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--desk-text-3);
  transition: color var(--desk-dur-fast) var(--desk-ease);
}

.slider-value.changed {
  color: var(--desk-text);
}

/* 原生 range：只改轨道与拇指，其他全交给浏览器 */
.slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 16px;
  background: transparent;
  cursor: pointer;
}

.slider-input::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-text) 18%, transparent);
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4.5px;
  border-radius: 50%;
  background: var(--desk-text);
  box-shadow: var(--desk-shadow-1);
}

.slider-input:focus-visible {
  outline: 2px solid var(--desk-accent);
  outline-offset: 2px;
  border-radius: var(--desk-r-pill);
}
</style>
