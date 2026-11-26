<template>
  <div class="sc-panel desk-seq desk-panel-row">
    <!-- 左：分类 -->
    <section class="sc-col desk-pane is-left">
      <h4 class="sc-sub desk-note">{{ t("card.shortcut.categories") }}</h4>
      <ul class="sc-list">
        <li v-for="g in GROUPS" :key="g" class="row" :class="{ 'is-on': g === active }" @click="active = g">
          <span class="tile" :style="{ background: GROUP_STYLE[g].soft, color: GROUP_STYLE[g].color }">
            <component :is="GROUP_STYLE[g].icon" :size="14" :stroke-width="1.9" />
          </span>
          <span class="name desk-ellipsis">{{ groupLabel(g) }}</span>
          <em class="num">{{ countOf(g) }}</em>
        </li>
      </ul>
    </section>

    <!-- 中：点一下执行；右侧与卡片库一致，已添加显示数量，可以继续添加 -->
    <section class="sc-col desk-pane is-mid">
      <h4 class="sc-sub desk-note">{{ t("card.shortcut.runHint", { group: groupLabel(active) }) }}</h4>
      <ul class="sc-list">
        <li v-for="s in byGroup(active)" :key="s.id" class="row" @click="runShortcut(s)">
          <span class="tile" :style="{ background: GROUP_STYLE[s.group].soft, color: GROUP_STYLE[s.group].color }">
            <svg v-if="sprite" aria-hidden="true"><use :xlink:href="'#' + s.icon" /></svg>
            <component :is="s.fallback" v-else :size="13" :stroke-width="1.9" />
          </span>
          <span class="name desk-ellipsis">{{ s.label }}</span>
          <span v-if="used(s.id)" class="desk-badge is-on">{{ used(s.id) }}</span>
          <GlassButton :icon="Plus" :label="t('card.shortcut.add')" @click.stop="addShortcut(state, s.id)" />
        </li>
      </ul>
    </section>

    <!-- 右：已启用（拖动排序 / 垃圾桶移除一次） -->
    <section class="sc-col desk-pane is-right">
      <h4 class="sc-sub desk-note">{{ t("card.shortcut.enabled", { n: enabled.length }) }}</h4>
      <ul class="sc-list">
        <li
          v-for="(s, i) in enabled"
          :key="i"
          class="row"
          :class="{ 'is-drag': dragFrom === i }"
          draggable="true"
          @dragstart="dragFrom = i"
          @dragover.prevent
          @drop="drop(i)"
          @dragend="dragFrom = -1"
        >
          <span class="grip"><GripVertical :size="13" :stroke-width="2" /></span>
          <span class="tile" :style="{ background: GROUP_STYLE[s.group].soft, color: GROUP_STYLE[s.group].color }">
            <svg v-if="sprite" aria-hidden="true"><use :xlink:href="'#' + s.icon" /></svg>
            <component :is="s.fallback" v-else :size="13" :stroke-width="2" />
          </span>
          <span class="name desk-ellipsis">{{ s.label }}</span>
          <GlassButton :icon="Trash2" :label="t('common.remove')" variant="danger" @click="removeShortcutAt(state, i)" />
        </li>
        <li v-if="!enabled.length" class="sc-sub desk-note">{{ t("card.shortcut.empty") }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { GlassButton } from "@/ui/controls"
import { GripVertical, Plus, Trash2 } from "lucide-vue-next"
import { t } from "@/core/i18n"
import {
  GROUPS,
  GROUP_STYLE,
  addShortcut,
  byGroup,
  enabledShortcuts,
  groupLabel,
  removeShortcutAt,
  reorderShortcut,
  runShortcut,
  shortcutOf,
  useSprite,
  type ShortcutGroup,
} from "./shortcut"

const props = defineProps<{ mode?: string; uid?: string }>()

/* 详情跟着卡片实例走：同一张卡放多张，各配各的 */
const state = shortcutOf(props.uid || "shortcut")

const active = ref<ShortcutGroup>("导航") // i18n-keep
const sprite = useSprite()
const dragFrom = ref(-1)
const enabled = computed(() => enabledShortcuts(state))
const used = (id: string) => state.enabled.filter((x) => x === id).length
const countOf = (g: ShortcutGroup) => byGroup(g).reduce((n, s) => n + used(s.id), 0)

function drop(to: number) {
  if (dragFrom.value >= 0) reorderShortcut(state, dragFrom.value, to)
  dragFrom.value = -1
}
</script>

<style scoped>
/* 三栏同构：分类 / 可选 / 已启用共用行、图标块与按钮 */
.sc-col {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3);
  min-height: 0;
  overflow: auto;
}

.sc-col.is-left { flex: 0 0 124px; }
.sc-col.is-mid { flex: 1 1 auto; }
.sc-col.is-right { flex: 0 0 208px; }

.sc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-0);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-1h);
  height: 32px;
  padding: 0 var(--desk-sp-1h);
  border-radius: var(--desk-r-control);
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-2);
}

/* 只有可点击的两栏有指针与悬停反馈。 */
.sc-col:not(.is-right) .row { cursor: pointer; }
.sc-col:not(.is-right) .row:hover { background: var(--dg-hover); }
.row.is-on { background: color-mix(in srgb, var(--desk-accent) 14%, transparent); color: var(--desk-accent); }
.row.is-drag { opacity: 0.5; }

.tile {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: var(--desk-r-sm);
}

.tile svg { width: 14px; height: 14px; }

.num {
  font-style: normal;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

.grip {
  display: grid;
  place-items: center;
  width: var(--desk-sp-3);
  flex: none;
  color: var(--desk-text-3);
  cursor: grab;
}
</style>
