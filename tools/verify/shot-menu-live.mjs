/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机验证「右键菜单用思源原生 Menu」：
 *   右键卡片 → 菜单是 `.b3-menu`（思源自己的），图标是 `<use href="#iconXxx">` 且不被填实；
 *   展开「尺寸」子菜单，当前尺寸带思源自带的勾；
 *   最后 Esc 关闭，桌面复原。
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

// 打开桌面
await page.evaluate(() => {
  const el = [...document.querySelectorAll('#toolbar .b3-tooltips, .toolbar__item')]
    .find((x) => /参考实现/i.test(x.getAttribute('aria-label') || x.getAttribute('title') || ''))
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(2500)

const frame = page.locator('.desk-root .frame').first()
const box = await frame.boundingBox()

// 右键
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
await page.waitForTimeout(700)

const readMenu = () => page.evaluate(() => [...document.querySelectorAll('.b3-menu')].map((m) => ({
  cls: m.className,
  box: (() => { const r = m.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } })(),
  rows: [...m.querySelectorAll('.b3-menu__item')].map((r) => {
    const svg = r.querySelector('svg')
    const hrefs = [...r.querySelectorAll('use')].map((u) => u.getAttribute('xlink:href') || u.getAttribute('href') || '')
    return {
      label: (r.querySelector('.b3-menu__label')?.textContent || '').trim(),
      icon: (hrefs[0] || '').replace('#', '') || null,
      fill: svg ? getComputedStyle(svg).fill : null,
      checked: !!r.querySelector('.b3-menu__checked'),
      rowH: Math.round(r.getBoundingClientRect().height),
    }
  }),
})))

const top = await readMenu()
await page.screenshot({ path: path.join(OUT, 'menu-live-top.png'), clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: 520, height: 420 } })

// 悬停「尺寸」展开子菜单
const opened = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.b3-menu__item')]
    .find((r) => (r.querySelector('.b3-menu__label')?.textContent || '').trim() === '尺寸')
  if (!row) return false
  row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
  return true
})
await page.waitForTimeout(800)
const withSub = await readMenu()
const subBox = withSub.at(-1)?.box
if (subBox) {
  await page.screenshot({ path: path.join(OUT, 'menu-live-sub.png'), clip: { x: Math.max(0, subBox.x - 300), y: Math.max(0, subBox.y - 60), width: 620, height: 460 } })
}

// 思源自己的行为：第一次 Esc 收子菜单、第二次收菜单
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
const closed = await page.evaluate(() => [...document.querySelectorAll('.b3-menu')]
  .filter((m) => {
    const r = m.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(m).display !== 'none'
  }).length)

// 「⋯」入口：菜单贴着按钮弹（鼠标点击带真实坐标）
const frame2 = page.locator('.desk-root .frame').first()
await frame2.hover()
await page.waitForTimeout(400)
const moreBox = await page.evaluate(() => {
  const r = document.querySelector('.desk-root .frame .more')?.getBoundingClientRect()
  return r ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null
})
await page.mouse.click(moreBox.x, moreBox.y)
await page.waitForTimeout(700)
const fromMore = await page.evaluate(() => {
  const m = [...document.querySelectorAll('.b3-menu')]
    .filter((el) => el.getBoundingClientRect().height > 0)
    .at(-1)
  if (!m) return null
  const r = m.getBoundingClientRect()
  return { x: Math.round(r.left), y: Math.round(r.top), rows: m.querySelectorAll('.b3-menu__item').length }
})
await page.screenshot({ path: path.join(OUT, 'menu-live-more.png'), clip: { x: Math.max(0, moreBox.x - 200), y: Math.max(0, moreBox.y - 40), width: 520, height: 400 } })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

await browser.close()
console.log(JSON.stringify({ top, opened, withSub, closed, moreBox, fromMore, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
