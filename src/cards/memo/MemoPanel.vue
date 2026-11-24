<template>
  <div class="mm-panel desk-seq desk-panel-row">
    <!-- 左：分组（今天 / 逾期 / 即将 / 收件箱 / 已完成） -->
    <aside class="mm-side desk-pane is-left">
      <nav class="mm-nav mm-scroll">
        <button
          v-for="group in GROUPS"
          :key="group.id"
          class="mm-row mm-nav-btn"
          :class="{ 'is-active': state.group === group.id }"
          type="button"
          @click="pick(group.id)"
        >
          <component :is="group.icon" :size="17" :stroke-width="1.8" class="mm-nav-icon" />
          <span class="mm-nav-name">{{ group.name }}</span>
          <span class="desk-badge" :class="{ 'is-on': counts[group.id] > 0 }">{{ counts[group.id] }}</span>
        </button>
      </nav>
      <p class="mm-tip desk-note">带日期的就是日程，没日期的进收件箱；随手点「今天」就排进今天。</p>
    </aside>

    <!-- 中：列表 -->
    <section class="mm-list-pane desk-pane is-mid">
      <Chips v-model="groupChips" :options="GROUP_CHIPS" class="mm-groups" />

      <header class="mm-bar">
        <span class="mm-bar-title">{{ current.name }}</span>
        <span class="mm-bar-hint desk-note">{{ current.hint }}</span>
        <span class="mm-grow" />
        <GlassButton v-if="state.group === 'done'" :icon="Trash2" label="清空已完成" variant="danger" @click="clearDone" />
      </header>

      <ul class="mm-scroll mm-list">
        <template v-for="row in listRows" :key="row.key">
          <li v-if="row.kind === 'date'" class="mm-date">{{ row.text }}</li>
          <li
            v-else
            class="mm-row mm-item mm-line"
            :class="{ 'is-done': row.item.done, 'is-active': row.item.id === activeId }"
            @click="activeId = row.item.id"
          >
            <button
              class="mm-dot"
              type="button"
              role="checkbox"
              :aria-checked="row.item.done"
              :aria-label="row.item.done ? '标记未完成' : '标记完成'"
              @click.stop="toggleItem(row.item.id)"
            />
            <span class="mm-text">{{ row.item.text }}</span>
            <span v-if="row.item.time" class="mm-time">{{ row.item.time }}</span>
            <span v-if="row.badge" class="desk-badge">{{ row.badge }}</span>
            <GlassButton :icon="X" label="删除" variant="danger" @click.stop="drop(row.item.id)" />
          </li>
        </template>
        <li v-if="!listRows.length" class="mm-empty desk-note">{{ current.empty }}</li>
      </ul>

      <form v-if="state.group !== 'done'" class="mm-new" @submit.prevent="create">
        <GlassField v-model="fresh" class="mm-input" :label="current.add" :placeholder="`${current.add}，回车`" />
        <GlassButton :icon="Plus" label="添加" variant="primary" text :disabled="!fresh.trim()" @click="create" />
      </form>
    </section>

    <!-- 右：编辑（改字段即写模型，没有保存按钮） -->
    <aside class="mm-detail desk-pane is-right">
      <template v-if="active">
        <div class="mm-detail-body mm-scroll">
          <label class="mm-field">
            <span class="mm-field-label">标题</span>
            <GlassField :model-value="active.text" label="日程标题" placeholder="要做什么" @update:model-value="setText" />
          </label>

          <div class="mm-field-row">
            <label class="mm-field">
              <span class="mm-field-label">日期</span>
              <GlassField :model-value="active.date" label="日程日期" type="date" @update:model-value="setDate" />
            </label>
            <label class="mm-field mm-field--time">
              <span class="mm-field-label">时间</span>
              <GlassField :model-value="active.time" label="日程时间" type="time" @update:model-value="setTime" />
            </label>
          </div>

          <div class="mm-field">
            <span class="mm-field-label">放到</span>
            <Chips v-model="quick" :options="QUICK" />
          </div>

          <label class="mm-field mm-field--grow">
            <span class="mm-field-label">备注</span>
            <GlassField :model-value="active.note" as="textarea" class="mm-note" label="备注" placeholder="详情、地点、链接…" @update:model-value="setNote" />
          </label>

          <p class="desk-note">
            {{ active.date ? `${dayLabel(active.date)} · ${weekdayOf(active.date)}` : "收件箱（不占日历）" }} · 建于
            {{ stamp(active.at) }}
          </p>
        </div>

        <footer class="mm-foot">
          <GlassSwitch :model-value="active.done" label="标记完成" @update:model-value="toggleItem(active.id)" />
          <span class="desk-note">{{ active.done ? "已完成" : "未完成" }}</span>
          <span class="mm-grow" />
          <GlassButton :icon="Trash2" label="删除" variant="danger" @click="drop(active.id)" />
        </footer>
      </template>

      <div v-else class="mm-detail-empty">
        <StickyNote :size="26" :stroke-width="1.6" />
        <p class="desk-note">左边选一条，或在下面新建</p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
