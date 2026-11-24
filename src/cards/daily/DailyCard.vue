<template>
  <div class="dl-card">
    <header class="dl-head">
      <span class="dl-title">{{ label }}</span>
      <span class="dl-meta">{{ meta }}</span>
    </header>

    <ul class="dl-lines desk-seq">
      <li v-for="(line, i) in shown" :key="i" class="dl-line" :class="{ 'is-head': line.type === 'h' }">{{ line.text }}</li>
      <li v-if="!shown.length" class="dl-empty desk-note">{{ empty }}</li>
    </ul>

  </div>
</template>

<script setup lang="ts">
/**
 * 日记卡：预览某一天的日记（默认今天），点开详情就地编辑
 *
 * 和日历、日程同一套日期：每张日记卡可以看不同的一天（实例状态 offset），
 * 顶部给「字 · 待办」，正文给前几行。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { stateOf } from "@/core/store"
import { dayOf, labelOf, loadDaily, type DailyPreview } from "@/core/dailyNote"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

/* 每张日记卡一份：看哪天（相对今天的偏移） */
const state = stateOf<{ offset: number }>(props.uid || "daily", { offset: 0 })
const date = computed(() => dayOf(state.offset))
const label = computed(() => labelOf(date.value))

const preview = ref<DailyPreview | null>(null)
const empty = computed(() => (state.offset === 0 ? "今天还没写 · 点开写一句" : "这天没有日记"))

const meta = computed(() => {
  const p = preview.value
  if (!p) return "0 字"
  const open = p.todos.filter((todo) => !todo.done).length
  return [`${p.words} 字`, open ? `${open} 待办` : ""].filter(Boolean).join(" · ")
})

/** 行数按卡片高度切（每格约两行，留一行给头部） */
const shown = computed(() => {
  const rows = Math.max(1, Math.round((props.h ?? 4) * 2 - 1))
  return (preview.value?.lines ?? []).slice(0, rows)
})

async function load() {
  preview.value = await loadDaily(date.value).catch(() => null)
}


let timer = 0
onMounted(() => {
  void load()
  timer = window.setInterval(() => void load(), 60_000)
})
onBeforeUnmount(() => window.clearInterval(timer))
watch(() => state.offset, () => void load())
</script>

<style scoped>
.dl-card {
  container-type: size;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 3cqh, 8px);
  width: 100%;
  height: 100%;
  padding: clamp(10px, 7cqw, 18px);
  min-height: 0;
  color: var(--desk-text);
}

.dl-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--desk-sp-2);
  min-width: 0;
}

.dl-title {
  font-size: clamp(12px, 5.6cqh, 15px);
  font-weight: var(--desk-fw-semibold);
  white-space: nowrap;
}

.dl-meta {
  min-width: 0;
  overflow: hidden;
  font-size: clamp(10px, 4cqh, 11px);
  color: var(--desk-text-3);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dl-lines {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.dl-line {
  flex: 0 0 auto;
  overflow: hidden;
  font-size: clamp(11px, 4.4cqh, 13px);
  line-height: 1.35;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dl-line.is-head {
  font-weight: var(--desk-fw-semibold);
}

.dl-empty {
  flex: 0 0 auto;
}


@container (max-width: 120px) {
  .dl-meta {
    display: none;
  }
}
</style>
