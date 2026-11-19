/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/** 诗词详情的 Chips（全文 / 译文 / 注释）：未选中态在照片上是否看得清 */
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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4 })
await page.route('**/appearance/covers/**', async (route) => {
  const tail = route.request().url().split('/appearance/covers/')[1]
  try {
    const r = await fetch(`http://127.0.0.1:6806/appearance/covers/${tail}`)
    route.fulfill({ status: r.status, contentType: 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
  } catch { route.fulfill({ status: 404, body: '' }) }
})
for (const host of ['base.desk.link', 'files.desk.link']) {
  await page.route(`**/${host}/**`, async (route) => {
    try {
      const r = await fetch(route.request().url())
      route.fulfill({ status: r.status, contentType: r.headers.get('content-type') || 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
    } catch { route.fulfill({ status: 502, body: '{}' }) }
  })
}

await page.goto(`http://127.0.0.1:${port}/index.html?theme=light`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 's', cardId: 'shici', size: '2x2' }] })))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(2200)
await page.evaluate(() => document.querySelector('.frame')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(1200)

const read = () => page.evaluate(() => {
  const chips = [...document.querySelectorAll('.desk-sheet .chip')]
  return chips.map((c) => {
    const cs = getComputedStyle(c)
    const r = c.getBoundingClientRect()
    return {
      label: c.textContent.trim(),
      active: c.classList.contains('active'),
      onPhoto: c.classList.contains('on-photo'),
      color: cs.color,
      background: cs.backgroundColor,
      border: cs.borderColor,
      height: Math.round(r.height),
      font: cs.fontSize,
    }
  })
})

const before = await read()
// 只截 chips 这一行（左右各留 40px），4 倍放大看边缘与对比
const head = page.locator('.desk-sheet .chips')
const box = await head.boundingBox()
const clip = { x: box.x - 40, y: box.y - 30, width: box.width + 80, height: box.height + 60 }
await page.screenshot({ path: path.join(OUT, 'docs-v23-chips-4x.png'), clip })

// 切到「译文」，确认选中/未选中两个态都对
await page.evaluate(() => {
  const chip = [...document.querySelectorAll('.desk-sheet .chip')].find((c) => c.textContent.trim() === '译文')
  chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(500)
const after = await read()
await page.screenshot({ path: path.join(OUT, 'docs-v23-chips-4x-active.png'), clip })

await browser.close()
server.close()
console.log(JSON.stringify({ before, after }, null, 2))
