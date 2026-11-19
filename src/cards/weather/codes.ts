/**
 * 天气码 → 中文描述 / 图标 / 天空渐变（纯展示映射，无副作用）
 */
import type { Component } from "vue"
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Cloudy, Moon, Sun } from "lucide-vue-next"
import { COVERS } from "@/core/image"

const WMO: Record<number, { label: string; icon: Component; night?: Component }> = {
  0: { label: "晴", icon: Sun, night: Moon },
  1: { label: "晴间多云", icon: CloudSun, night: CloudMoon },
  2: { label: "多云", icon: CloudSun, night: CloudMoon },
  3: { label: "阴", icon: Cloudy },
  45: { label: "雾", icon: CloudFog },
  48: { label: "冻雾", icon: CloudFog },
  51: { label: "小毛毛雨", icon: CloudDrizzle },
  53: { label: "毛毛雨", icon: CloudDrizzle },
  55: { label: "大毛毛雨", icon: CloudDrizzle },
  56: { label: "冻毛毛雨", icon: CloudDrizzle },
  57: { label: "强冻毛毛雨", icon: CloudDrizzle },
  61: { label: "小雨", icon: CloudRain },
  63: { label: "中雨", icon: CloudRain },
  65: { label: "大雨", icon: CloudRain },
  66: { label: "冻雨", icon: CloudRain },
  67: { label: "强冻雨", icon: CloudRain },
  71: { label: "小雪", icon: CloudSnow },
  73: { label: "中雪", icon: CloudSnow },
  75: { label: "大雪", icon: CloudSnow },
  77: { label: "米雪", icon: CloudSnow },
  80: { label: "小阵雨", icon: CloudRain },
  81: { label: "阵雨", icon: CloudRain },
  82: { label: "强阵雨", icon: CloudRain },
  85: { label: "小阵雪", icon: CloudSnow },
  86: { label: "大阵雪", icon: CloudSnow },
  95: { label: "雷暴", icon: CloudLightning },
  96: { label: "雷暴伴冰雹", icon: CloudLightning },
  99: { label: "强雷暴伴冰雹", icon: CloudLightning },
}

/** 未知天气码：描述给「—」，图标给中性云 */
const UNKNOWN: { label: string; icon: Component } = { label: "—", icon: Cloud }

export function describe(code: number, night = false) {
  const hit = WMO[code]
  if (!hit) return UNKNOWN
  return { label: hit.label, icon: night && hit.night ? hit.night : hit.icon }
}

/* ── 天空底（卡片与详情的背景）────────────────────────── */
/**
 * 天气状况 → 一套白天/夜间渐变。
 *
 * 数值取自 参考实现 的 `.weather-*`（sunny / cloudy / yin / foggy 是它的原渐变）；
 * 它把 rain / snow / thunder 做成 webp 贴图，这里按同一套深蓝-灰蓝色系改成渐变，
 * 不额外引图片资源。
 */
type Sky = "sunny" | "cloudy" | "yin" | "foggy" | "rain" | "snow" | "thunder"

const SKY: Record<Sky, { day: string; night: string }> = {
  sunny: {
    day: "linear-gradient(35deg, #154280 30%, #335693 70%, #a8b3d2)",
    night: "linear-gradient(45deg, #000012 20%, #29334e)",
  },
  cloudy: {
    day: "linear-gradient(35deg, #054989 30%, #72ade0)",
    night: "linear-gradient(35deg, #191a2e 30%, #4c5f7f)",
  },
  yin: {
    day: "linear-gradient(35deg, #354564 30%, #4c5f7f 65%, #8b9bb8)",
    night: "linear-gradient(45deg, #211e22 20%, #383a3e)",
  },
  foggy: {
    day: "linear-gradient(45deg, #789fb8 20%, #6386a3)",
    night: "linear-gradient(45deg, #6c7682 20%, #535d69)",
  },
  rain: {
    day: "linear-gradient(45deg, #123a63 20%, #3f6e97)",
    night: "linear-gradient(45deg, #0b1626 20%, #2c4055)",
  },
  snow: {
    day: "linear-gradient(45deg, #24486a 20%, #93a9bd)",
    night: "linear-gradient(45deg, #101b2a 20%, #3b4d61)",
  },
  thunder: {
    day: "linear-gradient(45deg, #1b2743 20%, #46577a)",
    night: "linear-gradient(45deg, #0a0f1a 20%, #2a3550)",
  },
}

function skyGroup(code: number): Sky {
  if (code <= 1) return "sunny"
  if (code === 2) return "cloudy"
  if (code === 3) return "yin"
  if (code === 45 || code === 48) return "foggy"
  if (code >= 51 && code <= 67) return "rain"
  if (code >= 71 && code <= 77) return "snow"
  if (code >= 80 && code <= 82) return "rain"
  if (code === 85 || code === 86) return "snow"
  if (code >= 95) return "thunder"
  return "cloudy"
}

/** 当前天气的天空渐变（未知码按多云处理） */
function skyOf(code: number, isDay: boolean) {
  const sky = SKY[skyGroup(code)]
  return isDay ? sky.day : sky.night
}

/** 天气底图：按天气码稳定挑一张思源题头图，叠在渐变下面（不额外引图片资源） */
function skyCover(code: number) {
  return COVERS[Math.abs(Math.round(Number(code) || 0)) % COVERS.length]
}

/** 天气卡 / 详情左栏的完整背景：同色系渐变压在图上面，昼夜与天气状况都看得出来 */
export function skyBackdrop(code: number, isDay: boolean) {
  return `${skyOf(code, isDay)}, url(${skyCover(code)})`
}

/* ── 接口 ──────────────────────────────────────────────── */

/** 中文天气描述 → WMO 码（判断顺序：雪 → 雨 → 其它） */
export function cnCode(text: string): number {
  const t = String(text || "")
  if (/雷/.test(t)) return 95
  if (/雪/.test(t)) return /大/.test(t) ? 75 : /中/.test(t) ? 73 : 71
  if (/暴雨|大雨/.test(t)) return 65
  if (/中雨/.test(t)) return 63
  if (/雨/.test(t)) return 61
  if (/雾|霾|沙|尘/.test(t)) return 45
  if (/阴/.test(t)) return 3
  if (/云/.test(t)) return 2
  return 0
}
