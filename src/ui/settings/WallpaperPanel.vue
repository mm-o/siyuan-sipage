<template>
  <div class="desk-panel">
    <!-- 当前壁纸预览：先看结果，再改（HIG） -->
    <div class="desk-preview" :style="previewStyle">
      <span class="desk-preview-tag">{{ currentLabel }}</span>
    </div>

    <!-- 来源：单一单选列表，避免两级控件造成割裂 -->
    <div class="sources">
      <button
        v-for="s in SOURCES"
        :key="s.value"
        class="source"
        :class="{ 'is-active': source === s.value }"
        @click="pick(s.value)"
      >
        <span class="source-icon"><component :is="s.icon" :size="15" :stroke-width="1.7" /></span>
        <span class="source-text">
          <strong>{{ s.label }}</strong>
          <small>{{ s.desc }}</small>
        </span>
        <span v-if="source === s.value" class="source-check">✓</span>
      </button>
    </div>

    <!-- 选择区：随来源切换 -->
    <div class="picker">
      <!-- 思源头图 -->
      <template v-if="source === 'cover'">
        <Chips v-model="activeCat" :options="catOptions" />
        <div class="desk-tiles">
          <button
            v-for="c in visible"
            :key="c.file"
            class="desk-tile ariaLabel" data-position="north" data-tooltip-encoding="none"
            :class="{ 'is-active': wallpaper.value === coverUrl(c.file) }"
            :style="{ backgroundImage: `url(${coverUrl(c.file)})` }"
            :aria-label="c.photographer ? `${labelOf(c)} · ${c.photographer}` : labelOf(c)"
            @click="wallpaper.value = coverUrl(c.file)"
          />
        </div>
      </template>

      <!-- 必应每日 -->
      <div v-else-if="source === 'bing'" class="desk-tiles">
        <button
          v-for="b in bing"
          :key="b.url"
          class="desk-tile ariaLabel" data-position="north" data-tooltip-encoding="none"
          :class="{ 'is-active': wallpaper.value === b.url }"
          :style="{ backgroundImage: `url(${b.url})` }"
          :aria-label="b.title"
          @click="wallpaper.value = b.url"
        />
        <p v-if="!bing.length" class="desk-hint">必应壁纸加载失败，请检查网络。</p>
      </div>

      <!-- 本地随机 -->
      <div v-else-if="source === 'random'" class="random">
        <div class="random-preview" :style="{ backgroundImage: `url(${wallpaper.value})` }" />
        <button class="desk-btn" @click="shuffle">换一张</button>
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
    />
  </div>

      <!-- 链接 -->
      <div v-else class="url-row">
        <input v-model="url" class="desk-input" type="url" placeholder="https://example.com/wallpaper.jpg" @keydown.enter="applyUrl" />
        <button class="desk-btn" @click="applyUrl">使用</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 壁纸面板
 *
 * 职责：选「用哪张壁纸」。模糊/遮罩不在这里（属于全局显示设置，在组件设置里）。
 * 来源只用可靠通道：思源 manifest / 必应官方接口 / 本地随机。
 */
import { Chips } from "@/ui/controls"
import { computed, onMounted, ref } from "vue"
import type { Component } from "vue"
import { Circle, Image as ImageIcon, Link } from "lucide-vue-next"
import { wallpaper } from "@/core/store"
import {
  COVERS,
  coverUrl,
  loadBingImages,
  loadCoverGroups,
  picsumWallpaper,
  randomCoverUrl,
  SOURCE_LABEL,
  type BingImage,
  type CoverGroup,
  type CoverItem,
  type WallSource,
} from "@/core/image"
import "@/ui/ui.css"

const SOURCES: { value: WallSource; label: string; desc: string; icon: Component }[] = [
  { value: "cover", label: "思源头图", desc: "本地 18 个分类", icon: ImageIcon },
  { value: "bing", label: "必应每日", desc: "最近 8 天（联网）", icon: ImageIcon },
  { value: "picsum", label: "Picsum 随机", desc: "联网，失败走代理", icon: ImageIcon },
  { value: "random", label: "本地随机", desc: "从题头图里随机", icon: ImageIcon },
  { value: "solid", label: "纯色", desc: "32 色 + 取色器", icon: Circle },
  { value: "url", label: "图片链接", desc: "自定义 URL", icon: Link },
]

const groups = ref<CoverGroup[]>([])
const bing = ref<BingImage[]>([])
const activeCat = ref("")
const url = ref("")

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

/** 当前来源由 store 推导，保证与桌面渲染一致 */
const source = computed<WallSource>(() => {
  if (wallpaper.type === "solid") return "solid"
  if (wallpaper.type === "url") return "url"
  if (wallpaper.source === "bing") return "bing"
  if (wallpaper.source === "picsum") return "picsum"
  if (wallpaper.source === "random") return "random"
  return "cover"
})
const currentLabel = computed(() => SOURCE_LABEL[source.value])

const previewStyle = computed(() => {
  const blur = wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined
  return source.value === "solid"
    ? { background: wallpaper.value, filter: blur }
    : { backgroundImage: `url(${wallpaper.resolved || wallpaper.value})`, filter: blur }
})

function labelOf(item: CoverItem) {
  return groups.value.find((g) => g.items.includes(item))?.label || ""
}

onMounted(async () => {
  groups.value = await loadCoverGroups()
  bing.value = await loadBingImages()
})

async function pick(s: WallSource) {
  switch (s) {
    case "cover": {
      wallpaper.type = "cover"
      wallpaper.source = "cover"
      const first = groups.value[0]?.items[0]
      if (first) wallpaper.value = coverUrl(first.file)
      break
    }
    case "bing": {
      wallpaper.type = "cover"
      wallpaper.source = "bing"
      if (!bing.value.length) bing.value = await loadBingImages()
      const pickOne = bing.value[Math.floor(Math.random() * bing.value.length)]
      if (pickOne) wallpaper.value = pickOne.url
      break
    }
    case "picsum": {
      wallpaper.type = "cover"
      wallpaper.source = "picsum"
      wallpaper.value = picsumWallpaper()
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
 * 24 个常用底色 + 末尾一个系统取色器（HIG color-wells.md：优先用系统取色器）。
 */
const props = defineProps<{ modelValue: string }>()
defineEmits<{ "update:modelValue": [string] }>()

const COLORS = [
  "#0b0e14", "#111827", "#1e293b", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#f1f5f9",
  "#fde68a", "#fbbf24", "#f59e0b", "#b45309", "#fecaca", "#ef4444", "#dc2626", "#991b1b",
  "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#d1fae5", "#10b981", "#8b5cf6", "#f472b6",
]

const isActive = (c: string) => c.toLowerCase() === wallpaper.value.toLowerCase()
</script>

<style scoped>
.sources {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--desk-sp-1h);
}

.source {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-2) 10px;
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

.source-icon {
  display: grid;
  place-items: center;
  opacity: 0.8;
}

.source-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.source-text small {
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}

.source-check {
  margin-left: auto;
  color: var(--desk-accent);
}

.picker {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
}

.random {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
}

.random-preview {
  flex: 1 1 auto;
  height: 96px;
  border-radius: var(--desk-r-control);
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
