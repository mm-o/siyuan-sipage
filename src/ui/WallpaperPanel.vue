<template>
  <div class="desk-panel set-page">
    <h2 class="set-h2">壁纸</h2>
    <p class="set-p">换一张底片；模糊与遮罩在「组件设置 → 壁纸」里调。</p>

    <!-- 来源统一选择 -->
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
          <GlassField v-model="assetQ" type="search" label="搜索图片文件名" placeholder="搜索文件名…" />
        </div>
        <div class="picsum-bar">
          <span class="desk-hint">{{ assetShown.length }} / {{ assets.length }} 张 · 取自笔记本 assets</span>
          <GlassButton @click="pick('siyuan')" text label="换一张" />
        </div>
        <div class="desk-tiles asset-grid">
          <div
            v-for="a in assetShown"
            :key="a.path"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.url})` }"

          >
            <button class="wallpaper-pick" type="button" :aria-label="a.path" @click="choose('siyuan', a.url)" />
            <FavDot :value="a.url" />
          </div>
        </div>
        <p v-if="!assets.length" class="desk-hint">笔记本里还没有图片资源。</p>
        <p v-else-if="!assetShown.length" class="desk-hint">没有匹配的图片，换个关键词。</p>
      </div>

      <!-- 思源头图 -->
      <template v-else-if="source === 'cover'">
        <Chips v-model="activeCat" :options="catOptions" />
        <div class="desk-tiles">
          <div
            v-for="c in coverVisible"
            :key="c.file"
            class="desk-tile ariaLabel" data-position="north" data-tooltip-encoding="none"
            :class="{ 'is-active': wallpaper.value === coverUrl(c.file) }"
            :style="{ backgroundImage: `url(${coverUrl(c.file)})` }"

          >
            <button class="wallpaper-pick" type="button" :aria-label="c.photographer ? `${labelOf(c)} · ${c.photographer}` : labelOf(c)" @click="choose('cover', coverUrl(c.file), 'cover')" />
            <FavDot :value="coverUrl(c.file)" />
          </div>
        </div>
        <GlassButton v-if="coverRest && !expanded" class="cover-more" @click="expanded = true" text :label="`展开全部 ${visible.length} 张`" />
      </template>

      <!-- 必应每日 -->
      <div v-else-if="source === 'bing'" class="desk-tiles">
        <div
          v-for="b in bing"
          :key="b.url"
          class="desk-tile"
          :class="{ 'is-active': wallpaper.value === b.url }"
          :style="{ backgroundImage: `url(${b.url})` }"

        >
            <button class="wallpaper-pick" type="button" :aria-label="b.title" @click="pickImage({ url: b.url }, 'bing')" />
            <FavDot :value="b.url" />
          </div>
        <p v-if="!bing.length" class="desk-hint">必应壁纸加载失败，请检查网络。</p>
      </div>

      <!-- 国内图源：alcy.cc 一次直出，国内可访问 -->
      <div v-else-if="source === 'gitee'" class="picsum">
        <div class="desk-tiles">
          <div
            v-for="a in alcy"
            :key="a.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.thumb})` }"

          >
            <button class="wallpaper-pick" type="button" :aria-label="`国内图源 · ${a.seed}`" @click="pickImage(a, 'gitee')" />
            <FavDot :value="a.url" />
          </div>
        </div>
        <GlassButton class="batch-btn" :class="{ 'is-busy': busy.gitee }" :disabled="busy.gitee" @click="reshuffle('gitee')" text :label='busy.gitee ? "取图中…" : `换一批 ${alcy.length}`' />
      </div>

      <!-- Picsum：全部列出，点哪张用哪张 -->
      <div v-else-if="source === 'picsum'" class="picsum">
        <div class="desk-tiles">
          <div
            v-for="p in picsum"
            :key="p.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === p.url }"
            :style="{ backgroundImage: `url(${p.thumb})` }"

          >
            <button class="wallpaper-pick" type="button" :aria-label="`Picsum · ${p.seed}`" @click="pickImage(p, 'picsum')" />
            <FavDot :value="p.url" />
          </div>
        </div>
        <GlassButton class="batch-btn" :class="{ 'is-busy': busy.picsum }" :disabled="busy.picsum" @click="reshuffle('picsum')" text :label='busy.picsum ? "取图中…" : `换一批 ${picsum.length}`' />
      </div>

      <!-- 本地随机 -->
      <div v-else-if="source === 'random'" class="random">
        <div class="random-preview" :style="{ backgroundImage: `url(${wallpaper.value})` }" />
        <GlassButton @click="shuffle" text label="换一张" />
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
          @click="choose('solid', c)"
        />
      </div>

      <!-- 跟随思源：没有可选项，只说清它跟的是什么 -->
      <p v-else-if="source === 'theme'" class="desk-hint">
        取思源当前主题的主题色做背景，切换「外观 → 主题」时壁纸跟着变，不需要重新设置。
      </p>

      <!-- 链接 -->
      <div v-else class="url-row">
        <GlassField v-model="url" type="url" label="壁纸图片链接" placeholder="https://example.com/wallpaper.jpg" @keydown.enter="applyUrl" />
        <GlassButton @click="applyUrl" text label="使用" />
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
import { Chips, GlassButton, GlassField, toast } from "@/ui/controls"
import { computed, defineComponent, h, reactive, ref, watch } from "vue"
import type { Component } from "vue"
import { Circle, Database, Globe, Heart, Image as ImageIcon, Link, Palette, Shuffle } from "lucide-vue-next"
import { addFavorite, dropFavorite, isFav, wallpaper, setWallpaper } from "@/core/store"
import {
  alcyBatch,
  coverUrl,
  favName,
  fetchImage,
  loadAssets,
  loadBingImages,
  loadCoverGroups,
  picsumFirst,
  picsumShuffle,
  randomCoverUrl,
  THEME_BG,
  wallSource,
  type AssetImage,
  type BingImage,
  type CoverGroup,
  type CoverItem,
  type WallSource,
  type WebImage,
} from "@/core/image"

