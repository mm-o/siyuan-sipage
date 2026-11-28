<template>
  <div class="qn-card">
    <header class="qn-head">
      <span class="qn-target desk-ellipsis" :title="targetLabel">{{ targetLabel }}</span>
      <span class="qn-count">{{ t("card.quicknote.count", { n: count }) }}</span>
    </header>

    <!-- 输入条与详情共用：写一行 → 点三个动作之一直接落盘 -->
    <QuickNoteComposer :uid="uid" @written="onWritten" />

    <!-- 目标文档本体（思源 Protyle 只读）：写完重挂并滚到底，和日记卡同一套排版 -->
    <DocPane
      ref="pane"
      compact
      plain
      :key="`${docId}-${renderKey}`"
      :id="docId"
      :empty-text="t('card.quicknote.previewEmpty')"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 快速记录卡（桌面）
 *
 * 输入条与详情共用 `QuickNoteComposer`；下半部分直接挂目标文档本体（`ui/DocPane` 只读压缩态），
 * 写完重挂一次并滚到底——和日记卡看到的是同一份文档、同一套排版。
 *
 * 预览不做任何"自动创建"：没有日记就显示提示，渲染阶段绝不调 ensureDaily。
 */
import { computed, nextTick, onMounted, ref } from "vue"
import { t } from "@/core/i18n"
import DocPane from "@/ui/DocPane.vue"
import QuickNoteComposer from "./QuickNoteComposer.vue"
import { todayCount } from "./quicknote"
import { useNoteDoc } from "./useNoteDoc"
import "./styles.css"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

const uid = computed(() => props.uid || "quicknote")
const { state, docId, renderKey, refresh } = useNoteDoc(uid.value)

const pane = ref<InstanceType<typeof DocPane>>()

const targetLabel = computed(() => state.target?.title || t("card.quicknote.targetToday"))
const count = computed(() => todayCount(state))

async function onWritten() {
  await refresh()
  await nextTick()
  pane.value?.scrollToEnd()
}

onMounted(async () => {
  await nextTick()
  pane.value?.scrollToEnd()
})
</script>
