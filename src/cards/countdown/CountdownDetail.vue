<template>
<div class="cd-detail-inner">
  <!-- 编辑表单 -->
  <form v-if="editing" class="cd-form" @submit.prevent="save">
    <GlassButton class="cd-back" :icon="ChevronLeft" :label="t('card.countdown.back')" text @click="backToList" />
    <div class="cd-form-body cd-scroll">
      <label class="cd-field">
        <span class="cd-field-label">{{ t("card.countdown.fieldTitle") }}</span>
        <GlassField v-model="draft.title" :label="t('card.countdown.titleLabel')" :placeholder="t('card.countdown.titlePlaceholder')" maxlength="24" />
      </label>
      <label class="cd-field">
        <span class="cd-field-label">{{ t("card.countdown.fieldDate") }}</span>
        <GlassField v-model="draft.date" :label="t('card.countdown.dateLabel')" type="date" />
      </label>
      <div class="cd-field">
        <span class="cd-field-label">{{ t("card.countdown.fieldCategory") }}</span>
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
        <span class="cd-field-label">{{ t("card.countdown.fieldRepeat") }}</span>
        <Segmented v-model="draft.repeat" :options="REPEAT_OPTIONS" />
      </div>
      <div v-if="draft.repeat === 'year'" class="cd-field-row">
        <span class="cd-field-label">{{ t("card.countdown.lunarHint") }}</span>
        <GlassSwitch v-model="draft.lunar" :label="t('card.countdown.lunarSwitch')" />
      </div>
      <div class="cd-field-row">
        <span class="cd-field-label">{{ t("card.countdown.pinned") }}</span>
        <GlassSwitch v-model="draft.pinned" :label="t('card.countdown.pinSwitch')" />
      </div>
    </div>
    <div class="cd-foot">
      <GlassButton class="cd-btn" :label="t('common.cancel')" text @click="cancelEdit" />
      <GlassButton class="cd-btn" :label="t('common.save')" variant="primary" text type="submit" :disabled="!valid" />
    </div>
  </form>

  <!-- 事件详情 -->
  <template v-else-if="current">
    <GlassButton class="cd-detail-back" :icon="ChevronLeft" :label="t('card.countdown.back')" text @click="backToList" />
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
          <span class="cd-meta-key">{{ t("card.countdown.targetDate") }}</span>
          <span class="cd-meta-val">{{ current.dateText }}</span>
        </div>
        <div class="cd-meta-row">
          <span class="cd-meta-key">{{ t("card.countdown.fieldRepeat") }}</span>
          <span class="cd-meta-val">{{ repeatText(current.event) }}</span>
        </div>
        <div class="cd-meta-row">
          <span class="cd-meta-key">{{ t("card.countdown.pinned") }}</span>
          <GlassSwitch :model-value="current.event.pinned" :label="t('card.countdown.pinSwitch')" @update:model-value="togglePinned(current.event.id)" />
        </div>
      </div>
    </div>
    <div class="cd-foot">
      <GlassButton class="cd-btn cd-btn--grow" :icon="Pencil" :label="t('card.countdown.edit')" variant="primary" text @click="startEdit(current.event.id)" />
      <GlassButton class="cd-btn" :icon="Trash2" :label="t('common.delete')" variant="danger" @click="removeSelected" />
    </div>
  </template>

  <div v-else class="cd-detail-empty">
    <CalendarDays :size="28" :stroke-width="1.6" />
    <p>{{ t("card.countdown.pickHint") }}</p>
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
import { GlassButton, GlassField, GlassSwitch, Segmented } from "@/ui/controls"
import { t } from "@/core/i18n"
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
  flex: 0 0 var(--desk-detail-w);
  width: var(--desk-detail-w);
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
  flex: none;
  align-self: flex-start;
  margin: var(--desk-sp-2);
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
  align-self: flex-start;
  margin: var(--desk-sp-2);
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

  .cd-btn--grow {
  flex: 1 1 auto;
  }
  .cd-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--desk-sp-1);
  height: 30px;
  padding: 0 10px;
  font: inherit;
  font-size: var(--desk-fs-sm);
  }
</style>