/**
 * 收藏开关：贴在每张图右上角。
 * 独立组件（不是函数式渲染）：在 setup 里算一次名字，只订阅这一张的状态，
 * 别处的收藏变化不会把整屏点亮。名字与落盘名字同源，所以点完立刻变亮。
 */
const FavDot = defineComponent({
  props: { value: { type: String, required: true } },
  setup(props) {
    const name = computed(() => favName(props.value))
    const on = computed(() => isFav(name.value))
    return () => h(GlassButton, {
      class: "fav-dot",
      icon: Heart,
      active: on.value,
      tone: "photo",
      variant: on.value ? "danger" : "default",
      label: on.value ? "取消收藏" : "收藏",
      onClick: (e: MouseEvent) => { e.stopPropagation(); void toggleFav(props.value) },
    })
  },
})

/** 收藏/取消收藏一张图。名字由 value 推出，点击后状态立刻跟着翻 */
const working = ref<string[]>([])

async function toggleFav(value: string) {
  const name = favName(value)
  if (working.value.includes(name)) return
  working.value = [...working.value, name]
  try {
    if (isFav(name)) await dropFavorite(name)
    else await addFavorite(value)
  } catch (e) {
    toast((e as Error)?.message || "收藏失败")
  } finally {
    working.value = working.value.filter((n) => n !== name)
  }
}

/** 壁纸来源与显示标签 */
const SOURCES: { value: WallSource; label: string; desc: string; icon: Component }[] = [
  { value: "theme", label: "跟随思源", desc: "吃主题色", icon: Palette },
  { value: "siyuan", label: "思源资源", desc: "笔记本图片", icon: Database },
  { value: "cover", label: "思源头图", desc: "本地 18 分类", icon: ImageIcon },
  { value: "bing", label: "必应每日", desc: "最近 8 天", icon: ImageIcon },
  { value: "gitee", label: "国内图源", desc: "alcy 直出", icon: Globe },
  { value: "picsum", label: "Picsum", desc: "需科学上网", icon: ImageIcon },
  { value: "random", label: "本地随机", desc: "题头图里随机", icon: Shuffle },
  { value: "solid", label: "纯色", desc: "24 色板", icon: Circle },
  { value: "url", label: "图片链接", desc: "自定义图片", icon: Link },
]

