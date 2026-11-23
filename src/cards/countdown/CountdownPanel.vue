<template>
  <div class="cd-panel desk-seq" :class="{ 'is-detail': narrowDetail }">
    <div class="cd-body">
      <!-- 左：分类 -->
      <aside class="cd-card cd-aside desk-pane is-left">
        <nav class="cd-nav">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.id"
            class="cd-nav-btn"
            :class="{ 'is-active': category === cat.id }"
            type="button"
            @click="pickCategory(cat.id)"
          >
            <span class="cd-nav-icon" :style="{ color: cat.color || undefined }">
              <component :is="cat.icon" :size="19" :stroke-width="1.9" />
            </span>
            <span class="cd-nav-name">{{ cat.name }}</span>
            <span class="cd-nav-count">{{ counts[cat.id] ?? 0 }}</span>
          </button>
        </nav>
      </aside>

      <!-- 中：列表 -->
      <section class="cd-card cd-list desk-pane is-mid">
        <div class="cd-cat-chips">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.id"
            class="cd-cat-chip"
            :class="{ 'is-active': category === cat.id }"
            type="button"
            @click="pickCategory(cat.id)"
          >
            <component :is="cat.icon" :size="14" :stroke-width="1.9" />
            {{ cat.name }}
            <em>{{ counts[cat.id] ?? 0 }}</em>
          </button>
        </div>

        <div class="cd-toolbar">
          <Segmented v-model="filter" :options="FILTERS" class="cd-time-tabs" />
          <GlassButton class="cd-primary" :icon="Plus" label="新建" variant="primary" text @click="startCreate" />
        </div>

        <ul v-if="list.length" class="cd-scroll cd-items">
          <li
            v-for="(item, i) in list"
            :key="item.event.id"
            class="cd-item"
            :class="{ 'is-hero': i === 0, 'desk-content-surface': i !== 0, 'is-selected': item.event.id === selectedId }"
            :style="i === 0 ? { backgroundImage: coverStyleOf(item.event) } : undefined"
            @click="select(item.event.id)"
          >
            <template v-if="i === 0">
              <div class="cd-hero-inner">
                <p class="cd-hero-title">{{ item.event.title }}<span class="cd-hero-prefix">{{ item.prefix }}</span></p>
                <p class="cd-hero-days"><b>{{ item.value }}</b><em>{{ item.unit }}</em></p>
                <p class="cd-hero-date">{{ item.dateText }}</p>
              </div>
            </template>
            <template v-else>
              <span
                class="cd-tile"
                :style="{ background: softOf(categoryOf(item.event.category).color), color: categoryOf(item.event.category).color }"
              >
                <component :is="categoryOf(item.event.category).icon" :size="20" :stroke-width="1.9" />
              </span>
              <span class="cd-row-main">
                <span class="cd-row-title">{{ item.event.title }}</span>
                <span class="cd-row-date">{{ item.dateText }}</span>
              </span>
              <span class="cd-row-days">
                <em>{{ item.prefix }}</em><b>{{ item.value }}</b><em>{{ item.unit }}</em>
              </span>
              <ChevronRight class="cd-row-chevron" :size="15" :stroke-width="2" />
            </template>
          </li>
        </ul>

        <div v-else class="cd-empty">
          <p class="cd-empty-title">还没有倒数日</p>
          <GlassButton class="cd-primary" :icon="Plus" label="新建第一个" variant="primary" text @click="startCreate" />
        </div>
      </section>

      <!-- 右：详情 / 编辑 -->
      <aside class="cd-card cd-detail desk-pane is-right">
        <CountdownDetail
        :current="current"
        :editing="editing"
        v-model:draft="draft"
        :valid="valid"
        v-model:unit="unit"
        @save="save"
        @back="backToList"
        @cancel="cancelEdit"
        @edit="startEdit"
        @remove="removeSelected"
          @pin="togglePinned"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 倒数日详情（三栏，对齐 参考实现 的 daysMatter）
 *
 * 左 200px「分类」竖栏（图标 + 名称 + 数量）｜中间自适应「列表」：分类胶囊（窄屏才显示）+ 时间段
 * 分段控件 + 新建按钮 + 主事件大卡 + 事件行｜右 300px「详情」：封面头 + 标题 + 大数字 + 日/周/月/年
 * 分段 + 目标日/重复/置顶 + 底部「编辑 / 删除」。
 *
 * 编辑不弹二级弹层：详情栏整块切成表单（标题 / 日期 / 分类胶囊 / 重复 / 置顶），保存后回到详情。
 * 数据全在 `core/store.ts` 的 `countdown` 里，这里只做筛选、排序、单位换算（`./countdown.ts`）。
 */
