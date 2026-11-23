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
        :class="{ 'is-active': tab === s.value }"
        @click="pick(s.value)"
      >
        <span class="source-icon"><component :is="s.icon" :size="15" :stroke-width="1.7" /></span>
        <span class="source-text">
          <strong>{{ s.label }}</strong>
          <small>{{ s.desc }}</small>
        </span>
      </button>
    </div>

    <!-- 选择区：随来源切换 -->
    <div class="picker">
      <!-- 思源资源：笔记本里的图片，内核直给；三行一屏 + 加载更多 -->
      <div v-if="tab === 'siyuan'" class="picsum">
        <div class="picker-search">
          <input v-model="assetQ" class="desk-input" type="search" placeholder="搜索文件名…" />
        </div>
        <span class="desk-hint">{{ assetShown.length }} / {{ assetFiltered.length }} 张 · 取自笔记本 assets</span>
        <div class="desk-tiles">
          <button
            v-for="a in assetShown"
            :key="a.path"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.url})` }"
            :aria-label="a.path"
            @click="assetsPick(a.url)"
          >
            <FavDot :value="a.url" :pending="favState(a.url)" />
          </button>
        </div>
        <p v-if="!assets.length && !loading.siyuan" class="desk-hint">笔记本里还没有图片资源。</p>
        <p v-else-if="assets.length && !assetShown.length" class="desk-hint">没有匹配的图片，换个关键词。</p>
        <button class="desk-btn act" type="button" @click="pickAsset">换一张</button>
        <button v-if="assetMore || assetLimit > PAGE" class="desk-btn act" type="button" @click="assetToggle">
          {{ assetMore ? `加载更多 ${Math.min(assetMore, PAGE)} 张` : "收起" }}
        </button>
      </div>

      <!-- 思源头图：18 个分类标签全部列出（纯文字标签，换行不滚） -->
      <template v-else-if="tab === 'cover'">
        <Chips v-model="activeCat" :options="catOptions" />
        <div class="desk-tiles">
          <button
            v-for="c in coverShown"
            :key="c.file"
            class="desk-tile ariaLabel" data-position="north" data-tooltip-encoding="none"
            :class="{ 'is-active': wallpaper.value === coverUrl(c.file) }"
            :style="{ backgroundImage: `url(${coverUrl(c.file)})` }"
            :aria-label="c.photographer ? `${labelOf(c)} · ${c.photographer}` : labelOf(c)"
            @click="useImage(coverUrl(c.file), 'cover')"
          >
            <FavDot :value="coverUrl(c.file)" :pending="favState(coverUrl(c.file))" />
          </button>
        </div>
        <button v-if="coverMore || coverLimit > PAGE" class="desk-btn act" type="button" @click="coverToggle">
          {{ coverMore ? `加载更多 ${Math.min(coverMore, PAGE)} 张` : "收起" }}
        </button>
      </template>

      <!-- 必应每日 -->
      <div v-else-if="tab === 'bing'" class="desk-tiles">
        <button
          v-for="b in bing"
          :key="b.url"
          class="desk-tile"
          :class="{ 'is-active': wallpaper.value === b.url }"
          :style="{ backgroundImage: `url(${b.url})` }"
          :aria-label="b.title"
          @click="useImage(b.url, 'bing')"
        >
          <FavDot :value="b.url" :pending="favState(b.url)" />
        </button>
        <p v-if="loading.bing" class="desk-hint">取图中…</p>
        <p v-else-if="!bing.length" class="desk-hint">必应壁纸加载失败，请检查网络。</p>
      </div>

      <!-- 国内图源：alcy.cc 一次直出，国内可访问 -->
      <div v-else-if="tab === 'gitee'" class="picsum">
        <div class="desk-tiles">
          <button
            v-for="a in alcy"
            :key="a.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.thumb})` }"
            :aria-label="`国内图源 · ${a.seed}`"
            @click="pickImage(a, 'gitee')"
          >
            <FavDot :value="a.url" :pending="favState(a.url)" />
          </button>
        </div>
        <button class="desk-btn act" type="button" :disabled="busy.gitee || loading.gitee" @click="reshuffleAlcy">
          {{ busy.gitee || loading.gitee ? "取图中…" : alcy.length ? `换一批 ${alcy.length}` : "换一批" }}
        </button>
        <p v-if="!alcy.length && !loading.gitee" class="desk-hint">取图失败，检查网络后再点「换一批」。</p>
      </div>

      <!-- Picsum：全部列出，点哪张用哪张 -->
      <div v-else-if="tab === 'picsum'" class="picsum">
        <div class="desk-tiles">
          <button
            v-for="p in picsum"
            :key="p.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === p.url }"
            :style="{ backgroundImage: `url(${p.thumb})` }"
            :aria-label="`Picsum · ${p.seed}`"
            @click="pickImage(p, 'picsum')"
          >
            <FavDot :value="p.url" :pending="favState(p.url)" />
          </button>
        </div>
        <button class="desk-btn act" type="button" :disabled="busy.picsum || loading.picsum" @click="reshuffle">
          {{ busy.picsum || loading.picsum ? "取图中…" : picsum.length ? `换一批 ${picsum.length}` : "换一批" }}
        </button>
        <p v-if="!picsum.length && !loading.picsum" class="desk-hint">取图失败，检查网络后再点「换一批」。</p>
      </div>

      <!-- 本地随机 / 跟随思源：同一块预览 + 同一颗按钮 -->
      <div v-else-if="tab === 'random'" class="random">
        <div class="random-preview" :style="{ backgroundImage: `url(${wallpaper.value})` }" />
        <button class="desk-btn act" type="button" @click="shuffle">换一张</button>
      </div>

      <div v-else-if="tab === 'theme'" class="random">
        <div class="random-preview" :style="{ background: THEME_BG }" />
        <p class="desk-hint">取思源当前主题的主题色做背景，切换「外观 → 主题」时壁纸跟着变，不需要重新设置。</p>
      </div>

      <!-- 纯色 -->
      <div v-else-if="tab === 'solid'" class="swatch">
        <button
          v-for="c in COLORS"
          :key="c"
          class="swatch-item ariaLabel" data-position="north" data-tooltip-encoding="none"
          :class="{ active: isActive(c) }"
          :style="{ background: c }"
          :aria-label="c"
          @click="wallpaper.value = c"
        />
      </div>

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
import { Chips, toast } from "@/ui/controls"
import { computed, defineComponent, h, reactive, ref, watch } from "vue"
import type { Component } from "vue"
import { CalendarDays, Camera, Droplet, FolderOpen, Globe, Heart, Images, Palette, Shuffle } from "lucide-vue-next"
import { addFavorite, dropFavorite, isFav, wallpaper } from "@/core/store"
import {
  alcyBatch,
  alcyWallpaper,
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

/** 一屏三行：4 列 × 3 行 = 12 张，末行永远是整行 */
const PAGE = 12

/**
 * 收藏开关：贴在每张图右上角。
 * 独立组件（不是函数式渲染）：在 setup 里算一次名字，只订阅这一张的状态，
 * 别处的收藏变化不会把整屏点亮。名字与落盘名字同源，所以点完立刻变亮。
 * pending 是乐观状态（"on" / "off"）：点下立刻翻色，写盘回来后由 favorites 接管。
 */
const FavDot = defineComponent({
  props: { value: { type: String, required: true }, pending: { type: String, default: "" } },
  setup(props) {
    const name = computed(() => favName(props.value))
    const on = computed(() => (props.pending ? props.pending === "on" : isFav(name.value)))
    return () =>
      h(
        "span",
        {
          class: ["fav-dot", { "is-on": on.value, "is-busy": Boolean(props.pending) }],
          role: "button",
          title: on.value ? "取消收藏" : "收藏",
          "aria-label": on.value ? "取消收藏" : "收藏",
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            void toggleFav(props.value)
          },
        },
        [h(Heart, { size: 12, strokeWidth: 2 })],
      )
  },
})

