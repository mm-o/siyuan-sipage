/**
 * 派生缓存 —— 唯一允许落 localStorage 的地方
 *
 * 只存"丢了能重建"的东西（天气响应、城市表这类）：带时间戳，可设 TTL，写失败（配额满）静默放过。
 * 用户状态一律走思源 petal（见 `core/store` 的 `persisted()` / `loadData`），不许进这里。
 */
const NS = "siyuan-sipage-cache:"

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
    /* 配额满就算了：缓存只是加速 */
  }
}
