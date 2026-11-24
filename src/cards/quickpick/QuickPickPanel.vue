<template>
  <div class="qp-panel desk-seq desk-panel-row">
    <!-- 左：已添加（拖动排序 + 垃圾桶） -->
    <section class="qp-col desk-pane is-left">
      <h4 class="qp-sub desk-note">已添加 {{ docs.length }}/{{ QUICK_SLOTS }} · 拖动排序</h4>
      <ul class="qp-list">
        <li
          v-for="(d, i) in docs"
          :key="i"
          class="qp-item"
          :class="{ 'is-drag': dragFrom === i }"
          draggable="true"
          @dragstart="dragFrom = i"
          @dragover.prevent
          @drop="drop(i)"
          @dragend="dragFrom = -1"
        >
          <span class="qp-grip"><GripVertical :size="13" :stroke-width="2" /></span>
          <span class="qp-ic" :style="{ background: tint(d.title).soft, color: tint(d.title).color }">
            <FileText :size="13" :stroke-width="2" />
          </span>
          <span class="qp-name desk-ellipsis">{{ d.title }}</span>
          <GlassButton :icon="Trash2" label="移除" variant="danger" @click="removeDocAt(state, i)" />
        </li>
        <li v-if="!docs.length" class="qp-empty desk-note">右栏点一下文档加入</li>
      </ul>
    </section>

    <!-- 右：搜索 + 最近，点一下加入 -->
    <section class="qp-col desk-pane is-right">
      <form class="qp-search" @submit.prevent="run">
        <GlassField v-model="keyword" class="qp-input" label="查找文档" placeholder="搜文档标题，回车" />
        <GlassButton :icon="Search" label="查找" @click="run" />
      </form>

      <ul class="qp-list">
        <li v-for="d in hits.length ? hits : recent" :key="d.id" class="qp-item" @click="pick(d)">
          <span class="qp-ic" :style="{ background: tint(d.title).soft, color: tint(d.title).color }">
            <FileText :size="13" :stroke-width="2" />
          </span>
          <span class="qp-name desk-ellipsis">{{ d.title }}</span>
          <span v-if="used(d.id)" class="desk-badge is-on">{{ used(d.id) }}</span>
          <GlassButton :icon="Plus" label="加入" :disabled="full" @click.stop="pick(d)" />
        </li>
        <li v-if="!hits.length && !recent.length" class="qp-empty desk-note">没有可添加的文档</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { GlassButton, GlassField } from "@/ui/controls"
import { computed, ref } from "vue"
import { FileText, GripVertical, Plus, Search, Trash2 } from "lucide-vue-next"
import { QUICK_SLOTS, addDoc, quickOf, recentDocs, removeDocAt, reorderQuick, searchDocs, tint, type PickDoc } from "@/core/quickdocs"

const props = defineProps<{ mode?: string; uid?: string }>()

/* 详情跟着卡片实例走：同一张卡放多张，各配各的 */
const state = quickOf(props.uid || "quickopen")
const docs = computed(() => state.docs)

const keyword = ref("")
const hits = ref<PickDoc[]>([])
const recent = ref<PickDoc[]>([])
const dragFrom = ref(-1)

const used = (id: string) => docs.value.filter((d) => d.id === id).length
const full = computed(() => docs.value.length >= QUICK_SLOTS)

function drop(to: number) {
  if (dragFrom.value >= 0) reorderQuick(state, dragFrom.value, to)
  dragFrom.value = -1
}

async function run() {
  try {
    hits.value = await searchDocs(keyword.value)
  } catch {
    hits.value = []
  }
}

function pick(d: PickDoc) {
  addDoc(state, d)
  keyword.value = ""
  hits.value = []
}

recentDocs(12)
  .then((list) => {
    recent.value = list
  })
  .catch(() => {
    recent.value = []
  })

void state
</script>

<style scoped>

.qp-col {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3);
  min-height: 0;
  overflow: auto;
}

.qp-col.is-left {
  flex: 0 0 216px;
}

.qp-col.is-right {
  flex: 1 1 auto;
}

.qp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
}

.qp-item {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1h);
  height: 32px;
  padding: 0 6px;
  font-size: var(--desk-fs-sm);
}

.qp-col.is-right .qp-item { cursor: pointer; }


.qp-grip {
  display: grid;
  place-items: center;
  width: 14px;
  height: 18px;
  flex: none;
  color: var(--desk-text-3);
  cursor: grab;
}

.qp-item.is-drag {
  opacity: 0.5;
}

.qp-ic {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: var(--desk-r-sm);
}

.qp-search {
  display: flex;
  gap: var(--desk-sp-1h);
}

.qp-input {
  flex: 1 1 auto;
  min-width: 0;
}

</style>
