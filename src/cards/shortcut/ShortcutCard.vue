<template>
  <div class="slot-card" :style="bgStyle">
    <div class="slot-grid desk-seq" :style="{ '--cols': g.cols, '--rows': g.rows }">
      <button
        v-for="(s, i) in items"
        :key="i"
        class="slot ariaLabel"
        type="button"
        data-position="north"
        data-tooltip-encoding="none"
        :aria-label="s?.label"
        @click.stop="runShortcut(s)"
      >
        <span class="slot-ic">
          <svg v-if="sprite" aria-hidden="true"><use :xlink:href="'#' + s.icon" /></svg>
          <component :is="s.fallback" v-else :size="18" :stroke-width="1.7" />
        </span>
      </button>

      <!-- 紧跟最后一个图标：打开卡片 -->
      <button class="slot ariaLabel" type="button" data-position="north" data-tooltip-encoding="none" :aria-label="t('card.shortcut.openCard')">
        <span class="slot-ic is-open"><Ellipsis :size="18" :stroke-width="1.9" /></span>
      </button>

      <button v-for="n in blanks" :key="'b' + n" class="slot" type="button" disabled />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 快捷方式卡
 *
 * 段落式尺寸：一个图标占「注册表里的段落」格（快捷方式 = 2 → 2×2 格一个），
 * 因此 4×2 两个、6×6 九个；尺寸由 fitDims 落在段落的倍数上。
 * 纯图标，名称走思源 tooltip（ariaLabel，方向向上）—— 不占版面，图标吃满槽位。
 */
import { computed, onMounted, ref } from "vue"
import { Ellipsis } from "lucide-vue-next"
import { randomCoverUrl } from "@/core/image"
import { t } from "@/core/i18n"
import { getCard } from "@/core/registry"
import { enabledShortcuts, runShortcut, shortcutOf, useSprite, type Shortcut } from "./shortcut"

const props = defineProps<{ size?: string; w?: number; h?: number; uid?: string }>()

const cover = ref("")
const bgStyle = computed(() => (cover.value ? { backgroundImage: `url(${cover.value})` } : {}))

onMounted(() => {
  void randomCoverUrl().then((url) => (cover.value = url))
})

const sprite = useSprite()
/* 每张卡一份：同一张卡放多张，各配各的图标 */
const state = shortcutOf(props.uid || "shortcut")
const g = computed(() => {
  /* 段落取自注册表（快捷方式 = 2）：一个图标占 2×2 格 */
  const step = getCard("shortcut")?.constrain?.step ?? 2
  const cols = Math.max(1, Math.floor((props.w ?? 2) / step))
  const rows = Math.max(1, Math.floor((props.h ?? 2) / step))
  return { cols, rows, count: cols * rows }
})
/* 内容占前 count−1 个槽位，末位留给「打开卡片」 */
const items = computed<Shortcut[]>(() => enabledShortcuts(state).slice(0, Math.max(0, g.value.count - 1)))
const blanks = computed(() => Math.max(0, g.value.count - items.value.length - 1))
</script>

<style scoped>
/* 卡片：照片底 + 一层压暗，图标本身自带彩色底，所以不再需要额外渐变 */
/* 槽位：外观全部来自全局 .slot（与工具按钮同源），这里不再覆盖间距 */

.slot:disabled { cursor: default; }

/* 图标：横竖同源（短边的 84%），圆角与卡片同为边长 10% */
.slot:hover .ic {
  background: rgb(255 255 255 / 28%);
  transform: translateY(-1px);
}

.slot:active .ic {
  transform: scale(0.94);
}

</style>
