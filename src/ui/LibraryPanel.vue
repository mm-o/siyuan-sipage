<template>
  <section class="lib">
    <h2 class="set-h2">卡片库</h2>
    <p class="set-p">点「添加」放到桌面；同一张卡可以放多张。</p>

    <ul class="lib-list">
      <li v-for="def in CARDS" :key="def.id" class="lib-row">
        <span class="lib-icon"><component :is="def.icon" :size="16" :stroke-width="1.7" /></span>
        <span class="lib-main">
          <b>{{ def.name }}</b>
          <small>{{ def.desc }}</small>
        </span>
        <span v-if="countOf(def.id)" class="lib-count">×{{ countOf(def.id) }}</span>
        <button
          v-if="countOf(def.id)"
          class="lib-btn is-quiet"
          type="button"
          aria-label="移除一个"
          @click="removeOne(def.id)"
        >
          −
        </button>
        <button class="lib-btn" type="button" @click="add(def.id)">添加</button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * 卡片库（设置第三栏，独立分区）
 *
 * 之前并进「组件设置」里，和滑轨混在一页，确实是两件事：这里是"往桌面上放卡"，那边是"调外观"。
 */
import { addToDesk, countOnDesk, desk, removeFromDesk } from "@/core/store"
import { CARDS } from "@/core/registry"

const countOf = (id: string) => countOnDesk(id)

function add(id: string) {
  addToDesk(id)
}

function removeOne(id: string) {
  for (let i = desk.cards.length - 1; i >= 0; i -= 1) {
    if (desk.cards[i].cardId === id) {
      removeFromDesk(desk.cards[i].uid)
      return
    }
  }
}
</script>

<style scoped>
.lib-list {
  display: flex;
  flex-direction: column;
  margin: var(--desk-sp-2) 0 0;
  padding: 0;
  list-style: none;
}

.lib-row {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2h);
  min-height: 46px;
  padding: var(--desk-sp-1) 0;
  border-bottom: 1px solid var(--desk-stroke);
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
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

.lib-btn {
  height: 26px;
  padding: 0 var(--desk-sp-2h);
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-accent) 12%, transparent);
  color: var(--desk-accent);
  font-size: var(--desk-fs-caption);
  cursor: pointer;
}

.lib-btn:hover {
  background: color-mix(in srgb, var(--desk-accent) 22%, transparent);
}

.lib-btn.is-quiet {
  width: 26px;
  padding: 0;
  background: transparent;
  color: var(--desk-text-3);
}

.lib-btn.is-quiet:hover {
  background: color-mix(in srgb, var(--desk-text) 8%, transparent);
  color: var(--desk-text);
}

/* 标题/说明与「关于」同款 */
.set-h2 {
  margin: 0 0 var(--desk-sp-1);
  font-size: var(--desk-fs-title);
  font-weight: 600;
}

.set-p {
  margin: 0;
  font-size: var(--desk-fs-body);
  color: var(--desk-text-2);
}
</style>
