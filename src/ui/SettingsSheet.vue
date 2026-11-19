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
        <section v-if="current === 'about'" class="about">
          <h2 class="set-h2">关于</h2>
          <p class="set-p">把 iTab 的卡片重写进思源：桌面、页签、文档里都能用，而且是活的。</p>
          <dl class="set-kv">
            <dt>版本</dt><dd>v{{ version }}</dd>
            <dt>设计语言</dt><dd>apple-design-skill（HIG · Liquid Glass）</dd>
            <dt>卡片来源</dt><dd>iTab 逆向还原（本地研究）</dd>
            <dt>运行环境</dt><dd>思源 {{ frontend }}</dd>
          </dl>
          <div class="set-group">
            <div class="set-row">
              <div class="set-label">
                <b>重置桌面</b>
                <small>清空卡片，回到默认一张</small>
              </div>
              <button class="desk-btn" type="button" @click="resetDesk()">重置</button>
            </div>
          </div>
        </section>
        <LibraryPanel v-else-if="current === 'library'" :selected="selected" @select="selected = $event" />
        <component :is="activeComponent" v-else />
      </div>

      <!-- ③ 侧栏：当前状态的实时反馈 -->
      <aside class="set-side desk-pane is-right">
        <h3 class="set-side-title">{{ sideTitle }}</h3>

        <!-- 预览卡：外观 / 壁纸分区 -->
        <div v-if="current === 'wallpaper' || current === 'cards'" class="set-preview" :style="previewBg">
          <div class="set-preview-card" :style="previewCard">
            <span class="pc-date">11.13 星期五</span>
            <span class="pc-big">13</span>
            <span class="pc-line" />
            <span class="pc-quote" />
          </div>
          <span class="set-preview-tag">{{ tag }}</span>
        </div>

        <!-- 卡片库：选中卡片的预览 + 张数 + 添加 -->
        <template v-else-if="current === 'library'">
          <div v-if="picked" class="set-card-preview">
            <!-- 真卡片：同一份组件、同一个外框，只是这里不响应点击 -->
            <div class="set-card-live">
              <CardFrame :card-id="picked.id" :size="`${pv.w}x${pv.h}`" :w="pv.w" :h="pv.h" preview>
                <component :is="picked.component" :size="`${pv.w}x${pv.h}`" :w="pv.w" :h="pv.h" />
              </CardFrame>
            </div>
            <b class="set-card-name">{{ picked.name }}</b>
            <small class="set-card-desc">{{ picked.desc }}</small>
            <span class="set-count">桌面已有 {{ countOf(picked.id) }} 张</span>
            <button class="set-add" type="button" @click="add(picked.id)">添加到桌面</button>
            <button v-if="countOf(picked.id)" class="set-remove" type="button" @click="removeOne(picked.id)">
              移除一张
            </button>
          </div>
        </template>

        <p v-if="current === 'library'" class="set-side-hint">同一张卡可以放多张；尺寸与位置在桌面「整理模式」里拖。</p>
        <p v-else-if="current === 'cards'" class="set-side-hint">拖动滑轨立刻生效，双击滑轨恢复该项默认值。</p>

        <div class="set-side-foot">
          <button class="desk-btn" type="button" @click="resetAll">恢复默认</button>
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
import { Grid2x2, Image as ImageIcon, Info, SlidersHorizontal } from "lucide-vue-next"
import { Settings as SettingsIcon } from "lucide-vue-next"
import CardFrame from "./CardFrame.vue"
import Sheet from "./Sheet.vue"
import WallpaperPanel from "./WallpaperPanel.vue"
import CardsPanel from "./CardsPanel.vue"
import LibraryPanel from "./LibraryPanel.vue"
import { appearance, desk, resetAppearance, resetDesk, wallpaper, addToDesk, countOnDesk, removeFromDesk } from "@/core/store"
import { CARDS } from "@/core/registry"
import pkg from "../../package.json"

const props = defineProps<{ open: boolean; tab?: string; origin?: DOMRect | null }>()
const emit = defineEmits<{ "update:open": [boolean] }>()

