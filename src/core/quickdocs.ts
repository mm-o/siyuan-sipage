/* SiYuan 的 app 实例：插件 onload 时由 Plugin 注入，供打开文档用（原 core/app.ts） */
let appRef: unknown = null

export function setApp(app: unknown) {
  appRef = app
}

function getApp(): any {
  return appRef || (window as any).siyuan?.ws?.app || null
}

import { stateOf } from "@/core/store"
import { post, sql } from "@/core/util"

export interface PickDoc {
  id: string
  title: string
}

interface QuickState {
  docs: PickDoc[]
}

/** 快捷打开最多 8 格；与卡片库一致，同一篇文档可以重复占位。 */
export const QUICK_SLOTS = 8

/** 老版本只有一份共享列表：第一次取用时认领给第一张卡，之后各卡各的 */
function claimLegacy(state: QuickState) {
  let raw: string | null = null
  try {
    raw = localStorage.getItem("desk:quickpick")
  } catch {
    return
  }
  if (!raw) return
  try {
    const box = JSON.parse(raw) as { docs?: PickDoc[] }
    if (!state.docs.length && Array.isArray(box.docs)) state.docs = box.docs.slice(0, QUICK_SLOTS)
    localStorage.removeItem("desk:quickpick")
  } catch {
    /* 旧键坏了就当没有 */
  }
}

/** 每张卡一份配置：按实例 uid 取，第一次取时用空列表建一份 */
export function quickOf(uid: string): QuickState {
  const state = stateOf<QuickState>(uid, { docs: [] })
  claimLegacy(state)
  return state
}

export function addDoc(state: QuickState, doc: PickDoc) {
  if (state.docs.length >= QUICK_SLOTS) return
  state.docs = [...state.docs, doc]
}

export function removeDocAt(state: QuickState, index: number) {
  if (index < 0 || index >= state.docs.length) return
  state.docs = state.docs.filter((_, i) => i !== index)
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
    await post("/api/filetree/openDocument", { id })
    return
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
export function reorderQuick(state: QuickState, from: number, to: number) {
  const list = [...state.docs]
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  state.docs = list
}
