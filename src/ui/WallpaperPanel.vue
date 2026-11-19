<template>
  <div class="desk-panel set-page">
    <h2 class="set-h2">壁纸</h2>
    <p class="set-p">换一张底片；模糊与遮罩在「组件设置 → 壁纸」里调。</p>

    <!-- 八个来源一屏看完：4 列 × 2 行 -->
    <div class="sources">
      <button
        v-for="s in SOURCES"
        :key="s.value"
        class="source"
        :class="{ 'is-active': source === s.value }"
        @click="pick(s.value)"
      >
        <span class="source-icon" :style="s.value === 'theme' ? { background: THEME_BG } : undefined">
          <component :is="s.icon" :size="15" :stroke-width="1.7" />
        </span>
        <span class="source-text">
          <strong>{{ s.label }}</strong>
          <small>{{ s.desc }}</small>
        </span>
        <span v-if="source === s.value" class="source-check">✓</span>
      </button>
    </div>

    <!-- 选择区：随来源切换 -->
    <div class="picker">
      <!-- 思源资源：笔记本里的图片，内核直给；全量列出 + 搜索 -->
      <div v-if="source === 'siyuan'" class="picsum">
        <div class="picker-search">
          <input v-model="assetQ" class="desk-input" type="search" placeholder="搜索文件名…" />
        </div>
        <div class="picsum-bar">
          <span class="desk-hint">{{ assetShown.length }} / {{ assets.length }} 张 · 取自笔记本 assets</span>
          <button class="desk-btn" type="button" @click="pick('siyuan')">换一张</button>
        </div>
        <div class="desk-tiles asset-grid">
          <button
            v-for="a in assetShown"
            :key="a.path"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.url})` }"
            :aria-label="a.path"
            @click="assetsPick(a.url)"
          >
            <FavDot :name="favName(a.url)" :value="a.url" />
          </button>
        </div>
        <p v-if="!assets.length" class="desk-hint">笔记本里还没有图片资源。</p>
        <p v-else-if="!assetShown.length" class="desk-hint">没有匹配的图片，换个关键词。</p>
      </div>

      <!-- 思源头图 -->
      <template v-else-if="source === 'cover'">
        <Chips v-model="activeCat" :options="catOptions" />
        <div class="desk-tiles">
          <button
            v-for="c in coverVisible"
            :key="c.file"
            class="desk-tile ariaLabel" data-position="north" data-tooltip-encoding="none"
            :class="{ 'is-active': wallpaper.value === coverUrl(c.file) }"
            :style="{ backgroundImage: `url(${coverUrl(c.file)})` }"
            :aria-label="c.photographer ? `${labelOf(c)} · ${c.photographer}` : labelOf(c)"
            @click="useImage(coverUrl(c.file), 'cover')"
          >
            <FavDot :name="favName(coverUrl(c.file))" :value="coverUrl(c.file)" />
          </button>
        </div>
        <button v-if="coverRest && !expanded" class="desk-btn cover-more" type="button" @click="expanded = true">
          展开全部 {{ visible.length }} 张
        </button>
      </template>

      <!-- 必应每日 -->
      <div v-else-if="source === 'bing'" class="desk-tiles">
        <button
          v-for="b in bing"
          :key="b.url"
          class="desk-tile"
          :class="{ 'is-active': wallpaper.value === b.url }"
          :style="{ backgroundImage: `url(${b.url})` }"
          :aria-label="b.title"
          @click="useImage(b.url, 'bing')"
        >
          <FavDot :name="favName(b.url)" :value="b.url" />
        </button>
        <p v-if="!bing.length" class="desk-hint">必应壁纸加载失败，请检查网络。</p>
      </div>

      <!-- 国内图源：alcy.cc 一次直出，国内可访问 -->
      <div v-else-if="source === 'gitee'" class="picsum">
        <div class="desk-tiles">
          <button
            v-for="a in alcy"
            :key="a.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.full }"
            :style="{ backgroundImage: `url(${a.thumb})` }"
            :aria-label="`国内图源 · ${a.seed}`"
            @click="useImage(a.full, 'gitee')"
          >
            <FavDot :name="favName(a.full)" :value="a.full" />
          </button>
        </div>
        <button class="desk-btn batch-btn" type="button" :class="{ 'is-busy': busy.gitee }" :disabled="busy.gitee" @click="reshuffleAlcy">
          {{ busy.gitee ? "取图中…" : `换一批 ${alcy.length}` }}
        </button>
      </div>

      <!-- Picsum：缩略图全部列出，点哪张用哪张 -->
      <div v-else-if="source === 'picsum'" class="picsum">
        <div class="desk-tiles">
          <button
            v-for="p in picsum"
            :key="p.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === p.thumb }"
            :style="{ backgroundImage: `url(${p.thumb})` }"
            :aria-label="`Picsum · ${p.seed}`"
            @click="useImage(p.thumb, 'picsum')"
          >
            <FavDot :name="favName(p.thumb)" :value="p.thumb" />
          </button>
        </div>
        <button class="desk-btn batch-btn" type="button" :class="{ 'is-busy': busy.picsum }" :disabled="busy.picsum" @click="reshuffle">
          {{ busy.picsum ? "取图中…" : `换一批 ${picsum.length}` }}
        </button>
      </div>

      <!-- 本地随机 -->
      <div v-else-if="source === 'random'" class="random">
        <div class="random-preview" :style="{ backgroundImage: `url(${wallpaper.value})` }" />
        <button class="desk-btn" type="button" @click="shuffle">换一张</button>
      </div>

      <!-- 纯色 -->
      <div v-else-if="source === 'solid'" class="swatch">
        <button
          v-for="c in COLORS"
          :key="c"
          class="swatch-item ariaLabel" data-position="north" data-tooltip-encoding="none"
          :class="{ active: isActive(c) }"
          :style="{ background: c }"
          :aria-label="c"
          @click="wallpaper.value = c"
        >
          <FavDot :name="favName(c)" :value="c" />
        </button>
      </div>

      <!-- 跟随思源：没有可选项，只说清它跟的是什么 -->
      <p v-else-if="source === 'theme'" class="desk-hint">
        取思源当前主题的主题色做背景，切换「外观 → 主题」时壁纸跟着变，不需要重新设置。
      </p>

      <!-- 链接 -->
      <div v-else class="url-row">
        <input v-model="url" class="desk-input" type="url" placeholder="https://example.com/wallpaper.jpg" @keydown.enter="applyUrl" />
        <button class="desk-btn" type="button" @click="applyUrl">使用</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 壁纸面板
 *
 * 职责：选「用哪张壁纸」。模糊/遮罩不在这里（属于全局显示设置，在组件设置里）。
 * 来源只用可靠通道：思源主题色 / 思源 assets / 思源题头图 / 必应官方接口 / 国内图源 / Picsum / 本地随机。
 */
import { Chips } from "@/ui/controls"
import { computed, h, onMounted, reactive, ref, watch } from "vue"
import type { Component } from "vue"
import { Circle, Database, Globe, Heart, Image as ImageIcon, Palette, Shuffle } from "lucide-vue-next"
import { favorites, isFav, wallpaper } from "@/core/store"
import {
  alcyBatch,
  alcyWallpaper,
  coverUrl,
  favName,
  loadAssets,
  loadBingImages,
  loadCoverGroups,
  picsumFirst,
  picsumShuffle,
  randomCoverUrl,
  removeFav,
  saveFav,
  THEME_BG,
  wallSource,
  type AlcyImage,
  type AssetImage,
  type BingImage,
  type CoverGroup,
  type CoverItem,
  type PicsumImage,
  type WallSource,
} from "@/core/image"

/**
 * 收藏开关：贴在每张可收藏的图右上角。
 * 落盘顺序 = 先写 public/favorites（文件），成功后再进状态，失败状态不变。
 */
const FavDot = (props: { name: string; value: string }) =>
  h(
    "span",
    {
      class: ["fav-dot", { "is-on": isFav(props.name) }],
      role: "button",
      title: isFav(props.name) ? "取消收藏" : "收藏",
      "aria-label": isFav(props.name) ? "取消收藏" : "收藏",
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        void toggleFav(props.name, props.value)
      },
    },
    [h(Heart, { size: 12, strokeWidth: 2 })],
  )

const working = ref<string[]>([])

async function toggleFav(name: string, value: string) {
  if (working.value.includes(name)) return
  working.value = [...working.value, name]
  try {
    if (isFav(name)) {
      await removeFav(name)
      favorites.items = favorites.items.filter((f) => f.name !== name)
    } else {
      await saveFav(value, name)
      favorites.items = [{ name, value, source: wallpaper.source }, ...favorites.items]
    }
  } finally {
    working.value = working.value.filter((n) => n !== name)
  }
}

/** 八个来源，4 列两行；跟随思源、思源资源都在这一屏里 */
const SOURCES: { value: WallSource; label: string; desc: string; icon: Component }[] = [
  { value: "theme", label: "跟随思源", desc: "吃主题色", icon: Palette },
  { value: "siyuan", label: "思源资源", desc: "笔记本图片", icon: Database },
  { value: "cover", label: "思源头图", desc: "本地 18 分类", icon: ImageIcon },
  { value: "bing", label: "必应每日", desc: "最近 8 天", icon: ImageIcon },
  { value: "gitee", label: "国内图源", desc: "alcy 直出", icon: Globe },
  { value: "picsum", label: "Picsum", desc: "需科学上网", icon: ImageIcon },
  { value: "random", label: "本地随机", desc: "题头图里随机", icon: Shuffle },
  { value: "solid", label: "纯色", desc: "24 色板", icon: Circle },
]

const groups = ref<CoverGroup[]>([])
const bing = ref<BingImage[]>([])
const picsum = ref<PicsumImage[]>([])
const alcy = ref<AlcyImage[]>([])
const assets = ref<AssetImage[]>([])
const activeCat = ref("")
const assetQ = ref("")
const url = ref("")
/** 换一批的即时反馈：点下就置位，出图后复位 */
const busy = reactive({ picsum: false, gitee: false })

/** 思源资源搜索：文件名不区分大小写，空格分词全都要命中 */
const assetShown = computed(() => {
  const q = assetQ.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!q.length) return assets.value
  return assets.value.filter((a) => {
    const p = a.path.toLowerCase()
    return q.every((w) => p.includes(w))
  })
})

const total = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

/** 分类标签（分类 + 数量），与其它面板共用 Chips */
const catOptions = computed(() => [
  { label: `全部 ${total.value}`, value: "" },
  ...groups.value.map((g) => ({ label: `${g.label} ${g.items.length}`, value: g.key })),
])

const visible = computed<CoverItem[]>(() => {
  const list = activeCat.value ? groups.value.filter((g) => g.key === activeCat.value) : groups.value
  return list.flatMap((g) => g.items)
})

/** 首屏只给 12 张（6 列两行），要更多再点「看全部」 */
const COVER_PAGE = 12
const expanded = ref(false)
const coverVisible = computed(() => (expanded.value ? visible.value : visible.value.slice(0, COVER_PAGE)))
const coverRest = computed(() => Math.max(visible.value.length - COVER_PAGE, 0))

/* 换分类回到首屏 */
watch(activeCat, () => (expanded.value = false))

/** 当前来源由 store 推导，保证与桌面渲染一致 */
const source = computed<WallSource>(() => wallSource(wallpaper))

function labelOf(item: CoverItem) {
  return groups.value.find((g) => g.items.includes(item))?.label || ""
}

/** 换图：来源与图片一起落，桌面上的表现立刻一致 */
function useImage(value: string, src: "cover" | "bing" | "picsum" | "gitee") {
  wallpaper.type = "cover"
  wallpaper.source = src
  wallpaper.value = value
}

onMounted(async () => {
  groups.value = await loadCoverGroups()
  bing.value = await loadBingImages()
  assets.value = await loadAssets()
  // 外网图必须走内核转发，12 张缩略图并发取（0.7~1.6s 一张）
  picsum.value = await picsumFirst()
  alcy.value = await alcyBatch()
})

async function pick(s: WallSource) {
  switch (s) {
    case "theme": {
      wallpaper.type = "theme"
      break
    }
    case "siyuan": {
      wallpaper.type = "siyuan"
      break
    }
    case "cover": {
      const first = groups.value[0]?.items[0]
      if (first) useImage(coverUrl(first.file), "cover")
      break
    }
    case "bing": {
      if (!bing.value.length) bing.value = await loadBingImages()
      const one = bing.value[Math.floor(Math.random() * bing.value.length)]
      if (one) useImage(one.url, "bing")
      break
    }
    case "gitee": {
      const one = alcy.value[0]
      useImage(one ? one.full : await alcyWallpaper(), "gitee")
      break
    }
    case "picsum": {
      const one = picsum.value[0]
      if (one) useImage(one.thumb, "picsum")
      break
    }
    case "random": {
      wallpaper.type = "cover"
      wallpaper.source = "random"
      wallpaper.value = await randomCoverUrl()
      break
    }
    case "solid": {
      wallpaper.type = "solid"
      if (!wallpaper.value.startsWith("#")) wallpaper.value = "#0b0e14"
      break
    }
    case "url": {
      wallpaper.type = "url"
      url.value = wallpaper.value.startsWith("http") ? wallpaper.value : ""
      break
    }
  }
}

/** 换一批：先给按钮置忙，取完再换 —— 点击立刻有反馈，不做「点了没反应」 */
async function reshuffle() {
  if (busy.picsum) return
  busy.picsum = true
  try {
    picsum.value = await picsumShuffle()
  } finally {
    busy.picsum = false
  }
}

/** 思源资源：点哪张用哪张，type 固定 siyuan，重开面板还认得回来 */
function assetsPick(u: string) {
  wallpaper.type = "siyuan"
  wallpaper.value = u
}

async function reshuffleAlcy() {
  if (busy.gitee) return
  busy.gitee = true
  try {
    alcy.value = await alcyBatch()
  } finally {
    busy.gitee = false
  }
}

async function shuffle() {
  wallpaper.value = await randomCoverUrl()
}

function applyUrl() {
  const v = url.value.trim()
  if (!v) return
  wallpaper.value = v
  wallpaper.type = "url"
}

/* 色板（原 ui/primitives/Swatch.vue，仅此处使用） */
/**
 * 颜色列表（基础组件 · 极限精简）
 *
 * 24 个常用底色。
 */
const COLORS = [
  "#0b0e14", "#111827", "#1e293b", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#f1f5f9",
  "#fde68a", "#fbbf24", "#f59e0b", "#b45309", "#fecaca", "#ef4444", "#dc2626", "#991b1b",
  "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#d1fae5", "#10b981", "#8b5cf6", "#f472b6",
]

const isActive = (c: string) => c.toLowerCase() === wallpaper.value.toLowerCase()
</script>

<style scoped>
/* 八个来源一屏看完：4 列 × 2 行 */
.sources {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--desk-sp-1h);
}

.source {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  min-width: 0;
  padding: var(--desk-sp-2) 9px;
  border-radius: var(--desk-r-control);
  border: 1px solid var(--desk-stroke);
  background: transparent;
  color: var(--desk-text-2);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--desk-dur-fast) var(--desk-ease),
    border-color var(--desk-dur-fast) var(--desk-ease);
}

.source:hover {
  background: color-mix(in srgb, var(--desk-accent) 8%, transparent);
}

.source.is-active {
  color: var(--desk-text);
  border-color: var(--desk-accent);
  background: color-mix(in srgb, var(--desk-accent) 12%, transparent);
}

/* 跟随思源：图标位直接显示主题色本身 */
.source-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  overflow: hidden;
}

.source-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.source-text strong {
  font-size: var(--desk-fs-caption);
  font-weight: 600;
}

.source-text small {
  overflow: hidden;
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.source-check {
  margin-left: auto;
  font-size: var(--desk-fs-caption);
  color: var(--desk-accent);
}

.picker {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
}

/* 中栏 550px：4 列跟来源网格同节奏，一行 4 张不碎 */
.picker :deep(.desk-tiles) {
  grid-template-columns: repeat(4, 1fr);
}

.picker :deep(.chips) {
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

/* 收藏心要绝对定位在图角落 */
.picker :deep(.desk-tile),
.swatch-item {
  position: relative;
}

/* 分类标签不许挤：单行不折字，撑不住就横向滚 */
.picker :deep(.chip) {
  flex: 0 0 auto;
  height: 26px;
  padding: 0 12px;
  font-size: var(--desk-fs-body);
  white-space: nowrap;
}

/* 搜索框占满一行，与下方数量行分开 */
.picker-search .desk-input {
  width: 100%;
}

/* 换一批：固定在网格下方，一行占满，与图格不抢位置 */
.batch-btn {
  width: 100%;
  height: 32px;
}

.batch-btn.is-busy {
  opacity: 0.6;
  cursor: progress;
}

/* 收藏心：图角落，平时浮一层玻璃，收藏后实心 */
.fav-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(0 0 0 / 34%);
  color: rgb(255 255 255 / 76%);
  opacity: 0;
  cursor: pointer;
  transition:
    opacity var(--desk-dur-fast) var(--desk-ease),
    transform var(--desk-dur-fast) var(--desk-ease);
}

.desk-tile:hover .fav-dot,
.swatch-item:hover .fav-dot,
.fav-dot.is-on {
  opacity: 1;
}

.fav-dot:hover {
  transform: scale(1.12);
}

.fav-dot.is-on {
  background: var(--desk-accent);
  color: #fff;
}

.fav-dot.is-on :deep(svg) {
  fill: currentColor;
}

/* 思源资源可能是成百张：固定高度内滚动，不把页面撑长 */
.asset-grid {
  max-height: 320px;
  overflow-y: auto;
  padding-right: var(--desk-sp-0);
}

.cover-more {
  align-self: flex-start;
}

.picsum-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-2);
}

.random {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
}

.random-preview {
  aspect-ratio: 16 / 9;
  border-radius: var(--desk-r-md);
  border: 1px solid var(--desk-stroke);
  background-size: cover;
  background-position: center;
}

.url-row {
  display: flex;
  gap: var(--desk-sp-2);
}

.swatch {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--desk-sp-1h);
}

.swatch-item {
  aspect-ratio: 1;
  padding: 0;
  border-radius: 7px;
  border: 1px solid var(--desk-stroke);
  cursor: pointer;
  transition: transform var(--desk-dur-fast) var(--desk-ease);
}

.swatch-item:hover {
  transform: scale(1.08);
}

.swatch-item.active {
  box-shadow:
    0 0 0 2px var(--desk-glass-fill-strong),
    0 0 0 4px var(--desk-accent);
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

.set-page {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-3);
}
</style>