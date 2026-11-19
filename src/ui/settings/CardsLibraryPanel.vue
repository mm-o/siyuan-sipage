<template>
  <div class="desk-panel">
    <p class="desk-hint">同一张卡可以添加多次；尺寸与位置在桌面「整理模式」里调整。</p>

    <div v-for="def in CARDS" :key="def.id" class="row">
      <div class="row-main">
        <strong>{{ def.name }}</strong>
        <small>{{ def.desc }}</small>
      </div>

      <span v-if="countOf(def.id)" class="count">×{{ countOf(def.id) }}</span>

      <button
        v-if="countOf(def.id)"
        class="desk-btn"
        aria-label="移除一个"
        @click="removeOne(def.id)"
      >
        −
      </button>

      <button class="desk-btn" @click="add(def.id)">添加</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 卡片库
 *
 * 同一张卡允许多个实例：每点一次「添加」就在桌面上多放一张，
 * 「−」按 uid 移除最后添加的那一个实例。
 */
import { CARDS } from "@/core/registry"
import { addToDesk, countOnDesk, desk, removeFromDesk } from "@/core/store"
import "@/ui/ui.css"

const countOf = (id: string) => countOnDesk(id)

function add(id: string) {
  /* 所有卡片统一从 2×2 起步，尺寸在整理模式里拖 */
  addToDesk(id)
}

function removeOne(id: string) {
  for (let i = desk.cards.length - 1; i >= 0; i -= 1) {
    if (desk.cards[i].cardId === id) {
      removeFromDesk(desk.cards[i].uid)
      return
    }
  }
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-3);
  min-height: 42px;
  padding: var(--desk-sp-1) 0;
  border-bottom: 1px solid var(--desk-stroke);
}

.row-main {
  display: flex;
  flex-direction: column;
  margin-right: auto;
  min-width: 0;
}

.count {
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}
</style>
