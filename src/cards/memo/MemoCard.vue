<template>
  <div class="mm-card" :class="`is-${size}`">
    <div class="mm-body">
      <header class="mm-head">
        <span class="mm-title">备忘录</span>
        <span class="mm-count">{{ leftCount }} 条待办</span>
      </header>

      <ul class="mm-list desk-seq">
        <li v-for="item in visible.slice(0, plan.rows)" :key="item.id" class="mm-row" :class="{ 'is-done': item.done }">
          <button class="mm-dot" type="button" :aria-label="item.done ? '标记未完成' : '标记完成'" @click="toggle(item.id)" />
          <span class="mm-text">{{ item.text }}</span>
        </li>
        <li v-if="!visible.length" class="mm-empty desk-note">没有待办，点开详情可以添加</li>
      </ul>

      <form v-if="plan.input" class="mm-add" @submit.prevent="submit">
        <input v-model="draft" class="mm-input" type="text" placeholder="回车添加" @keydown.enter.prevent="submit" />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { add, leftCount, toggle, visible } from "./memo"

const props = defineProps<{ size?: string; w?: number; h?: number }>()
const draft = ref("")

/** 尺寸只决定显示几行 / 有没有输入框 */
const PLAN: Record<string, { rows: number; input: boolean }> = {
  "1x1": { rows: 3, input: false },
  "2x1": { rows: 2, input: false },
  "2x2": { rows: 5, input: true },
  "2x4": { rows: 11, input: true },
  "4x2": { rows: 5, input: true },
}
const plan = computed(() => PLAN[props.size || "2x2"] || PLAN["2x2"])

function submit() {
  add(draft.value)
  draft.value = ""
}
</script>

<style scoped>
.mm-card {
  container-type: size;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
}

.mm-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 3cqh, 8px);
  padding: clamp(10px, 7cqw, 18px);
}

.mm-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--desk-sp-2);
}

.mm-title {
  font-size: clamp(12px, 5.6cqh, 15px);
  font-weight: var(--desk-fw-semibold);
}

.mm-count {
  font-size: clamp(10px, 4cqh, 11px);
  color: var(--desk-text-3);
}

.mm-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 1.6cqh, 6px);
  min-height: 0;
  overflow: hidden;
}

.mm-row {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  font-size: clamp(11px, 4.6cqh, 13px);
}

.mm-dot {
  flex: none;
  width: clamp(11px, 4.4cqh, 14px);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--desk-text) 28%, transparent);
  background: transparent;
  cursor: pointer;
}

.mm-row.is-done .mm-dot {
  background: var(--desk-accent);
  border-color: var(--desk-accent);
}

.mm-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-row.is-done .mm-text {
  color: var(--desk-text-3);
  text-decoration: line-through;
}



.mm-add {
  margin-top: auto;
}

.mm-input {
  width: 100%;
  height: clamp(22px, 8cqh, 28px);
  padding: 0 8px;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 5%, transparent);
  color: var(--desk-text);
  font-size: var(--desk-fs-sm);
}

@container (max-width: 200px) {
  .mm-input,
  .mm-count {
    display: none;
  }
}
</style>