/** 收藏/取消收藏一张图：先翻状态，写盘失败再回滚 —— 不等磁盘 */
const favPending = ref<Record<string, "on" | "off">>({})

const favState = (value: string) => favPending.value[favName(value)] || ""

async function toggleFav(value: string) {
  const name = favName(value)
  if (favPending.value[name]) return
  const want = !isFav(name)
  favPending.value = { ...favPending.value, [name]: want ? "on" : "off" }
  try {
    if (want) await addFavorite(value)
    else await dropFavorite(name)
  } catch (e) {
    toast((e as Error)?.message || "收藏失败")
  } finally {
    const rest = { ...favPending.value }
    delete rest[name]
    favPending.value = rest
  }
}

/** 八个来源，4 列两行；图标与来源一一对应，同一尺寸同一线宽 */
const SOURCES: { value: WallSource; label: string; desc: string; icon: Component }[] = [
  { value: "theme", label: "跟随思源", desc: "吃主题色", icon: Palette },
  { value: "siyuan", label: "思源资源", desc: "笔记本图片", icon: FolderOpen },
  { value: "cover", label: "思源头图", desc: "本地 18 分类", icon: Images },
  { value: "bing", label: "必应每日", desc: "最近 8 天", icon: CalendarDays },
  { value: "gitee", label: "国内图源", desc: "alcy 直出", icon: Globe },
  { value: "picsum", label: "Picsum", desc: "需科学上网", icon: Camera },
  { value: "random", label: "本地随机", desc: "题头图里随机", icon: Shuffle },
  { value: "solid", label: "纯色", desc: "24 色板", icon: Droplet },
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
/** 正在取数的来源：给骨架 / 按钮文案用 */
const loading = reactive<Record<string, boolean>>({})
/** 浏览中的来源：点标签立刻切，不等列表取完 */
const tab = ref<WallSource>(wallSource(wallpaper))
/** 三行一屏，加载更多按行加 */
const assetLimit = ref(PAGE)
const coverLimit = ref(PAGE)

/** 思源资源搜索：文件名不区分大小写，空格分词全都要命中 */
const assetFiltered = computed(() => {
  const q = assetQ.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!q.length) return assets.value
  return assets.value.filter((a) => {
    const p = a.path.toLowerCase()
    return q.every((w) => p.includes(w))
  })
})

