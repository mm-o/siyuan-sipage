<template>
<div class="cd-detail-inner">
  <!-- 编辑表单 -->
  <form v-if="editing" class="cd-form" @submit.prevent="save">
    <button class="cd-back" type="button" @click="backToList">
      <ChevronLeft :size="16" :stroke-width="2" />返回
    </button>
    <div class="cd-form-body cd-scroll">
      <label class="cd-field">
        <span class="cd-field-label">标题</span>
        <input v-model="draft.title" class="desk-input" placeholder="例如：妈妈的生日" maxlength="24" />
      </label>
      <label class="cd-field">
        <span class="cd-field-label">日期</span>
        <input v-model="draft.date" class="desk-input" type="date" />
      </label>
      <div class="cd-field">
        <span class="cd-field-label">分类</span>
        <div class="cd-chips">
          <button
            v-for="cat in EVENT_CATEGORIES"
            :key="cat.id"
            class="cd-chip"
            :class="{ 'is-active': draft.category === cat.id }"
            type="button"
            @click="draft.category = cat.id"
          >
            <component :is="cat.icon" :size="13" :stroke-width="2" :style="{ color: cat.color }" />
            {{ cat.name }}
          </button>
        </div>
      </div>
      <div class="cd-field">
        <span class="cd-field-label">重复</span>
        <Segmented v-model="draft.repeat" :options="REPEAT_OPTIONS" />
      </div>
      <div v-if="draft.repeat === 'year'" class="cd-field-row">
        <span class="cd-field-label">按农历（春节、中秋这类）</span>
        <button class="cd-switch" :class="{ 'is-on': draft.lunar }" type="button" role="switch" :aria-checked="!!draft.lunar" @click="draft.lunar = !draft.lunar">
          <span class="cd-switch-knob" />
        </button>
      </div>
      <div class="cd-field-row">
        <span class="cd-field-label">置顶</span>
        <button class="cd-switch" :class="{ 'is-on': draft.pinned }" type="button" role="switch" :aria-checked="draft.pinned" @click="draft.pinned = !draft.pinned">
          <span class="cd-switch-knob" />
        </button>
      </div>
    </div>
    <div class="cd-foot">
      <button class="cd-btn" type="button" @click="cancelEdit">取消</button>
      <button class="cd-btn cd-btn--primary" type="submit" :disabled="!valid">保存</button>
    </div>
  </form>

  <!-- 事件详情 -->
  <template v-else-if="current">
    <button class="cd-detail-back" type="button" @click="backToList">
      <ChevronLeft :size="18" :stroke-width="2" />返回
    </button>
    <div class="cd-detail-head" :style="{ backgroundImage: coverStyleOf(current.event, 'head') }" />
    <div class="cd-detail-body cd-scroll">
      <h2 class="cd-detail-title">
        {{ current.event.title }}<span class="cd-detail-prefix">{{ current.prefix }}</span>
      </h2>
      <p class="cd-detail-days"><b>{{ current.value }}</b><span>{{ current.unit }}</span></p>
      <p class="cd-detail-date">{{ current.dateText }}</p>
      <Segmented v-model="unit" :options="UNITS" class="cd-unit-tabs" />
      <div class="cd-meta">
        <div class="cd-meta-row">
          <span class="cd-meta-key">目标日</span>
          <span class="cd-meta-val">{{ current.dateText }}</span>
        </div>
        <div class="cd-meta-row">
          <span class="cd-meta-key">重复</span>
          <span class="cd-meta-val">{{ repeatText(current.event) }}</span>
        </div>
        <div class="cd-meta-row">
          <span class="cd-meta-key">置顶</span>
          <button
            class="cd-switch"
            :class="{ 'is-on': current.event.pinned }"
            type="button"
            role="switch"
            :aria-checked="current.event.pinned"
            @click="togglePinned(current.event.id)"
          >
            <span class="cd-switch-knob" />
          </button>
        </div>
      </div>
    </div>
    <div class="cd-foot">
      <button class="cd-btn cd-btn--primary cd-btn--grow" type="button" @click="startEdit(current.event.id)">
        <Pencil :size="15" :stroke-width="2" />编辑
      </button>
      <button class="cd-btn cd-btn--danger" type="button" aria-label="删除" @click="removeSelected">
        <Trash2 :size="16" :stroke-width="2" />
      </button>
    </div>
  </template>

  <div v-else class="cd-detail-empty">
    <CalendarDays :size="28" :stroke-width="1.6" />
    <p>选择事件查看详情</p>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * 倒数日详情右栏（新建/编辑表单 + 事件详情）
 *
 * 从 CountdownPanel 抽出来的：面板只管左分类与中列表，右栏自成一体。
 * 状态从 props 进（draft 是父组件的 reactive 对象，直接改字段），动作走 emit。
 */
import { computed, reactive, watch } from "vue"
import { CalendarDays, ChevronLeft, Pencil, Trash2 } from "lucide-vue-next"
import { Segmented } from "@/ui/controls"
import {
  EVENT_CATEGORIES,
  REPEAT_OPTIONS,
  UNITS,
  coverStyleOf,
  repeatText,
  type CountdownEvent,
  type CountdownUnit,
} from "./countdown"

const props = defineProps<{
  current: { event: CountdownEvent; prefix: string; value: number; unit: string; dateText: string } | null
  editing: boolean
  draft: Omit<CountdownEvent, "id">
  valid: boolean
  unit: CountdownUnit
}>()

const emit = defineEmits<{
  save: []
  back: []
  cancel: []
  edit: [string]
  remove: []
  pin: [string]
  "update:unit": [CountdownUnit]
  "update:draft": [Omit<CountdownEvent, "id">]
}>()

