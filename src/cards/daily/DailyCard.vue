<template>
  <div class="dl-card">
    <header class="dl-head">
      <span class="dl-title">{{ label }}</span>
      <span class="dl-meta">{{ meta }}</span>
    </header>

    <!-- 正文就是思源渲染出来的那篇日记，只读、不拦点击 -->
    <div v-if="preview" class="dl-body">
      <ProtyleView :id="preview.id" />
    </div>
    <div v-else class="dl-empty desk-empty is-tight"><EmptyArt /><span>{{ empty }}</span></div>
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
import { EmptyArt } from "@/ui/controls"
import ProtyleView from "@/ui/ProtyleView.vue"
import { dateKey, dayLabel, itemsOf, weekdayOf } from "@/core/agenda"
import { dayOf, loadDaily, type DailyPreview } from "@/core/dailyNote"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

/* 每张日记卡一份：看哪天（相对今天的偏移） */
const state = stateOf<{ offset: number }>(props.uid || "daily", { offset: 0 })
const date = computed(() => dayOf(state.offset))
const label = computed(() => {
  const key = dateKey(date.value)
  return `${dayLabel(key)} · ${weekdayOf(key)}`
})

const preview = ref<DailyPreview | null>(null)
const empty = computed(() => (state.offset === 0 ? "今天还没写 · 点开写一句" : "这天没有日记"))

const meta = computed(() => {
  const p = preview.value
  /* 待办 = 那天的日程 + 日记里的待办块，和详情左栏同一个口径 */
  const open =
    itemsOf(dateKey(date.value)).filter((item) => !item.done).length +
    (p?.todos.filter((todo) => !todo.done).length ?? 0)
  return [`${p?.words ?? 0} 字`, open ? `${open} 待办` : ""].filter(Boolean).join(" · ")
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

/* 正文：思源渲染，卡片里只读——不吞点击，点卡仍开详情 */
.dl-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  pointer-events: none;
  font-size: clamp(11px, 4.4cqh, 13px);
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
