/**
 * 本机缓存（允许落 localStorage 的唯一入口）
 *
 * 只存**可重建的派生数据**（天气、索引这类联网结果），不存用户状态 ——
 * 用户状态在 core/store.ts，走思源的 petal 存储。
 * 命名空间统一 `desk-cache:`，读失败一律当没有，不让缓存成为故障源。
 */
const NS = "desk-cache:"

export function cacheGet<T>(key: string, ttl = 0): T | null {
  try {
    const raw = localStorage.getItem(NS + key)
    if (!raw) return null
    const box = JSON.parse(raw) as { at: number; v: T }
    if (ttl && Date.now() - box.at > ttl) return null
    return box.v
  } catch {
    return null
  }
}

export function cacheSet(key: string, value: unknown) {
  try {
    localStorage.setItem(NS + key, JSON.stringify({ at: Date.now(), v: value }))
  } catch {
    /* 配额满就算了，缓存永远只是加速 */
  }
}

/** 取缓存；没有就用 loader 造一份并写回（索引类数据用） */
export async function cacheOnce<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T | null> {
  const hit = cacheGet<T>(key, ttl)
  if (hit) return hit
  try {
    const value = await loader()
    cacheSet(key, value)
    return value
  } catch {
    return cacheGet<T>(key)
  }
}
