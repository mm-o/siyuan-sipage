<template>
  <div class="dl-panel desk-seq desk-panel-row">
    <!-- 左：日期 / 统计 / 待办 / 唯一动作 -->
    <aside class="dl-side desk-pane is-left">
      <header class="dl-day">
        <b class="dl-day-num">{{ dayNum }}</b>
        <span class="dl-day-label">{{ label }}</span>
        <!-- 固定一行：没有日记也写 0 块 · 0 字，下面的日历不会上移 -->
        <span class="dl-meta desk-note">{{ meta }}</span>
      </header>

      <MiniCalendar v-model="selectedKey" nav today class="dl-cal" />

      <ul class="dl-todos mm-scroll">
        <li
          v-for="todo in todos"
          :key="todo.id || todo.text"
          class="mm-line"
          :class="{ 'is-done': todo.done }"
          :title="todo.text"
          @click="reveal(todo.id)"
        >
          <span class="mm-text">{{ todo.text }}</span>
        </li>
        <li v-if="!todos.length" class="desk-note">没有待办</li>
      </ul>

      <GlassButton v-if="!preview && state.offset === 0" class="dl-open" text variant="primary" :icon="PenLine" label="写今天的日记" @click="create" />
    </aside>

    <!-- 右：只读全文（思源 Protyle 渲染） -->
    <section class="dl-body desk-pane is-right">
      <div ref="host" class="dl-protyle" />
      <p v-if="!preview" class="dl-empty desk-note">{{ state.offset === 0 ? "点左下「写今天的日记」，写完这里就是编辑器" : "这天没有日记" }}</p>
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
import { PenLine } from "lucide-vue-next"
import { GlassButton, toast } from "@/ui/controls"
import { stateOf } from "@/core/store"
import { mountProtyle } from "@/ui/protyle"
import MiniCalendar from "@/ui/MiniCalendar.vue"
import { dateKeyOf, dailyStat, dayOf, ensureToday, labelOf, loadDaily, type DailyPreview } from "@/core/dailyNote"

const props = defineProps<{ mode?: string; uid?: string }>()

const state = stateOf<{ offset: number }>(props.uid || "daily", { offset: 0 })
const date = computed(() => dayOf(state.offset))
const label = computed(() => labelOf(date.value))
const dayNum = computed(() => date.value.getDate())

/** 小日历选中的是哪天：和实例 offset 互转 */
const selectedKey = computed({
  get: () => dateKeyOf(date.value),
  set: (key: string) => {
    const [y, m, d] = key.split("-").map(Number)
    if (!y || !m || !d) return
    const target = new Date(y, m - 1, d)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    state.offset = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  },
})
/** 固定一行：没有日记也写 0 块 · 0 字，下面的日历不会因为空而上下跳 */
const meta = computed(() => {
  const p = preview.value
  if (!p) return "0 块 · 0 字"
  const open = p.todos.filter((todo) => !todo.done).length
  return `${p.blocks} 块 · ${p.words} 字${open ? ` · ${open} 待办` : ""}`
})

const preview = ref<DailyPreview | null>(null)
const todos = computed(() => preview.value?.todos ?? [])
const host = ref<HTMLElement>()
let handle: { destroy: () => void } | null = null


function render() {
  const el = host.value
  handle?.destroy?.()
  handle = null
  if (!el) return
  el.replaceChildren()
  const note = preview.value
  if (!note) return
  /* 就地编辑 + 思源文档的完整功能：标题、面包屑、块图标、工具栏都保留 */
  handle = mountProtyle((window as any).siyuan?.ws?.app, el, note.id, {
    editable: true,
    full: true,
    onInput: () => void refreshStat(),
  })
}

/** 点待办：滚到正文里那一行，同一个编辑器，不另开窗口 */
function reveal(id: string) {
  if (!id) return
  host.value?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })
}

async function load() {
  preview.value = await loadDaily(date.value).catch(() => null)
  render()
}

/** 停笔后只刷新字数/块数：不重挂 Protyle，光标不丢 */
async function refreshStat() {
  const note = preview.value
  if (!note) return
  const stat = await dailyStat(note.id).catch(() => null)
  if (!stat) return
  note.words = stat.words
  note.blocks = stat.blocks
}

/** 新建今天的日记，然后就地开写（不跳去文档页签） */
/** 新建今天的日记，然后走同一条加载/挂载路径（不另开窗口） */
async function create() {
  try {
    await ensureToday()
    await load()
  } catch (e) {
    toast(`创建日记失败：${(e as Error).message}`, 3000)
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

/* 统计行固定高度：没有数据也占位，日历不上下跳 */
.dl-meta {
  min-height: 1.5em;
  font-variant-numeric: tabular-nums;
}

.dl-cal {
  font-size: var(--desk-fs-sm);
}

/* 待办直接挂在日历下面：分隔线常驻，日期一换内容跟着换，行比可点列表收紧一档 */
.dl-todos {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  min-height: 0;
  margin: 0;
  padding: var(--desk-sp-2) 0 0;
  border-top: 1px solid var(--desk-stroke);
  list-style: none;
  font-size: var(--desk-fs-caption);
}

.dl-todos .mm-line {
  min-height: calc(var(--desk-hit) - 4px);
  cursor: pointer;
}

.dl-open {
  flex: 0 0 auto;
  align-self: flex-start;
}

/* 文档页：实底 + 不做 backdrop-filter，否则会给 fixed 提示菜单造包含块，斜杠菜单会飘/被裁 */
.dl-body {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  background: var(--desk-surface);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  /* 不裁切：斜杠 / 引用提示菜单要能盖到栏外 */
  overflow: visible;
}

/* 高度交给 Protyle 自己（.protyle 是 flex 列，内容区自己滚），这里不抢 overflow */
.dl-protyle {
  width: 100%;
  height: 100%;
  padding: var(--desk-detail-pad);
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
