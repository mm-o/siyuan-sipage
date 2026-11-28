<template>
  <section ref="rootRef" class="doc-pane" :class="{ 'desk-pane is-right': !plain }">
    <ProtyleView
      v-if="id"
      ref="view"
      class="doc-pane-view"
      :class="{ 'is-compact': compact }"
      :id="id"
      :editable="editable"
      :full="full"
      :on-input="onInput"
    />
    <div v-else class="doc-pane-empty desk-empty">
      <EmptyArt />
      <span>{{ emptyText }}</span>
      <slot name="empty-action" />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 文档正文区（日记卡片/详情、快速记录卡片/详情共用）
 *
 * 只管「思源 Protyle 装进来之后怎么摆」：pane 材质、内边距、字号、正文色、空态、
 * 以及两个常用动作——滚到某个块（reveal）、滚到末尾（scrollToEnd，记完立刻看到）。
 * 内容与编辑能力全在 `ui/ProtyleView`。
 */
import { ref } from "vue"
import { EmptyArt } from "@/ui/controls"
import ProtyleView from "@/ui/ProtyleView.vue"

const props = defineProps<{
  id: string
  /** 就地编辑（默认只读） */
  editable?: boolean
  /** 保留标题/面包屑/工具栏 */
  full?: boolean
  /** 没有文档时的提示 */
  emptyText?: string
  onInput?: () => void
  /** 只出内容、不自己铺 pane 玻璃：外层已经是 pane 时用它 */
  plain?: boolean
  /** 卡片里用：去掉弹窗级的大内边距 */
  compact?: boolean
}>()

const rootRef = ref<HTMLElement>()
const view = ref<InstanceType<typeof ProtyleView>>()

/** 滚到某个块（日记详情里点待办就靠它） */
function reveal(blockId: string) {
  view.value?.reveal(blockId)
}

/** 滚到末尾：Protyle 自己滚动，找出真正可滚的那一层（宿主管道在响应式内容里） */
function scrollToEnd() {
  const root = rootRef.value
  if (!root) return
  for (const el of [root, ...root.querySelectorAll<HTMLElement>(".protyle-content, .protyle-wysiwyg, .protyle")]) {
    if (el.scrollHeight > el.clientHeight + 4) {
      el.scrollTop = el.scrollHeight
      return
    }
  }
}

defineExpose({ reveal, scrollToEnd })
</script>

<style scoped>
.doc-pane {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 高度交给 Protyle 自己（.protyle 是 flex 列，内容区自己滚），这里不抢 overflow */
.doc-pane-view {
  width: 100%;
  height: 100%;
  padding: var(--desk-detail-pad);
  color: var(--desk-text);
  font-size: var(--desk-fs-body);
}

.doc-pane-view.is-compact {
  padding: 0;
}

.doc-pane-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