/** 这一屏（整行）与还能加载多少 */
const assetShown = computed(() => assetFiltered.value.slice(0, assetLimit.value))
const assetMore = computed(() => Math.max(assetFiltered.value.length - assetShown.value.length, 0))

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

const coverShown = computed(() => visible.value.slice(0, coverLimit.value))
const coverMore = computed(() => Math.max(visible.value.length - coverShown.value.length, 0))

/* 换分类 / 改搜索都回到首屏 */
watch(activeCat, () => (coverLimit.value = PAGE))
watch(assetQ, () => (assetLimit.value = PAGE))

/** 当前来源由 store 推导，保证与桌面渲染一致 */
const source = computed<WallSource>(() => wallSource(wallpaper))

function labelOf(item: CoverItem) {
  return groups.value.find((g) => g.items.includes(item))?.label || ""
}

/** 换图：value 存地址（可复现、能落盘），resolved 存已下发的图（只活内存） */
function useImage(value: string, src: "cover" | "bing" | "picsum" | "gitee", data?: string) {
  wallpaper.type = "cover"
  wallpaper.source = src
  wallpaper.value = value
  wallpaper.resolved = data && data !== value ? data : undefined
}

/** 点一张外网图：缩略图先上墙（点下就有反应），原图回来再替换 */
async function pickImage(img: WebImage, src: "picsum" | "gitee") {
  useImage(img.url, src, img.thumb)
  if (img.url.startsWith("data:")) return
  const want = img.url
  const full = await fetchImage(want).catch(() => img.thumb)
  if (wallpaper.value === want) wallpaper.resolved = full
}

/** 每个来源的列表只在用得到时取一次，取过的就一直复用 */
async function ensure(s: WallSource) {
  if (loading[s]) return
  loading[s] = true
  try {
    if (s === "siyuan" && !assets.value.length) assets.value = await loadAssets()
    else if (s === "cover" && !groups.value.length) groups.value = await loadCoverGroups()
    else if (s === "bing" && !bing.value.length) bing.value = await loadBingImages()
    else if (s === "picsum" && !picsum.value.length) picsum.value = await picsumFirst()
    else if (s === "gitee" && !alcy.value.length) alcy.value = await alcyBatch()
  } finally {
    loading[s] = false
  }
}

/* 标签一换就把它那一屏填满；外部换图时标签跟着走 */
watch(source, (s) => {
  if (s !== tab.value) tab.value = s
})
watch(tab, (s) => void ensure(s).catch(() => {}), { immediate: true })

