<template>
  <div class="slot-card is-plain">
    <div class="doc-list desk-seq" :style="{ '--rows': rowsMax }">
      <button
        v-for="(doc, i) in rows"
        :key="i"
        class="doc-row"
        :class="{ 'is-more': !doc }"
        type="button"
        :style="{ '--bg': docColor(i).bg, '--line': docColor(i).line, '--ink': docColor(i).ink }"
        @click="doc && onRow(doc, $event)"
      >
        <component :is="doc ? FileText : Ellipsis" :size="16" :stroke-width="1.8" />
        <span class="doc-title">{{ doc ? doc.title : "更多" }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 快捷打开卡
 * 与最近文档共用 docRows / docColor：行 = 文档 + 末行「更多」，无文档时只剩「更多」。
 */
import { computed } from "vue"
import { Ellipsis, FileText } from "lucide-vue-next"
import { openDoc, quickOf } from "@/core/quickdocs"
import { docColor, docRows } from "@/ui/controls"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

/* 每张卡一份配置：同一张卡放多张，各配各的文档 */
const state = quickOf(props.uid || "quickopen")

const rowsMax = computed(() => Math.max(1, Math.floor(props.h ?? 2)))
const rows = docRows(computed(() => state.docs), computed(() => props.h))

function onRow(doc: { id?: string } | undefined, e: MouseEvent) {
  if (!doc?.id) return
  e.stopPropagation()
  void openDoc(doc.id)
}
</script>
