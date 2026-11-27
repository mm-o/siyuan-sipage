<template>
  <div class="qn-card">
    <header class="qn-head">
      <span class="qn-target desk-ellipsis" :title="targetLabel">{{ targetLabel }}</span>
      <span class="qn-count">{{ t("card.quicknote.count", { n: count }) }}</span>
    </header>

    <!-- 输入区拦住点击与拖动：点输入框不该弹详情，整理模式下也不该被拖走 -->
    <form class="qn-form" @submit.prevent="submit" @click.stop @pointerdown.stop>
      <GlassField
        v-model="draft"
        class="qn-input"
        :label="t('card.quicknote.label')"
        :placeholder="t('card.quicknote.placeholder')"
        :disabled="writing"
      />
      <GlassButton type="submit" :icon="CornerDownLeft" :label="t('card.quicknote.save')" :disabled="!draft.trim() || writing" />
    </form>

    <ul v-if="rows.length" class="qn-history" @click.stop>
      <li v-for="row in rows" :key="row.at" class="qn-row">
        <button class="qn-row-btn" type="button" :title="t('card.quicknote.openTarget')" @click="open(row)">
          <span class="qn-time">{{ timeOf(row.at) }}</span>
          <span class="qn-text desk-ellipsis">{{ row.text }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="qn-hint desk-ellipsis">{{ t("card.quicknote.empty") }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * 快速记录卡（桌面）
 *
 * 只做一件事：写一行 → 追加到目标文档末尾。目标默认「今天的日记」，
 * 想钉在别的文档上在详情里选；历史只做提示（我刚刚记了什么），点击回到那篇文档。
 *
 * 行数按格子高度给：h≥6 才出历史，最多 4 行——一行都不许切成两半。
 */
import { computed, ref } from "vue"
import { CornerDownLeft } from "lucide-vue-next"
import { GlassButton, GlassField, toast } from "@/ui/controls"
import { openDoc } from "@/core/quickdocs"
import { t } from "@/core/i18n"
import { appendNote, quickNoteOf, todayCount, type NoteRecord } from "./quicknote"
import "./styles.css"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

/* 每张卡一份：目标、格式、历史各卡各的 */
const state = quickNoteOf(props.uid || "quicknote")

const draft = ref("")
const writing = ref(false)

/**
 * 标题只做展示，不查文档：没钉住就写「今天的日记」。
 * 卡片渲染时绝不调 ensureDaily —— 那会凭空建出一篇日记，用户只是想看一眼桌面。
 */
const targetLabel = computed(() => state.target?.title || t("card.quicknote.targetToday"))

const count = computed(() => todayCount(state))
const rows = computed(() => {
  const max = Math.max(0, Math.min(4, Math.floor(((props.h ?? 6) - 4) / 2)))
  return state.history.slice(0, max)
})

const timeOf = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

async function submit() {
  const text = draft.value.trim()
  if (!text || writing.value) return
  writing.value = true
  try {
    const target = await appendNote(state, text)
    draft.value = ""
    toast(t("card.quicknote.saved", { title: target.title }))
  } catch (e) {
    toast(t("card.quicknote.failed", { msg: String((e as Error)?.message || e) }))
  } finally {
    writing.value = false
  }
}

function open(row: NoteRecord) {
  void openDoc(row.id)
}
</script>
