<template>
  <Sheet v-model:open="open" title="设置" :icon="SettingsIcon" :origin="origin" width="min(1040px, 94vw)" height="min(660px, 86vh)">
    <div class="set">
      <!-- ① 导航 -->
      <nav class="set-nav desk-pane is-left">
        <button
          v-for="s in SECTIONS"
          :key="s.value"
          class="set-nav-item"
          :class="{ 'is-active': current === s.value }"
          type="button"
          @click="current = s.value"
        >
          <span class="set-nav-icon"><component :is="s.icon" :size="16" :stroke-width="1.7" /></span>
          <span class="set-nav-label">{{ s.label }}</span>
          <span v-if="s.badge" class="set-nav-badge">{{ s.badge }}</span>
        </button>
      </nav>

      <!-- ② 内容 -->
      <div class="set-main desk-pane is-mid">
        <AboutPanel v-if="current === 'about'" />
        <LibraryPanel v-else-if="current === 'library'" :selected="selected" @select="selected = $event" />
        <component :is="activeComponent" v-else />
      </div>

      <!-- ③ 侧栏：当前状态的实时反馈 -->
      <aside class="set-side desk-pane is-right">
        <h3 class="set-side-title">{{ sideTitle }}</h3>

        <!-- 预览卡：外观 / 壁纸分区 -->
        <template v-if="current === 'wallpaper' || current === 'cards'">
          <div class="set-preview" :style="previewBg">
            <div class="set-preview-card desk-surface">
              <span class="pc-date">11.13 星期五</span>
              <span class="pc-big">13</span>
              <span class="pc-line" />
              <span class="pc-quote" />
            </div>
            <span class="set-preview-tag">{{ tag }}</span>
          </div>

          <!-- 当前壁纸：来源 + 尺寸 -->
          <div class="set-meta">
            <span class="set-meta-src">{{ sourceLabel }}</span>
            <span class="set-meta-size">{{ wallSize }}</span>
          </div>

          <!-- 收藏：点一下换过去，右上角叉删掉 -->
          <template v-if="current === 'wallpaper'">
            <h4 class="set-side-sub">收藏 {{ favorites.length }} 张</h4>
            <div v-if="favorites.length" class="set-fav">
              <div v-for="name in favorites" :key="name" class="set-fav-item" :class="{ 'is-active': wallpaper.value === favUrl(name) }" :style="{ backgroundImage: `url(${favUrl(name)})` }">
                <button class="set-fav-pick" type="button" :aria-label="`用这张收藏 · ${name}`" @click="setWallpaper('cover', favUrl(name), 'cover')" />
                <GlassButton class="set-fav-x" :icon="X" label="删除收藏" tone="photo" variant="danger" @click.stop="dropFav(name)" />
              </div>
            </div>
            <p v-else class="desk-hint">点壁纸右上角的 ♥ 或桌面右键「收藏当前壁纸」，图会存进思源 public 文件夹。</p>
          </template>
        </template>

        <!-- 卡片库：选中卡片的预览 + 张数 + 添加 -->
        <template v-else-if="current === 'library'">
          <div v-if="picked" class="set-card-preview">
            <!-- 真卡片：同一份组件、同一个外框，只是这里不响应点击 -->
            <div class="set-card-live">
              <CardFrame :card-id="picked.id" :w="pv.w" :h="pv.h" preview>
                <component :is="picked.component" :size="`${pv.w}x${pv.h}`" :w="pv.w" :h="pv.h" />
              </CardFrame>
            </div>
            <b class="set-card-name">{{ picked.name }}</b>
            <small class="set-card-desc">{{ picked.desc }}</small>
            <span class="set-count desk-badge" :class="{ 'is-on': countOnDesk(picked.id) }">
              {{ countOnDesk(picked.id) ? `已添加 ${countOnDesk(picked.id)} 张` : "尚未添加" }}
            </span>
            <GlassButton class="set-add" text :variant="countOnDesk(picked.id) ? 'default' : 'primary'" :icon="Plus" label="添加到桌面" @click="addToDesk(picked.id)" />
            <GlassButton v-if="countOnDesk(picked.id)" class="set-remove" text variant="danger" :icon="Minus" label="移除一张" @click="removeOne(picked.id)" />
          </div>
        </template>

        <!-- 关于：版本信息 + 重置桌面 -->
        <template v-else-if="current === 'about'">
          <dl class="set-kv">
            <dt>版本</dt><dd>v{{ version }}</dd>
            <dt>运行环境</dt><dd>思源 {{ frontend }}</dd>
            <dt>仓库</dt>
            <dd><a class="set-link" :href="pkg.homepage" target="_blank" rel="noreferrer">{{ pkg.homepage.replace("https://github.com/", "") }}</a></dd>
          </dl>
          <div class="set-about-reset">
            <b>重置桌面</b>
            <small>清空卡片，回到默认一张</small>
            <GlassButton text label="重置" @click="resetDesk()" />
          </div>
        </template>

        <p v-if="current === 'library'" class="set-side-hint">同一张卡可以放多张；尺寸与位置在桌面「整理模式」里拖。</p>
        <p v-else-if="current === 'cards'" class="set-side-hint">拖动滑轨立刻生效，双击滑轨恢复该项默认值。</p>

        <dl v-if="current === 'wallpaper'" class="set-stats">
          <div><dt>模糊</dt><dd>{{ wallpaper.blur }}</dd></div>
          <div><dt>遮罩</dt><dd>{{ Math.round(wallpaper.mask * 100) }}%</dd></div>
          <div><dt>张贴</dt><dd>{{ desk.cards.length }}</dd></div>
        </dl>

        <div class="set-side-foot">
          <GlassButton text label="恢复默认" @click="resetAll" />
        </div>
      </aside>
    </div>
  </Sheet>
