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
 * 最近文档卡
 * 行 = 文档 + 末行「更多」；无文档时只剩「更多」一行；打开详情靠末行冒泡到卡片。
 */
import { computed, onMounted, ref } from "vue"
import { Ellipsis, FileText } from "lucide-vue-next"
import { openDoc, recentDocs, type PickDoc } from "@/core/quickdocs"
import { docColor, docRows } from "@/ui/controls"

const props = defineProps<{ size?: string; w?: number; h?: number }>()

const list = ref<PickDoc[]>([])
const rowsMax = computed(() => Math.max(1, Math.floor(props.h ?? 2)))
const rows = docRows(
  list,
  computed(() => {
    const h = props.h ?? 2
    const w = props.w ?? 4
    /* 行数 = 高度 + 2（留一行给「更多」），夹在 3~6 行 */
    return Math.min(6, Math.max(3, Math.floor(h) + 2))
  }),
)

/** 有文档 → 打开文档并阻止冒泡；「更多」→ 放行，冒泡到卡片打开详情 */
function onRow(doc: { id?: string } | undefined, e: MouseEvent) {
  if (!doc?.id) return
  e.stopPropagation()
  void openDoc(doc.id)
}

async function load() {
  try {
    list.value = await recentDocs(8)
  } catch {
    list.value = []
  }
}

onMounted(async () => {
  await load()
  if (!list.value.length) window.setTimeout(load, 1200)
})
</script>
