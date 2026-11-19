<template>
  <div class="mm-panel desk-seq">
    <div class="mm-pane desk-pane is-left">
      <header class="mm-bar">
        <span class="mm-tab" :class="{ 'is-on': memo.filter === 'all' }" @click="memo.filter = 'all'">全部</span>
        <span class="mm-tab" :class="{ 'is-on': memo.filter === 'todo' }" @click="memo.filter = 'todo'">待办</span>
        <span class="mm-tab" :class="{ 'is-on': memo.filter === 'done' }" @click="memo.filter = 'done'">已完成</span>
        <span class="mm-grow" />
        <GlassButton :icon="Trash2" label="清空已完成" @click="clearDone" />
      </header>

      <ul class="mm-list">
        <li v-for="item in visible" :key="item.id" class="mm-row" :class="{ 'is-done': item.done, 'is-active': item.id === activeId }" @click="activeId = item.id">
          <button class="mm-dot" type="button" :aria-label="item.done ? '标记未完成' : '标记完成'" @click.stop="toggle(item.id)" />
          <span class="mm-text">{{ item.text }}</span>
          <button class="mm-del" type="button" aria-label="删除" @click.stop="remove(item.id)">
            <X :size="14" :stroke-width="1.8" />
          </button>
        </li>
        <li v-if="!visible.length" class="mm-empty">这里还没有内容</li>
      </ul>
    </div>

    <div class="mm-pane desk-pane is-right">
      <template v-if="active">
        <textarea v-model="draft" class="mm-edit" placeholder="写点什么…" @input="update(active.id, draft)" />
        <footer class="mm-foot">
          <span class="mm-time">{{ new Date(active.at).toLocaleString("zh-CN", { hour12: false }) }}</span>
          <GlassButton :icon="Check" label="标记完成" @click="toggle(active.id)" />
        </footer>
      </template>
      <p v-else class="mm-empty">左边选一条，或直接新建</p>

      <form class="mm-new" @submit.prevent="create">
        <input v-model="fresh" class="mm-input" type="text" placeholder="新备忘，回车添加" />
        <GlassButton :icon="Plus" label="添加" @click="create" />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GlassButton } from "@/ui/controls"
import { computed, ref, watch } from "vue"
import { Check, Plus, Trash2, X } from "lucide-vue-next"
import { add, clearDone, memo, remove, toggle, update, visible } from "./memo"

const activeId = ref(visible.value[0]?.id || "")
const draft = ref("")
const fresh = ref("")

const active = computed(() => memo.items.find((i) => i.id === activeId.value))

watch(active, (item) => {
  draft.value = item?.text || ""
}, { immediate: true })

watch(memo, () => {
  if (!memo.items.some((i) => i.id === activeId.value)) activeId.value = memo.items[0]?.id || ""
}, { deep: true })

function create() {
  add(fresh.value)
  fresh.value = ""
  activeId.value = memo.items[0]?.id || ""
}
</script>

<style scoped>
.mm-panel {
  display: flex;
  gap: var(--desk-detail-gap);
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
}

.mm-pane {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-detail-pad);
  min-height: 0;
}

.mm-pane.is-left {
  flex: 1 1 auto;
}

.mm-pane.is-right {
  flex: 0 0 300px;
}

.mm-bar {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1);
}

.mm-tab {
  padding: var(--desk-sp-0) 8px;
  border-radius: var(--desk-r-pill);
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-2);
  cursor: pointer;
}

.mm-tab.is-on {
  background: color-mix(in srgb, var(--desk-accent) 16%, transparent);
  color: var(--desk-accent);
}

.mm-grow {
  flex: 1 1 auto;
}

.mm-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
}

.mm-row {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-1h) 8px;
  border-radius: var(--desk-r-control);
  font-size: var(--desk-fs-body);
  cursor: pointer;
}

.mm-row.is-active {
  background: color-mix(in srgb, var(--desk-accent) 12%, transparent);
}

.mm-dot {
  flex: none;
  width: 14px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--desk-text) 30%, transparent);
  background: transparent;
  cursor: pointer;
}

.mm-row.is-done .mm-dot {
  background: var(--desk-accent);
  border-color: var(--desk-accent);
}

.mm-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-row.is-done .mm-text {
  color: var(--desk-text-3);
  text-decoration: line-through;
}

.mm-del {
  flex: none;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: var(--desk-r-sm);
  background: transparent;
  color: var(--desk-text-3);
  cursor: pointer;
}

.mm-edit {
  flex: 1 1 auto;
  min-height: 0;
  resize: none;
  padding: var(--desk-sp-2h);
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 4%, transparent);
  color: var(--desk-text);
  font-size: var(--desk-fs-body);
  line-height: 1.6;
}

.mm-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-2);
}

.mm-time {
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}

.mm-new {
  display: flex;
  gap: var(--desk-sp-1h);
}

.mm-input {
  flex: 1 1 auto;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 5%, transparent);
  color: var(--desk-text);
  font-size: var(--desk-fs-sm);
}

.mm-empty {
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-3);
}
</style>
