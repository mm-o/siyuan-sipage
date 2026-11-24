<template>
  <div class="mm-card">
    <div class="mm-body">
      <header class="mm-head">
        <span class="mm-title">今天</span>
        <span class="mm-count">{{ meta }}</span>
      </header>

      <ul ref="list" class="mm-list desk-seq">
        <template v-for="row in rows" :key="row.key">
          <li v-if="row.kind === 'head'" class="mm-sec">
            <span>{{ row.text }}</span>
            <span class="mm-sec-count">{{ row.count }}</span>
          </li>
          <li v-else class="mm-row" :class="{ 'is-done': row.item.done }">
            <button
              class="mm-dot"
              type="button"
              role="checkbox"
              :aria-checked="row.item.done"
              :aria-label="row.item.done ? '标记未完成' : '标记完成'"
              @click="toggleItem(row.item.id)"
            />
            <span v-if="row.item.time" class="mm-time">{{ row.item.time }}</span>
            <span class="mm-text" :class="{ 'is-late': row.late }">{{ row.item.text }}</span>
          </li>
        </template>
        <li v-if="!rows.length" class="mm-empty desk-note">{{ empty }}</li>
      </ul>

      <form v-if="showInput" class="mm-add" @submit.prevent="submit">
        <GlassField v-model="draft" class="mm-input" label="新建今天的日程" placeholder="回车加到今天" />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 日程备忘卡（桌面）
 *
 * 只回答一个问题：今天还剩什么没做。三段按优先级排：今天 → 逾期 → 备忘（收件箱），
 * 收件箱条目在这里只读，安排日期在详情里做（卡片只留一个输入框，永远加到今天）。
 * 行数按列表实测高度切：一格 28px 命中区 + 间距，装不下就少显示几行，绝不把一行切成两半。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { GlassField } from "@/ui/controls"
import { addItem, counts, inbox, itemsOf, overdue, todayKey, toggleItem, weekdayOf } from "@/core/agenda"

const props = defineProps<{ size?: string; w?: number; h?: number }>()

/** 列表实测高度：行数由它算，不由格子数猜（同一张卡可以拖成任意 w×h） */
const list = ref<HTMLElement>()
const listHeight = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  observer = new ResizeObserver((entries) => {
    listHeight.value = entries[0]?.contentRect.height || 0
  })
  if (list.value) observer.observe(list.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

/** 一行 = 命中区 28 + 间距 4（与 .mm-list 的 gap 同源） */
const ROW = 32

const showInput = computed(() => (props.w ?? 4) >= 3 && (props.h ?? 2) >= 2)
const sections = computed(() => (props.h ?? 2) >= 3)

const rows = computed(() => {
  const slots = Math.max(1, Math.floor((listHeight.value + 4) / ROW))
  const late = overdue.value
  const box = inbox.value
  const groups = [
    { key: "today", text: "", items: itemsOf(todayKey()), count: 0, late: false },
    { key: "late", text: "逾期", items: late, count: late.length, late: true },
    { key: "inbox", text: "备忘", items: box, count: box.length, late: false },
  ]
  const out: Row[] = []
  for (const group of groups) {
    if (!group.items.length) continue
    /* 分段标题也要占一行：剩下的位置不够「标题 + 至少一条」就不起标题 */
    if (sections.value && group.text && out.length + 1 >= slots && out.length) break
    if (sections.value && group.text) out.push({ kind: "head", key: `h-${group.key}`, text: group.text, count: group.count })
    for (const item of group.items) {
      if (out.length >= slots) break
      out.push({ kind: "item", key: item.id, item, late: group.late })
    }
    if (out.length >= slots) break
  }
  return out
})

type Row =
  | { kind: "head"; key: string; text: string; count: number }
  | { kind: "item"; key: string; item: ReturnType<typeof itemsOf>[number]; late: boolean }

const meta = computed(() => {
  const hit = counts.value
  const parts = [`${weekdayOf(todayKey())} · ${hit.today} 项`]
  if (hit.late) parts.push(`逾期 ${hit.late}`)
  return parts.join(" · ")
})

const empty = computed(() => "今天空着，下面加一条")

const draft = ref("")

function submit() {
  addItem({ text: draft.value, date: todayKey() })
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 3cqh, 8px);
  padding: clamp(10px, 7cqw, 18px);
}

.mm-head {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--desk-sp-2);
  min-width: 0;
}

.mm-title {
  font-size: clamp(12px, 5.6cqh, 15px);
  font-weight: var(--desk-fw-semibold);
}

.mm-count {
  min-width: 0;
  overflow: hidden;
  font-size: clamp(10px, 4cqh, 11px);
  color: var(--desk-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-list {
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

.mm-row {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  min-height: var(--desk-hit);
  font-size: clamp(11px, 4.6cqh, 13px);
}

.mm-time {
  display: none;
  flex: none;
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

.mm-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-text.is-late {
  color: var(--desk-danger);
}

.mm-row.is-done .mm-text {
  color: var(--desk-text-3);
  text-decoration: line-through;
}

/* 分段标题：逾期 / 备忘 */
.mm-sec {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-1);
  min-height: var(--desk-hit);
  font-size: clamp(9px, 3.6cqh, 11px);
  color: var(--desk-text-3);
}

.mm-sec-count {
  font-variant-numeric: tabular-nums;
}

.mm-empty {
  flex: 0 0 auto;
}

.mm-add {
  flex: 0 0 auto;
  margin-top: auto;
}

.mm-input {
  width: 100%;
  height: clamp(26px, 9cqh, 32px);
}

@container (min-width: 200px) {
  .mm-time {
    display: inline;
  }
}

@container (max-width: 200px) {
  .mm-count {
    display: none;
  }
}
</style>
