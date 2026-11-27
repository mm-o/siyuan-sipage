/**
 * 语言与词条 —— 界面文案的唯一出口
 *
 * 词条本体在 `src/i18n/zh_CN.json` / `en_US.json`（同一份文件也被思源用于命令的 langKey，
 * 所以两边共用一套键，不要另造第二份字典）。
 *
 * 语言在启动时定一次：思源切换语言会整页重载，所以 `t()` 保持纯函数，模板里可以直接调，
 * 不需要响应式包装。
 *
 * 键名约定（扁平、点号分段；前半段 = 出处，方便回查）：
 *   common.*        跨处复用的词（关闭 / 重置 / 加载中 / 星期 …）
 *   common.weekday.*  星期（full / short / tiny 三档，0 = 周日），卡片一律用 weekdayFull() 等取，不要各存一份
 *   card.<id>.name  注册表里的卡片名
 *   card.<id>.desc  注册表里的一句话说明
 *   card.<id>.*     卡片自己的文案（卡片目录内使用）
 *   ui.<area>.*     ui 目录下的壳、设置、控件、整理
 *   core.*          core 里的领域词（日程分组、天气描述、图片分类 …）
 *   embed.*         文档内嵌
 *
 * 变量用 `{name}` 占位：`t("ui.desk.cardCount", { n: 12 })`。
 * 缺词先回落中文，再无中文就回落键名本身 —— 缺词由 `tools/verify/check-i18n.mjs` 拦住。
 */
import zhCN from "@/i18n/zh_CN.json"
import enUS from "@/i18n/en_US.json"

type Lang = "zh_CN" | "en_US"

const DICTS: Record<Lang, Record<string, string>> = {
  zh_CN: zhCN as Record<string, string>,
  en_US: enUS as Record<string, string>,
}

/** 思源语言 > 文档语言 > 中文；拿不到就当中文 */
function detect(): Lang {
  try {
    const fromSiYuan = (window as any)?.siyuan?.config?.lang
    const raw = String(fromSiYuan || document.documentElement.lang || "zh_CN").toLowerCase()
    return raw.startsWith("zh") ? "zh_CN" : "en_US"
  } catch {
    return "zh_CN"
  }
}

export const lang: Lang = detect()
export const isZh = lang === "zh_CN"

/** 取词条；`{name}` 占位会被 vars 替换 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let out = DICTS[lang][key] ?? DICTS.zh_CN[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.split(`{${name}}`).join(String(value))
    }
  }
  return out
}

/** 注册表用：卡片名 */
export const cardName = (id: string) => t(`card.${id}.name`)
/** 注册表用：卡片说明 */
export const cardDesc = (id: string) => t(`card.${id}.desc`)

/* ── 星期：0 = 周日 … 6 = 周六（与 Date.getDay() 同序）──
 * 全站共用一套，卡片不要各自再存一份七天名字。 */
/** 全称：周一 … 周日 / "Mon" … "Sun" */
export const weekdayFull = (day: number) => t(`common.weekday.full.${day}`)
/** 短名：一 … 日 / "Mon" … "Sun" */
export const weekdayShort = (day: number) => t(`common.weekday.short.${day}`)
/** 两字母缩写：一 … 日 / "Mo" … "Su"（只给窄表头，例如迷你日历） */
export const weekdayTiny = (day: number) => t(`common.weekday.tiny.${day}`)
