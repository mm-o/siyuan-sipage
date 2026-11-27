<template>
  <section class="lib set-page">
    <h2 class="set-h2">{{ t('ui.lib.title') }}</h2>
    <p class="set-p">{{ t('ui.lib.intro') }}</p>

    <div v-for="group in groups" :key="group.key" class="lib-group">
      <h3 class="lib-group-title">{{ group.label }}</h3>
      <ul class="lib-list">
        <li v-for="def in group.cards" :key="def.id">
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
            <span v-if="def.writable" class="lib-write">{{ t('ui.lib.writable') }}</span>
            <span v-if="countOnDesk(def.id)" class="lib-count desk-badge is-on">{{ countOnDesk(def.id) }}</span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 卡片库（设置第三栏的中间列表）
 *
 * 只负责「选哪张卡」：点一行 → 右侧栏显示预览、已放张数与添加/移除按钮，
 * 添加动作统一在右栏完成，列表本身不再塞两个按钮。
 *
 * 按 `category` 分组：分组顺序固定（registry 的 CARD_CATEGORIES），空分组不显示；
 * 「可写」标记来自 `writable`——能在卡片里直接动思源数据的那几张。
 */
import { computed } from "vue"
import { CARD_CATEGORIES, CARDS } from "@/core/registry"
import { countOnDesk } from "@/core/store"
import { t } from "@/core/i18n"

defineProps<{ selected: string }>()
const emit = defineEmits<{ select: [string] }>()

const groups = computed(() =>
  CARD_CATEGORIES
    .map((key) => ({ key, label: t(`ui.lib.group.${key}`), cards: CARDS.filter((c) => c.category === key) }))
    .filter((group) => group.cards.length > 0),
)
</script>

<style scoped>
.lib-group + .lib-group {
  margin-top: var(--desk-sp-3);
}

.lib-group-title {
  margin: var(--desk-sp-2) 0 var(--desk-sp-1);
  font-size: var(--desk-fs-caption);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--desk-text-3);
}

.lib-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
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

.lib-write {
  flex: none;
  padding: 1px 6px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-accent) 14%, transparent);
  color: var(--desk-accent);
  font-size: var(--desk-fs-caption);
  line-height: 1.5;
}

.lib-count {
  flex: none;
}

/* 标题/说明与其它分区一致 */
</style>
