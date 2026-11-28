<template>
  <div class="qn-compose" @click.stop @pointerdown.stop>
    <form class="qn-form" @submit.prevent="write(last)">
      <GlassField
        v-model="draft"
        class="qn-input"
        :label="t('card.quicknote.label')"
        :placeholder="t('card.quicknote.placeholder')"
        :disabled="writing"
        @keydown.enter.prevent="write(last)"
      />
    </form>

    <!-- 三个动作：点哪个就用哪种写法直接写入；高亮的那个是回车会用的。
         永远可点：输入为空时点它只把焦点送回输入框并提示一句，不做"点了没反应"的死按钮。 -->
    <div class="qn-acts">
      <button
        v-for="act in ACTS"
        :key="act.format"
        class="qn-act"
        :class="{ 'is-on': last === act.format }"
        type="button"
        :aria-label="t(act.hint)"
        :aria-pressed="last === act.format"
        :title="t(act.hint)"
        @click.stop="pick(act.format)"
      >
        <component :is="act.icon" :size="12" :stroke-width="2" />
        <span>{{ t(act.label) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 快速记录的输入条（卡片与详情共用）
 *
 * 一步就能记：写一行 → 点「文本 / 待办 / 时间」其中之一立刻写入；回车沿用上一次用过的写法。
 * 写入后 `written` 抛给外层，由外层决定怎么刷新文档视图（卡片重挂 Protyle / 详情重挂编辑器）。
 */
import { computed, nextTick, ref } from "vue"
import { Clock, SquareCheck, Type } from "lucide-vue-next"
import { GlassField, toast } from "@/ui/controls"
import { t } from "@/core/i18n"
import { appendNote, quickNoteOf, type NoteFormat, type NoteTarget } from "./quicknote"
import "./styles.css"

const props = defineProps<{ uid: string; autofocus?: boolean }>()
const emit = defineEmits<{ written: [NoteTarget] }>()

const state = quickNoteOf(props.uid)

const rootRef = ref<HTMLElement>()
const draft = ref("")
const writing = ref(false)

const ACTS: { format: NoteFormat; icon: unknown; label: string; hint: string }[] = [
  { format: "text", icon: Type, label: "card.quicknote.act.text", hint: "card.quicknote.write.text" },
  { format: "todo", icon: SquareCheck, label: "card.quicknote.act.todo", hint: "card.quicknote.write.todo" },
  { format: "stamp", icon: Clock, label: "card.quicknote.act.stamp", hint: "card.quicknote.write.stamp" },
]

/** 回车与高亮用「上一次用过的写法」，第一次是纯文本 */
const last = computed(() => state.format)

function focusInput() {
  rootRef.value?.querySelector<HTMLInputElement>("input")?.focus()
}

/** 点按钮：有内容就写；没内容就聚焦输入框并提示，绝不"点了没反应" */
function pick(format: NoteFormat) {
  if (!draft.value.trim()) {
    focusInput()
    toast(t("card.quicknote.needText"))
    return
  }
  void write(format)
}

async function write(format: NoteFormat) {
  const text = draft.value.trim()
  if (!text || writing.value) {
    if (!text) focusInput()
    return
  }
  writing.value = true
  state.format = format
  try {
    const target = await appendNote(state, text, format)
    draft.value = ""
    toast(t("card.quicknote.saved", { title: target.title }))
    emit("written", target)
    /* 连续记：写完把光标放回输入框 */
    await nextTick()
    focusInput()
  } catch (e) {
    toast(t("card.quicknote.failed", { msg: String((e as Error)?.message || e) }))
  } finally {
    writing.value = false
  }
}
</script>