const groups = ref<CoverGroup[]>([])
const bing = ref<BingImage[]>([])
const picsum = ref<WebImage[]>([])
const alcy = ref<WebImage[]>([])
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

/** 最后一次选择生效；所有来源与收藏共用 store 的切换入口。 */
let selection = 0
function choose(...args: Parameters<typeof setWallpaper>) {
  selection++
  setWallpaper(...args)
}

async function pickImage(img: { url: string; thumb?: string }, src: "bing" | "picsum" | "gitee") {
  const request = ++selection
  const full = img.url.startsWith("data:") ? img.url : await fetchImage(img.url).catch(() => img.thumb)
  if (request === selection) setWallpaper("cover", img.url, src, full)
}

/** 每个来源的列表只在用得到时取一次，取过的就一直复用 */
async function ensure(s: WallSource) {
  if (s === "siyuan" && !assets.value.length) assets.value = await loadAssets()
  else if (s === "cover" && !groups.value.length) groups.value = await loadCoverGroups()
  else if (s === "bing" && !bing.value.length) bing.value = await loadBingImages()
  else if (s === "picsum" && !picsum.value.length) picsum.value = await picsumFirst()
  else if (s === "gitee" && !alcy.value.length) alcy.value = await alcyBatch()
}

/* 来源一变就把它那一屏填满；取不到就空着，不影响别的来源 */
watch(source, (s) => void ensure(s).catch(() => {}), { immediate: true })

async function pick(s: WallSource) {
  const request = ++selection
  await ensure(s).catch(() => {})
  if (request !== selection) return
  switch (s) {
    case "theme": return choose("theme")
    case "siyuan": {
      const one = assets.value[Math.floor(Math.random() * assets.value.length)]
      return choose("siyuan", one?.url || "")
    }
    case "solid": return choose("solid", wallpaper.value.startsWith("#") ? wallpaper.value : COLORS[0])
    case "url": {
      url.value = wallpaper.value.startsWith("http") ? wallpaper.value : ""
      return choose("url", url.value)
    }
    case "cover": {
      const first = groups.value[0]?.items[0]
      if (first) choose("cover", coverUrl(first.file), "cover")
      return
    }
    case "bing": {
      const one = bing.value[Math.floor(Math.random() * bing.value.length)]
      if (one) await pickImage(one, "bing")
      return
    }
    case "picsum":
    case "gitee": {
      const one = (s === "picsum" ? picsum.value : alcy.value)[0]
      if (one) await pickImage(one, s)
      return
    }
    case "random": return shuffle()
  }
}

async function reshuffle(s: "picsum" | "gitee") {
  if (busy[s]) return
  busy[s] = true
  try {
    const images = await (s === "picsum" ? picsumShuffle() : alcyBatch())
    ;(s === "picsum" ? picsum : alcy).value = images
  } catch (error) { toast(`取图失败：${(error as Error).message}`) }
  finally { busy[s] = false }
}

async function shuffle() {
  const request = ++selection
  const value = await randomCoverUrl()
  if (request === selection) setWallpaper("cover", value, "random")
}

function applyUrl() {
  const value = url.value.trim()
  if (value) choose("url", value)
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
/* 来源统一选择 */
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
  border: 1px solid var(--desk-stroke);
  font: inherit;
  text-align: left;
  cursor: pointer;
}


.source.is-active {
  border-color: var(--desk-accent);
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

.picker :deep(.chips) {
  flex-wrap: nowrap;
  overflow-x: auto;
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
.wallpaper-pick { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: inherit; background: transparent; cursor: pointer; }
.wallpaper-pick:focus-visible { outline: var(--desk-ring); outline-offset: 2px; }
.fav-dot { position: absolute; top: 3px; right: 3px; z-index: 1; opacity: 0; }
.desk-tile:hover .fav-dot, .desk-tile:focus-within .fav-dot, .fav-dot.is-on { opacity: 1; }
.fav-dot.is-on :deep(svg) { fill: currentColor; }
@media (hover: none) { .fav-dot { opacity: 1; } }

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

</style>