<template>
  <label class="slider desk-slider" :class="{ 'is-disabled': disabled, ariaLabel: defaultValue !== undefined }" data-position="north" data-tooltip-encoding="none" :aria-label="hint">
    <span class="slider-label">{{ label }}</span>
    <input
      :class="isNative() ? 'b3-slider desk-native-slider' : 'slider-input'"
      type="range"
      :aria-label="label"
      :aria-valuetext="display"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      :style="{ '--range-progress': `${progress}%` }"
      @input="onInput"
      @dblclick="reset"
    />
    <output class="slider-value" :class="{ changed }">{{ display }}</output>
  </label>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { isNative } from "@/ui/style"
import { t } from "@/core/i18n"

const props = withDefaults(defineProps<{
  modelValue: number
  label: string
  min?: number
  max?: number
  step?: number
  suffix?: string
  scale?: number
  defaultValue?: number
  disabled?: boolean
}>(), { min: 0, max: 100, step: 1, suffix: "", scale: 1 })
const emit = defineEmits<{ "update:modelValue": [number] }>()
const format = (value: number) => `${Math.round(value * props.scale)}${props.suffix}`
const display = computed(() => format(props.modelValue))
const changed = computed(() => props.defaultValue !== undefined && Math.abs(props.modelValue - props.defaultValue) > 1e-6)
const progress = computed(() => Math.max(0, Math.min(100, (props.modelValue - props.min) / Math.max(1e-9, props.max - props.min) * 100)))
const hint = computed(() => props.defaultValue === undefined ? props.label : t("ui.slider.hint", { label: props.label, value: format(props.defaultValue) }))
const onInput = (event: Event) => !props.disabled && emit("update:modelValue", Number((event.target as HTMLInputElement).value))
const reset = () => !props.disabled && props.defaultValue !== undefined && emit("update:modelValue", props.defaultValue)
</script>
