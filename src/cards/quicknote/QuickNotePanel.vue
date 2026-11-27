<template>
  <div class="qnp desk-seq desk-panel-row">
    <!-- 左：写入目标 -->
    <section class="qnp-col desk-pane is-left">
      <h4 class="qnp-sub desk-note">{{ t("card.quicknote.target") }}</h4>

      <div class="qnp-target">
        <span class="qnp-target-name desk-ellipsis" :title="pinnedTitle">{{ pinnedTitle }}</span>
        <GlassButton
          v-if="state.target"
          text
          :icon="RotateCcw"
          :label="t('card.quicknote.resetTarget')"
          @click="resetTarget"
        />
        <span v-else class="qnp-tag">{{ t("card.quicknote.targetAuto") }}</span>
      </div>

      <form class="qnp-search" @submit.prevent="run">
        <GlassField
          v-model="keyword"
          class="qnp-input"
          :label="t('card.quicknote.findLabel')"
          :placeholder="t('card.quicknote.findPlaceholder')"
        />
        <GlassButton :icon="Search" :label="t('common.search')" @click="run" />
      </form>

      <ul class="qnp-list desk-seq">
        <li
          v-for="doc in list"
          :key="doc.id"
          class="qnp-item"
          :class="{ 'is-on': state.target?.id === doc.id }"
          @click="pick(doc)"
        >
          <span class="qnp-ic"><FileText :size="13" :stroke-width="2" /></span>
          <span class="qnp-name desk-ellipsis">{{ doc.title }}</span>
          <Check v-if="state.target?.id === doc.id" :size="13" :stroke-width="2.4" />
        </li>
        <li v-if="!list.length" class="qnp-empty desk-empty is-tight">
          <EmptyArt />
          <span>{{ t("card.quicknote.noDoc") }}</span>
        </li>
      </ul>
    </section>

    <!-- 右：写入格式 + 最近记录 -->
    <section class="qnp-col desk-pane is-right">
      <h4 class="qnp-sub desk-note">{{ t("card.quicknote.format") }}</h4>
      <Segmented v-model="format" :options="FORMATS" />

      <h4 class="qnp-sub desk-note">{{ t("card.quicknote.history") }}</h4>
      <ul class="qnp-list desk-seq">
        <li v-for="row in state.history" :key="row.at" class="qnp-item is-link" @click="open(row)">
          <span class="qnp-time">{{ timeOf(row.at) }}</span>
          <span class="qnp-name desk-ellipsis">{{ row.text }}</span>
          <span class="qnp-doc desk-ellipsis">{{ row.title }}</span>
        </li>
        <li v-if="!state.history.length" class="qnp-empty desk-empty is-tight">
          <EmptyArt />
          <span>{{ t("card.quicknote.historyEmpty") }}</span>
        </li>
      </ul>

      <div v-if="state.history.length" class="qnp-foot">
        <GlassButton text variant="danger" :icon="Trash2" :label="t('card.quicknote.clearHistory')" @click="clearHistory(state)" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 快速记录详情
 *
 * 左栏决定"写到哪"：默认今天的日记（写入时现算），也可以搜/选一篇文档钉住。
 * 右栏决定"怎么写"：纯文本 / 待办 / 时间戳，以及最近 8 条记录（点击跳回那篇文档）。
 */
import { computed, ref } from "vue"
import { Check, FileText, RotateCcw, Search, Trash2 } from "lucide-vue-next"
import { EmptyArt, GlassButton, GlassField, Segmented } from "@/ui/controls"
import { openDoc, recentDocs, searchDocs, type PickDoc } from "@/core/quickdocs"
import { t } from "@/core/i18n"
import { clearHistory, quickNoteOf, type NoteFormat, type NoteRecord } from "./quicknote"
import "./styles.css"

const props = defineProps<{ mode?: string; uid?: string }>()

/* 详情跟着卡片实例走：同一张卡放多张，各记各的 */
const state = quickNoteOf(props.uid || "quicknote")

const FORMATS = [
  { label: t("card.quicknote.format.text"), value: "text" },
  { label: t("card.quicknote.format.todo"), value: "todo" },
  { label: t("card.quicknote.format.stamp"), value: "stamp" },
]

const format = computed({
  get: () => state.format,
  set: (value: string) => { state.format = value as NoteFormat },
})

const keyword = ref("")
const hits = ref<PickDoc[]>([])
const recent = ref<PickDoc[]>([])

const list = computed(() => (hits.value.length ? hits.value : recent.value))
const pinnedTitle = computed(() => state.target?.title || t("card.quicknote.targetToday"))
const timeOf = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

async function run() {
  try {
    hits.value = await searchDocs(keyword.value, 12)
  } catch {
    hits.value = []
  }
}

function pick(doc: PickDoc) {
  state.target = { id: doc.id, title: doc.title }
  keyword.value = ""
  hits.value = []
}

function resetTarget() {
  state.target = null
  keyword.value = ""
  hits.value = []
}

function open(row: NoteRecord) {
  void openDoc(row.id)
}

recentDocs(12)
  .then((docs) => { recent.value = docs })
  .catch(() => { recent.value = [] })
</script>
