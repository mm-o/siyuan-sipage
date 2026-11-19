<template>
  <button
    class="gb ariaLabel"
    :class="{ 'is-on': active }"
    type="button"
    data-position="north"
    data-tooltip-encoding="none"
    :aria-label="label"
    @click.stop="$emit('click', $event)"
  >
    <component :is="icon" :size="14" :stroke-width="1.7" />
  </button>
</template>

<script setup lang="ts">
/**
 * 圆形毛玻璃按钮（全项目唯一的圆形控件）
 *
 * 一个图标 = 一个按钮，不做成长条工具栏；**只有一档尺寸**（28px，HIG 的 desktop 默认命中区），
 * 卡片上的「全屏 / 更多」、弹层里的「全屏 / 关闭」、全屏层的「退出」都是它，
 * 不再出现 34 / 28 两套大小。图标全部来自 lucide（stroke 1.7），不自己画 SVG。
 *
 * 提示用思源的 ariaLabel 机制（`ariaLabel` 类 + `data-position` + aria-label）：
 * 由思源在文档根部用 `#tooltip`（position: fixed）渲染，不会被滚动面板的 overflow 裁掉。
 */
import type { Component } from "vue"

defineProps<{ icon: Component; label: string; active?: boolean }>()
defineEmits<{ click: [MouseEvent] }>()
</script>

<style scoped>
.gb {
  width: var(--desk-hit, 28px);
  height: var(--desk-hit, 28px);
  display: grid;
  place-items: center;
  padding: 0;
  /* 行高归零：inline svg 的基线会让图标偏上/偏下 1px */
  line-height: 0;
  font-size: 0;
  border-radius: 50%;
  /* 毛玻璃：半透明深色 + 清透模糊 + 内侧高光 */
  border: 1px solid rgb(255 255 255 / 24%);
  background: rgb(20 22 28 / 34%);
  backdrop-filter: blur(var(--desk-blur-clear, 12px)) saturate(var(--desk-saturate, 1.4));
  -webkit-backdrop-filter: blur(var(--desk-blur-clear, 12px)) saturate(var(--desk-saturate, 1.4));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 2px 8px rgb(0 0 0 / 22%);
  color: rgb(255 255 255 / 92%);
  cursor: pointer;
  transition:
    background var(--desk-dur-fast) var(--desk-ease),
    transform var(--desk-dur-fast) var(--desk-ease),
    color var(--desk-dur-fast) var(--desk-ease);
}

.gb:hover {
  background: rgb(20 22 28 / 58%);
  transform: translateY(-1px);
}

.gb:active {
  transform: scale(0.94);
}

.gb.is-on {
  color: #ff6b8a;
  border-color: rgb(255 107 138 / 45%);
  background: rgb(255 107 138 / 16%);
}

.gb:focus-visible {
  outline: 2px solid var(--desk-accent);
  outline-offset: 2px;
}
</style>
