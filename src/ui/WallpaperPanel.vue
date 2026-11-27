<template>
  <div class="desk-panel desk-set-page">
    <h2 class="desk-set-h2">{{ t("ui.wall.title") }}</h2>
    <p class="desk-set-p">{{ t("ui.wall.desc") }}</p>

    <!-- 来源统一选择：图标与来源一一对应，同一尺寸同一线宽 -->
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
          <GlassField v-model="assetQ" type="search" :label="t('ui.wall.searchLabel')" :placeholder="t('ui.wall.searchPlaceholder')" />
        </div>
        <span class="desk-hint">{{ t("ui.wall.assetCount", { shown: assetShown.length, total: assetFiltered.length }) }}</span>
        <div class="desk-tiles">
          <div
            v-for="a in assetShown"
            :key="a.path"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.url})` }"
          >
            <button class="wallpaper-pick" type="button" :aria-label="a.path" @click="choose('siyuan', a.url)" />
            <FavDot :value="a.url" :pending="favState(a.url)" />
          </div>
        </div>
        <p v-if="!assets.length" class="desk-hint">{{ t("ui.wall.assetsEmpty") }}</p>
        <p v-else-if="!assetShown.length" class="desk-hint">{{ t("ui.wall.assetsNoMatch") }}</p>
        <GlassButton class="act" text :label="t('ui.wall.anotherImage')" @click="pick('siyuan')" />
        <GlassButton
          v-if="assetMore || assetLimit > PAGE"
          class="act"
          text
          :label="assetMore ? t('ui.wall.loadMore', { n: Math.min(assetMore, PAGE) }) : t('ui.wall.collapse')"
          @click="assetToggle"
        />
      </div>

      <!-- 思源头图：分类标签全列出（纯文字标签，换行不滚） -->
      <template v-else-if="tab === 'cover'">
        <Chips v-model="activeCat" :options="catOptions" />
        <div class="desk-tiles">
          <div
            v-for="c in coverShown"
            :key="c.file"
            class="desk-tile ariaLabel" data-position="north" data-tooltip-encoding="none"
            :class="{ 'is-active': wallpaper.value === coverUrl(c.file) }"
            :style="{ backgroundImage: `url(${coverUrl(c.file)})` }"
          >
            <button class="wallpaper-pick" type="button" :aria-label="c.photographer ? `${labelOf(c)} · ${c.photographer}` : labelOf(c)" @click="choose('cover', coverUrl(c.file), 'cover')" />
            <FavDot :value="coverUrl(c.file)" :pending="favState(coverUrl(c.file))" />
          </div>
        </div>
        <GlassButton
          v-if="coverMore || coverLimit > PAGE"
          class="act"
          text
          :label="coverMore ? t('ui.wall.loadMore', { n: Math.min(coverMore, PAGE) }) : t('ui.wall.collapse')"
          @click="coverToggle"
        />
      </template>

      <!-- 必应每日 -->
      <div v-else-if="tab === 'bing'" class="picsum">
        <div class="desk-tiles">
          <div
            v-for="b in bing"
            :key="b.url"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === b.url }"
            :style="{ backgroundImage: `url(${b.url})` }"
          >
            <button class="wallpaper-pick" type="button" :aria-label="b.title" @click="pickImage({ url: b.url }, 'bing')" />
            <FavDot :value="b.url" :pending="favState(b.url)" />
          </div>
        </div>
        <p v-if="loading.bing" class="desk-hint">{{ t("ui.wall.fetching") }}</p>
        <p v-else-if="!bing.length" class="desk-hint">{{ t("ui.wall.bingFail") }}</p>
      </div>

      <!-- 国内图源：alcy.cc 一次直出，国内可访问 -->
      <div v-else-if="tab === 'gitee'" class="picsum">
        <div class="desk-tiles">
          <div
            v-for="a in alcy"
            :key="a.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === a.url }"
            :style="{ backgroundImage: `url(${a.thumb})` }"
          >
            <button class="wallpaper-pick" type="button" :aria-label="t('ui.wall.alcyAlt', { seed: a.seed })" @click="pickImage(a, 'gitee')" />
            <FavDot :value="a.url" :pending="favState(a.url)" />
          </div>
        </div>
        <GlassButton class="act" text :disabled="busy.gitee || loading.gitee" @click="reshuffle('gitee')" :label="busy.gitee || loading.gitee ? t('ui.wall.fetching') : alcy.length ? t('ui.wall.batch', { n: alcy.length }) : t('ui.wall.batchAlone')" />
        <p v-if="!alcy.length && !loading.gitee" class="desk-hint">{{ t("ui.wall.fetchFail") }}</p>
      </div>

      <!-- Picsum：缩略图先铺，点哪张用哪张，原图后到 -->
      <div v-else-if="tab === 'picsum'" class="picsum">
        <div class="desk-tiles">
          <div
            v-for="p in picsum"
            :key="p.seed"
            class="desk-tile"
            :class="{ 'is-active': wallpaper.value === p.url }"
            :style="{ backgroundImage: `url(${p.thumb})` }"
          >
            <button class="wallpaper-pick" type="button" :aria-label="`Picsum · ${p.seed}`" @click="pickImage(p, 'picsum')" />
            <FavDot :value="p.url" :pending="favState(p.url)" />
          </div>
        </div>
        <GlassButton class="act" text :disabled="busy.picsum || loading.picsum" @click="reshuffle('picsum')" :label="busy.picsum || loading.picsum ? t('ui.wall.fetching') : picsum.length ? t('ui.wall.batch', { n: picsum.length }) : t('ui.wall.batchAlone')" />
        <p v-if="!picsum.length && !loading.picsum" class="desk-hint">{{ t("ui.wall.fetchFail") }}</p>
      </div>

      <!-- 本地随机 / 跟随思源：同一块预览 -->
      <div v-else-if="tab === 'random'" class="random">
        <div class="random-preview" :style="{ backgroundImage: `url(${wallpaper.value})` }" />
        <GlassButton class="act" text :label="t('ui.wall.anotherImage')" @click="shuffle" />
      </div>

      <div v-else-if="tab === 'theme'" class="random">
        <div class="theme-preview" :style="themePreview">
          <i class="theme-preview-card" />
          <i class="theme-preview-card is-wide" />
        </div>
        <p class="desk-hint">{{ t("ui.wall.themeHint") }}</p>
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
          @click="choose('solid', c)"
        />
      </div>

      <!-- 链接 -->
      <div v-else class="url-row">
        <GlassField v-model="url" type="url" :label="t('ui.wall.urlLabel')" placeholder="https://example.com/wallpaper.jpg" @keydown.enter="applyUrl" />
        <GlassButton text :label="t('ui.wall.use')" @click="applyUrl" />
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
 *
 * 三条交互约定：
 *   1. 点来源先切屏、再取数：取数多慢都不挡切换，按钮就地显示「取图中…」。
 *   2. 网格一屏三行（4×3=12），末行永远是整行；要更多点「加载更多」。
 *   3. 点图先落缩略图（立刻上墙），原图回来再替换；收藏先翻状态，写盘失败再回滚。
 */
import { Chips, GlassButton, GlassField, toast } from "@/ui/controls"
import { computed, defineComponent, h, reactive, ref, watch } from "vue"
import type { Component } from "vue"
import { CalendarDays, Camera, Droplet, FolderOpen, Globe, Heart, Images, Link, Palette, Shuffle } from "lucide-vue-next"
import { t } from "@/core/i18n"
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
  wallSource,
  type AssetImage,
  type BingImage,
  type CoverGroup,
  type CoverItem,
  type WallSource,
  type WebImage,
} from "@/core/image"

/** 「跟随思源」预览：桌面就是思源背景本身，这里只画主题底色 + 卡片剪影 */
const themePreview = computed(() => ({ background: "var(--b3-theme-background)" }))

/** 一屏三行：4 列 × 3 行 = 12 张 */
const PAGE = 12

/**
 * 收藏开关：贴在每张图右上角。
 * 独立组件：在 setup 里算一次名字，只订阅这一张的状态，别处的收藏变化不会把整屏点亮。
 * pending 是乐观状态（"on" / "off"）：点下立刻翻色，写盘回来后由 favorites 接管。
 */
const FavDot = defineComponent({
  props: { value: { type: String, required: true }, pending: { type: String, default: "" } },
  setup(props) {
    const name = computed(() => favName(props.value))
    const on = computed(() => (props.pending ? props.pending === "on" : isFav(name.value)))
    return () => h(GlassButton, {
      class: ["fav-dot", { "is-busy": Boolean(props.pending) }],
      icon: Heart,
      active: on.value,
      tone: "photo",
      variant: on.value ? "danger" : "default",
      label: on.value ? t("ui.wall.unfav") : t("ui.wall.fav"),
      onClick: (e: MouseEvent) => { e.stopPropagation(); void toggleFav(props.value) },
    })
  },
})

/** 收藏的乐观状态：name → 目标状态；写盘期间图标已经是最终样子 */
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
    toast((e as Error)?.message || t("ui.wall.favFail"))
  } finally {
    const rest = { ...favPending.value }
    delete rest[name]
    favPending.value = rest
  }
}

/** 壁纸来源与显示标签 */
const SOURCES: { value: WallSource; label: string; desc: string; icon: Component }[] = [
  { value: "theme", label: t("ui.wall.srcThemeLabel"), desc: t("ui.wall.srcThemeDesc"), icon: Palette },
  { value: "siyuan", label: t("ui.wall.srcAssetsLabel"), desc: t("ui.wall.srcAssetsDesc"), icon: FolderOpen },
  { value: "cover", label: t("ui.wall.srcCoverLabel"), desc: t("ui.wall.srcCoverDesc"), icon: Images },
  { value: "bing", label: t("ui.wall.srcBingLabel"), desc: t("ui.wall.srcBingDesc"), icon: CalendarDays },
  { value: "gitee", label: t("ui.wall.srcAlcyLabel"), desc: t("ui.wall.srcAlcyDesc"), icon: Globe },
  { value: "picsum", label: t("ui.wall.srcPicsumLabel"), desc: t("ui.wall.srcPicsumDesc"), icon: Camera },
  { value: "random", label: t("ui.wall.srcRandomLabel"), desc: t("ui.wall.srcRandomDesc"), icon: Shuffle },
  { value: "solid", label: t("ui.wall.srcSolidLabel"), desc: t("ui.wall.srcSolidDesc"), icon: Droplet },
  { value: "url", label: t("ui.wall.srcUrlLabel"), desc: t("ui.wall.srcUrlDesc"), icon: Link },
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
/** 正在取数的来源：给按钮文案与失败提示用 */
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

/** 分类标签（分类 + 数量），与其它面板共用 Chips；标签全部换行列出来 */
const catOptions = computed(() => [
  { label: t("ui.wall.catAll", { n: total.value }), value: "" },
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

/* 外部换图（右侧收藏、右键收藏）→ 标签跟着走；点标签则两边本来就一致 */
watch(source, (s) => {
  if (s !== tab.value) tab.value = s
})

function labelOf(item: CoverItem) {
  return groups.value.find((g) => g.items.includes(item))?.label || ""
}

/** 最后一次选择生效；所有来源与收藏共用 store 的切换入口。 */
let selection = 0
function choose(...args: Parameters<typeof setWallpaper>) {
  selection++
  setWallpaper(...args)
}

/** 点一张外网图：缩略图先上墙（点下就有反应），原图回来再替换 */
async function pickImage(img: { url: string; thumb?: string }, src: "bing" | "picsum" | "gitee") {
  const request = ++selection
  setWallpaper("cover", img.url, src, img.thumb && img.thumb !== img.url ? img.thumb : undefined)
  if (img.url.startsWith("data:")) return
  const full = await fetchImage(img.url).catch(() => img.thumb)
  if (request === selection && full) setWallpaper("cover", img.url, src, full)
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

/* 标签一换就把它那一屏填满；取不到就空着，不影响别的来源 */
watch(tab, (s) => void ensure(s).catch(() => {}), { immediate: true })

async function pick(s: WallSource) {
  /* 先切屏：高亮与「取图中…」立刻到位，取数在后面跑 */
  tab.value = s
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
  } catch (error) { toast(t("ui.wall.fetchFailDetail", { msg: (error as Error).message })) }
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

/** 加载更多 / 收起：同一颗按钮、同一个位置 */
function assetToggle() {
  assetLimit.value = assetMore.value ? assetLimit.value + PAGE : PAGE
}

function coverToggle() {
  coverLimit.value = coverMore.value ? coverLimit.value + PAGE : PAGE
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
  border-radius: var(--desk-r-control);
  border: 1px solid var(--desk-stroke);
  background: transparent;
  color: var(--desk-text-2);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--desk-dur-fast) var(--desk-ease),
    border-color var(--desk-dur-fast) var(--desk-ease),
    transform var(--desk-dur-fast) var(--desk-ease);
}

.source:hover {
  background: color-mix(in srgb, var(--desk-accent) 8%, transparent);
}

.source:active {
  transform: scale(0.97);
}

/* 选中态交给全局的玻璃高亮规则，这里只把文字提到最亮 */
.source.is-active {
  color: var(--dg-ink);
}

/* 图标位：只有图标本身，不做圆角底衬；选中跟着变色 */
.source-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 15px;
  height: 15px;
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

/* 动作按钮：一行一颗、占满宽度 */
.act {
  width: 100%;
}

.act:disabled {
  cursor: progress;
  animation: desk-pulse 1s ease-in-out infinite;
}

/* 图格：整块都是点击区，焦点环跟着键盘走 */
.wallpaper-pick { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: inherit; background: transparent; cursor: pointer; }
.wallpaper-pick:focus-visible { outline: var(--desk-ring); outline-offset: 2px; }
.fav-dot { position: absolute; top: 3px; right: 3px; z-index: 1; opacity: 0; }
.desk-tile:hover .fav-dot, .desk-tile:focus-within .fav-dot, .fav-dot.is-on { opacity: 1; }
.fav-dot.is-on :deep(svg) { fill: currentColor; }
/* 写盘还没回来：心轻轻呼吸一下表示「在存」 */
.fav-dot.is-busy :deep(svg) { animation: desk-pulse 700ms ease-in-out infinite; }
@media (hover: none) { .fav-dot { opacity: 1; } }

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

/* 跟随思源：预览就是主题底色 + 两张卡片的剪影，一句话说清「桌面和思源一个底」 */
.theme-preview {
  position: relative;
  aspect-ratio: 32 / 11;
  overflow: hidden;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-md);
  background-size: cover;
  background-position: center;
}

.theme-preview-card {
  position: absolute;
  top: 24%;
  left: 10%;
  width: 22%;
  height: 46%;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-md);
  background: var(--desk-surface);
  opacity: 0.92;
}

.theme-preview-card.is-wide {
  left: 38%;
  width: 50%;
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

.swatch-item:active {
  transform: scale(0.96);
}

.swatch-item.active {
  box-shadow:
    0 0 0 2px var(--desk-glass-fill-strong),
    0 0 0 4px var(--desk-accent);
}

@media (prefers-reduced-motion: reduce) {
  .act:disabled,
  .fav-dot.is-busy :deep(svg) {
    animation: none;
  }
}
</style>
