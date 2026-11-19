/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机验证「设置弹窗 = 卡片详情弹窗」：
 *   结构：没有独立标题栏，只有悬浮关闭键；内容自己排版（外圈 12、每栏 20）
 *   展开：从触发的那个按钮 FLIP 放大（挂钩 Element.animate 记录关键帧）
 *   关闭：Esc 能关，桌面复原
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
await page.evaluate(() => {
  const el = [...document.querySelectorAll('#toolbar .b3-tooltips, .toolbar__item')]
    .find((x) => /参考实现/i.test(x.getAttribute('aria-label') || x.getAttribute('title') || ''))
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(2500)

const chrome = () => page.evaluate(() => {
  const sheet = document.querySelector('.desk-sheet')
  if (!sheet) return null
  const b = sheet.getBoundingClientRect()
  const cs = getComputedStyle(sheet)
  return {
    box: { w: Math.round(b.width), h: Math.round(b.height) },
    head: sheet.querySelectorAll('.desk-sheet-head').length,
    floatClose: sheet.querySelectorAll('.desk-sheet-close').length,
    bodyPad: getComputedStyle(sheet.querySelector('.desk-sheet-body')).padding,
    inset: sheet.querySelector('.settings') ? getComputedStyle(sheet.querySelector('.settings')).padding : null,
    panePad: sheet.querySelector('.pane') ? getComputedStyle(sheet.querySelector('.pane')).padding : null,
    title: sheet.querySelector('.nav-title')?.textContent?.trim() ?? null,
    radius: cs.borderRadius,
    backdrop: cs.backdropFilter,
  }
})

// 详情：点卡片（作为「统一弹层」的参照）
await page.evaluate(() => {
  document.querySelector('.desk-root .frame')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(1200)
const detail = await chrome()
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// 设置：挂钩动画 + 从按钮展开
await page.evaluate(() => {
  window.__flip = []
  const orig = Element.prototype.animate
  Element.prototype.animate = function (frames, opts) {
    window.__flip.push({ frames: frames.map((f) => f.transform || ''), duration: opts?.duration })
    return orig.call(this, frames, opts)
  }
  document.querySelector('.desk-hero-tools')?.dispatchEvent(new MouseEvent('mouseenter'))
})
await page.waitForTimeout(300)
const heroRect = await page.evaluate(() => {
  const r = document.querySelector('.desk-hero-action[aria-label="设置"]')?.getBoundingClientRect()
  return r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null
})
await page.evaluate(() => {
  document.querySelector('.desk-hero-action[aria-label="设置"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(900)
const settings = await chrome()
const flip = await page.evaluate(() => window.__flip || [])
await page.locator('.desk-sheet').screenshot({ path: path.join(OUT, 'settings-live.png') })

await page.keyboard.press('Escape')
await page.waitForTimeout(600)
const closed = await page.evaluate(() => document.querySelectorAll('.desk-sheet').length)

await browser.close()
console.log(JSON.stringify({ detail, settings, heroRect, flip, closed, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
