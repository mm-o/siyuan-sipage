<template>
  <div class="desk-photo-card en" :class="[`is-${size}`, { 'desk-detail': isDetail, 'on-photo': isDetail }]">
    <!-- 背景：卡片与详情同一张 -->
    <div class="desk-photo" :class="{ 'is-detail': isDetail }" :style="bgStyle" />

    <!-- 详情：玻璃面板 + 文字列 + 动作条（三张内容卡同一结构） -->
    <div v-if="isDetail" class="desk-detail-panel">
      <div class="desk-detail-body">
        <p class="desk-detail-en desk-chars is-fast">
          <span v-for="(w, i) in words" :key="i" :style="{ '--i': i }">{{ w }}&nbsp;</span>
        </p>
        <p v-if="data.note" class="desk-detail-text">{{ data.note }}</p>
      </div>

      <div class="desk-detail-foot">
        <SeriesNav :series="series" />

        <div class="desk-fab">
          <GlassButton :icon="playing ? Pause : Play" :label="playing ? t('card.english.pauseRead') : t('card.english.read')" @click="togglePlay" />
          <GlassButton :icon="copied ? Check : Copy" :label="t('card.english.copy')" @click="copyAll" />
          <GlassButton :icon="BookOpen" :label="t('card.english.dict')" @click="openDict" />
          <GlassButton :icon="ImageIcon" :label="t('card.english.shuffleCover')" @click="series.shuffleCover" />
        </div>
      </div>
    </div>

    <!-- 卡片：与详情同一份文字，垂直居中；朗读键悬浮在右下角 -->
    <div v-else class="desk-photo-body">
      <p class="desk-photo-text line">{{ data.content || t("common.loading") }}</p>
      <p v-if="data.note" class="desk-photo-sub note">{{ data.note }}</p>
    </div>

    <GlassButton
      v-if="!isDetail"
      class="play"
      mini
      :icon="playing ? Pause : Play"
      :label="playing ? t('card.english.pauseRead') : t('card.english.read')"
      @click="togglePlay"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 每日英语
 *
 * 接口 `API_EN` 只按「今天」返回一句（不支持 ?date=），
 * 所以「上一条 / 下一条」用一条本地句库循环：offset 0 = 今天的接口内容，
 * 其余在本地 24 句里循环 —— 离线也有内容可翻。
 * 朗读：接口给了 tts 就播音频，本地句库用系统语音合成。
 */
import { GlassButton, SeriesNav } from "@/ui/controls"
import { computed, onBeforeUnmount, ref } from "vue"
import { BookOpen, Check, Copy, Image as ImageIcon, Pause, Play } from "lucide-vue-next"
import { dailySeries } from "@/core/daily"
import { API_EN } from "@/core/api"
import { photoBg } from "@/ui/controls"
import { copyText } from "@/ui/controls"
import { t } from "@/core/i18n"

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number; mode?: "card" | "detail" }>(), {
  size: "2x2",
  mode: "card",
})

interface English {
  content: string
  note: string
  tts: string
}

const API = API_EN

/** 本地句库：接口一天只给一句，翻页靠它循环（与今天的接口内容互不重复地混在一起） */
// i18n-keep-begin（内容型数据：中英成对的句库，翻译会破坏配对）
const POOL: Array<[content: string, note: string]> = [
  ["The only way to do great work is to love what you do.", "做出伟大工作的唯一方法，是热爱你所做的事。"],
  ["Simplicity is the ultimate sophistication.", "简约是终极的精致。"],
  ["What we think, we become.", "我们所想，即我们所成。"],
  ["Stay hungry, stay foolish.", "求知若饥，虚心若愚。"],
  ["Well begun is half done.", "良好的开端是成功的一半。"],
  ["Knowledge is power.", "知识就是力量。"],
  ["Fortune favors the bold.", "幸运眷顾勇者。"],
  ["Nothing ventured, nothing gained.", "不入虎穴，焉得虎子。"],
  ["Practice makes perfect.", "熟能生巧。"],
  ["Where there is a will, there is a way.", "有志者事竟成。"],
  ["Time and tide wait for no man.", "岁月不待人。"],
  ["All that glitters is not gold.", "闪光的未必都是金子。"],
  ["A friend in need is a friend indeed.", "患难见真情。"],
  ["Rome was not built in a day.", "罗马不是一天建成的。"],
  ["The best way out is always through.", "最好的出路永远是穿过它。"],
  ["In the middle of difficulty lies opportunity.", "困难之中藏着机会。"],
  ["Life is what happens when you're busy making other plans.", "生活就是你忙于计划时发生的事。"],
  ["It always seems impossible until it's done.", "在做成之前，一切看起来都不可能。"],
  ["The future belongs to those who believe in the beauty of their dreams.", "未来属于相信梦想之美的人。"],
  ["We are what we repeatedly do. Excellence is a habit.", "我们反复做的事造就了我们，卓越是一种习惯。"],
  ["Simplicity is prerequisite for reliability.", "简单是可靠的前提。"],
  ["Talk is cheap. Show me the code.", "空谈无益，把代码给我看。"],
  ["The journey is the reward.", "旅程本身就是回报。"],
  ["To be or not to be, that is the question.", "生存还是毁灭，这是一个问题。"],
]
// i18n-keep-end
// i18n-keep-end