</template>

<script setup lang="ts">
/**
 * 设置外壳（三栏）
 *
 *   左：分区导航（壁纸 / 组件设置 / 卡片库 / 关于）
 *   中：当前分区的设置项
 *   右：实时反馈（预览卡 / 统计 / 提示），底部统一「恢复默认」
 *
 * 三栏分工固定，新增分区只写中间那块，右栏按需给一句话反馈，不再把「卡片库」
 * 混进「组件设置」里。
 */
import { computed, ref, watch } from "vue"
import { getFrontend } from "siyuan"
import { Grid2x2, Image as ImageIcon, Info, Minus, Plus, SlidersHorizontal, X } from "lucide-vue-next"
import { Settings as SettingsIcon } from "lucide-vue-next"
import CardFrame from "./CardFrame.vue"
import Sheet from "./Sheet.vue"
import AboutPanel from "./AboutPanel.vue"
import WallpaperPanel from "./WallpaperPanel.vue"
import CardsPanel from "./CardsPanel.vue"
import LibraryPanel from "./LibraryPanel.vue"
import { appearance, desk, favorites, resetAppearance, resetDesk, wallpaper, setWallpaper, addToDesk, countOnDesk, removeFromDesk, dropFavorite } from "@/core/store"
import { GlassButton, toast } from "./controls"
import { SOURCE_LABEL, favUrl, wallpaperBg, wallSource } from "@/core/image"
import { CARDS } from "@/core/registry"
import pkg from "../../package.json"

const props = defineProps<{ tab?: string; origin?: DOMRect | null }>()
const open = defineModel<boolean>("open", { required: true })

const SECTIONS = [
  { label: "壁纸", value: "wallpaper", component: WallpaperPanel, icon: ImageIcon },
  { label: "组件设置", value: "cards", component: CardsPanel, icon: SlidersHorizontal },
  { label: "卡片库", value: "library", component: LibraryPanel, icon: Grid2x2, badge: String(CARDS.length) },
  { label: "关于", value: "about", icon: Info },
]

const current = ref(props.tab || "wallpaper")
watch(
  () => [open.value, props.tab] as const,
  ([isOpen, tab]) => {
    if (isOpen && tab) current.value = tab
  },
)

const activeComponent = computed(() => SECTIONS.find((s) => s.value === current.value)?.component)
const sideTitle = computed(
  () =>
    ({ wallpaper: "预览", cards: "预览", library: "统计", about: "信息" })[current.value] ?? "预览",
)
const version = pkg.version
const frontend = getFrontend()

/* 预览：用真实壁纸做底（图片 / 纯色 / 跟随思源三态统一由 wallpaperBg 给出） */
const previewBg = computed(() => wallpaperBg(wallpaper))
const tag = computed(
  () => `圆角 ${appearance.radius} · 模糊 ${appearance.blur} · 玻璃 ${Math.round(appearance.opacity * 100)}%`,
)

