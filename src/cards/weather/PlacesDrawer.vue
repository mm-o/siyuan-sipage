<template>
  <aside class="wx-places desk-pane is-right" :style="{ backgroundImage: sky }">
        <h2 class="wx-places-title">天气列表</h2>

        <input v-model="keyword" class="wx-search" placeholder="输入城市、区县、乡镇" @input="onInput" />

        <button class="wx-locate" type="button" :disabled="locating" @click="locate">
          {{ locating ? "定位中…" : "使用我的位置" }}
        </button>

        <p v-if="searching" class="wx-places-hint">搜索中…</p>
        <p v-else-if="searchError" class="wx-places-hint">{{ searchError }}</p>
        <ul v-else-if="hits.length" class="wx-hits">
          <li v-for="hit in hits" :key="hit.id">
            <button class="wx-hit" type="button" @click="pick(hit)">
              <span class="wx-hit-name">{{ hit.name }}</span>
              <span class="wx-hit-region">{{ regionOf(hit) }}</span>
            </button>
          
            </li>
        </ul>

        <ul class="wx-locs">
          <li v-for="loc in locations" :key="loc.id" class="wx-loc" :class="{ 'is-active': loc.id === activeId }">
            <button class="wx-loc-pick" type="button" @click="selectWeatherPlace(loc.id)">
              <span class="wx-loc-main">
                <span class="wx-loc-name">{{ loc.name }}</span>
                <span class="wx-loc-cond">
                  <component v-if="metas[loc.id]" :is="condOf(loc.id).icon" :size="14" :stroke-width="1.6" />
                  <span>{{ metas[loc.id] ? condOf(loc.id).label : "—" }}</span>
                </span>
              </span>
              <span class="wx-loc-side">
                <span class="wx-loc-deg">{{ metas[loc.id] ? `${metas[loc.id].now.temp}°` : "—" }}</span>
                <span v-if="metas[loc.id]" class="wx-loc-range">
                  最高{{ metas[loc.id].days[0].max }}° 最低{{ metas[loc.id].days[0].min }}°
                </span>
              </span>
            </button>
            <span class="wx-loc-acts">
              <button
                v-if="!isFirst(loc)"
                class="wx-loc-act"
                type="button"
                title="置顶"
                aria-label="置顶"
                @click.stop="pinWeatherPlace(loc.id)"
              >
                <Pin :size="13" :stroke-width="2" />
              </button>
              <button
                v-if="locations.length > 1"
                class="wx-loc-act is-del"
                type="button"
                title="删除"
                aria-label="删除"
                @click.stop="removeWeatherPlace(loc.id)"
              >
                <Trash2 :size="13" :stroke-width="2" />
              </button>
            </span>
          </li>
        </ul>
      </aside>
</template>

<script setup lang="ts">
/**
 * 天气列表（详情右栏）
 *
 * 自成一体：搜索、区县定位、候选列表、已存地点（置顶 / 删除）。
 * 只对外抛两件事：`select(id)` 切换地点、`pick(place)` 新地点加入。
 */
import { computed, onBeforeUnmount, ref } from "vue"
import { Pin, Trash2 } from "lucide-vue-next"
import {
  addWeatherPlace,
  pinWeatherPlace,
  removeWeatherPlace,
  selectWeatherPlace,
  type WeatherPlace,
} from "@/core/store"
import { preciseLocate, searchPlaces } from "./weather"
import type { WeatherData } from "./weather"

const props = defineProps<{
  places: WeatherPlace[]
  activeId: string
  metas: Record<string, WeatherData>
  sky: string
  condOf: (id: string) => { icon: unknown; label: string }
}>()

const keyword = ref("")
const hits = ref<WeatherPlace[]>([])
const searching = ref(false)
const searchError = ref("")
const locating = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null
let token = 0

function onInput() {
  if (timer) clearTimeout(timer)
  const q = keyword.value.trim()
  if (!q) {
    token += 1
    hits.value = []
    searching.value = false
    searchError.value = ""
    return
  }
  timer = setTimeout(() => void run(q), 300)
}

