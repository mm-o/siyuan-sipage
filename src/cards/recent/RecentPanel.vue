<template>
  <div class="rc-panel desk-seq">
    <div class="rc-pane desk-pane">
      <header class="rc-bar">
        <span class="rc-title">最近打开 · 16 篇</span>
        <GlassButton :icon="RotateCcw" label="刷新" @click="load" />
      </header>

      <div class="rc-grid">
        <button
          v-for="(doc, i) in cells"
          :key="i"
          class="rc-cell"
          :class="{ 'is-empty': !doc }"
          type="button"
          :title="doc ? `${doc.title} · ${doc.notebook} · ${doc.updated}` : '暂无'"
          @click="doc && openDoc(doc.id)"
        >
          <template v-if="doc">
            <span class="rc-name">{{ doc.title }}</span>
            <span v-if="doc.notebook" class="rc-pill">{{ doc.notebook }}</span>
            <span class="rc-foot">
              <span class="rc-num">{{ doc.words }} 字</span>
              <span class="rc-time">{{ doc.updated }}</span>
            </span>
          </template>
          <span v-else class="rc-dash">—</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GlassButton } from "@/ui/controls"
import { computed, onMounted, ref } from "vue"
import { RotateCcw } from "lucide-vue-next"
import { openDoc, recentDocs, sql, type PickDoc } from "@/core/quickdocs"

/** 笔记本名：官方接口，模块级缓存，整页只请求一次 */
let notebookPromise: Promise<Map<string, string>> | null = null
function notebookNames() {
  notebookPromise ||= fetch("/api/notebook/lsNotebooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
    .then((r) => r.json())
    .then((j) => new Map(((j?.data?.notebooks || []) as { id: string; name: string }[]).map((n) => [n.id, n.name])))
    .catch(() => new Map<string, string>())
  return notebookPromise
}

interface Row extends PickDoc {
  notebook: string
  updated: string
  words: number
}

const list = ref<Row[]>([])
const cells = computed(() => Array.from({ length: 16 }, (_, i) => list.value[i]))

async function load() {
  try {
    const base = await recentDocs(16)
    const meta = new Map<string, { box: string; updated: string; words: number }>()
    const rows = await sql("select id, box, updated, length from blocks where type = 'd' order by updated desc limit 16").catch(() => [])
    for (const r of rows) {
      meta.set(String(r.id), { box: String(r.box || ""), updated: String(r.updated || ""), words: Number(r.length) || 0 })
    }
    const names = await notebookNames()
    const fmt = (v: string) => (v.length >= 12 ? `${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}` : v)
    list.value = base.map((d) => {
      const m = meta.get(d.id)
      return { ...d, notebook: m ? names.get(m.box) || "" : "", updated: m ? fmt(m.updated) : "", words: m?.words ?? 0 }
    })
  } catch {
    list.value = []
  }
}

onMounted(load)
</script>

<style scoped>
.rc-panel {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
}

.rc-pane {
  border-radius: var(--desk-r-pane-in) var(--desk-r-pane-in) var(--desk-r-pane) var(--desk-r-pane);
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-detail-pad);
  min-height: 0;
}

.rc-bar {
  display: flex;
  align-items: center;
  gap: var(--desk-sp-2);
}

.rc-title {
  flex: 1 1 auto;
  font-size: var(--desk-fs-body);
  font-weight: var(--desk-fw-semibold);
}

/* 4×4：每格一张「文档信息卡」 */
.rc-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: var(--desk-detail-gap);
}

.rc-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--desk-sp-1);
  padding: var(--desk-sp-2);
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 5%, transparent);
  color: var(--desk-text);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.rc-cell:hover {
  background: color-mix(in srgb, var(--desk-accent) 13%, transparent);
  border-color: color-mix(in srgb, var(--desk-accent) 40%, transparent);
}

.rc-cell:active {
  transform: scale(0.985);
}

.rc-cell.is-empty {
  align-items: center;
  justify-content: center;
  color: var(--desk-text-3);
  border-style: dashed;
  cursor: default;
}

.rc-name {
  /* 两行封顶：标题比其它信息更重要 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: var(--desk-fs-sm);
  font-weight: var(--desk-fw-semibold);
  line-height: 1.35;
  overflow: hidden;
}

/* 笔记本做成小胶囊，跟倒数日的分类条同一套 */
.rc-pill {
  max-width: 100%;
  padding: 1px 6px;
  border-radius: var(--desk-r-pill);
  background: color-mix(in srgb, var(--desk-accent) 12%, transparent);
  color: var(--desk-accent);
  font-size: var(--desk-fs-2xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rc-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--desk-sp-1h);
  width: 100%;
  font-size: var(--desk-fs-2xs);
  color: var(--desk-text-3);
  font-variant-numeric: tabular-nums;
}

.rc-dash {
  opacity: 0.5;
}
</style>
