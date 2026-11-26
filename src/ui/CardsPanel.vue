<template>
  <div class="set-page">
    <h2 class="set-h2">{{ t('ui.cards.title') }}</h2>
    <p class="set-p">{{ t('ui.cards.intro') }}</p>

    <div class="set-group">
      <h4 class="set-group-title">{{ t('ui.cards.groupStyle') }}</h4>
      <Segmented v-model="a.style" :options="STYLE_OPTIONS" />
      <p class="set-p">{{ styleHint }}</p>
    </div>

    <div class="set-group">
      <h4 class="set-group-title">{{ t('ui.cards.groupLayout') }}</h4>
      <Slider v-model="a.cell" :label="t('ui.cards.cell')" :min="CELL_MIN" :max="CELL_MAX" :step="1" suffix="px" :default-value="D.cell" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">{{ t('ui.cards.groupMotion') }}</h4>
      <div class="set-row">
        <div class="set-label"><b>{{ t('ui.cards.motion') }}</b></div>
        <GlassSwitch v-model="a.motion" :label="t('ui.cards.motion')" />
      </div>
      <Slider v-model="a.motionDur" :label="t('ui.cards.motionDur')" :min="0" :max="1200" :step="20" suffix="ms" :default-value="D.motionDur" />
      <Slider v-model="a.motionStagger" :label="t('ui.cards.motionStagger')" :min="0" :max="120" :step="5" suffix="ms" :default-value="D.motionStagger" />
      <Slider v-model="a.motionChar" :label="t('ui.cards.motionChar')" :min="0" :max="80" :step="2" suffix="ms" :default-value="D.motionChar" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">{{ t('ui.cards.groupCard') }}</h4>
      <Slider v-model="a.radius" :label="t('ui.cards.radius')" :min="0" :max="32" :step="2" suffix="px" :default-value="D.radius" />
      <Slider v-model="a.blur" :label="t('ui.cards.blur')" :min="0" :max="40" :step="2" suffix="px" :default-value="D.blur" />
      <Slider v-model="a.opacity" :label="t('ui.cards.opacity')" :min="0.15" :max="1" :step="0.02" suffix="%" :scale="100" :default-value="D.opacity" />
      <Slider v-model="a.shadow" :label="t('ui.cards.shadow')" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" :default-value="D.shadow" />
      <Slider v-model="a.lift" :label="t('ui.cards.lift')" :min="0" :max="6" :step="1" suffix="px" :default-value="D.lift" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">{{ t('ui.cards.groupPane') }}</h4>
      <Slider v-model="a.paneOpacity" :label="t('ui.cards.paneOpacity')" :min="0.6" :max="1" :step="0.02" suffix="%" :scale="100" :default-value="D.paneOpacity" />
    </div>

    <div class="set-group">
      <h4 class="set-group-title">{{ t('ui.cards.groupWallpaper') }}</h4>
      <p v-if="isTheme" class="desk-hint">{{ t('ui.cards.themeHint') }}</p>
      <template v-else>
        <Slider v-model="wallpaper.blur" :label="t('ui.cards.wallBlur')" :min="0" :max="24" suffix="px" />
        <Slider v-model="wallpaper.mask" :label="t('ui.cards.wallMask')" :min="0" :max="0.8" :step="0.02" suffix="%" :scale="100" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 全局外观参数；预览和恢复默认统一由 SettingsSheet 提供。 */
import { computed } from "vue"
import { GlassSwitch, Segmented } from "@/ui/controls"
import Slider from "@/ui/Slider.vue"
import { appearance as a, DEFAULT_APPEARANCE as D, CELL_MIN, CELL_MAX, wallpaper, type DeskStyle } from "@/core/store"
import { t } from "@/core/i18n"

/** 三套材质：质感 / 思源组件 / Material 3 */
const STYLE_OPTIONS: { label: string; value: DeskStyle }[] = [
  { label: t("ui.cards.styleGlass"), value: "liquid" },
  { label: t("ui.cards.styleNative"), value: "native" },
  { label: "MD3", value: "md3" },
]

const STYLE_HINTS: Record<DeskStyle, string> = {
  liquid: t("ui.cards.styleLiquidDesc"),
  native: t("ui.cards.styleNativeDesc"),
  md3: t("ui.cards.styleMd3Desc"),
}

const styleHint = computed(() => STYLE_HINTS[a.style] ?? "")

/** 跟随思源不看模糊/遮罩：那两层只服务于照片底片 */
const isTheme = computed(() => wallpaper.type === "theme")
</script>
