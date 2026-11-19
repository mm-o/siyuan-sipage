/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/** 图标复核：桌面壳右上角品牌标 + 详情动作按钮（4 倍放大看是否线性描边、不实心） */
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
await page.goto(`http://127.0.0.1:${port}/index.html?theme=light`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'y', cardId: 'yiyan', size: '2x2' }] })))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(2200)

// 1) 桌面壳右上角：品牌标 + 两个工具按钮（hover 才出现）
await page.hover('.desk-hero-tools')
await page.waitForTimeout(400)
await page.locator('.desk-hero-tools').screenshot({ path: path.join(OUT, 'docs-v22-desk-mark.png') })

const mark = await page.evaluate(() => {
  const svg = document.querySelector('.desk-hero-leaf svg')
  const use = svg?.querySelector('use')
  const sym = use ? document.querySelector(use.getAttribute('xlink:href')) : null
  const g = sym?.querySelector('g')
  return {
    svgFill: svg ? getComputedStyle(svg).fill : null,
    symbolG: g ? { fill: g.getAttribute('fill'), stroke: g.getAttribute('stroke') } : null,
    rectsFilled: [...(sym?.querySelectorAll('rect') || [])].map((r) => getComputedStyle(r).fill),
  }
})

// 2) 详情动作按钮
await page.evaluate(() => document.querySelector('.frame')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(1200)
await page.locator('.desk-detail-foot').screenshot({ path: path.join(OUT, 'docs-v22-fab-icons.png') })

const fab = await page.evaluate(() => [...document.querySelectorAll('.gb svg')].map((s) => ({
  label: s.closest('button')?.getAttribute('aria-label'),
  fill: getComputedStyle(s).fill,
  stroke: getComputedStyle(s).strokeWidth,
  size: s.getBoundingClientRect().width,
})))

await browser.close()
server.close()
console.log(JSON.stringify({ mark, fab }, null, 2))
