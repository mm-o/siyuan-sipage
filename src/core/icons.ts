/**
 * 插件图标（顶栏 / 页签 / 桌面壳右上角共用）
 *
 * 四个圆角方块拼成的「整页」标：左上与右下实心、右上与左下半透明，
 * 一眼能看出「一屏卡片」。填充色用 currentColor，跟随思源的顶栏/页签前景色。
 */
const MARK = `<g fill="currentColor">
    <rect x="3.5" y="3.5" width="11" height="11" rx="3"/>
    <rect x="17.5" y="3.5" width="11" height="11" rx="3" opacity=".55"/>
    <rect x="3.5" y="17.5" width="11" height="11" rx="3" opacity=".55"/>
    <rect x="17.5" y="17.5" width="11" height="11" rx="3"/>
  </g>`

/** addTopBar 用：内联 <svg> */
export const PLUGIN_ICON_SVG = `<svg viewBox="0 0 32 32" width="16" height="16">${MARK}</svg>`

/** addIcons 注册的 symbol id：页签、桌面壳右上角用 <use href="#…"> */
export const PLUGIN_ICON_ID = "iconDeskCards"

export const PLUGIN_ICONS = `<symbol id="${PLUGIN_ICON_ID}" viewBox="0 0 32 32">${MARK}</symbol>`