const series = dailySeries<English>("english", {
  initial: { content: "", note: "", tts: "" },
  load: async (offset) => {
    if (offset === 0) {
      try {
        const res = await fetch(API)
        const json = await res.json()
        const d = json?.data
        if (d?.content) return { content: d.content, note: d.note || "", tts: d.tts || "" }
      } catch {}
      // 接口挂了就用句库顶上
    }
    const index = (((offset - 1) % POOL.length) + POOL.length) % POOL.length
    const [content, note] = POOL[index]
    return { content, note, tts: "" }
  },
})

/** 逐词浮现：按空格切词（保留标点） */
const words = computed(() => (series.item.value?.content || "").split(/\s+/).filter(Boolean))

const data = series.item
const cover = series.cover
const size = computed(() => props.size)
const isDetail = computed(() => props.mode === "detail")

/** 背景：与另两张卡一致，只用共享的思源本地题头图（跟着内容切换） */
const bgStyle = computed(() => photoBg(cover.value))

const playing = ref(false)
const copied = ref(false)
let audio: HTMLAudioElement | null = null

function stopPlay() {
  audio?.pause()
  audio = null
  window.speechSynthesis?.cancel()
  playing.value = false
}

function togglePlay() {
  if (playing.value) {
    stopPlay()
    return
  }
  if (data.value.tts) {
    audio = new Audio(data.value.tts)
    audio.addEventListener("ended", () => (playing.value = false))
    void audio.play()
    playing.value = true
    return
  }
  // 本地句库没有音频：用系统语音合成
  if (!window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance(data.value.content)
  utter.lang = "en-US"
  utter.onend = () => (playing.value = false)
  window.speechSynthesis.speak(utter)
  playing.value = true
}

/** 复制英文 + 中文释义 */
async function copyAll() {
  await copyText([data.value.content, data.value.note].filter(Boolean).join("\n"))
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}

function openDict() {
  window.open(`https://www.bing.com/dict/search?q=${encodeURIComponent(data.value.content)}`, "_blank")
}

onBeforeUnmount(stopPlay)
</script>

<style scoped>
/* 结构来自 styles/index.css 的 .desk-photo-*；这里只管字体家族与行数 */
.line {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.note {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

/* 卡片上的朗读键：右下角悬浮 */
.play {
  position: absolute;
  right: 8px;
  bottom: 8px;
}

/* 1×1 / 2×1 空间不够：不显示朗读键（详情里仍可朗读） */
.is-mini .play,
.is-wide:not(.is-big) .play {
  display: none;
}

/* 1×1：只留句子 */
.is-mini .note {
  display: none;
}

.is-mini .line {
  font-size: var(--desk-fs-card-text);
  -webkit-line-clamp: 3;
}

/* 2×1：句子两行 + 释义一行 */
.is-wide:not(.is-big) .line {
  -webkit-line-clamp: 2;
}

.is-wide:not(.is-big) .note {
  -webkit-line-clamp: 1;
}

/* 宽卡：（正文字号由 styles/index.css 的 .is-wide.is-big .desk-photo-text 统一给） */
.is-wide.is-big .line {
  -webkit-line-clamp: 3;
}

.is-wide.is-big .note {
  font-size: var(--desk-fs-card-meta);
}
</style>