async function run(q: string) {
  const mine = ++token
  searching.value = true
  searchError.value = ""
  try {
    const list = await searchPlaces(q)
    if (mine !== token) return
    hits.value = list
    if (!list.length) searchError.value = "没有找到这个地点"
  } catch {
    if (mine !== token) return
    hits.value = []
    searchError.value = "搜索失败，请重试"
  } finally {
    if (mine === token) searching.value = false
  }
}

onBeforeUnmount(() => {
  token += 1
  if (timer) clearTimeout(timer)
})

function pick(hit: WeatherPlace) {
  addWeatherPlace(hit)
  keyword.value = ""
  hits.value = []
  searchError.value = ""
}

async function locate() {
  if (locating.value) return
  locating.value = true
  searchError.value = ""
  try {
    addWeatherPlace(await preciseLocate())
  } catch {
    searchError.value = "定位失败，请手动搜索地点"
  } finally {
    locating.value = false
  }
}

const isFirst = (loc: WeatherPlace) => props.places[0]?.id === loc.id
const regionOf = (loc: WeatherPlace) => [loc.admin, loc.country].filter(Boolean).join(" · ")
const locations = computed(() => props.places)
</script>

<style scoped>
.wx-places {
  flex: 0 0 var(--desk-aside-w);
  width: var(--desk-aside-w);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2h);
  padding: var(--desk-sp-4) var(--desk-sp-3);
  /* 与左栏同一套底：同色 + 同背景图定位，深浅只靠一层薄纱拉开层次 */
  background-color: #184482;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.wx-places-title {
  margin: 0;
  font-size: var(--desk-fs-lg);
  font-weight: 400;
  color: #efefef;
}

.wx-search {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--desk-r-sm);
  border: 0;
  background: rgb(255 255 255 / 20%);
  color: #fff;
  font: inherit;
  font-size: var(--desk-fs-sm);
  outline: none;
}

.wx-search::placeholder {
  color: rgb(255 255 255 / 55%);
}

.wx-search:focus {
  box-shadow: 0 0 0 2px rgb(255 255 255 / 40%);
}

.wx-places-hint {
  margin: 0;
  font-size: var(--desk-fs-sm);
  color: rgb(255 255 255 / 65%);
}

.wx-hits {
  flex: 0 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: none;
}

.wx-hits::-webkit-scrollbar {
  display: none;
}

.wx-hit {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-2);
  width: 100%;
  padding: 5px 8px;
  border: 0;
  border-radius: var(--desk-r-sm);
  background: transparent;
  color: #efefef;
  font: inherit;
  font-size: var(--desk-fs-sm);
  text-align: left;
  cursor: pointer;
}

.wx-hit:hover {
  background: rgb(255 255 255 / 14%);
}

.wx-hit-name {
  flex: 0 0 auto;
}

.wx-hit-region {
  min-width: 0;
  color: rgb(255 255 255 / 60%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 地点卡片（参考实现的 section.wx-locs::-webkit-scrollbar {
  display: none;
}

.wx-loc-acts {
  position: absolute;
  top: var(--desk-sp-1);
  right: var(--desk-sp-1);
  display: flex;
  gap: var(--desk-sp-0);
  opacity: 0;
  transition: opacity var(--desk-dur-fast) var(--desk-ease);
}

/* 只有鼠标悬停才出现（选中态不显示，保持干净） */
.wx-loc:hover .wx-loc-acts {
  opacity: 1;
}

.wx-loc-act {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: var(--desk-r-sm);
  background: rgb(255 255 255 / 18%);
  color: #fff;
  cursor: pointer;
  transition: background var(--desk-dur-fast) var(--desk-ease);
}

.wx-loc-act:hover {
  background: rgb(255 255 255 / 32%);
}

.wx-loc-act.is-del:hover {
  background: var(--desk-danger);
}
</style>
