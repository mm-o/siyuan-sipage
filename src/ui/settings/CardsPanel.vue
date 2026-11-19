<template>
  <div class="desk-panel panel">
    <!-- 预览：与壁纸面板同构 —— 顶部一块「真实底片」，改参数立刻看到 -->
    <div class="desk-preview" :style="previewBg">
      <div class="preview-card" :style="previewCard">
        <span class="pc-date">2026.11.13 星期五</span>
        <span class="pc-big">13</span>
        <span class="pc-line" />
        <span class="pc-quote" />
        <span class="pc-quote short" />
      </div>
      <span class="desk-preview-tag">{{ tag }}</span>
    </div>

    <h4 class="desk-section-title">布局</h4>
    <h4 class="desk-section-title">动效</h4>
    <div class="row-inline">
      <span>入场动效</span>
      <button class="desk-btn" @click="a.motion = !a.motion">{{ a.motion ? "开" : "关" }}</button>
    </div>
    <Slider v-model="a.motionDur" label="入场时长" :min="0" :max="1200" :step="20" suffix="ms" :default-value="D.motionDur" />
    <Slider v-model="a.motionStagger" label="逐块间隔" :min="0" :max="120" :step="5" suffix="ms" :default-value="D.motionStagger" />
    <Slider v-model="a.motionChar" label="逐字间隔" :min="0" :max="80" :step="2" suffix="ms" :default-value="D.motionChar" />

    <h4 class="desk-section-title">布局</h4>
    <Slider v-model="a.cell" label="单格边长" :min="48" :max="72" :step="4" suffix="px" :default-value="D.cell" />

    <h4 class="desk-section-title">卡片</h4>
    <Slider v-model="a.radius" label="圆角" :min="0" :max="32" :step="2" suffix="px" :default-value="D.radius" />
    <Slider v-model="a.blur" label="玻璃模糊" :min="0" :max="40" :step="2" suffix="px" :default-value="D.blur" />
    <Slider
      v-model="a.opacity"
      label="玻璃不透明度"
      :min="0.15"
      :max="1"
      :step="0.02"
      suffix="%"
      :scale="100"
      :default-value="D.opacity"
    />
    <Slider v-model="a.shadow" label="阴影" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" :default-value="D.shadow" />
    <Slider v-model="a.lift" label="悬浮位移" :min="0" :max="6" :step="1" suffix="px" :default-value="D.lift" />

    <h4 class="desk-section-title">弹窗</h4>
    <Slider
      v-model="a.paneOpacity"
      label="栏不透明度"
      :min="0.6"
      :max="1"
      :step="0.02"
      suffix="%"
      :scale="100"
      :default-value="D.paneOpacity"
    />

    <h4 class="desk-section-title">壁纸</h4>
    <Slider v-model="wallpaper.blur" label="模糊" :min="0" :max="24" suffix="px" />
    <Slider v-model="wallpaper.mask" label="遮罩" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" />

    <div class="foot">
      <span class="desk-hint">双击滑轨恢复默认</span>
      <button class="desk-btn" @click="resetAll">恢复默认</button>
    </div>
    <h4 class="desk-section-title">卡片库</h4>
    <p class="desk-hint">同一张卡可以添加多次；尺寸与位置在桌面「整理模式」里调整。</p>

  <div v-for="def in CARDS" :key="def.id" class="row">
    <div class="row-main">
      <strong>{{ def.name }}</strong>
      <small>{{ def.desc }}</small>
    </div>

    <span v-if="countOf(def.id)" class="count">×{{ countOf(def.id) }}</span>

    <button
      v-if="countOf(def.id)"
      class="desk-btn"
      aria-label="移除一个"
      @click="removeOne(def.id)"
    >
      −
    </button>

    <button class="desk-btn" @click="add(def.id)">添加</button>
  </div>
  
  </div>
</template>

