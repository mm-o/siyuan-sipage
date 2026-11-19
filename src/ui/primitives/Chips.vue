<template>
  <div class="chips">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      class="chip"
      :class="{ active: modelValue === opt.value, 'on-photo': tone === 'on-photo' }"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * 标签选择（Chips）
 *
 * 两种底色：
 *   plain     玻璃/实色表面（设置面板）
 *   on-photo  照片上的详情（诗词的 全文/译文/注释）—— 未选中也要看得清：
 *             白字 + 深色半透明药丸 + 更亮的描边，选中反白
 *
 * 一个图标一个按钮的规则不适用于文字标签；选项 ≤4 时仍优先用 Segmented，
 * Chips 只用于「多项、可换行」的标签场景。
 */
interface ChipOption {
  label: string
  value: string | number
}

withDefaults(defineProps<{ modelValue: string | number; options: ChipOption[]; tone?: "plain" | "on-photo" }>(), {
  tone: "plain",
})
defineEmits<{ "update:modelValue": [string | number] }>()
</script>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--desk-sp-1h);
}

.chip {
  height: 22px;
  padding: 0 10px;
  border-radius: var(--desk-r-sm);
  border: 1px solid color-mix(in srgb, var(--desk-text) 14%, transparent);
  background: transparent;
  color: var(--desk-text-2);
  font: inherit;
  font-size: var(--desk-fs-caption);
  cursor: pointer;
  transition:
    background var(--desk-dur-fast) var(--desk-ease),
    color var(--desk-dur-fast) var(--desk-ease),
    border-color var(--desk-dur-fast) var(--desk-ease);
}

.chip:hover {
  color: var(--desk-text);
  border-color: color-mix(in srgb, var(--desk-accent) 50%, transparent);
}

.chip.active {
  color: #fff;
  background: var(--desk-accent);
  border-color: var(--desk-accent);
  font-weight: var(--desk-fw-medium);
}

/* ── 照片底：未选中 = 白字 + 深色药丸（HIG：玻璃上的文字必须有底色兜底） ── */
.chip.on-photo {
  height: var(--desk-hit, 24px);
  border-color: rgb(255 255 255 / 30%);
  background: rgb(16 18 24 / 52%);
  color: #fff;
  backdrop-filter: blur(var(--desk-blur-clear, 12px)) saturate(var(--desk-saturate, 1.4));
  -webkit-backdrop-filter: blur(var(--desk-blur-clear, 12px)) saturate(var(--desk-saturate, 1.4));
  text-shadow: 0 1px 2px rgb(0 0 0 / 35%);
}

.chip.on-photo:hover {
  color: #fff;
  border-color: rgb(255 255 255 / 55%);
  background: rgb(16 18 24 / 68%);
}

.chip.on-photo.active {
  color: #14161a;
  background: #fff;
  border-color: transparent;
  text-shadow: none;
}
</style>
