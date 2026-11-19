/* SiYuan 的 app 实例：插件 onload 时由 Plugin 注入，供打开文档用（原 core/app.ts） */
let appRef: unknown = null

export function setApp(app: unknown) {
  appRef = app
}

function getApp(): any {
  return appRef || (window as any).siyuan?.ws?.app || null
}

import { computed } from "vue"
import { persisted } from "@/core/persist"

export interface PickDoc {
  id: string
  title: string
}

/** 尺寸 → 能放几个格（1x1=1，一字排开=2，方块=4，长条/高条=8） */
const SLOTS: Record<string, number> = {
  "1x1": 1,
  "1x2": 2,
  "2x1": 2,
  "2x2": 4,
  "4x2": 8,
  "2x4": 8,
}

export const quickpick = persisted("desk:quickpick", { docs: [] as PickDoc[] })

export const docs = computed(() => quickpick.docs)

export function setSlot(index: number, doc: PickDoc | null) {
  const next = [...quickpick.docs]
  if (doc) next[index] = doc
  else next.splice(index, 1)
  quickpick.docs = next.filter(Boolean).slice(0, 8)
}

export function removeDoc(id: string) {
  quickpick.docs = quickpick.docs.filter((d) => d.id !== id)
}

export async function sql(stmt: string) {
  const res = await fetch("/api/query/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stmt }),
  })
  const json = await res.json()
  if (json?.code !== 0) throw new Error(json?.msg || "查询失败")
  return (json.data || []) as Record<string, unknown>[]
}

export async function searchDocs(keyword: string, limit = 8): Promise<PickDoc[]> {
  const k = keyword.trim().replace(/'/g, "''")
  if (!k) return []
  const rows = await sql(
    `select id, content as title from blocks where type = 'd' and content like '%${k}%' order by updated desc limit ${limit}`,
  )
  return rows.map((r) => ({ id: String(r.id), title: String(r.title || "未命名文档") }))
}

export async function recentDocs(limit = 8): Promise<PickDoc[]> {
  const rows = await sql(`select id, content as title from blocks where type = 'd' order by updated desc limit ${limit}`)
  return rows.map((r) => ({ id: String(r.id), title: String(r.title || "未命名文档") }))
}

/**
 * 打开文档 —— 按「插件能拿到的 API」逐级降级（实测：`window.siyuan` 上没有 openTab，
 * 也没有 importMap，`require` 也拿不到 'siyuan' 模块，所以只能走 app 实例与协议）。
 *
 * 1. app.plugins 里任一插件实例的 openTab（Plugin 基类提供，最接近官方模块函数）
 * 2. `siyuan://blocks/<id>` 深链（SiYuan 桌面端注册的协议，会开在该文档上）
 * 3. /api/filetree/openDocument（部分内核版本存在）
 */
export async function openDoc(id: string) {
  const w = window as any

  try {
    const app = getApp()
    const plugins: any[] = app?.plugins || []
    for (const p of plugins) {
      const fn = p?.openTab || p?.app?.openTab
      if (typeof fn === "function") {
        await fn.call(p, { app, doc: { id } })
        return
      }
    }
  } catch (e) {
    console.warn("[desk-cards] plugins.openTab 不可用", e)
  }

  try {
    const mod: any = await import(/* @vite-ignore */ "siyuan")
    if (mod?.openTab) {
      mod.openTab({ app: getApp(), doc: { id } })
      return
    }
  } catch {
    /* 内核没给模块映射，正常 */
  }

  try {
    const res = await fetch("/api/filetree/openDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (json?.code === 0) return
  } catch {
    /* 继续 */
  }

  /* 最后一条：桌面端协议，等同在 OS 里点开这篇文档 */
  w.open(`siyuan://blocks/${id}`)
}

/** 按标题哈希出稳定色相：卡片与弹窗共用（浅底 + 同色图标） */
export function tint(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360
  const hue = 190 + (h % 5) * 34
  return {
    color: `hsl(${hue} 82% 56%)`,
    soft: `color-mix(in srgb, hsl(${hue} 82% 56%) 14%, transparent)`,
  }
}

/** 拖动排序：把 from 移到 to */
export function reorderQuick(from: number, to: number) {
  const list = [...quickpick.docs]
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  quickpick.docs = list
}
