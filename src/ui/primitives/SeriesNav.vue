<template>
  <div class="desk-fab">
    <GlassButton :icon="ChevronLeft" label="上一条" @click="series.step('prev')" />
    <GlassButton :icon="ChevronRight" label="下一条" @click="series.step('next')" />
  </div>
</template>

<script setup lang="ts">
/**
 * 序列翻页组（每日一言 / 每日英语 / 每日诗词详情共用）
 *
 * 三张卡的「上一条 / 下一条」完全一致：同一位置（动作条左侧）、同一图标、同一提示。
 * 背景随内容切换、想手动换图用详情动作条里的「换一张背景」。
 */
import { ChevronLeft, ChevronRight } from "lucide-vue-next"
import GlassButton from "./GlassButton.vue"

defineProps<{ series: { step: (dir: "prev" | "next") => Promise<void> } }>()
</script>
