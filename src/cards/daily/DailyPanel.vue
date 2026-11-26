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

      <ul class="desk-block-list mm-scroll dl-todos">
        <li
          v-for="row in rows"
          :key="row.id"
          class="mm-row mm-line"
          :class="{ 'is-done': row.done }"
          :title="row.text"
          @click="row.kind === 'agenda' ? toggleItem(row.id) : view?.reveal(row.id)"
        >
          <span class="mm-dot" :class="{ 'is-on': row.done }" role="checkbox" :aria-checked="row.done" />
          <span class="mm-text">{{ row.text }}</span>
        </li>
        <li v-if="!rows.length" class="desk-empty is-tight"><EmptyArt /><span>{{ t("card.daily.noTodos") }}</span></li>
      </ul>

      <GlassButton v-if="!preview && state.offset === 0" class="dl-open" text variant="primary" :icon="PenLine" :label="t('card.daily.writeToday')" @click="create" />
    </aside>

    <!-- 右：只读全文（思源 Protyle 渲染） -->
    <section class="dl-body desk-pane is-right">
      <ProtyleView v-if="preview" ref="view" class="dl-protyle" :id="preview.id" editable full :on-input="refreshStat" />
      <div v-if="!preview" class="dl-empty desk-empty">
        <EmptyArt />
        <span>{{ state.offset === 0 ? t("card.daily.emptyTodayWrite") : t("card.daily.noDiary") }}</span>
        <GlassButton text variant="primary" :icon="PenLine" :label="t('card.daily.writeDay')" @click="create" />
      </div>
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
import { computed, ref, watch } from "vue"
import { PenLine } from "lucide-vue-next"
import { EmptyArt, GlassButton, toast } from "@/ui/controls"
import { stateOf } from "@/core/store"
import MiniCalendar from "@/ui/MiniCalendar.vue"
import ProtyleView from "@/ui/ProtyleView.vue"
import { dateKey, dayLabel, itemsOf, toggleItem, weekdayOf } from "@/core/agenda"
import { dailyStat, dailyTodos, dayOf, ensureDaily, loadDaily, previewOf, type DailyPreview } from "@/core/dailyNote"
import { t } from "@/core/i18n"

const props = defineProps<{ mode?: string; uid?: string }>()

const state = stateOf<{ offset: number }>(props.uid || "daily", { offset: 0 })
const date = computed(() => dayOf(state.offset))
const label = computed(() => {
  const key = dateKey(date.value)
  return `${dayLabel(key)} · ${weekdayOf(key)}`
})
const dayNum = computed(() => date.value.getDate())

/** 小日历选中的是哪天：和实例 offset 互转 */
const selectedKey = computed({
  get: () => dateKey(date.value),
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
  if (!p) return t("card.daily.meta", { blocks: 0, words: 0 })
  const open = openTodos.value
  return `${t("card.daily.meta", { blocks: p.blocks, words: p.words })}${open ? ` · ${t("card.daily.openTodos", { n: open })}` : ""}`
})

const preview = ref<DailyPreview | null>(null)
const view = ref<InstanceType<typeof ProtyleView>>()
const todos = computed(() => preview.value?.todos ?? [])

/** 左栏待办 = 那天的日程 + 日记里自己写的待办块（日程可勾，日记块点了滚到正文） */
const rows = computed(() => [
  ...itemsOf(dateKey(date.value)).map((item) => ({ id: item.id, text: item.text, done: item.done, kind: "agenda" as const })),
  ...todos.value.map((todo) => ({ id: todo.id || todo.text, text: todo.text, done: todo.done, kind: "diary" as const })),
])

/** 统计行里的待办数：两个来源的未完成合计 */
const openTodos = computed(() => rows.value.filter((row) => !row.done).length)
async function load() {
  preview.value = await loadDaily(date.value).catch(() => null)
}

/** 停笔后就地刷新字数与待办：不重挂 Protyle，光标不丢 */
async function refreshStat() {
  const note = preview.value
  if (!note) return
  const [stat, list] = await Promise.all([
    dailyStat(note.id).catch(() => null),
    dailyTodos(note.id).catch(() => []),
  ])
  if (stat) {
    note.words = stat.words
    note.blocks = stat.blocks
  }
  note.todos = list
}

/** 新建今天的日记：建完走同一条加载路径，编辑器自己会挂上 */
async function create() {
  try {
    preview.value = await previewOf(await ensureDaily(date.value))
  } catch (e) {
    toast(t("card.daily.createFailed", { msg: (e as Error).message }), 3000)
  }
}

watch(() => state.offset, () => void load())
load()
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

/* 待办直接挂在日历下面：分隔线常驻，日期一换内容跟着换 */
.dl-todos {
  padding-top: var(--desk-sp-2);
  border-top: 1px solid var(--desk-stroke);
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

/* 和其它栏同一套玻璃：提示菜单已经被收养到 body，不再需要为 fixed 定位牺牲背景 */
.dl-body {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
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
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