/**
 * 日程备忘详情
 *
 * 三栏：分组 → 条目 → 编辑。日程与备忘在这里是同一张列表的两种身份：
 * 有日期进「今天 / 逾期 / 即将」，没日期进「收件箱」；右栏改日期就在两边移动，
 * 勾掉立刻反映到卡片和日历（同一份 core/agenda 状态）。
 */
import { Chips, GlassButton, GlassField, GlassSwitch } from "@/ui/controls"
import { computed, ref, watch } from "vue"
import { AlarmClock, CalendarDays, CircleCheck, Inbox, Plus, StickyNote, Trash2, X } from "lucide-vue-next"
import { stateOf } from "@/core/store"
import {
  addItem,
  agenda,
  clearDone,
  counts,
  dayKey,
  dayLabel,
  doneList,
  inbox,
  itemsOf,
  overdue,
  patchItem,
  removeItem,
  scheduleItem,
  todayKey,
  toggleItem,
  upcoming,
  weekdayOf,
  type PlanGroup,
  type PlanItem,
} from "@/core/agenda"

const props = defineProps<{ mode?: string; uid?: string }>()

/** 每张日程备忘卡一份：左栏停在哪个分组按实例 uid 存 */
const state = stateOf<{ group: PlanGroup }>(props.uid || "memo", { group: agenda.group })

const GROUPS = [
  { id: "today", name: "今天", icon: CalendarDays, hint: "做完就勾掉", empty: "今天空着，下面加一条", add: "加到今天" },
  { id: "late", name: "逾期", icon: AlarmClock, hint: "过了日子还没勾掉", empty: "没有逾期，很好", add: "加到今天" },
  { id: "upcoming", name: "即将", icon: Inbox, hint: "明天以后", empty: "后面几天还是空的", add: "加到明天" },
  { id: "inbox", name: "收件箱", icon: StickyNote, hint: "只作备忘，不占日历", empty: "随手记的都在这儿", add: "记一条备忘" },
  { id: "done", name: "已完成", icon: CircleCheck, hint: "最近勾掉的在前", empty: "还没有勾掉过", add: "加到今天" },
] as const

const QUICK = [
  { label: "今天", value: "today" },
  { label: "明天", value: "tomorrow" },
  { label: "收件箱", value: "inbox" },
]

/** 窄窗收起左栏后，分组改用一行胶囊（五个选项 Segmented 放不下） */
const GROUP_CHIPS = GROUPS.map((group) => ({ label: group.name, value: group.id }))
const groupChips = computed({
  get: () => state.group,
  set: (value: string | number) => pick(String(value)),
})

const current = computed(() => GROUPS.find((group) => group.id === state.group) || GROUPS[0])

const activeId = ref("")
const active = computed(() => (activeId.value ? visible.value.find((item) => item.id === activeId.value) : undefined))

function pick(id: string) {
  state.group = id as typeof state.group
  activeId.value = ""
}

/* ── 五个分组的内容（今天与逾期带相对日期，即将按天分组）── */

type Row =
  | { kind: "date"; key: string; text: string }
  | { kind: "item"; key: string; item: PlanItem; badge: string }

const visible = computed<PlanItem[]>(() => {
  switch (state.group) {
    case "late":
      return overdue.value
    case "upcoming":
      return upcoming.value
    case "inbox":
      return inbox.value
    case "done":
      return doneList.value
    default:
      return itemsOf(todayKey())
  }
})

const listRows = computed<Row[]>(() => {
  const out: Row[] = []
  let last = ""
  for (const item of visible.value) {
    if (state.group === "upcoming" && item.date !== last) {
      last = item.date
      out.push({ kind: "date", key: `d-${item.date}`, text: `${dayLabel(item.date)} ${weekdayOf(item.date)}` })
    }
    const badge =
      state.group === "late"
        ? dayLabel(item.date)
        : state.group === "done"
          ? item.date
            ? dayLabel(item.date)
            : "备忘"
          : ""
    out.push({ kind: "item", key: item.id, item, badge })
  }
  return out
})

/* 选中项跟列表走：换分组、删掉、勾完都自动落到第一条 */
watch(
  () => [state.group, visible.value.map((item) => item.id).join(",")].join("|"),
  () => {
    if (activeId.value && visible.value.some((item) => item.id === activeId.value)) return
    activeId.value = visible.value[0]?.id || ""
  },
  { immediate: true },
)

/* ── 写模型 ─────────────────────────────────────────────── */

const asText = (value: string | number) => String(value ?? "")

function setText(value: string | number) {
  if (active.value) patchItem(active.value.id, { text: asText(value) })
}
function setNote(value: string | number) {
  if (active.value) patchItem(active.value.id, { note: asText(value) })
}
function setTime(value: string | number) {
  if (active.value) patchItem(active.value.id, { time: asText(value) })
}
function setDate(value: string | number) {
  const item = active.value
  if (item) patchItem(item.id, { date: asText(value) })
}

