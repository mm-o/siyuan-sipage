import { computed, onBeforeUnmount, ref, watch } from "vue"
import { persisted } from "@/core/persist"

type Phase = "focus" | "rest"

interface PomodoroRecord {
  at: number
  minutes: number
}

export const NOISES = [
  { id: "rain", label: "雨声", url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1a1c0dc4.mp3" },
  { id: "forest", label: "森林", url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_c8c8a73467.mp3" },
  { id: "cafe", label: "咖啡馆", url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_1f9d6c0e0a.mp3" },
] as const

const DEFAULT_POMODORO = {
  /** 一个专注/休息阶段多长（分钟） */
  focus: 25,
  rest: 5,
  phase: "focus" as Phase,
  /** 本阶段开始的时间戳（0 = 暂停中） */
  startedAt: 0,
  /** 暂停时剩下的毫秒数（跑起来后以它为基准往下减） */
  remaining: 25 * 60_000,
  round: 0,
  cover: "" as string,
  noise: "" as string,
  records: [] as PomodoroRecord[],
}

export const pomodoro = persisted("desk:pomodoro", { ...DEFAULT_POMODORO })

export const records = computed(() => pomodoro.records.slice(0, 12))

/* 没在跑的时候调时长，剩余时间跟着走；跑着的时候不动（本轮按原时长走完） */
watch(
  () => [pomodoro.focus, pomodoro.rest] as const,
  () => {
    if (!pomodoro.startedAt) pomodoro.remaining = phaseMs()
  },
)

/** 当前阶段的整段时长 */
function phaseMs(phase: Phase = pomodoro.phase) {
  return (phase === "focus" ? pomodoro.focus : pomodoro.rest) * 60_000
}

/** 剩余毫秒：跑着就用「暂停时剩下的 - 已过去」，暂停了就直接用存下的 */
function remainingMs(now = Date.now()) {
  if (!pomodoro.startedAt) return Math.max(0, pomodoro.remaining)
  return Math.max(0, pomodoro.remaining - (now - pomodoro.startedAt))
}

export function clockText(ms: number) {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

let audio: HTMLAudioElement | null = null

export function toggleNoise(id: string) {
  if (audio) {
    audio.pause()
    audio = null
  }
  if (pomodoro.noise === id) {
    pomodoro.noise = ""
    return
  }
  const n = NOISES.find((x) => x.id === id)
  if (!n) return
  pomodoro.noise = id
  audio = new Audio(n.url)
  audio.loop = true
  audio.volume = 0.4
  void audio.play().catch(() => {
    pomodoro.noise = ""
  })
}

/** 阶段结束：专注算一个番茄并入账，然后切到另一半 */
function finishPhase(auto: boolean) {
  if (pomodoro.phase === "focus") {
    pomodoro.round += 1
    pomodoro.records.unshift({ at: Date.now(), minutes: pomodoro.focus })
    pomodoro.records = pomodoro.records.slice(0, 50)
  }
  pomodoro.phase = pomodoro.phase === "focus" ? "rest" : "focus"
  pomodoro.remaining = phaseMs()
  pomodoro.startedAt = auto ? Date.now() : 0
}

export function usePomodoro() {
  const now = ref(Date.now())
  const id = window.setInterval(() => {
    now.value = Date.now()
    if (pomodoro.startedAt && remainingMs(now.value) === 0) finishPhase(true)
  }, 500)
  onBeforeUnmount(() => window.clearInterval(id))
  const running = computed(() => pomodoro.startedAt > 0)
  const left = computed(() => remainingMs(now.value))
  const percent = computed(() => 1 - left.value / phaseMs())
  return { running, left, percent }
}

export function start() {
  if (pomodoro.remaining <= 0) pomodoro.remaining = phaseMs()
  pomodoro.startedAt = Date.now()
}

/** 暂停：把「还剩多少」存下来，不动时长设置 */
export function pause() {
  pomodoro.remaining = remainingMs()
  pomodoro.startedAt = 0
}

export function reset() {
  pomodoro.startedAt = 0
  pomodoro.remaining = phaseMs()
}

/** 手动跳过：切到另一半，不记番茄 */
export function skip() {
  finishPhase(false)
  pomodoro.remaining = phaseMs()
}