import { GlassButton, Segmented } from "@/ui/controls"
import { computed, ref, watch } from "vue"
import { ChevronRight, Plus } from "lucide-vue-next"
import {
  addCountdownEvent,
  countdown,
  removeCountdownEvent,
  updateCountdownEvent,
  type CountdownCategory,
} from "@/core/store"
import CountdownDetail from "./CountdownDetail.vue"
import {
  blankDraft,
  CATEGORIES,
  categoryCounts,
  categoryOf,
  coverStyleOf,
  draftValid,
  FILTERS,
  softOf,
  viewOf,
  visibleViews,
  type CountdownFilter,
  type CountdownUnit,
} from "./countdown"

/* ── 筛选与选择 ───────────────────────────────────────── */
const category = ref<"all" | CountdownCategory>("all")
const filter = ref<CountdownFilter>("all")
const selectedId = ref("")
const unit = ref<CountdownUnit>("day")

const counts = computed(() => categoryCounts(countdown.events))

/** 分类 + 时间段双重筛选后的列表（排序已在 countdown.ts 里统一） */
const list = computed(() => {
  const byCategory = category.value === "all" ? countdown.events : countdown.events.filter((e) => e.category === category.value)
  return visibleViews(byCategory, filter.value)
})

const current = computed(() => {
  const id = selectedId.value || list.value[0]?.event.id
  if (!id) return null
  const event = countdown.events.find((e) => e.id === id)
  return event ? viewOf(event, unit.value) : null
})

watch(
  () => list.value.map((v) => v.event.id).join(","),
  () => {
    if (!selectedId.value && list.value.length) selectedId.value = list.value[0].event.id
    if (selectedId.value && !list.value.some((v) => v.event.id === selectedId.value)) selectedId.value = list.value[0]?.event.id ?? ""
  },
  { immediate: true },
)

function pickCategory(id: "all" | CountdownCategory) {
  category.value = id
  selectedId.value = ""
  editing.value = false
}
function select(id: string) {
  selectedId.value = id
  editing.value = false
  narrowOpen.value = true
}

/* ── 新建 / 编辑 ──────────────────────────────────────── */
const editing = ref(false)
const editingId = ref("")
const draft = ref(blankDraft())

const valid = computed(() => draftValid(draft.value))

function startCreate() {
  editingId.value = ""
  draft.value = blankDraft(category.value === "all" ? "anniversary" : category.value)
  editing.value = true
  narrowOpen.value = true
}

function startEdit(id: string) {
  const event = countdown.events.find((e) => e.id === id)
  if (!event) return
  editingId.value = id
  draft.value = {
    title: event.title,
    date: event.date,
    category: event.category,
    repeat: event.repeat,
    lunar: !!event.lunar,
    pinned: event.pinned,
  }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editingId.value = ""
}

function save() {
  if (!valid.value) return
  const payload = { ...draft.value, title: draft.value.title.trim() }
  if (editingId.value) {
    updateCountdownEvent(editingId.value, payload)
    selectedId.value = editingId.value
  } else {
    selectedId.value = addCountdownEvent(payload)
    category.value = "all"
    filter.value = "all"
  }
  editing.value = false
  editingId.value = ""
}

function togglePinned(id: string) {
  const event = countdown.events.find((e) => e.id === id)
  if (event) updateCountdownEvent(id, { pinned: !event.pinned })
}

function removeSelected() {
  const id = selectedId.value
  if (!id) return
  removeCountdownEvent(id)
  selectedId.value = ""
  if (editingId.value === id) cancelEdit()
}

/* ── 窄屏：详情盖在列表上（对齐 参考实现 的 568px 行为） ──── */
const narrowOpen = ref(false)
const narrowDetail = computed(() => narrowOpen.value || editing.value)
function backToList() {
  narrowOpen.value = false
  cancelEdit()
}
</script>

<style scoped>
/**
 * 尺寸/间距/圆角照抄 参考实现 的 daysMatter：
 * 页面留白 8、栏间距 8、三栏卡片圆角 20 + 1px 边、列表里主事件 margin 8/12、
 * 行内 44px 图标块、28px 药丸主按钮、28px 分段控件。
 * 颜色走本项目的 `--desk-*`（它的 `--d-*` 与我们的语义一一对应：#fff 面板 / 半透明标签 / #0586ff 主色）。
 */
.cd-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  container-type: inline-size;
  color: var(--desk-text);
}

.cd-body {
  display: flex;
  gap: var(--desk-sp-2);
  height: 100%;
  min-height: 0;
}

/* 三栏仅定义布局，材质与圆角统一由 desk-pane 提供。 */
.cd-card {
  min-height: 0;
  overflow: hidden;
}

/* ── 左：分类 ──────────────────────────────────────────── */
.cd-aside {
  flex: 0 0 var(--desk-aside-w);
  width: var(--desk-aside-w);
  display: flex;
  flex-direction: column;
  padding: var(--desk-sp-2);
}

