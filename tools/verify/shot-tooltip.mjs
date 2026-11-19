/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机验证：所有提示走思源的 ariaLabel 机制
 *
 * 思源用 `ariaLabel` 类 + `data-position` + `aria-label`，在文档根部用
 * `#tooltip`（position: fixed）渲染 —— 不受滚动面板 overflow 裁剪。
 * 这里逐项 hover，读 `#tooltip` 的文案/位置，并确认没有残留 b3-tooltips 与原生 title。
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const OUT = path.resolve(import.meta.dirname, '../../docs/screens')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const TOKEN = 'bct45z7gltevi22s'

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))

await page.goto(`http://127.0.0.1:6806/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5500)
await page.evaluate(() => document.querySelector('#message')?.remove())

/** hover 后读思源的 #tooltip */
const probe = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const tip = document.querySelector('#tooltip')
  const cs = tip ? getComputedStyle(tip) : null
  const b = el.getBoundingClientRect()
  const t = tip?.getBoundingClientRect()
  return {
    cls: el.className.toString().slice(0, 70),
    title: el.getAttribute('title'),
    aria: el.getAttribute('aria-label'),
    position: el.getAttribute('data-position'),
    encoding: el.getAttribute('data-tooltip-encoding'),
    tooltipClass: tip?.className,
    tooltipText: tip?.textContent,
    tooltipDisplay: cs?.display,
    tooltipPosition: cs?.position,
    aboveElement: !!(t && b && t.bottom <= b.top + 2),
  }
}, selector)

const hoverAndProbe = async (selector, wait = 800) => {
  await page.hover(selector)
  await page.waitForTimeout(wait)
  return probe(selector)
}

// 1) 桌面壳右上角
await page.evaluate(() => {
  const el = [...document.querySelectorAll('#toolbar .ariaLabel, .toolbar__item')]
    .find((x) => /参考实现/i.test(x.getAttribute('aria-label') || ''))
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(2500)
await page.evaluate(() => document.querySelector('.desk-hero-tools')?.dispatchEvent(new MouseEvent('mouseenter')))
await page.waitForTimeout(300)
const hero = await hoverAndProbe('.desk-hero-action[aria-label="设置"]')
await page.screenshot({ path: path.join(OUT, 'tooltip-hero.png'), clip: { x: 1180, y: 20, width: 260, height: 140 } })

// 2) 卡片详情里的动作按钮 + 关闭键
await page.evaluate(() => document.querySelector('.desk-root .frame')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(1500)
const fab = await hoverAndProbe('.desk-sheet .gb[aria-label="下一条"]')
const box = await page.locator('.desk-sheet .gb[aria-label="下一条"]').boundingBox()
await page.screenshot({ path: path.join(OUT, 'tooltip-fab.png'), clip: { x: box.x - 40, y: box.y - 70, width: 160, height: 130 } })

const close = await hoverAndProbe('.desk-sheet-close')
const closeBox = await page.locator('.desk-sheet-close').boundingBox()
await page.screenshot({ path: path.join(OUT, 'tooltip-close.png'), clip: { x: closeBox.x - 90, y: closeBox.y - 40, width: 140, height: 110 } })
await page.keyboard.press('Escape')
await page.waitForTimeout(700)

// 3) 设置面板：滑块 + 壁纸缩略图
await page.evaluate(() => {
  document.querySelector('.desk-hero-tools')?.dispatchEvent(new MouseEvent('mouseenter'))
})
await page.waitForTimeout(250)
await page.evaluate(() => {
  document.querySelector('.desk-hero-action[aria-label="添加卡片"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(900)
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.desk-sheet .nav-item')]
    .find((b) => (b.textContent || '').includes('组件设置'))
  item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(600)
const slider = await hoverAndProbe('.desk-sheet .slider', 800)
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.desk-sheet .nav-item')]
    .find((b) => (b.textContent || '').includes('壁纸'))
  item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(700)
const tile = await hoverAndProbe('.desk-sheet .desk-tile', 800)

// 残留检查：插件三个根里不能再有 b3-tooltips，也不能有 title
const leftovers = await page.evaluate(() => ({
  b3Tooltips: document.querySelectorAll('.desk-root .b3-tooltips, .desk-sheet-mask .b3-tooltips, .desk-embed-card .b3-tooltips').length,
  titles: document.querySelectorAll('.desk-root [title], .desk-sheet-mask [title]').length,
}))

await browser.close()
console.log(JSON.stringify({ hero, fab, close, slider, tile, leftovers, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
