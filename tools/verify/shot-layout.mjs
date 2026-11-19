/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 版式复核（三件事）：
 *   1. 网格自适应：左右留白一致、列宽均分、右侧不留空
 *   2. 图标居中：每个图标按钮里 svg 的中心 = 按钮中心（误差 ≤ 1px）
 *   3. 通用全屏：任何卡片左上角都能全屏，Esc 退出
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const DIST = path.resolve(import.meta.dirname, '../../dev-dist')
const OUT = path.resolve(import.meta.dirname, '../../docs/screens')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' }

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html'
  const file = path.join(DIST, rel)
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end('404'); return }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))
await page.route('**/appearance/covers/**', async (route) => {
  const tail = route.request().url().split('/appearance/covers/')[1]
  try {
    const r = await fetch(`http://127.0.0.1:6806/appearance/covers/${tail}`)
    route.fulfill({ status: r.status, contentType: tail.endsWith('.json') ? 'application/json' : 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
  } catch { route.fulfill({ status: 404, body: '' }) }
})

await page.goto(`http://127.0.0.1:${port}/index.html?theme=light`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({
    cards: [
      { uid: 'c1', cardId: 'clock', size: '2x2' },
      { uid: 'c2', cardId: 'calendar', size: '2x2' },
      { uid: 'c3', cardId: 'yiyan', size: '1x1' },
      { uid: 'c4', cardId: 'shici', size: '2x2' },
      { uid: 'c5', cardId: 'english', size: '2x2' },
      { uid: 'c6', cardId: 'calendar', size: '4x2' },
    ],
  }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(5000)

/** 网格：绝对落位，逐行归并后量（行内是否铺满、卡片宽高比、右侧留白） */
const grid = await page.evaluate(() => {
  const grid = document.querySelector('.desk-root .grid')
  if (!grid) {
    return {
      error: 'grid-missing',
      frames: document.querySelectorAll('.frame').length,
      empty: !!document.querySelector('.desk-root .empty'),
      seed: localStorage.getItem('desk-cards:desk')?.slice(0, 80) ?? null,
    }
  }
  const gr = grid.getBoundingClientRect()
  const cells = [...grid.children].map((el) => {
    const r = el.getBoundingClientRect()
    return {
      l: Math.round(r.left - gr.left),
      t: Math.round(r.top - gr.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
      aspect: +(r.width / r.height).toFixed(3),
    }
  })
  const rows = [...new Set(cells.map((c) => c.t))].map((t) => {
    const row = cells.filter((c) => c.t === t)
    return {
      t,
      cells: row.map((c) => `${c.w}x${c.h}`),
      leftSlack: Math.min(...row.map((c) => c.l)),
      rightSlack: Math.round(gr.width - Math.max(...row.map((c) => c.l + c.w))),
    }
  })
  return {
    gridBox: { w: Math.round(gr.width), h: Math.round(gr.height) },
    cellCount: cells.length,
    rowCount: rows.length,
    rows,
    aspects: [...new Set(cells.map((c) => c.aspect))],
  }
})

/** 图标居中：svg 中心 vs 按钮中心 */
const iconCenters = async () => page.evaluate(() => {
  const out = []
  const probe = (label, btn) => {
    if (!btn) return
    const b = btn.getBoundingClientRect()
    const svg = btn.querySelector('svg')
    if (!svg) return
    const s = svg.getBoundingClientRect()
    out.push({
      label,
      dx: +((s.left + s.width / 2) - (b.left + b.width / 2)).toFixed(2),
      dy: +((s.top + s.height / 2) - (b.top + b.height / 2)).toFixed(2),
      btn: `${Math.round(b.width)}x${Math.round(b.height)}`,
      svg: `${Math.round(s.width)}x${Math.round(s.height)}`,
    })
  }
  probe('hero-action', document.querySelector('.desk-hero-action'))
  probe('hero-leaf', document.querySelector('.desk-hero-leaf'))
  probe('card-more', document.querySelector('.frame .more'))
  probe('card-fs', document.querySelector('.frame .fs'))
  return out
})

// 悬浮后按钮才显示（opacity 不影响布局，直接量）
await page.locator('.frame').first().hover()
await page.waitForTimeout(400)
const icons = await iconCenters()
await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, 'layout-grid.png') })

// 全屏：点卡片左上角的「全屏」
await page.evaluate(() => document.querySelector('.frame .fs')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(700)
const full = await page.evaluate(() => {
  const layer = document.querySelector('.desk-full')
  const box = document.querySelector('.desk-full-box')
  const inner = document.querySelector('.desk-full-inner > *')
  const close = document.querySelector('.desk-full-close')
  const br = box?.getBoundingClientRect()
  const ir = inner?.getBoundingClientRect()
  const cr = close?.getBoundingClientRect()
  const svg = close?.querySelector('svg')?.getBoundingClientRect()
  return {
    layer: !!layer,
    box: br ? { w: Math.round(br.width), h: Math.round(br.height) } : null,
    inner: ir ? { w: Math.round(ir.width), h: Math.round(ir.height) } : null,
    closeCenterDelta: cr && svg ? {
      dx: +((svg.left + svg.width / 2) - (cr.left + cr.width / 2)).toFixed(2),
      dy: +((svg.top + svg.height / 2) - (cr.top + cr.height / 2)).toFixed(2),
    } : null,
  }
})
await page.screenshot({ path: path.join(OUT, 'layout-fullscreen.png') })
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const fullClosed = await page.evaluate(() => !document.querySelector('.desk-full'))

// 弹层关闭键居中
await page.evaluate(() => document.querySelector('.frame')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(900)
const sheetClose = await page.evaluate(() => {
  const btn = document.querySelector('.desk-sheet-close')
  const svg = btn?.querySelector('svg')?.getBoundingClientRect()
  const b = btn?.getBoundingClientRect()
  return b && svg ? {
    dx: +((svg.left + svg.width / 2) - (b.left + b.width / 2)).toFixed(2),
    dy: +((svg.top + svg.height / 2) - (b.top + b.height / 2)).toFixed(2),
    btn: `${Math.round(b.width)}x${Math.round(b.height)}`,
  } : null
})

await browser.close()
server.close()
console.log(JSON.stringify({ grid, icons, full, fullClosed, sheetClose, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
