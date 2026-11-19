<template>
  <div class="seg" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="seg-item"
      :class="{ active: modelValue === opt.value }"
      role="tab"
      :aria-selected="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
/** 分段控件（基础组件 · 极限精简）：等宽单选，高亮用滑块式药丸 */
export interface SegOption {
  label: string
  value: string
}

defineProps<{ modelValue: string; options: SegOption[] }>()
defineEmits<{ "update:modelValue": [string] }>()
</script>

<style scoped>
.seg {
  display: flex;
  gap: var(--desk-sp-0);
  padding: var(--desk-sp-0);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 8%, transparent);
}

.seg-item {
  flex: 1 1 0;
  min-width: 0;
  height: 24px;
  border: 0;
  border-radius: calc(var(--desk-r-control) - 2px);
  background: transparent;
  color: var(--desk-text-2);
  font: inherit;
  font-size: var(--desk-fs-caption);
  cursor: pointer;
  transition:
    background var(--desk-dur) var(--desk-ease),
    color var(--desk-dur) var(--desk-ease);
}

.seg-item:hover {
  color: var(--desk-text);
}

.seg-item.active {
  background: var(--desk-glass-fill-strong);
  color: var(--desk-text);
  font-weight: var(--desk-fw-medium);
  box-shadow: var(--desk-shadow-1);
}
</style>
