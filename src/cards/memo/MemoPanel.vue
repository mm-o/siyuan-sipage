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
      <p class="mm-tip desk-note">{{ t("card.memo.tip") }}</p>
    </aside>

    <!-- 中：列表 -->
    <section class="mm-list-pane desk-pane is-mid">


      <header class="desk-block-head mm-bar">
        <b>{{ current.name }}</b>
        <span>{{ current.hint }}</span>
        <span class="desk-block-grow" />
        <GlassButton v-if="state.group === 'done'" :icon="Trash2" :label="t('card.memo.clearDone')" variant="danger" @click="clearDone" />
      </header>

      <ul class="desk-block-list mm-scroll">
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
              :aria-label="row.item.done ? t('common.markUndone') : t('common.markDone')"
              @click.stop="toggleItem(row.item.id)"
            />
            <span class="mm-text">{{ row.item.text }}</span>
            <span v-if="row.item.time" class="mm-time">{{ row.item.time }}</span>
            <span v-if="row.badge" class="desk-badge">{{ row.badge }}</span>
            <GlassButton :icon="X" :label="t('common.delete')" variant="danger" @click.stop="drop(row.item.id)" />
          </li>
        </template>
        <li v-if="!listRows.length" class="desk-empty is-tight"><EmptyArt /><span>{{ current.empty }}</span></li>
      </ul>

      <form v-if="state.group !== 'done'" class="desk-form-row" @submit.prevent="create">
        <GlassField v-model="fresh" class="mm-input" :label="current.add" :placeholder="t('card.memo.inputPlaceholder', { label: current.add })" />
        <GlassButton :icon="Plus" :label="t('common.add')" variant="primary" text :disabled="!fresh.trim()" @click="create" />
      </form>
    </section>

    <!-- 右：编辑（改字段即写模型，没有保存按钮） -->
    <aside class="mm-detail desk-pane is-right">
      <template v-if="active">
        <div class="mm-detail-body mm-scroll">
          <label class="mm-field">
            <span class="mm-field-label">{{ t("common.fieldTitle") }}</span>
            <GlassField :model-value="active.text" :label="t('card.memo.titleLabel')" :placeholder="t('card.memo.titlePlaceholder')" @update:model-value="setText" />
          </label>

          <div class="mm-field-row">
            <label class="mm-field">
              <span class="mm-field-label">{{ t("common.fieldDate") }}</span>
              <GlassField :model-value="active.date" :label="t('card.memo.dateLabel')" type="date" @update:model-value="setDate" />
            </label>
            <label class="mm-field mm-field--time">
              <span class="mm-field-label">{{ t("card.memo.fieldTime") }}</span>
              <GlassField :model-value="active.time" :label="t('card.memo.timeLabel')" type="time" @update:model-value="setTime" />
            </label>
          </div>

          <div class="mm-field">
            <span class="mm-field-label">{{ t("card.memo.fieldMove") }}</span>
            <Chips v-model="quick" :options="QUICK" />
          </div>

          <label class="mm-field mm-field--grow">
            <span class="mm-field-label">{{ t("card.memo.fieldNote") }}</span>
            <GlassField :model-value="active.note" as="textarea" class="mm-note" :label="t('card.memo.fieldNote')" :placeholder="t('card.memo.notePlaceholder')" @update:model-value="setNote" />
          </label>

          <p class="desk-note">
            {{ active.date ? `${dayLabel(active.date)} · ${weekdayOf(active.date)}` : t("card.memo.inboxNoCalendar") }} · {{ t("card.memo.createdAt", { at: stamp(active.at) }) }}
          </p>
        </div>

        <footer class="mm-foot">
          <GlassSwitch :model-value="active.done" :label="t('common.markDone')" @update:model-value="toggleItem(active.id)" />
          <span class="desk-note">{{ active.done ? t("card.memo.statusDone") : t("card.memo.statusOpen") }}</span>
          <span class="desk-block-grow" />
          <GlassButton :icon="Trash2" :label="t('common.delete')" variant="danger" @click="drop(active.id)" />
        </footer>
      </template>

      <div v-else class="mm-detail-empty">
        <StickyNote :size="26" :stroke-width="1.6" />
        <p class="desk-note">{{ t("card.memo.detailEmpty") }}</p>
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
import { Chips, EmptyArt, GlassButton, GlassField, GlassSwitch } from "@/ui/controls"
import { computed, ref, watch } from "vue"
import { AlarmClock, CalendarDays, CircleCheck, Inbox, Plus, StickyNote, Trash2, X } from "lucide-vue-next"
import { t } from "@/core/i18n"
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
  { id: "today", name: t("common.today"), icon: CalendarDays, hint: t("card.memo.todayHint"), empty: t("card.memo.emptyToday"), add: t("card.memo.addToday") },
  { id: "late", name: t("card.memo.groupLate"), icon: AlarmClock, hint: t("card.memo.lateHint"), empty: t("card.memo.emptyLate"), add: t("card.memo.addToday") },
  { id: "upcoming", name: t("card.memo.groupUpcoming"), icon: Inbox, hint: t("card.memo.upcomingHint"), empty: t("card.memo.emptyUpcoming"), add: t("card.memo.addTomorrow") },
  { id: "inbox", name: t("card.memo.groupInbox"), icon: StickyNote, hint: t("card.memo.inboxHint"), empty: t("card.memo.emptyInbox"), add: t("card.memo.addInbox") },
  { id: "done", name: t("card.memo.groupDone"), icon: CircleCheck, hint: t("card.memo.doneHint"), empty: t("card.memo.emptyDone"), add: t("card.memo.addToday") },
] as const

const QUICK = [
  { label: t("common.today"), value: "today" },
  { label: t("common.tomorrow"), value: "tomorrow" },
  { label: t("card.memo.groupInbox"), value: "inbox" },
]


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
            : t("card.memo.sectionNotes")
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

.mm-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-2);
  min-width: 0;
}

.mm-scroll {
  min-height: 0;
  overflow-y: auto;
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

/* 窄窗只收左栏：列表与编辑永远在场 */
/* 窄窗：左栏收成 44px 图标条，分组照样切（不再整栏隐藏） */
@container (max-width: 720px) {
  .mm-side {
    flex: 0 0 44px;
    width: 44px;
    padding: var(--desk-sp-1);
  }

  .mm-tip,
  .mm-nav-name {
    display: none;
  }

  .mm-nav-btn {
    justify-content: center;
    padding: var(--desk-sp-1h) 0;
  }

  .mm-nav-btn .desk-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 10px;
  }

  .mm-nav-btn {
    position: relative;
  }
}
</style>