<script setup lang="ts">
/**
 * 组件设置（全局外观）
 *
 * 布局对齐壁纸面板：顶部预览 + 分组滑轨 + 底部操作。
 * 预览用真实壁纸做底，卡片骨架读取同一批 CSS 变量（core/appearance.ts），
 * 所以拖动任何一项，预览与桌面卡片同时变化。
 *
 * 依据 apple-design-skill：
 *   settings.md  精简设置项、给默认值（双击复位）
 *   sliders.md   最小在左、最大在右、显示精确值
 *   accessibility.md  文本对比度（caption 用 72% 白）
 */
import { computed } from "vue"
import Slider from "@/ui/primitives/Slider.vue"
import { appearance as a, DEFAULT_APPEARANCE as D, resetAppearance, addToDesk, countOnDesk, removeFromDesk } from "@/core/store"
import { wallpaper } from "@/core/store"
import "@/ui/ui.css"

const previewBg = computed(() => ({
  backgroundImage: `url(${wallpaper.resolved || wallpaper.value})`,
  filter: wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined,
}))

/** 卡片骨架：完全由当前外观参数渲染 */
const previewCard = computed(() => ({
  borderRadius: `${a.radius}px`,
  backdropFilter: `blur(${a.blur}px) saturate(1.4)`,
  WebkitBackdropFilter: `blur(${a.blur}px) saturate(1.4)`,
  background: `color-mix(in srgb, var(--desk-glass-fill) ${a.opacity * 100}%, transparent)`,
  boxShadow: `0 10px 30px rgb(0 0 0 / ${a.shadow})`,
}))

const tag = computed(() => `圆角 ${a.radius} · 模糊 ${a.blur} · 玻璃 ${Math.round(a.opacity * 100)}%`)
/** 重置保持一致：外观与壁纸显示一起回到默认 */
function resetAll() {
  resetAppearance()
  wallpaper.blur = 0
  wallpaper.mask = 0.18
}

/* ── 卡片库（原 CardsLibraryPanel）───────────────────── */
import { CARDS } from "@/core/registry"
import "@/ui/ui.css"

const countOf = (id: string) => countOnDesk(id)

function add(id: string) {
  /* 所有卡片统一从 2×2 起步，尺寸在整理模式里拖 */
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
/* 面板骨架与预览条来自 ui.css 的 .desk-panel / .desk-preview；这里只收紧行距 */
.panel {
  gap: 1px;
}

.preview-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 156px;
  height: 98px;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: var(--desk-sp-2h) 12px;
  border: 1px solid var(--desk-stroke);
  color: #fff;
  overflow: hidden;
}

/* 骨架元素：低对比，仅表达层级 */
.pc-date {
  font-size: var(--desk-fs-2xs);
  opacity: 0.7;
}

.pc-big {
  font-size: 30px;
  line-height: 1;
  font-weight: 300;
  opacity: 0.95;
}

.pc-line {
  height: 1px;
  background: rgb(255 255 255 / 26%);
  margin: var(--desk-sp-0) 0;
}

.pc-quote,
.pc-quote.short {
  height: 5px;
  border-radius: var(--desk-r-xs);
  background: rgb(255 255 255 / 34%);
}

.pc-quote.short {
  width: 62%;
}

/* 底部操作条：与设置行同高同节奏，不吸白底 */
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  height: var(--desk-hit);
  margin-top: var(--desk-sp-3);
  padding-top: var(--desk-sp-2);
  border-top: 1px solid var(--desk-stroke);
}

.foot .desk-btn {
  height: 24px;
  padding: 0 10px;
}
  .row {
    display: flex;
    align-items: center;
    gap: var(--desk-sp-3);
    min-height: 42px;
    padding: var(--desk-sp-1) 0;
    border-bottom: 1px solid var(--desk-stroke);
  }
  
  .row-main {
    display: flex;
    flex-direction: column;
    margin-right: auto;
    min-width: 0;
  }
  
  .count {
    font-size: var(--desk-fs-caption);
    color: var(--desk-text-3);
    font-variant-numeric: tabular-nums;
  }
</style>