/* 模板沿用父组件的名字，这里做一层薄映射 */
const current = computed(() => props.current)
const editing = computed(() => props.editing)
/** 编辑中的草稿：本地副本，任何字段改动都往父组件同步（父的 valid 才会重算） */
const draft = reactive({ ...props.draft })
watch(
  () => props.draft,
  (v) => Object.assign(draft, v),
  { deep: true },
)
watch(draft, () => emit("update:draft", { ...draft }), { deep: true })
const valid = computed(() => props.valid)
const unit = computed({
  get: () => props.unit,
  set: (v: CountdownUnit) => emit("update:unit", v),
})
const save = () => emit("save")
const backToList = () => emit("back")
const cancelEdit = () => emit("cancel")
const startEdit = (id: string) => emit("edit", id)
const removeSelected = () => emit("remove")
const togglePinned = (id: string) => emit("pin", id)
</script>

<style scoped>
  .cd-detail-inner {
  flex: 0 0 300px;
  width: 300px;
  display: flex;
  flex-direction: column;
  }

  .cd-detail-head {
  flex: none;
  height: 128px;
  background-color: color-mix(in srgb, var(--desk-accent) 10%, transparent);
  background-size: cover;
  background-position: center;
  }

  .cd-detail-back {
  display: none;
  align-items: center;
  gap: var(--desk-sp-1);
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-bottom: 1px solid var(--desk-stroke);
  background: transparent;
  color: var(--desk-text);
  font: inherit;
  font-size: var(--desk-fs-lg);
  cursor: pointer;
  }

  .cd-detail-body {
  flex: 1 1 auto;
  padding: var(--desk-sp-3) 16px;
  }

  .cd-detail-title {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  }

  .cd-detail-prefix {
  flex: none;
  font-size: var(--desk-fs-sm);
  font-weight: 400;
  color: var(--desk-text-2);
  }

  .cd-detail-days {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-0);
  margin: 0 0 4px;
  line-height: 1;
  color: var(--desk-accent);
  }

  .cd-detail-days b {
  font-size: 40px;
  font-weight: 700;
  }

  .cd-detail-days span {
  margin: 0 8px 0 2px;
  font-size: 16px;
  font-weight: 500;
  }

  .cd-detail-date {
  margin: 0 0 12px;
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-2);
  }

  .cd-unit-tabs {
  margin-bottom: var(--desk-sp-4);
  }

  .cd-meta {
  font-size: var(--desk-fs-sm);
  }

  .cd-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  padding: var(--desk-sp-1h) 0;
  border-bottom: 1px solid var(--desk-stroke);
  }

  .cd-meta-key {
  color: var(--desk-text-2);
  }

  .cd-meta-val {
  color: var(--desk-text);
  }

  .cd-foot {
  flex: none;
  display: flex;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3);
  border-top: 1px solid var(--desk-stroke);
  }

  .cd-detail-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-3);
  padding: 0 24px;
  text-align: center;
  color: var(--desk-text-2);
  opacity: 0.8;
  }

  .cd-detail-empty p {
  margin: 0;
  font-size: var(--desk-fs-lg);
  }

  .cd-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  }

  .cd-back {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: var(--desk-sp-1);
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-bottom: 1px solid var(--desk-stroke);
  background: transparent;
  color: var(--desk-text);
  font: inherit;
  font-size: var(--desk-fs-lg);
  cursor: pointer;
  }

  .cd-form-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px;
  }

  .cd-field {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1h);
  }

  .cd-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  }

  .cd-field-label {
  font-size: var(--desk-fs-body);
  color: var(--desk-text-2);
  }

  .cd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--desk-sp-1h);
  }

  .cd-switch {
  flex: none;
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--desk-text) 20%, transparent);
  cursor: pointer;
  transition: background var(--desk-dur-fast) var(--desk-ease);
  }

  .cd-switch.is-on {
  background: var(--desk-accent);
  }

  .cd-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
  transition: transform var(--desk-dur-fast) var(--desk-ease);
  }

  .cd-switch.is-on .cd-switch-knob {
  transform: translateX(18px);
  }

  .cd-detail {
  display: none;
  }

  .cd-detail-back {
  display: inline-flex;
  }
  .cd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--desk-sp-1);
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-md);
  background: transparent;
  color: var(--desk-text);
  font: inherit;
  font-size: var(--desk-fs-body);
  cursor: pointer;
  }

  .cd-btn:hover {
  background: color-mix(in srgb, var(--desk-text) 5%, transparent);
  }

  .cd-btn--grow {
  flex: 1 1 auto;
  }

  .cd-btn--primary {
  border-color: color-mix(in srgb, var(--desk-accent) 45%, transparent);
  background: color-mix(in srgb, var(--desk-accent) 8%, transparent);
  color: var(--desk-accent);
  }

  .cd-btn--primary:hover {
  background: color-mix(in srgb, var(--desk-accent) 14%, transparent);
  }

  .cd-btn--primary:disabled {
  opacity: 0.45;
  cursor: default;
  }

  .cd-btn--danger {
  border-color: color-mix(in srgb, var(--desk-danger) 40%, transparent);
  background: color-mix(in srgb, var(--desk-danger) 8%, transparent);
  color: var(--desk-danger);
  }
  .cd-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--desk-sp-1);
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--desk-stroke);
  border-radius: 999px;
  background: color-mix(in srgb, var(--desk-text) 4%, transparent);
  color: var(--desk-text-2);
  font: inherit;
  font-size: var(--desk-fs-sm);
  cursor: pointer;
  }

  .cd-chip.is-active {
  color: var(--desk-accent);
  border-color: var(--desk-accent);
  background: var(--desk-surface);
  }
</style>
