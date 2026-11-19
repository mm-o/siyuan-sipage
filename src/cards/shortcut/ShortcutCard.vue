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
      <button class="slot ariaLabel" type="button" data-position="north" data-tooltip-encoding="none" aria-label="打开卡片">
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
 * 自由尺寸：每 2×2 格一个图标（slotGrid），放大 2 格自动多一个。
 * 纯图标，名称走思源 tooltip（ariaLabel，方向向上）—— 不占版面，图标吃满槽位。
 */
import { computed, onMounted, ref } from "vue"
import { Ellipsis } from "lucide-vue-next"
import { randomCoverUrl } from "@/core/image"
import { slotGrid } from "@/ui/view"
import { enabledShortcuts, runShortcut, useSprite, type Shortcut } from "./shortcut"

const props = defineProps<{ size?: string; w?: number; h?: number }>()

const cover = ref("")
const bgStyle = computed(() => (cover.value ? { backgroundImage: `url(${cover.value})` } : {}))

onMounted(() => {
  void randomCoverUrl().then((url) => (cover.value = url))
})

const sprite = useSprite()
const g = computed(() => slotGrid(props.w, props.h))
/* 内容占前 count−1 个槽位，末位留给「打开卡片」 */
const items = computed<Shortcut[]>(() => enabledShortcuts().slice(0, Math.max(0, g.value.count - 1)))
const blanks = computed(() => Math.max(0, g.value.count - items.value.length - 1))
</script>

<style scoped>
/* 卡片：照片底 + 一层压暗，图标本身自带彩色底，所以不再需要额外渐变 */
/* 槽位：自己做尺寸参照（cqmin），内边距形成图标之间的缝隙 */
.slot {
  container-type: size;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  padding: clamp(2px, 7%, 6px);
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}

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