async function pick(s: WallSource) {
  /* 先切屏：高亮与「取图中…」立刻到位，取数在后面跑 */
  tab.value = s
  await ensure(s).catch(() => {})
  if (tab.value !== s) return
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
      const one = bing.value[Math.floor(Math.random() * bing.value.length)]
      if (one) useImage(one.url, "bing")
      break
    }
    case "gitee": {
      const one = alcy.value[0]
      if (one) await pickImage(one, "gitee")
      else useImage(await alcyWallpaper(), "gitee")
      break
    }
    case "picsum": {
      const one = picsum.value[0]
      if (one) await pickImage(one, "picsum")
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

/** 加载更多 / 收起：同一颗按钮、同一个位置 */
const assetToggle = () => (assetLimit.value = assetMore.value ? assetLimit.value + PAGE : PAGE)
const coverToggle = () => (coverLimit.value = coverMore.value ? coverLimit.value + PAGE : PAGE)

/** 思源资源「换一张」：从当前筛选结果里随机挑一张 */
function pickAsset() {
  const list = assetFiltered.value
  if (list.length) assetsPick(list[Math.floor(Math.random() * list.length)].url)
}

/** 换一批：先给按钮置忙，取完再换 —— 点击立刻有反馈，不做「点了没反应」 */
async function reshuffle() {
  if (busy.picsum) return
  busy.picsum = true
  try {
    picsum.value = await picsumShuffle()
  } catch {
    toast("Picsum 取图失败，检查网络后再试")
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
  } catch {
    toast("国内图源取图失败，检查网络后再试")
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

/* 图标位：只有图标本身，不做圆角底衬；选中跟着变色 */
.source-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--desk-text-3);
  transition: color var(--desk-dur-fast) var(--desk-ease);
}

.source.is-active .source-icon {
  color: var(--desk-accent);
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

.picker {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
}

/* 网格 / 计数 / 按钮之间用一个间距令牌，别指望浏览器默认 margin */
.picsum {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-3);
}

/* 中栏 550px：4 列跟来源网格同节奏，一行 4 张不碎 */
.picker :deep(.desk-tiles) {
  grid-template-columns: repeat(4, 1fr);
}

/* 分类标签：全部换行列出来，纯文字，选中只换色加粗 */
.picker :deep(.chips) {
  gap: var(--desk-sp-1) var(--desk-sp-3);
  overflow: visible;
}

.picker :deep(.chip) {
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  color: var(--desk-text-3);
  transition: color var(--desk-dur-fast) var(--desk-ease);
}

.picker :deep(.chip:hover) {
  color: var(--desk-text);
  background: none;
  box-shadow: none;
}

.picker :deep(.chip.active) {
  color: var(--desk-accent);
  background: none;
  box-shadow: none;
  font-weight: 600;
}

/* 收藏心要绝对定位在图角落 */
.picker :deep(.desk-tile),
.swatch-item {
  position: relative;
}

/* 搜索框占满一行：交给 flex 定宽，别用 width:100% 跟 content-box 打架 */
.picker-search {
  display: flex;
}

/* 动作按钮：一行一颗、占满宽度；高度/圆角/字号全走 .desk-btn 的令牌 */
.act {
  width: 100%;
}

.act:disabled {
  cursor: progress;
  animation: desk-pulse 1s ease-in-out infinite;
}

/* 收藏心：图角落，平时浮一层玻璃，收藏后实心 */
.fav-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(0 0 0 / 34%);
  color: rgb(255 255 255 / 76%);
  opacity: 0;
  cursor: pointer;
  transform: scale(0.82);
  transition:
    opacity var(--desk-dur-fast) var(--desk-ease),
    transform var(--desk-dur-fast) var(--desk-ease),
    background var(--desk-dur-fast) var(--desk-ease);
}

.desk-tile:hover .fav-dot,
.desk-tile:focus-visible .fav-dot,
.swatch-item:hover .fav-dot,
.fav-dot.is-on {
  opacity: 1;
  transform: none;
}

/* 触屏没有 hover：心一直露出来（淡一点） */
@media (hover: none) {
  .fav-dot {
    opacity: 0.72;
  }
}

/* 按下就缩，比悬停更快 */
.fav-dot:active {
  transform: scale(0.86);
  transition-duration: 60ms;
}

/* 点亮：弹一下 + 一圈涟漪，40ms 内就能看到 */
.fav-dot.is-on {
  background: var(--desk-accent);
  color: #fff;
  animation: desk-heart-pop 420ms var(--desk-ease-out);
}

.fav-dot.is-on::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 1.5px solid var(--desk-accent);
  pointer-events: none;
  animation: desk-heart-ring 520ms var(--desk-ease-out) forwards;
}

.fav-dot.is-on :deep(svg) {
  fill: currentColor;
}

/* 写盘还没回来：心轻轻呼吸一下表示「在存」 */
.fav-dot.is-busy :deep(svg) {
  animation: desk-pulse 700ms ease-in-out infinite;
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