/* 壁纸信息：来源名 + 真实像素尺寸（主题/纯色没有像素，就给颜色） */
const sourceLabel = computed(() => SOURCE_LABEL[wallSource(wallpaper)])
const wallSize = ref("")
watch(
  [() => wallpaper.type, () => wallpaper.resolved || wallpaper.value],
  (_, __, onCleanup) => {
    if (wallpaper.type === "theme") {
      wallSize.value = "主题色"
      return
    }
    if (wallpaper.type === "solid") {
      wallSize.value = wallpaper.value.toUpperCase()
      return
    }
    if (wallpaper.type === "siyuan" && !wallpaper.value) {
      wallSize.value = "思源资源"
      return
    }
    const src = wallpaper.resolved || wallpaper.value
    if (!src) {
      wallSize.value = ""
      return
    }
    const img = new Image()
    wallSize.value = ""
    onCleanup(() => { img.onload = img.onerror = null })
    img.onload = () => (wallSize.value = `${img.naturalWidth}×${img.naturalHeight}`)
    img.onerror = () => (wallSize.value = "加载失败")
    img.src = src
  },
  { immediate: true },
)

async function dropFav(name: string) {
  try { await dropFavorite(name) }
  catch (error) { toast(`删除收藏失败：${(error as Error).message}`) }
}

/**
 * 预览尺寸：用注册表的约束推出来，不另写一套。
 *   step  → 两段（6×3），拼图正好两块
 *   其它  → 4×2
 */
const pv = computed(() => {
  const step = picked.value?.constrain?.step ?? 1
  /* 有段落的卡：给两段（快捷方式 4×2、统计 6×3），正好一眼看出它的颗粒度 */
  return step > 1 ? { w: step * 2, h: step } : { w: 4, h: 2 }
})

/* 卡片库：选中一张卡，右栏预览并添加 */
const selected = ref(CARDS[0]?.id ?? "")
const picked = computed(() => CARDS.find((c) => c.id === selected.value))

function removeOne(id: string) {
  for (let i = desk.cards.length - 1; i >= 0; i -= 1) {
    if (desk.cards[i].cardId === id) {
      removeFromDesk(desk.cards[i].uid)
      return
    }
  }
}

function resetAll() {
  resetAppearance()
  wallpaper.blur = 0
  wallpaper.mask = 0.18
}
</script>

<style scoped>
.set {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: var(--desk-detail-gap);
}

/* ① 导航 */
.set-nav {
  flex: 0 0 156px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--desk-sp-2);
}

.set-nav-item {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
  height: 34px;
  padding: 0 var(--desk-sp-2h);
  border: 0;
  border-radius: var(--desk-r-control);
  background: transparent;
  color: var(--desk-text-2);
  font-size: var(--desk-fs-body);
  text-align: left;
  cursor: pointer;
}

.set-nav-item:hover {
  background: color-mix(in srgb, var(--desk-text) 6%, transparent);
}

.set-nav-item.is-active {
  background: color-mix(in srgb, var(--desk-accent) 14%, transparent);
  color: var(--desk-accent);
}

.set-nav-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.set-nav-badge {
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

/* ② 内容 */
.set-main {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden auto;
  padding: var(--desk-sp-4);
}

/* ③ 侧栏 */
.set-side {
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-3);
  padding: var(--desk-sp-4);
  min-height: 0;
}

.set-side-title {
  margin: 0;
  font-size: var(--desk-fs-caption);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--desk-text-3);
}

.set-side-hint {
  margin: 0;
  font-size: var(--desk-fs-caption);
  line-height: 1.6;
  color: var(--desk-text-3);
}

.set-side-foot {
  margin-top: auto;
  padding-top: var(--desk-sp-2);
  border-top: 1px solid var(--desk-stroke);
  flex: 0 0 auto;
}

/* 收藏网格：整栏剩余空间全部给它，装不下就自己滚，底部按钮永远不被挤走 */
.set-side > .set-fav {
  flex: 1 1 0;
  min-height: 96px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: var(--desk-sp-0);
}

.set-side > .set-side-hint {
  margin-top: var(--desk-sp-2);
}

/* 底部小统计：把右栏剩余空间变成实时反馈 */
.set-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--desk-sp-1h);
  margin: auto 0 0;
}

.set-stats div {
  padding: var(--desk-sp-1h) var(--desk-sp-2);
  border-radius: var(--desk-r-md);
  border: 1px solid var(--desk-stroke);
  text-align: center;
}

.set-stats dt {
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
}

.set-stats dd {
  margin: 2px 0 0;
  font-size: var(--desk-fs-body);
  font-variant-numeric: tabular-nums;
  color: var(--desk-text);
}

