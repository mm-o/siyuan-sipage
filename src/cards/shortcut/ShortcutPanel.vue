<template>
  <div class="sc-panel desk-seq">
    <!-- 左：分类 -->
    <section class="sc-col desk-pane is-left">
      <h4 class="sc-sub">分类</h4>
      <ul class="sc-list">
        <li v-for="g in GROUPS" :key="g" class="row" :class="{ 'is-on': g === active }" @click="active = g">
          <span class="tile" :style="{ background: GROUP_STYLE[g].soft, color: GROUP_STYLE[g].color }">
            <component :is="GROUP_STYLE[g].icon" :size="14" :stroke-width="1.9" />
          </span>
          <span class="name">{{ g }}</span>
          <em class="num">{{ countOf(g) }}</em>
        </li>
      </ul>
    </section>

    <!-- 中：点一下执行，＋ 加入右栏（不设上限） -->
    <section class="sc-col desk-pane is-mid">
      <h4 class="sc-sub">{{ active }} · 点一下执行，＋ 加入</h4>
      <ul class="sc-list">
        <li v-for="s in byGroup(active)" :key="s.id" class="row" @click="runShortcut(s)">
          <span class="tile" :style="{ background: GROUP_STYLE[s.group].soft, color: GROUP_STYLE[s.group].color }">
            <svg v-if="sprite" aria-hidden="true"><use :xlink:href="'#' + s.icon" /></svg>
            <component :is="s.fallback" v-else :size="13" :stroke-width="1.9" />
          </span>
          <span class="name">{{ s.label }}</span>
          <button v-if="!isOn(s.id)" class="btn" type="button" aria-label="加入" @click.stop="addShortcut(s.id)">
            <Plus :size="13" :stroke-width="2.4" />
          </button>
          <Check v-else :size="13" :stroke-width="2.4" class="check" />
        </li>
      </ul>
    </section>

    <!-- 右：已启用（拖动排序 / 垃圾桶移除） -->
    <section class="sc-col desk-pane is-right">
      <h4 class="sc-sub">已启用 {{ enabled.length }}</h4>
      <ul class="sc-list">
        <li
          v-for="(s, i) in enabled"
          :key="s.id"
          class="row is-static"
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
          <span class="name">{{ s.label }}</span>
          <button class="btn" type="button" aria-label="移除" @click="toggleShortcut(s.id)">
            <Trash2 :size="13" :stroke-width="1.9" />
          </button>
        </li>
        <li v-if="!enabled.length" class="sc-sub">空</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { Check, GripVertical, Plus, Trash2 } from "lucide-vue-next"
import {
  GROUPS,
  GROUP_STYLE,
  addShortcut,
  byGroup,
  enabledShortcuts,
  reorderShortcut,
  runShortcut,
  shortcutState,
  toggleShortcut,
  useSprite,
  type ShortcutGroup,
} from "./shortcut"

const active = ref<ShortcutGroup>("导航")
const sprite = useSprite()
const dragFrom = ref(-1)
const enabled = computed(() => enabledShortcuts())
const isOn = (id: string) => shortcutState.enabled.includes(id)
const countOf = (g: ShortcutGroup) => byGroup(g).filter((s) => isOn(s.id)).length

function drop(to: number) {
  if (dragFrom.value >= 0) reorderShortcut(dragFrom.value, to)
  dragFrom.value = -1
}
</script>

<style scoped>
/* 三栏同构：分类 / 可选 / 已启用共用一套行、图标块与按钮 */
.sc-panel {
  display: flex;
  gap: var(--desk-detail-gap);
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
}

.sc-col {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-sp-3);
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
}

.sc-col.is-left { flex: 0 0 124px; }
.sc-col.is-mid { flex: 1 1 auto; }
.sc-col.is-right { flex: 0 0 208px; }

.sc-sub {
  margin: 0;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}

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
  cursor: pointer;
}

.row:hover { background: color-mix(in srgb, var(--desk-accent) 10%, transparent); }
.row.is-on { background: color-mix(in srgb, var(--desk-accent) 14%, transparent); color: var(--desk-accent); }
.row.is-static { cursor: default; }
.row.is-static:hover { background: transparent; }
.row.is-drag { opacity: 0.5; }

.tile {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: var(--desk-r-sm);
}

.tile svg { width: 14px; height: 14px; fill: currentColor; }

.name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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

.btn,
.check {
  flex: none;
  color: var(--desk-accent);
}

.btn {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: var(--desk-r-sm);
  background: transparent;
  color: var(--desk-text-3);
  cursor: pointer;
}

.btn:hover {
  background: color-mix(in srgb, var(--desk-accent) 16%, transparent);
  color: var(--desk-accent);
}
</style>
