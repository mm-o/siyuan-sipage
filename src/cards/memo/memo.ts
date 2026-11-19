import { computed } from "vue"
import { persisted } from "@/core/persist"

interface MemoItem {
  id: string
  text: string
  done: boolean
  at: number
}

export const memo = persisted("desk:memo", {
  items: [
    { id: "seed-1", text: "把今天的想法记在这里", done: false, at: Date.now() },
  ] as MemoItem[],
  filter: "all" as "all" | "todo" | "done",
})

export const visible = computed(() => {
  if (memo.filter === "todo") return memo.items.filter((i) => !i.done)
  if (memo.filter === "done") return memo.items.filter((i) => i.done)
  return memo.items
})

export const leftCount = computed(() => memo.items.filter((i) => !i.done).length)

export function add(text: string) {
  const t = text.trim()
  if (!t) return
  memo.items.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: t, done: false, at: Date.now() })
}

export function toggle(id: string) {
  const item = memo.items.find((i) => i.id === id)
  if (item) item.done = !item.done
}

export function remove(id: string) {
  memo.items = memo.items.filter((i) => i.id !== id)
}

export function update(id: string, text: string) {
  const item = memo.items.find((i) => i.id === id)
  if (item) item.text = text
}

export function clearDone() {
  memo.items = memo.items.filter((i) => !i.done)
}
