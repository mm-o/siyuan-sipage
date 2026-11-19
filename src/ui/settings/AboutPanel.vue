<template>
  <div class="desk-panel">
    <div class="head">
      <strong>参考实现 卡片</strong>
      <span class="badge">v{{ version }}</span>
    </div>
    <p class="desk-hint">把 参考实现 的精美卡片重写进思源；卡片在页签与文档里都能用，而且是活的。</p>

    <div class="desk-kv"><span>设计语言</span><em>apple-design-skill（HIG · Liquid Glass）</em></div>
    <div class="desk-kv"><span>卡片来源</span><em>参考实现 逆向还原（本地研究用途）</em></div>
    <div class="desk-kv"><span>运行环境</span><em>思源 {{ frontend }}</em></div>

    <div class="desk-divider" />

    <div class="desk-row">
      <div class="desk-row-main">
        <strong>重置桌面</strong>
        <small>清空卡片，回到默认一张</small>
      </div>
      <button class="desk-btn" @click="resetDesk()">重置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 关于面板：版本、来源、设计依据、重置入口 */
import { getFrontend } from "siyuan"
import { resetDesk } from "@/core/store"
import "@/ui/ui.css"

const version = "2.5.0"
const frontend = getFrontend()
</script>

<style scoped>


.head {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-2);
}

.badge {
  font-size: var(--desk-fs-caption);
  padding: 1px 6px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-accent) 18%, transparent);
}
</style>
