<template>
  <section class="lib set-page">
    <h2 class="set-h2">卡片库</h2>
    <p class="set-p">点一行选中，右侧预览并添加。</p>

    <ul class="lib-list">
      <li v-for="def in CARDS" :key="def.id">
        <button
          class="lib-row"
          :class="{ 'is-active': def.id === selected }"
          type="button"
          @click="emit('select', def.id)"
        >
          <span class="lib-icon"><component :is="def.icon" :size="16" :stroke-width="1.7" /></span>
          <span class="lib-main">
            <b>{{ def.name }}</b>
            <small>{{ def.desc }}</small>
          </span>
          <span v-if="countOnDesk(def.id)" class="lib-count desk-badge is-on">{{ countOnDesk(def.id) }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * 卡片库（设置第三栏的中间列表）
 *
 * 只负责「选哪张卡」：点一行 → 右侧栏显示预览、已放张数与添加/移除按钮，
 * 添加动作统一在右栏完成，列表本身不再塞两个按钮。
 */
import { CARDS } from "@/core/registry"
import { countOnDesk } from "@/core/store"

defineProps<{ selected: string }>()
const emit = defineEmits<{ select: [string] }>()
</script>

<style scoped>
.lib-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: var(--desk-sp-2) 0 0;
  padding: 0;
  list-style: none;
}

.lib-row {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2h);
  width: 100%;
  min-height: 44px;
  padding: var(--desk-sp-0) var(--desk-sp-2);
  border: 0;
  text-align: left;
  cursor: pointer;
}



.lib-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--desk-r-sm);
  background: color-mix(in srgb, var(--desk-text) 7%, transparent);
  color: var(--desk-text-2);
}

.lib-row.is-active .lib-icon {
  color: var(--desk-accent);
}

.lib-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}

.lib-main b {
  font-size: var(--desk-fs-body);
  font-weight: 500;
}

.lib-main small {
  overflow: hidden;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-count {
  flex: none;
}

/* 标题/说明与其它分区一致 */
</style>
