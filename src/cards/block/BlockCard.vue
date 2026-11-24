<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { blockOf } from "./block"
import { mountProtyle } from "./block"
import "./styles.css"

/**
 * 思源块卡片：用内核 Protyle 渲染（自定义块只有它能挂载），只显示块本体。
 * 全屏切换会重建宿主节点，所以 host 变化与 fullscreenchange 都要重挂一次。
 */
const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

/* 每张卡一份：同一张卡放多张，各显示各的块 */
const blockState = blockOf(props.uid || "block")

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

onMounted(() => {
  render()
  document.addEventListener("fullscreenchange", render)
})
watch(host, render, { flush: "post" })
watch(() => blockState.id, render)
onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer)
  document.removeEventListener("fullscreenchange", render)
  handle?.destroy?.()
  handle = null
})
</script>

<template>
  <div class="bk-card">
    <div ref="host" class="bk-body db-block desk-seq" />
    <p v-if="!blockState.id" class="bk-empty">点开选择要显示的块</p>
  </div>
</template>

<style scoped>
.bk-card {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--desk-text);
}

.bk-body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: clamp(8px, 4.5cqw, 14px);
  font-size: clamp(10px, 3.1cqh, 13px);
  line-height: 1.65;
}

.bk-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}
</style>
