/**
 * ⚠️ 非源码 / 不参与打包 —— 全局样式命名守卫（`pnpm check:css`）。
 *
 * 背景：2026-11-27 的真机事故 —— `src/styles/index.css` 是**全局**样式表（不是 scoped），
 * 里面用了 `.slot` / `.doc-row` / `.set-*` 这类通用类名；而 iTab modules、思桌等插件恰好
 * 也用同名类，于是插件一启用就把别人的界面一起重绘了。
 *
 * 规则：全局样式表里「第一个复合选择器」的类名必须 `desk-` 开头。
 * 历史遗留的裸类名放在 LEGACY 白名单里 —— **只能减不能增**，新增一个就失败。
 * 状态类（`.is-*`）与思源自有类（`body--dark` / `.dark` / `.layout-tab-container` / `.protyle-*`）
 * 是例外，写在 EXTERNAL 里。
 */
import fs from 'node:fs'
import path from 'node:path'

const CSS = path.resolve(process.cwd(), 'src/styles/index.css')

/** 历史遗留：短期保留，改样式时顺手迁到 desk- 前缀，并从这张表里删掉 */
const LEGACY = new Set([
  'cd-cat-chip', 'cd-chip', 'cd-nav-btn', 'chip', 'chips', 'db-block', 'doc-list',
  'frame', 'gb', 'gb-text', 'gs-arrow', 'gs-knob', 'gs-trigger', 'gs-value', 'gs-wrap',
  'lib-row', 'mm-row', 'mm-scroll', 'qp-item', 'rc-cell', 'sc-col', 'seg', 'seg-item',
  'source', 'tools', 'wx-hit', 'wx-hits', 'wx-loc', 'wx-loc-pick',
])

/** 不归我们管的类：思源自己的容器/主题状态，或通用状态类名约定 */
const EXTERNAL = new Set(['body--dark', 'dark', 'layout-tab-container', 'protyle-hint', 'is-active', 'is-selected', 'is-wide', 'on-photo'])

const css = fs.readFileSync(CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const firstClasses = new Set()
for (const rule of css.matchAll(/(^|\})\s*([^{}@;]+?)\s*\{/g)) {
  for (const one of rule[2].split(',')) {
    const first = one.trim().split(/[\s>+~]/)[0]
    const m = first.match(/^\.([A-Za-z][\w-]*)/)
    if (m) firstClasses.add(m[1])
  }
}

const violations = [...firstClasses]
  .filter((name) => !name.startsWith('desk-') && !LEGACY.has(name) && !EXTERNAL.has(name))
  .sort()

const legacyInUse = [...firstClasses].filter((name) => LEGACY.has(name)).sort()
const staleLegacy = [...LEGACY].filter((name) => !firstClasses.has(name)).sort()

console.log(JSON.stringify({
  首层类名总数: firstClasses.size,
  新增未加前缀: violations,
  遗留未加前缀: legacyInUse,
  白名单已失效可删除: staleLegacy,
}, null, 2))

if (violations.length) {
  console.error('\n全局样式命名守卫未通过：新类名必须以 desk- 开头（避免与其它插件/思源自带类重名）')
  process.exit(1)
}
if (staleLegacy.length) {
  console.log(`\n提示：白名单里有 ${staleLegacy.length} 个已不存在的类名，可以删掉：${staleLegacy.join(', ')}`)
}
console.log(`OK 全局样式命名收敛：${firstClasses.size} 个首层类名，未加前缀的新增 0 个`)
