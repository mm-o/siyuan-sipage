/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机版式复核：网格左右留白一致（右侧不留空）+ 图标居中 + 通用全屏。
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const OUT = path.resolve(import.meta.dirname, '../../docs/screens')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const TOKEN = 'bct45z7gltevi22s'

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))

await page.goto(`http://127.0.0.1:6806/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5500)
await page.evaluate(() => document.querySelector('#message')?.remove())
await page.evaluate(() => {
  const el = [...document.querySelectorAll('#toolbar .b3-tooltips, .toolbar__item')]
    .find((x) => /参考实现/i.test(x.getAttribute('aria-label') || x.getAttribute('title') || ''))
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(2600)

const grid = await page.evaluate(() => {
  const grid = document.querySelector('.desk-root .grid')
  if (!grid) return null
  const gr = grid.getBoundingClientRect()
  const cs = getComputedStyle(grid)
  const cells = [...grid.children].map((el) => {
    const r = el.getBoundingClientRect()
    return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }
  })
  const cols = cs.gridTemplateColumns.split(' ').map((n) => Math.round(parseFloat(n)))
  return {
    gridW: Math.round(gr.width),
    columns: cols.length,
    columnWidth: cols[0],
    columnsEqual: cols.every((w) => w === cols[0]),
    gap: cs.gap,
    cells: cells.length,
    leftSlack: Math.round(Math.min(...cells.map((c) => c.l)) - gr.left),
    rightSlack: Math.round(gr.right - Math.max(...cells.map((c) => c.r))),
    firstRow: cells.slice(0, 4),
  }
})

await page.locator('.desk-root .frame').first().hover()
await page.waitForTimeout(400)
const icons = await page.evaluate(() => {
  const out = []
  const probe = (label, btn) => {
    const b = btn?.getBoundingClientRect()
    const s = btn?.querySelector('svg')?.getBoundingClientRect()
    if (!b || !s) return
    out.push({ label, dx: +((s.left + s.width / 2) - (b.left + b.width / 2)).toFixed(2), dy: +((s.top + s.height / 2) - (b.top + b.height / 2)).toFixed(2) })
  }
  probe('hero-action', document.querySelector('.desk-hero-action'))
  probe('card-fs', document.querySelector('.desk-root .frame .fs'))
  probe('card-more', document.querySelector('.desk-root .frame .more'))
  return out
})

await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, 'layout-live-grid.png') })

// 通用全屏
await page.evaluate(() => document.querySelector('.desk-root .frame .fs')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(800)
const full = await page.evaluate(() => {
  const box = document.querySelector('.desk-full-box')?.getBoundingClientRect()
  const close = document.querySelector('.desk-full-close')
  const b = close?.getBoundingClientRect()
  const s = close?.querySelector('svg')?.getBoundingClientRect()
  return {
    layer: !!document.querySelector('.desk-full'),
    box: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
    closeDelta: b && s ? { dx: +((s.left + s.width / 2) - (b.left + b.width / 2)).toFixed(2), dy: +((s.top + s.height / 2) - (b.top + b.height / 2)).toFixed(2) } : null,
  }
})
await page.screenshot({ path: path.join(OUT, 'layout-live-fullscreen.png') })
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
const fullClosed = await page.evaluate(() => !document.querySelector('.desk-full'))

// 弹层关闭键居中（真机 Sheet）
await page.evaluate(() => document.querySelector('.desk-root .frame')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(1100)
const sheetClose = await page.evaluate(() => {
  const btn = document.querySelector('.desk-sheet-close')
  const b = btn?.getBoundingClientRect()
  const s = btn?.querySelector('svg')?.getBoundingClientRect()
  return b && s ? { dx: +((s.left + s.width / 2) - (b.left + b.width / 2)).toFixed(2), dy: +((s.top + s.height / 2) - (b.top + b.height / 2)).toFixed(2) } : null
})
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

await browser.close()
console.log(JSON.stringify({ grid, icons, full, fullClosed, sheetClose, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
