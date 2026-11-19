<template>
  <div class="set-page">
    <h2 class="set-h2">组件设置</h2>
    <p class="set-p">整屏生效：所有卡片共用这套参数。</p>

    <div class="set-group">
      <h4 class="set-group-title">布局</h4>
      <Slider v-model="a.cell" label="单格边长" :min="48" :max="72" :step="4" suffix="px" :default-value="D.cell" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">动效</h4>
      <div class="set-row">
        <div class="set-label"><b>入场动效</b></div>
        <button class="set-switch" :class="{ 'is-on': a.motion }" type="button" role="switch" :aria-checked="a.motion" @click="a.motion = !a.motion">
          <span class="set-switch-knob" />
        </button>
      </div>
      <Slider v-model="a.motionDur" label="入场时长" :min="0" :max="1200" :step="20" suffix="ms" :default-value="D.motionDur" />
      <Slider v-model="a.motionStagger" label="逐块间隔" :min="0" :max="120" :step="5" suffix="ms" :default-value="D.motionStagger" />
      <Slider v-model="a.motionChar" label="逐字间隔" :min="0" :max="80" :step="2" suffix="ms" :default-value="D.motionChar" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">卡片</h4>
      <Slider v-model="a.radius" label="圆角" :min="0" :max="32" :step="2" suffix="px" :default-value="D.radius" />
      <Slider v-model="a.blur" label="玻璃模糊" :min="0" :max="40" :step="2" suffix="px" :default-value="D.blur" />
      <Slider v-model="a.opacity" label="玻璃不透明度" :min="0.15" :max="1" :step="0.02" suffix="%" :scale="100" :default-value="D.opacity" />
      <Slider v-model="a.shadow" label="阴影" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" :default-value="D.shadow" />
      <Slider v-model="a.lift" label="悬浮位移" :min="0" :max="6" :step="1" suffix="px" :default-value="D.lift" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">弹窗</h4>
      <Slider v-model="a.paneOpacity" label="栏不透明度" :min="0.6" :max="1" :step="0.02" suffix="%" :scale="100" :default-value="D.paneOpacity" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">壁纸</h4>
      <Slider v-model="wallpaper.blur" label="模糊" :min="0" :max="24" suffix="px" />
      <Slider v-model="wallpaper.mask" label="遮罩" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" />
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
import Slider from "@/ui/Slider.vue"
import {appearance as a, DEFAULT_APPEARANCE as D, resetAppearance, addToDesk, countOnDesk, removeFromDesk, desk } from "@/core/store"
import { wallpaper } from "@/core/store"
import { wallpaperBg } from "@/core/image"

const previewBg = computed(() => ({
  ...wallpaperBg(wallpaper),
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
.set-page {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-3);
}

.set-h2 {
  margin: 0;
  font-size: var(--desk-fs-title);
  font-weight: 600;
}

.set-p {
  margin: calc(var(--desk-sp-3) * -1 + 2px) 0 0;
  font-size: var(--desk-fs-body);
  color: var(--desk-text-2);
}

/* 分组：标题 + 若干行，行间细线 */
.set-group {
  padding: var(--desk-sp-2) var(--desk-sp-3);
  border-radius: var(--desk-r-md);
  background: color-mix(in srgb, var(--desk-text) 3%, transparent);
}

.set-group-title {
  margin: 0 0 var(--desk-sp-1);
  font-size: var(--desk-fs-body);
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--desk-text);
}

/* 开关行：左标题 + 右开关，与滑轨行同高 */
.set-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-3);
  min-height: 32px;
}

.set-label {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.set-label b {
  font-size: var(--desk-fs-body);
  font-weight: 400;
  color: var(--desk-text-2);
}

.set-switch {
  position: relative;
  flex: none;
  width: 38px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-text) 16%, transparent);
  cursor: pointer;
  transition: background var(--desk-dur-fast) var(--desk-ease);
}

.set-switch.is-on {
  background: var(--desk-accent);
}

.set-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 28%);
  transition: transform var(--desk-dur-fast) var(--desk-ease);
}

.set-switch.is-on .set-switch-knob {
  transform: translateX(16px);
}
</style>