/* 预览卡：真实壁纸 + 当前外观参数 */
.set-preview {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 2;
  border-radius: var(--desk-r-md);
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

/* 来源 + 尺寸 */
.set-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--desk-sp-2);
}

.set-meta-src {
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-2);
}

.set-meta-size {
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

/* 收藏：3 列，与来源网格同构；每格右上角带删除 */
.set-side-sub {
  margin: 0;
  font-size: var(--desk-fs-caption);
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--desk-text-3);
}

.set-fav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--desk-sp-1h);
  align-content: start;
}

.set-fav-item {
  position: relative;
  aspect-ratio: 16 / 10;
  padding: 0;
  border-radius: 7px;
  border: 1px solid var(--desk-stroke);
  background-size: cover;
  background-position: center;
  cursor: pointer;
  transition:
    transform var(--desk-dur-fast) var(--desk-ease),
    box-shadow var(--desk-dur-fast) var(--desk-ease);
}

.set-fav-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--desk-shadow-2);
}

.set-fav-item.is-active {
  box-shadow: 0 0 0 2px var(--desk-accent);
}

/* 删除叉：只在悬停/选中时露出来，不挡缩略图 */
.set-fav-pick { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; border-radius: inherit; background: transparent; cursor: pointer; }
.set-fav-pick:focus-visible { outline: var(--desk-ring); outline-offset: 2px; }
.set-fav-x { position: absolute; top: 2px; right: 2px; opacity: 0; }
.set-fav-item:hover .set-fav-x, .set-fav-item:focus-within .set-fav-x { opacity: 1; }
@media (hover: none) { .set-fav-x { opacity: 1; } }

.set-preview-card {
  --dg-surface-fill: var(--dg-card-fill);
  --dg-surface-radius: var(--desk-r-card);
  --dg-surface-blur: var(--desk-blur-regular);
  --dg-surface-shadow: 0 6px 18px rgb(12 28 48 / calc(var(--desk-card-shadow, .34) * .5));
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 66%;
  padding: var(--desk-sp-2h) var(--desk-sp-3);
}

.pc-date {
  font-size: var(--desk-fs-2xs);
  opacity: 0.72;
}

.pc-big {
  font-size: 28px;
  font-weight: 300;
  line-height: 1;
}

.pc-line {
  height: 1px;
  background: color-mix(in srgb, currentColor 18%, transparent);
}

.pc-quote {
  height: 5px;
  border-radius: var(--desk-r-xs);
  background: color-mix(in srgb, currentColor 18%, transparent);
}

.set-preview-tag {
  position: absolute;
  left: var(--desk-sp-2);
  bottom: var(--desk-sp-2);
  padding: 2px 6px;
  border-radius: var(--desk-r-sm);
  background: rgb(0 0 0 / 42%);
  color: #fff;
  font-size: var(--desk-fs-2xs);
}

/* 卡片库：右栏预览与操作 */
.set-card-preview {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--desk-sp-1);
}

/* 真卡片的画布：4:2 的比例，卡片在里面按 cqmin 自适应 */
.set-card-live {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 1;
  overflow: hidden;
}

.set-card-name {
  margin-top: var(--desk-sp-1);
  font-size: var(--desk-fs-body);
  font-weight: 600;
  text-align: center;
}

.set-card-desc {
  font-size: var(--desk-fs-caption);
  line-height: 1.5;
  color: var(--desk-text-3);
  text-align: center;
}

.set-count {
  align-self: flex-start;
  margin-top: var(--desk-sp-1);
}

.set-add { width: 100%; min-height: 30px; margin-top: var(--desk-sp-2); }
.set-remove { width: 100%; }

/* 关于：说明 + 键值表 */
.set-kv {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: var(--desk-sp-2) var(--desk-sp-3);
  margin: 0;
  font-size: var(--desk-fs-body);
}

.set-kv dt {
  color: var(--desk-text-3);
}

.set-kv dd {
  margin: 0;
  color: var(--desk-text);
}

.set-link {
  color: var(--desk-accent);
  text-decoration: none;
}

/* 关于：重置桌面（危险操作放最下面，和右栏「恢复默认」分开） */
.set-about-reset {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  margin-top: auto;
  padding-top: var(--desk-sp-3);
  border-top: 1px solid var(--desk-stroke);
  font-size: var(--desk-fs-caption);
}

.set-about-reset b {
  font-weight: 600;
  color: var(--desk-text);
}

.set-about-reset small {
  color: var(--desk-text-3);
}

.set-about-reset .gb {
  margin-top: var(--desk-sp-1);
}
</style>
