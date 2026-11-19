/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守门）。
 * 构建入口只有 src/index.ts；运行 `pnpm check:dist` 可自证 dist 里没有 .mjs。
 *
 * 设置面板四个分区的截图 + 关键尺寸，用来确认盒模型重置后没有走形。
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const DIST = path.resolve(import.meta.dirname, '../../dev-dist')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.json': 'application/json',
}
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html'
  const file = path.join(DIST, rel)
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('404')
    return
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })

await page.route('**/appearance/covers/**', async (route) => {
  const name = route.request().url().split('/').pop()
  try {
    const r = await fetch(`http://127.0.0.1:6806/appearance/covers/${name}`)
    route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
  } catch {
    route.fulfill({ status: 404, body: '' })
  }
})

await page.goto(`http://127.0.0.1:${port}/index.html?theme=light`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
await page.hover('.desk-hero-tools')
await page.waitForTimeout(180)
// 展开动画：设置与卡片详情共用同一个 Sheet，应该从按钮原位 FLIP 放大
// （动画只有 280ms，直接读 getAnimations 会抓不到 → 先挂钩 Element.animate 记录）
await page.evaluate(() => {
  window.__flip = []
  const orig = Element.prototype.animate
  Element.prototype.animate = function (frames, opts) {
    window.__flip.push({ frames: frames.map((f) => f.transform || ""), duration: opts?.duration })
    return orig.call(this, frames, opts)
  }
})
const heroRect = await page.evaluate(() => {
  const r = document.querySelector('.desk-hero-action[aria-label="设置"]')?.getBoundingClientRect()
  return r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null
})
await page.click('.desk-hero-action[aria-label="设置"]')
await page.waitForTimeout(700)
const flip = await page.evaluate(() => ({ calls: window.__flip || [] }))

// 结构统一性：没有独立标题栏，只有悬浮关闭键
const chrome = await page.evaluate(() => {
  const sheet = document.querySelector('.desk-sheet')
  return {
    head: sheet?.querySelectorAll('.desk-sheet-head').length ?? -1,
    floatClose: sheet?.querySelectorAll('.desk-sheet-close').length ?? -1,
    bodyPad: sheet?.querySelector('.desk-sheet-body') ? getComputedStyle(sheet.querySelector('.desk-sheet-body')).padding : '',
    settingsPad: sheet?.querySelector('.settings') ? getComputedStyle(sheet.querySelector('.settings')).padding : '',
    navPad: sheet?.querySelector('.nav') ? getComputedStyle(sheet.querySelector('.nav')).padding : '',
    panePad: sheet?.querySelector('.pane') ? getComputedStyle(sheet.querySelector('.pane')).padding : '',
    title: sheet?.querySelector('.nav-title')?.textContent?.trim() ?? '',
  }
})

const tabs = ['壁纸', '组件设置', '卡片库', '关于']
const OUT = path.resolve(import.meta.dirname, '../../docs/screens')
fs.mkdirSync(OUT, { recursive: true })
const shots = []
for (let i = 0; i < tabs.length; i++) {
  await page.locator('.nav-item').nth(i).click()
  await page.waitForTimeout(450)
  const file = path.join(OUT, `settings-${i}.png`)
  await page.locator('.desk-sheet').screenshot({ path: file })
  shots.push(path.basename(file))
}

const box = await page.evaluate(() => {
  const q = (s) => document.querySelector(`.desk-sheet ${s}`)
  const b = (el) => { const r = el?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null }
  return {
    sheet: b(document.querySelector('.desk-sheet')),
    nav: b(q('.nav')),
    pane: b(q('.pane')),
    navItem: b(q('.nav-item')),
    paneFirst: b(q('.pane > *')),
  }
})
await browser.close()
server.close()
console.log(JSON.stringify({ shots, heroRect, flip, chrome, box, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 4) }, null, 2))
