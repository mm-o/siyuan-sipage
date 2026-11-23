<script setup lang="ts">
import { GlassButton, GlassField } from "@/ui/controls"
import { onBeforeUnmount, ref, watch } from "vue"
import { Check, Search } from "lucide-vue-next"
import { blockState, blockTitle, setId } from "./block"
import { searchDocs, type PickDoc } from "@/core/quickdocs"
import { mountProtyle } from "./block"
import "./styles.css"

/** 弹窗：上方输入/搜索，下方完整预览（预览区可滚动，所以内容能看全） */
const draft = ref(blockState.id)
const keyword = ref("")
const hits = ref<PickDoc[]>([])
const host = ref<HTMLElement>()
let handle: { destroy: () => void } | null = null

let timer = 0

/** 唯一渲染入口：多源触发（挂载 / host 变化 / 全屏 / 选块）合并成一次，避免双层 Protyle */
function render() {
  if (timer) return
  timer = window.setTimeout(() => {
    timer = 0
    const el = host.value
    if (!el) return
    handle?.destroy?.()
    handle = null
    el.replaceChildren()
    if (!blockState.id) return
    handle = mountProtyle((window as any).siyuan?.ws?.app, el, blockState.id)
  }, 16)
}

async function apply() {
  const id = draft.value.trim()
  if (!id) return
  setId(id, await blockTitle(id).catch(() => ""))
  hits.value = []
  render()
}

async function search() {
  hits.value = await searchDocs(keyword.value).catch(() => [])
}

function pick(id: string, title: string) {
  draft.value = id
  setId(id, title)
  hits.value = []
  render()
}

watch(host, render, { flush: "post" })
onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer)
  handle?.destroy?.()
  handle = null
})
</script>

<template>
  <div class="bk-panel desk-seq">
    <section class="bk-top desk-pane is-mid">
      <form class="row" @submit.prevent="apply">
        <GlassField v-model="draft" class="input" label="思源块 ID" placeholder="粘贴块 ID，回车确认" />
        <GlassButton :icon="Check" label="确认" @click="apply" />
      </form>
      <form class="row" @submit.prevent="search">
        <GlassField v-model="keyword" class="input" label="搜索文档标题" placeholder="或搜文档标题" />
        <GlassButton :icon="Search" label="搜索" @click="search" />
      </form>
      <ul v-if="hits.length" class="hits">
        <li v-for="d in hits" :key="d.id" class="hit" @click="pick(d.id, d.title)">{{ d.title }}</li>
      </ul>
    </section>

    <section class="bk-preview desk-pane is-bottom">
      <div class="scroll">
        <div ref="host" class="db-block" />
      </div>
      <p v-if="!blockState.id" class="bk-empty">输入块 ID 或搜索文档后，这里显示完整预览</p>
    </section>
  </div>
</template>

<style scoped>
.bk-panel {
  display: flex;
  flex-direction: column;
  gap: var(--desk-detail-gap);
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
}

.bk-top {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3);
}

.row {
  display: flex;
  gap: var(--desk-sp-1h);
}

.input {
  flex: 1 1 auto;
  min-width: 0;
}

.hits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--desk-sp-1);
}

.hit {
  max-width: var(--desk-aside-w);
  height: 26px;
  padding: 0 10px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-text) 6%, transparent);
  font-size: var(--desk-fs-sm);
  line-height: 26px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.hit:hover {
  background: color-mix(in srgb, var(--desk-accent) 14%, transparent);
}

/* 预览：占满剩余高度并滚动（卡片裁切、弹窗滚动，两种场景相反） */
.bk-preview {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: var(--desk-sp-3);
}

/* 滚动发生在栏内部，滚动条不会越过圆角 */
.scroll {
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  overscroll-behavior: contain;
}

.scroll::-webkit-scrollbar {
  width: 8px;
}

.scroll::-webkit-scrollbar-thumb {
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-text) 22%, transparent);
}

/* 弹窗里内容按自然高度铺开，滚动交给 .scroll 层 */
.bk-preview :deep(.protyle) {
  padding: 0;
}

.bk-preview :deep(.bk-empty) {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-3);
}
</style>