.cd-nav {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  overflow-y: auto;
}

.cd-nav

.cd-nav-btn {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2h);
  width: 100%;
  padding: var(--desk-sp-2h) 12px;
  font: inherit;
  font-size: var(--desk-fs-lg);
  text-align: left;
}

.cd-nav-icon {
  flex: none;
  display: grid;
  place-items: center;
}

.cd-nav-name {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-nav-count {
  flex: none;
  font-size: var(--desk-fs-sm);
  opacity: 0.6;
}

/* ── 中：列表 ──────────────────────────────────────────── */
.cd-list {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 分类胶囊：宽屏隐藏（左侧已有栏），窄屏才露 */
.cd-cat-chips {
  display: none;
  gap: var(--desk-sp-1h);
  padding: var(--desk-sp-3) var(--desk-sp-3) 0;
  overflow-x: auto;
}

.cd-cat-chips

.cd-cat-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--desk-sp-1);
  height: 30px;
  padding: 0 10px;
  font: inherit;
  font-size: var(--desk-fs-sm);
  white-space: nowrap;
  flex-shrink: 0;
}

.cd-cat-chip em {
  font-style: normal;
  opacity: 0.7;
}

.cd-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3) var(--desk-sp-3) 0;
}

.cd-time-tabs {
  flex: 0 0 auto;
  min-width: var(--desk-aside-w);
}

/* 按钮只保留布局，材质与状态统一由 GlassButton 提供。 */
.cd-primary {
  flex: 0 0 auto;
}

.cd-toolbar .cd-primary {
  margin-left: auto;
}

.cd-scroll {
  min-height: 0;
  overflow-y: auto;
}

.cd-scroll

.cd-items {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  margin: 0;
  padding: 0 var(--desk-sp-3) var(--desk-sp-3);
  list-style: none;
}

/* 主事件大卡：照片封面，圆角与内容行一致。 */
.cd-item.is-hero {
  padding: var(--desk-sp-4);
  border-radius: var(--desk-r-control);
  color: #fff;
  background-color: #0f172a;
  background-size: cover;
  /* 宽而扁的块裁封面：往上偏一点，别正好裁到图片最暗的中段 */
  background-position: center 32%;
  cursor: pointer;
}

.cd-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  min-width: 0;
}

.cd-hero-title {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-1h);
  margin: 0 0 4px;
  font-size: var(--desk-fs-lg);
  color: rgb(255 255 255 / 90%);
}

.cd-hero-prefix {
  font-size: var(--desk-fs-sm);
  color: rgb(255 255 255 / 72%);
}

.cd-hero-days {
  display: flex;
  align-items: baseline;
  margin: 0 0 8px;
  line-height: 1;
}

.cd-hero-days b {
  font-size: 60px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.cd-hero-days em {
  margin-left: var(--desk-sp-1);
  font-size: 24px;
  font-style: normal;
  font-weight: 700;
}

.cd-hero-date {
  margin: 0;
  font-size: var(--desk-fs-sm);
  color: rgb(255 255 255 / 80%);
}

/* 事件行（.dma-row：图标块 44 + 标题 16 + 右侧数字 + 箭头） */
.cd-item:not(.is-hero) {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-3);
  padding: var(--desk-sp-2h) var(--desk-sp-3);
  cursor: pointer;
}

.cd-tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.cd-row-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
}

.cd-row-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--desk-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-row-date {
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-2);
}

.cd-row-days {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-0);
  white-space: nowrap;
}

.cd-row-days b {
  font-size: 28px;
  font-weight: 600;
  color: var(--desk-text);
}

.cd-row-days em {
  font-size: var(--desk-fs-sm);
  font-style: normal;
  color: var(--desk-text-2);
}

.cd-row-chevron {
  flex: none;
  color: var(--desk-text-3);
}

.cd-empty {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-3);
  color: var(--desk-text-2);
}

.cd-empty-title {
  margin: 0;
  font-size: var(--desk-fs-lg);
}

/* ── 右：详情 ──────────────────────────────────────────── */

/* 返回：只有窄屏（详情盖在列表上时）才出现 */

/* 底部动作条（.dma-detail 的 p-3 border-t） */

/* ── 编辑表单 ─────────────────────────────────────────── */

/* 开关（对齐 el-switch：40×22 药丸） */

/* ── 窄屏（<760px）：分类收进胶囊行，详情盖在列表上 ────── */
@container (max-width: 720px) {
  .cd-aside {
    display: none;
  }

  .cd-cat-chips {
    display: flex;
  }

  .cd-panel :deep(.cd-detail-back) {
    display: inline-flex;
  }

  .cd-panel.is-detail .cd-detail {
    display: flex;
    position: absolute;
    inset: 8px;
    z-index: 20;
    width: auto;
  }

}
</style>
