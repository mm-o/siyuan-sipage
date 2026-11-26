<template>
  <div class="desk-photo-card yiyan" :class="[`is-${size}`, { 'desk-detail': isDetail, 'on-photo': isDetail }]">
    <!-- 背景：卡片与详情同一张（core/daily 只随机一次） -->
    <div class="desk-photo" :class="{ 'is-detail': isDetail }" :style="bgStyle" />

    <!-- 详情：玻璃面板 + 文字列 + 动作条（三张内容卡同一结构） -->
    <div v-if="isDetail" class="desk-detail-panel">
      <div class="desk-detail-body desk-seq">
        <p class="desk-detail-quote desk-chars">
          <span v-for="(ch, i) in chars" :key="i" :style="{ '--i': i }">{{ ch }}</span>
        </p>
        <p v-if="quote.from" class="desk-detail-author">{{ quote.from }}</p>
      </div>

      <div class="desk-detail-foot">
        <SeriesNav :series="series" />

        <div class="desk-fab">
          <GlassButton :icon="Heart" :label="liked ? t('card.yiyan.unlike') : t('card.yiyan.like')" :active="liked" @click="liked = !liked" />
          <GlassButton :icon="copied ? Check : Copy" :label="t('card.yiyan.copy')" @click="copy" />
          <GlassButton :icon="ImageIcon" :label="t('card.yiyan.shuffleCover')" @click="series.shuffleCover" />
        </div>
      </div>
    </div>

    <!-- 卡片：与详情同一份文字，垂直居中；逐字浮现 -->
    <div v-else class="desk-photo-body">
      <p class="desk-photo-text quote desk-chars">
        <span v-for="(ch, i) in chars" :key="i" :style="{ '--i': i }">{{ ch }}</span>
      </p>
      <p v-if="quote.from" class="desk-photo-sub from">{{ quote.from }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 每日一言
 *
 * 接口 `${API_BASE}/yiyan/random` —— 每次给一条随机句子，
 * 所以「上一条 / 下一条」就是再取一条；序列与背景由 core/daily 统一管理，
 * 卡片与详情永远是同一句、同一张图。
 */
import { GlassButton, SeriesNav } from "@/ui/controls"
import { computed, ref } from "vue"
import { Check, Copy, Heart, Image as ImageIcon } from "lucide-vue-next"
import { dailySeries } from "@/core/daily"
import { API_BASE } from "@/core/api"
import { photoBg } from "@/ui/controls"
import { copyText } from "@/ui/controls"
import { t } from "@/core/i18n"

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number; mode?: "card" | "detail" }>(), { size: "2x2", mode: "card" })

interface Quote {
  hitokoto: string
  from: string
}

const API = `${API_BASE}/yiyan/random`

const series = dailySeries<Quote>("yiyan", {
  initial: { hitokoto: t("card.yiyan.loading"), from: "" },
  load: async () => {
    try {
      const res = await fetch(API, { headers: { accept: "application/json" } })
      const json = await res.json()
      const d = json?.data
      return d?.hitokoto ? { hitokoto: d.hitokoto, from: d.from || "" } : null
    } catch {
      return { hitokoto: t("card.yiyan.loadFailed"), from: "" }
    }
  },
})

/** 逐字浮现：把一句话拆成单字 */
const chars = computed(() => [...(series.item.value?.hitokoto ?? "")])

const quote = series.item
const cover = series.cover
const size = computed(() => props.size)
const isDetail = computed(() => props.mode === "detail")
const bgStyle = computed(() => photoBg(cover.value))

const liked = ref(false)
const copied = ref(false)

async function copy() {
  const text = quote.value.from ? `${quote.value.hitokoto} —— ${quote.value.from}` : quote.value.hitokoto
  await copyText(text)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<style scoped>
/* 字号/行数只跟尺寸相关；结构（照片、留白、居中、行数上限）来自 styles/index.css 的 .desk-photo-* */
.quote {
  -webkit-line-clamp: 4;
}

/* 1×1：只留引文与出处，行数收窄（88px 里 2 行 + 出处刚好放得下） */
.is-mini .quote {
  font-size: var(--desk-fs-card-text);
  -webkit-line-clamp: 2;
}

.is-mini .from {
  font-size: var(--desk-fs-card-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 2×1：高度减半 —— 引文两行 + 出处一行 */
.is-wide:not(.is-big) .quote {
  -webkit-line-clamp: 2;
}

.is-wide:not(.is-big) .from {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 宽卡：，引文 3 行（字号由 styles/index.css 的 .is-wide.is-big .desk-photo-text 统一给） */
.is-wide.is-big .quote {
  -webkit-line-clamp: 3;
}

.is-wide.is-big .from {
  font-size: var(--desk-fs-card-meta);
}
</style>
