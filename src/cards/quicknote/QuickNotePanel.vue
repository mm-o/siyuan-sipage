<template>
  <div class="qnp desk-seq desk-panel-row">
    <!-- 左：写到哪 -->
    <section class="qnp-col desk-pane is-left">
      <h4 class="qnp-sub desk-note">{{ t("card.quicknote.target") }}</h4>

      <div class="qnp-target">
        <span class="qnp-target-name desk-ellipsis" :title="pinnedTitle">{{ pinnedTitle }}</span>
        <GlassButton
          v-if="state.target"
          text
          :icon="RotateCcw"
          :label="t('card.quicknote.resetTarget')"
          @click="setTarget(null)"
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
          @click="setTarget(doc)"
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

    <!-- 右：同一套输入条 + 目标文档本体（和日记详情共用 DocPane，可直接编辑） -->
    <section class="qnp-doc desk-pane is-right">
      <header class="qnp-doc-head">
        <span class="qnp-doc-title desk-ellipsis" :title="pinnedTitle">{{ pinnedTitle }}</span>
        <span class="qnp-tag">{{ t("card.quicknote.docEdit") }}</span>
      </header>

      <QuickNoteComposer :uid="uid" class="qnp-doc-compose" @written="onWritten" />

      <DocPane
        ref="pane"
        :key="`${docId}-${renderKey}`"
        :id="docId"
        editable
        full
        :empty-text="t('card.quicknote.previewEmpty')"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 快速记录详情
 *
 * 左栏决定"写到哪"（默认今天的日记，可搜/钉任意文档）；
 * 右栏 = 与卡片同一套输入条 + 目标文档本体（`ui/DocPane`，与日记详情同一套外观与编辑器）。
 */
import { computed, nextTick, ref } from "vue"
import { Check, FileText, RotateCcw, Search } from "lucide-vue-next"
import { EmptyArt, GlassButton, GlassField } from "@/ui/controls"
import DocPane from "@/ui/DocPane.vue"
import { recentDocs, searchDocs, type PickDoc } from "@/core/quickdocs"
import { t } from "@/core/i18n"
import QuickNoteComposer from "./QuickNoteComposer.vue"
import { useNoteDoc } from "./useNoteDoc"
import "./styles.css"

const props = defineProps<{ mode?: string; uid?: string }>()

const uid = computed(() => props.uid || "quicknote")
const { state, docId, renderKey, refresh } = useNoteDoc(uid.value)

const pane = ref<InstanceType<typeof DocPane>>()
const keyword = ref("")
const hits = ref<PickDoc[]>([])
const recent = ref<PickDoc[]>([])

const list = computed(() => (hits.value.length ? hits.value : recent.value))
const pinnedTitle = computed(() => state.target?.title || t("card.quicknote.targetToday"))

async function setTarget(target: PickDoc | null) {
  state.target = target ? { id: target.id, title: target.title } : null
  keyword.value = ""
  hits.value = []
  await refresh()
}

async function onWritten() {
  await refresh()
  await nextTick()
  pane.value?.scrollToEnd()
}

async function run() {
  try {
    hits.value = await searchDocs(keyword.value, 12)
  } catch {
    hits.value = []
  }
}

recentDocs(12)
  .then((docs) => { recent.value = docs })
  .catch(() => { recent.value = [] })
</script>