const SECTIONS = [
  { label: "壁纸", value: "wallpaper", component: WallpaperPanel, icon: ImageIcon },
  { label: "组件设置", value: "cards", component: CardsPanel, icon: SlidersHorizontal },
  { label: "卡片库", value: "library", component: LibraryPanel, icon: Grid2x2, badge: String(CARDS.length) },
  { label: "关于", value: "about", icon: Info },
]

const open = ref(props.open)
watch(() => props.open, (v) => (open.value = v))
watch(open, (v) => emit("update:open", v))

const current = ref(props.tab || "wallpaper")
/* 旧的 library 名字保留兼容：现在它重新是独立分区，直接可用 */
watch(
  () => [props.open, props.tab] as const,
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

/* 预览：用真实壁纸做底，卡片骨架读取同一批外观变量 */
const previewBg = computed(() => ({
  backgroundImage: `url(${wallpaper.resolved || wallpaper.value})`,
}))
const previewCard = computed(() => ({
  borderRadius: `${appearance.radius}px`,
  backdropFilter: `blur(${appearance.blur}px) saturate(1.4)`,
  WebkitBackdropFilter: `blur(${appearance.blur}px) saturate(1.4)`,
  background: `color-mix(in srgb, var(--desk-glass-fill) ${appearance.opacity * 100}%, transparent)`,
  boxShadow: `0 10px 30px rgb(0 0 0 / ${appearance.shadow})`,
}))
const tag = computed(
  () => `圆角 ${appearance.radius} · 模糊 ${appearance.blur} · 玻璃 ${Math.round(appearance.opacity * 100)}%`,
)

/**
 * 预览尺寸：用注册表的约束推出来，不另写一套。
 *   step  → 两段（6×3），拼图正好两块
 *   ratios→ 按比例给 6 宽（2:1 → 6×3）
 *   其它  → 4×2
 */
const pv = computed(() => {
  const c = picked.value?.constrain
  /* 段落卡：两段（快捷方式 2 → 4×2；统计 3 → 6×3）*/
  if (c?.step && c.step > 1) return { w: c.step * 2, h: c.step }
  /* 比例卡：6 宽按比例（2:1 → 6×3）*/
  if (c?.ratios?.length) return { w: 6, h: Math.max(1, Math.round(6 / c.ratios[0])) }
  return { w: 4, h: 2 }
})

/* 卡片库：选中一张卡，右栏预览并添加 */
const selected = ref("")
const picked = computed(() => CARDS.find((c) => c.id === (selected.value || firstCardId())) ?? null)
const firstCardId = () => CARDS[0]?.id ?? ""
const countOf = (id: string) => countOnDesk(id)

function add(id: string) {
  addToDesk(id)
}

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

.set-preview-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 66%;
  padding: var(--desk-sp-2h) var(--desk-sp-3);
  border: 1px solid var(--desk-stroke);
  color: #fff;
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
  background: rgb(255 255 255 / 26%);
}

.pc-quote {
  height: 5px;
  border-radius: var(--desk-r-xs);
  background: rgb(255 255 255 / 34%);
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
  margin-top: var(--desk-sp-1);
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-2);
}

.set-add {
  width: 100%;
  height: 30px;
  margin-top: var(--desk-sp-2);
  border: 0;
  border-radius: var(--desk-r-control);
  background: var(--desk-accent);
  color: #fff;
  font-size: var(--desk-fs-body);
  cursor: pointer;
}

.set-add:hover { filter: brightness(1.06); }

.set-remove {
  width: 100%;
  height: 28px;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: transparent;
  color: var(--desk-text-2);
  font-size: var(--desk-fs-caption);
  cursor: pointer;
}

.set-remove:hover {
  color: var(--desk-danger);
  border-color: color-mix(in srgb, var(--desk-danger) 46%, transparent);
}

/* 关于：说明 + 键值表 */
.set-h2 {
  margin: 0 0 var(--desk-sp-1);
  font-size: var(--desk-fs-title);
  font-weight: 600;
}

.set-p {
  margin: 0 0 var(--desk-sp-3);
  font-size: var(--desk-fs-body);
  line-height: 1.6;
  color: var(--desk-text-2);
}

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
</style>
