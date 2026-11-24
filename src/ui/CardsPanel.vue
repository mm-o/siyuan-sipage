<template>
  <div class="set-page">
    <h2 class="set-h2">组件设置</h2>
    <p class="set-p">整屏生效：所有卡片共用这套参数。</p>

    <div class="set-group">
      <h4 class="set-group-title">布局</h4>
      <Slider v-model="a.cell" label="单格边长" :min="CELL_MIN" :max="CELL_MAX" :step="1" suffix="px" :default-value="D.cell" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">动效</h4>
      <div class="set-row">
        <div class="set-label"><b>入场动效</b></div>
        <GlassSwitch v-model="a.motion" label="入场动效" />
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
      <p v-if="isTheme" class="desk-hint">跟随思源：直接用思源当前背景，不叠模糊与遮罩。</p>
      <template v-else>
        <Slider v-model="wallpaper.blur" label="模糊" :min="0" :max="24" suffix="px" />
        <Slider v-model="wallpaper.mask" label="遮罩" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 全局外观参数；预览和恢复默认统一由 SettingsSheet 提供。 */
import { computed } from "vue"
import { GlassSwitch } from "@/ui/controls"
import Slider from "@/ui/Slider.vue"
import { appearance as a, DEFAULT_APPEARANCE as D, CELL_MIN, CELL_MAX, wallpaper } from "@/core/store"

/** 跟随思源不看模糊/遮罩：那两层只服务于照片底片 */
const isTheme = computed(() => wallpaper.type === "theme")
</script>
