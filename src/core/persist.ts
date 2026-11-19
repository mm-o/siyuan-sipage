import { reactive, watch } from "vue"

/**
 * 卡片自己的持久化：一个 reactive 对象 + 自动落盘（100ms 合并由 storage 的写入节奏兜住）。
 * 只给「几张卡各自的偏好/清单」用；桌面布局、外观这些仍然在 `core/store.ts` 里。
 */
export function persisted<T extends object>(key: string, defaults: T): T {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { ...defaults }
      const data = JSON.parse(raw) as Partial<T>
      return { ...defaults, ...data }
    } catch {
      return { ...defaults }
    }
  }

  const state = reactive(read()) as T
  let timer = 0
  watch(
    state,
    () => {
      if (timer) return
      timer = window.setTimeout(() => {
        timer = 0
        try {
          localStorage.setItem(key, JSON.stringify(state))
        } catch {
          /* 配额满了就算了，卡片还能用 */
        }
      }, 150)
    },
    { deep: true },
  )
  return state
}
