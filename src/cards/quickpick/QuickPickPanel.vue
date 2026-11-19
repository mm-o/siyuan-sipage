<template>
  <div class="qp-panel desk-seq desk-panel-row">
    <!-- 左：已添加（拖动排序 + 垃圾桶） -->
    <section class="qp-col desk-pane is-left">
      <h4 class="qp-sub desk-note">已添加 {{ docs.length }}/8 · 拖动排序</h4>
      <ul class="qp-list">
        <li
          v-for="(d, i) in docs"
          :key="d.id"
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
          <button class="qp-act" type="button" aria-label="移除" @click="removeDoc(d.id)">
            <Trash2 :size="13" :stroke-width="1.9" />
          </button>
        </li>
        <li v-if="!docs.length" class="qp-empty desk-note">右栏点一下文档加入</li>
      </ul>
    </section>

    <!-- 右：搜索 + 最近，点一下加入 -->
    <section class="qp-col desk-pane is-right">
      <form class="qp-search" @submit.prevent="run">
        <input v-model="keyword" class="qp-input" type="text" placeholder="搜文档标题，回车" />
        <GlassButton :icon="Search" label="查找" @click="run" />
      </form>

      <ul class="qp-list">
        <li v-for="d in hits.length ? hits : recent" :key="d.id" class="qp-item" @click="pick(d)">
          <span class="qp-ic" :style="{ background: tint(d.title).soft, color: tint(d.title).color }">
            <FileText :size="13" :stroke-width="2" />
          </span>
          <span class="qp-name desk-ellipsis">{{ d.title }}</span>
          <Plus v-if="!has(d.id)" :size="12" :stroke-width="2.4" class="qp-add" />
          <Check v-else :size="12" :stroke-width="2.4" class="qp-add" />
        </li>
        <li v-if="!hits.length && !recent.length" class="qp-empty desk-note">没有可添加的文档</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { GlassButton } from "@/ui/controls"
import { ref } from "vue"
import { Check, FileText, GripVertical, Plus, Search, Trash2 } from "lucide-vue-next"
import { docs, quickpick, recentDocs, reorderQuick, removeDoc, searchDocs, setSlot, tint, type PickDoc } from "@/core/quickdocs"

const keyword = ref("")
const hits = ref<PickDoc[]>([])
const recent = ref<PickDoc[]>([])
const dragFrom = ref(-1)

const has = (id: string) => docs.value.some((d) => d.id === id)

function drop(to: number) {
  if (dragFrom.value >= 0) reorderQuick(dragFrom.value, to)
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
  if (has(d.id)) return
  setSlot(docs.value.length, d)
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

void quickpick
</script>

<style scoped>


.qp-col {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3);
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
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
  border-radius: var(--desk-r-control);
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-2);
  cursor: pointer;
}

.qp-item:hover {
  background: color-mix(in srgb, var(--desk-accent) 10%, transparent);
}

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



.qp-add {
  flex: none;
  color: var(--desk-accent);
}

.qp-act {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--desk-text-3);
  cursor: pointer;
}

.qp-act:hover {
  background: color-mix(in srgb, var(--desk-accent) 16%, transparent);
  color: var(--desk-accent);
}

.qp-search {
  display: flex;
  gap: var(--desk-sp-1h);
}

.qp-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 5%, transparent);
  color: var(--desk-text);
  font-size: var(--desk-fs-sm);
}


</style>