/** 三个快捷去处：今天 / 明天 / 收件箱；别的日期这些标签都不亮 */
const quick = computed({
  get: () => {
    const date = active.value?.date || ""
    if (!date) return "inbox"
    if (date === todayKey()) return "today"
    if (date === dayKey(1)) return "tomorrow"
    return "other"
  },
  set: (value: string | number) => {
    const item = active.value
    if (!item) return
    scheduleItem(item.id, value === "inbox" ? "" : value === "today" ? todayKey() : dayKey(1))
  },
})

function drop(id: string) {
  removeItem(id)
}

function stamp(at: number) {
  return new Date(at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
}

/* ── 新建：跟着当前分组落到对应的日子 ─────────────────────── */

const fresh = ref("")

function create() {
  const text = fresh.value
  if (!text.trim()) return
  const date = state.group === "inbox" ? "" : state.group === "upcoming" ? dayKey(1) : todayKey()
  const item = addItem({ text, date })
  fresh.value = ""
  if (item) activeId.value = item.id
}
</script>

<style scoped>
.mm-panel {
  container-type: inline-size;
}

/* ── 左：分组 ──────────────────────────────────────────── */
.mm-side {
  flex: 0 0 var(--desk-aside-w);
  width: var(--desk-aside-w);
  display: flex;
  flex-direction: column;
  gap: var(--desk-detail-gap);
  padding: var(--desk-detail-pad);
  min-height: 0;
}

.mm-nav {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
}

.mm-nav-btn {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2h);
  width: 100%;
  padding: var(--desk-sp-1h) var(--desk-sp-3);
  font-size: var(--desk-fs-lg);
  text-align: left;
}

.mm-nav-icon {
  flex: none;
  color: var(--desk-text-2);
}

.mm-nav-btn.is-active .mm-nav-icon {
  color: var(--desk-accent);
}

.mm-nav-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-tip {
  flex: 0 0 auto;
  padding: 0 var(--desk-sp-2);
  line-height: 1.5;
}

/* ── 中：列表 ──────────────────────────────────────────── */
.mm-list-pane {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-detail-pad);
  min-height: 0;
}

/* 分组胶囊只在窄窗出现（宽屏有左栏） */
.mm-groups {
  display: none;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: var(--desk-sp-1);
}

.mm-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-2);
  min-width: 0;
}

.mm-bar-title {
  font-size: var(--desk-fs-title);
  font-weight: var(--desk-fw-semibold);
}

.mm-bar-hint {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-grow {
  flex: 1 1 auto;
}

.mm-scroll {
  min-height: 0;
  overflow-y: auto;
}

.mm-list {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  margin: 0;
  padding: 0;
  list-style: none;
}

.mm-date {
  padding: var(--desk-sp-2) 0 var(--desk-sp-1);
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}

.mm-item {
  min-width: 0;
  padding-right: var(--desk-sp-1);
  cursor: pointer;
}

/* 删除：平时收起来，悬停或选中这一行才出现（图标型危险操作保持中性） */
.mm-item > .gb {
  flex: none;
  opacity: 0;
  transition: opacity var(--desk-dur-fast) var(--desk-ease);
}

.mm-item:is(:hover, .is-active) > .gb,
.mm-item > .gb:focus-visible {
  opacity: 1;
}

.mm-empty {
  padding: var(--desk-sp-3) 0;
}

.mm-new {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1h);
  padding-top: var(--desk-sp-2);
  border-top: 1px solid var(--desk-stroke);
}

.mm-input {
  flex: 1 1 auto;
  min-width: 0;
}

/* ── 右：编辑 ──────────────────────────────────────────── */
.mm-detail {
  flex: 0 0 var(--desk-detail-w);
  width: var(--desk-detail-w);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mm-detail-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2h);
  padding: var(--desk-detail-pad);
}

.mm-field {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  min-width: 0;
}

.mm-field--grow {
  flex: 1 1 auto;
  min-height: 0;
}

.mm-field-row {
  display: flex;
  gap: var(--desk-sp-2);
  min-width: 0;
}

.mm-field--time {
  /* 时间字段只需要「09:30」，余下宽度留给日期 */
  flex: 0 1 34%;
}

.mm-field-label {
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-2);
}

.mm-note {
  flex: 1 1 auto;
  min-height: calc(var(--desk-sp-4) * 5);
  resize: none;
}

.mm-foot {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1h);
  padding: var(--desk-sp-2) var(--desk-detail-pad);
  border-top: 1px solid var(--desk-stroke);
}

.mm-detail-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-2);
  padding: 0 var(--desk-sp-4);
  color: var(--desk-text-3);
}

.mm-detail-empty p {
  margin: 0;
  text-align: center;
}

/* 窄窗：分组栏换成胶囊，再窄只留列表（勾选照常，编辑要宽一点） */
@container (max-width: 720px) {
  .mm-side {
    display: none;
  }

  .mm-groups {
    display: flex;
  }
}

@container (max-width: 460px) {
  .mm-detail {
    display: none;
  }
}
</style>
