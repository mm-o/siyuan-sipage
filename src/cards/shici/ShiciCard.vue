<template>
  <div class="desk-photo-card shici" :class="[`is-${size}`, { 'desk-detail': isDetail, 'on-photo': isDetail }]">
    <!-- 背景：卡片与详情同一张（思源本地题头图，离线可用） -->
    <div class="desk-photo" :class="{ 'is-detail': isDetail }" :style="bgStyle" />

    <!-- 详情：玻璃面板 + 文字列 + 动作条（三张内容卡同一结构） -->
    <div v-if="isDetail" class="desk-detail-panel">
      <header class="head">
        <p class="desk-detail-quote title">{{ poem.title || "加载中…" }}</p>
        <p class="desk-detail-meta">{{ byline }}</p>
      </header>

      <Chips v-model="tab" :options="TABS" tone="on-photo" class="tabs" />

      <div class="desk-detail-body">
        <template v-if="tab === 'content'">
          <div class="verse-lines desk-seq">
          <p v-for="(line, i) in contentLines" :key="i" class="verse">{{ line }}</p>
        </div>
        </template>
        <p v-else-if="tab === 'translate'" class="desk-detail-text">{{ poem.translate || "暂无译文" }}</p>
        <template v-else>
          <p class="desk-detail-text">{{ poem.annotation || poem.note || "暂无注释" }}</p>
          <div v-if="poem.tags?.length" class="tags">
            <span v-for="t in poem.tags" :key="t" class="tag">{{ t }}</span>
          </div>
        </template>
      </div>

      <div class="desk-detail-foot">
        <SeriesNav :series="series" />
        <div class="desk-fab">
          <GlassButton :icon="copied ? Check : Copy" label="复制全文" @click="copyPoem" />
          <GlassButton :icon="ImageIcon" label="换一张背景" @click="series.shuffleCover" />
        </div>
      </div>
    </div>

    <!-- 卡片：标题 + 作者 + 前几行，垂直居中 -->
    <div v-else class="desk-photo-body">
      <header class="head">
        <p class="desk-photo-title title">{{ poem.title || "加载中…" }}</p>
        <p v-if="byline" class="desk-photo-meta meta">{{ byline }}</p>
      </header>
      <p class="desk-photo-text lines desk-chars is-fast"><span v-for="(ch, i) in [...previewText]" :key="i" :style="{ '--i': i }">{{ ch }}</span></p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 每日诗词
 *
 * 接口 `${API_BASE}/todayShici` 支持 ?date=YYYY-MM-DD，
 * 所以「上一首 / 下一首」= 前一天 / 后一天的诗，缓存后不重复请求。
 * 序列与背景由 core/daily 统一管理：卡片与详情永远同一首诗、同一张图。
 */
import { GlassButton, SeriesNav, Chips } from "@/ui/controls"
import { computed, ref } from "vue"
import { Check, Copy, Image as ImageIcon } from "lucide-vue-next"
import { dailySeries } from "@/core/daily"
import { API_BASE } from "@/core/api"
import { photoBg } from "@/ui/controls"
import { copyText } from "@/ui/controls"

const props = withDefaults(defineProps<{ size?: string; w?: number; h?: number; mode?: "card" | "detail" }>(), { size: "2x2", mode: "card" })

interface Poem {
  title: string
  author: string
  dynasty: string
  content: string
  translate: string
  annotation: string
  note?: string
  tags?: string[]
}

const API = `${API_BASE}/todayShici`
const TABS = [
  { label: "全文", value: "content" },
  { label: "译文", value: "translate" },
  { label: "注释", value: "annotation" },
]

const series = dailySeries<Poem>("shici", {
  initial: { title: "", author: "", dynasty: "", content: "", translate: "", annotation: "" },
  load: async (offset) => {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    try {
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const res = await fetch(`${API}?date=${day}`)
      const json = await res.json()
      const d = json?.data
      if (!d?.title) return null
      return {
        title: d.title,
        author: d.author || "",
        dynasty: d.dynasty || "",
        content: d.content || d.quotes || "",
        translate: d.translate || "",
        annotation: d.annotation || "",
        note: d.preface || "",
        tags: d.tags || [],
      }
    } catch {
      return null
    }
  },
})

const poem = series.item
const cover = series.cover
const tab = ref("content")
const copied = ref(false)

const size = computed(() => props.size)
const isDetail = computed(() => props.mode === "detail")
const bgStyle = computed(() => photoBg(cover.value))

const contentLines = computed(() => (poem.value.content || "").split("\n").filter(Boolean))
const previewText = computed(() => contentLines.value.join("\n"))
const byline = computed(() => [poem.value.dynasty, poem.value.author].filter(Boolean).join(" · "))

/** 复制全文（详情右下角玻璃按钮） */
async function copyPoem() {
  await copyText(`《${poem.value.title}》 ${byline.value}\n${poem.value.content}`)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<style scoped>
/* 结构来自 styles/index.css 的 .desk-photo-*；这里只管字号与行数 */
.head {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
}

.lines {
  white-space: pre-line;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.title {
  font-size: var(--desk-fs-card-title);
}

.meta {
  font-size: var(--desk-fs-card-meta);
}

/* 1×1：标题 + 作者，标题收到 11px 让五六个字排一行 */
.is-mini .desk-photo-body {
  padding: var(--desk-card-pad-y) 10px;
}

.is-mini .title {
  font-size: var(--desk-fs-card-title);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.is-mini .meta {
  font-size: var(--desk-fs-card-sub);
}

.is-mini .lines {
  display: none;
}

/* 2×1：高度只有 88px —— 标题 + 两句诗，朝代·作者让位给正文 */
.is-wide:not(.is-big) .meta {
  display: none;
}

.is-wide:not(.is-big) .lines {
  -webkit-line-clamp: 2;
  font-size: var(--desk-fs-card-text);
}

.is-wide:not(.is-big) .title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 宽卡：，诗行 4 行（字号由 styles/index.css 的 .is-wide.is-big .desk-photo-text 统一给） */
.is-wide.is-big .lines {
  -webkit-line-clamp: 4;
  line-height: 1.7;
}

.is-wide.is-big .title {
  font-size: var(--desk-fs-card-title-wide);
}

.is-wide.is-big .meta {
  font-size: var(--desk-fs-card-meta);
}

/* ── 详情 ─────────────────────────────────────────────── */
.desk-detail .head {
  gap: var(--desk-sp-1);
}

.desk-detail .title {
  font-size: var(--desk-fs-large);
}

.tabs {
  flex: 0 0 auto;
}

.desk-detail .desk-detail-body {
  gap: var(--desk-sp-0);
}

.verse {
  margin: 0;
  font-size: var(--desk-fs-headline);
  line-height: 1.9;
  letter-spacing: 0.06em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--desk-sp-1h);
}

.tag {
  padding: 1px 8px;
  border-radius: var(--desk-r-pill);
  font-size: var(--desk-fs-caption);
  background: rgb(255 255 255 / 12%);
  color: rgb(255 255 255 / 78%);
}
</style>
