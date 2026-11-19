<template>
  <Sheet v-model:open="open" title="设置" :icon="SettingsIcon" :origin="origin" width="min(780px, 92vw)" height="min(620px, 84vh)">
    <div class="settings">
      <!-- 左导航：常驻单层（HIG sidebars.md），标题就在栏顶 -->
      <nav class="nav desk-pane is-left">
          <button
          v-for="s in SECTIONS"
          :key="s.value"
          class="nav-item"
          :class="{ 'is-active': current === s.value }"
          @click="current = s.value"
        >
          <span class="nav-icon"><component :is="s.icon" :size="15" :stroke-width="1.7" /></span>
          <span>{{ s.label }}</span>
        </button>
      </nav>

      <!-- 内容：按导航换面板 -->
      <div class="pane desk-pane is-right">
        <component :is="activeComponent" />
      </div>
    </div>
  </Sheet>
</template>

<script setup lang="ts">
/**
 * 设置面板外壳
 *
 * 与卡片详情共用同一个 `Sheet`：一块玻璃面、悬浮关闭键、从触发按钮 FLIP 展开。
 * 这里只做两件事：左导航 + 切换面板。
 * 新增一个设置分区 = 在 SECTIONS 加一行 + 写一个面板组件，其余不动。
 */
import { computed, ref, watch } from "vue"
import { Image as ImageIcon, Info, LayoutGrid, SlidersHorizontal } from "lucide-vue-next"
import { Settings as SettingsIcon } from "lucide-vue-next"
import Sheet from "./Sheet.vue"
import WallpaperPanel from "./settings/WallpaperPanel.vue"
import CardsPanel from "./settings/CardsPanel.vue"
import CardsLibraryPanel from "./settings/CardsLibraryPanel.vue"
import AboutPanel from "./settings/AboutPanel.vue"
import "@/ui/ui.css"

const props = defineProps<{ open: boolean; tab?: string; origin?: DOMRect | null }>()
const emit = defineEmits<{ "update:open": [boolean] }>()

/** 导航分区：图标统一取 lucide，不手画 SVG */
const SECTIONS = [
  { label: "壁纸", value: "wallpaper", component: WallpaperPanel, icon: ImageIcon },
  { label: "组件设置", value: "cards", component: CardsPanel, icon: SlidersHorizontal },
  { label: "卡片库", value: "library", component: CardsLibraryPanel, icon: LayoutGrid },
  { label: "关于", value: "about", component: AboutPanel, icon: Info },
]

const open = ref(props.open)
watch(() => props.open, (v) => (open.value = v))
watch(open, (v) => emit("update:open", v))

const current = ref(props.tab || "wallpaper")

// 外部打开时指定分区（点「设置」→壁纸 / 点「添加卡片」→卡片库）
watch(
  () => [props.open, props.tab] as const,
  ([isOpen, tab]) => {
    if (isOpen && tab) current.value = tab
  },
  { immediate: true },
)

const activeComponent = computed(() => SECTIONS.find((s) => s.value === current.value)?.component || WallpaperPanel)
</script>

<style scoped>
.settings {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  gap: var(--desk-detail-gap);
  /* 外圈 inset 由 Sheet 统一给，这里只剩栏与栏之间的缝 */
  color: var(--desk-text);
}

.nav {
  flex: 0 0 128px;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
  min-height: 0;
  padding: var(--desk-detail-pad) var(--desk-sp-2);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  height: var(--desk-hit);
  padding: 0 var(--desk-sp-3);
  border: 0;
  border-radius: var(--desk-r-control);
  background: transparent;
  color: var(--desk-text-2);
  font: inherit;
  font-size: var(--desk-fs-body);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--desk-dur) var(--desk-ease),
    color var(--desk-dur) var(--desk-ease);
}

.nav-icon {
  display: grid;
  place-items: center;
  opacity: 0.75;
}

.nav-item:hover {
  color: var(--desk-text);
  background: color-mix(in srgb, var(--desk-accent) 10%, transparent);
}

.nav-item.is-active {
  color: var(--desk-text);
  background: color-mix(in srgb, var(--desk-accent) 16%, transparent);
  font-weight: var(--desk-fw-medium);
}

.pane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--desk-detail-pad);
  /* 不显示滚动条，但仍可滚（滚轮/触控板） */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.pane::-webkit-scrollbar {
  display: none;
}
</style>
