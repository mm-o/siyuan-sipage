<template>
  <div ref="host" class="db-block protyle-view" />
</template>

<script setup lang="ts">
/**
 * 思源内容预览/编辑（块卡、日记卡、日记详情、日历右栏共用）
 *
 * 只负责「给一个文档/块 id，把 Protyle 挂上去，切 id 时重挂，卸载时销毁」。
 * 渲染瘦身交给 `.db-block`（隐藏 Protyle 外壳），可编辑与提示菜单的事在 `ui/protyle`。
 */
import { onBeforeUnmount, ref, watch } from "vue"
import { mountProtyle } from "@/ui/protyle"

const props = defineProps<{
  id: string
  editable?: boolean
  full?: boolean
  onInput?: () => void
}>()

const host = ref<HTMLElement>()
let handle: { destroy: () => void } | null = null

function render() {
  handle?.destroy?.()
  handle = null
  const el = host.value
  if (!el) return
  el.replaceChildren()
  if (!props.id) return
  handle = mountProtyle((window as any).siyuan?.ws?.app, el, props.id, {
    editable: props.editable,
    full: props.full,
    onInput: props.onInput,
  })
}

/** 滚到某个块（日记详情里点待办就靠它） */
function reveal(blockId: string) {
  host.value?.querySelector<HTMLElement>(`[data-node-id="${blockId}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })
}

defineExpose({ reveal })

watch([() => props.id, host], render, { flush: "post", immediate: true })
onBeforeUnmount(() => {
  handle?.destroy?.()
  handle = null
})
</script>

<style scoped>
.protyle-view {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
