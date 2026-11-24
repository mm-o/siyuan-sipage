<template>
  <div class="dl-panel desk-seq desk-panel-row">
    <!-- 左：日期 / 统计 / 待办 / 唯一动作 -->
    <aside class="dl-side desk-pane is-left">
      <header class="dl-day">
        <b class="dl-day-num">{{ dayNum }}</b>
        <span class="dl-day-label">{{ label }}</span>
        <span class="desk-note">{{ meta }}</span>
      </header>

      <div class="dl-nav">
        <GlassButton :icon="ChevronLeft" label="前一天" @click="step(-1)" />
        <GlassButton text label="今天" :disabled="state.offset === 0" @click="state.offset = 0" />
        <GlassButton :icon="ChevronRight" label="后一天" @click="step(1)" />
      </div>

      <ul class="dl-todos mm-scroll">
        <li v-for="(todo, i) in preview?.todos ?? []" :key="i" class="mm-line" :class="{ 'is-done': todo.done }">
          <span class="mm-text">{{ todo.text }}</span>
        </li>
        <li v-if="!preview?.todos?.length" class="desk-note">这天没有待办</li>
      </ul>

      <GlassButton class="dl-open" text variant="primary" :icon="PenLine" :label="preview ? '打开日记' : '写今天的日记'" @click="open" />
    </aside>

    <!-- 右：只读全文（思源 Protyle 渲染） -->
    <section class="dl-body desk-pane is-right">
      <div ref="host" class="dl-protyle" />
      <p v-if="!preview" class="dl-empty desk-note">{{ state.offset === 0 ? "今天还没有写日记" : "这天没有日记" }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 日记详情：左日期（可前后翻），右只读全文
 *
 * 只读用的是和「思源块」卡同一个 Protyle 挂载（`ui/protyle`）；
 * 每张日记卡一份日期偏移，所以开着两张卡能同时看两天。
 */
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { ChevronLeft, ChevronRight, PenLine } from "lucide-vue-next"
import { GlassButton, toast } from "@/ui/controls"
import { stateOf } from "@/core/store"
import { mountProtyle } from "@/ui/protyle"
import { dayOf, ensureToday, labelOf, loadDaily, openDaily, type DailyPreview } from "@/core/dailyNote"

const props = defineProps<{ mode?: string; uid?: string }>()

const state = stateOf<{ offset: number }>(props.uid || "daily", { offset: 0 })
const date = computed(() => dayOf(state.offset))
const label = computed(() => labelOf(date.value))
const dayNum = computed(() => date.value.getDate())
const meta = computed(() => (preview.value ? `${preview.value.blocks} 块 · ${preview.value.words} 字` : ""))

const preview = ref<DailyPreview | null>(null)
const host = ref<HTMLElement>()
let handle: { destroy: () => void } | null = null

function step(delta: number) {
  state.offset += delta
}

function render() {
  const el = host.value
  handle?.destroy?.()
  handle = null
  if (!el) return
  el.replaceChildren()
  const note = preview.value
  if (!note) return
  handle = mountProtyle((window as any).siyuan?.ws?.app, el, note.id)
}

async function load() {
  preview.value = await loadDaily(date.value).catch(() => null)
  render()
}

async function open() {
  try {
    const note = state.offset === 0 ? await ensureToday() : await loadDaily(date.value)
    if (!note) {
      toast("这天没有日记", 2000)
      return
    }
    await openDaily(note.id)
  } catch (e) {
    toast(`打开失败：${(e as Error).message}`, 3000)
  }
}

watch(() => state.offset, () => void load())
watch(host, render, { flush: "post" })
load()
onBeforeUnmount(() => {
  handle?.destroy?.()
  handle = null
})
</script>

<style scoped>
.dl-side {
  flex: 0 0 var(--desk-aside-w);
  width: var(--desk-aside-w);
  display: flex;
  flex-direction: column;
  gap: var(--desk-detail-gap);
  padding: var(--desk-detail-pad);
  min-height: 0;
}

.dl-day {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  padding-bottom: var(--desk-sp-2);
  border-bottom: 1px solid var(--desk-stroke);
}

.dl-day-num {
  font-size: calc(var(--desk-fs-large) * 1.3);
  font-weight: var(--desk-fw-semibold);
  line-height: 1;
  color: var(--desk-accent);
  font-variant-numeric: tabular-nums;
}

.dl-day-label {
  font-size: var(--desk-fs-body);
}

.dl-nav {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1);
}

.dl-todos {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--desk-fs-caption);
}

.dl-open {
  flex: 0 0 auto;
  align-self: flex-start;
}

.dl-body {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: var(--desk-detail-pad);
  overflow: hidden;
}

.dl-protyle {
  width: 100%;
  height: 100%;
  overflow: auto;
  color: var(--desk-text);
  font-size: var(--desk-fs-body);
}

.dl-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}
</style>
