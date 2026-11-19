/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 翻页数字的折叠过程：用 CDP 把动画暂停后精确 seek，逐帧截图。
 *   t=120ms 旧数字上半张抬起
 *   t=250ms 抬到一半，新数字上半张已经露出
 *   t=430ms 旧上半张几乎合上
 *   t=720ms 新数字下半张落下
 *   t=980ms 新数字下半张到位
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
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })

await page.goto(`http://127.0.0.1:${port}/index.html?theme=dark`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'c', cardId: 'clock', size: '4x2' }] }))
  localStorage.setItem('desk-cards:appearance', JSON.stringify({ radius: 18, blur: 24, opacity: 0.62, shadow: 0.34, lift: 2, gap: 12, cell: 240 }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(1800)

const cdp = await page.context().newCDPSession(page)
await cdp.send('Animation.enable')
const ids = []
cdp.on('Animation.animationStarted', (e) => ids.push(e.animation.id))

// 等秒数变化触发的翻页动画
await page.waitForFunction(() => !!document.querySelector('.flip.play'), null, { polling: 10, timeout: 8000 })
await page.waitForTimeout(30)

// 暂停所有正在跑的动画，逐个 seek
const pausable = [...new Set(ids)]
for (const id of pausable) {
  try { await cdp.send('Animation.setPaused', { animations: [id], paused: true }) } catch {}
}
const tile = page.locator('.flip.play').first()
const frames = [120, 250, 430, 720, 980]
const shots = []
for (const ms of frames) {
  for (const id of pausable) {
    try { await cdp.send('Animation.seekAnimations', { animations: [id], currentTime: ms }) } catch {}
  }
  const p = path.join(OUT, `docs-v21-pose-${ms}.png`)
  await tile.screenshot({ path: p })
  shots.push(path.basename(p))
}

const state = await page.evaluate(() => {
  const el = document.querySelector('.flip.play')
  const items = [...el.querySelectorAll('.item')].map((it) => ({
    cls: it.className,
    up: getComputedStyle(it.querySelector('.up')).transform,
    down: getComputedStyle(it.querySelector('.down')).transform,
    text: it.querySelector('.inn span')?.textContent,
  }))
  return { items }
})

await browser.close()
server.close()
console.log(JSON.stringify({ shots, state }, null, 2))
