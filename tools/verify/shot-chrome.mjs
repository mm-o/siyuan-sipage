/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 外层控件复核：卡片悬浮按钮（更多 / 全屏）、右键菜单、弹层关闭按钮。
 *
 * 右键菜单现在直接用思源原生 `Menu`（不再自绘），验证页里 `siyuan` 是替身，
 * 所以这里断言的是「我们交给思源的那份菜单项」：条目、图标名、子菜单、弹出坐标。
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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))
await page.route('**/appearance/covers/**', async (route) => {
  const tail = route.request().url().split('/appearance/covers/')[1]
  try {
    const r = await fetch(`http://127.0.0.1:6806/appearance/covers/${tail}`)
    route.fulfill({ status: r.status, contentType: tail.endsWith('.json') ? 'application/json' : 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
  } catch { route.fulfill({ status: 404, body: '' }) }
})

await page.goto(`http://127.0.0.1:${port}/index.html?theme=dark`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({
    cards: [
      { uid: 'c1', cardId: 'clock', size: '4x2' },
      { uid: 'c2', cardId: 'shici', size: '2x2' },
    ],
  }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(2400)

// 1) 时钟悬浮：左上「全屏」mini 按钮 + 右上「更多」mini 按钮
const clock = page.locator('.frame:has(.clock)')
await clock.hover()
await page.waitForTimeout(400)
await clock.screenshot({ path: path.join(OUT, 'docs-v20-clock-hover.png') })
const btns = await page.evaluate(() => {
  const f = document.querySelector('.frame:has(.clock)') || document.querySelectorAll('.frame')[0]
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName, cls: el.className } }
  return {
    more: box(f.querySelector('.more')),
    fs: box(f.querySelector('.fs-btn')),
    overlap: (() => {
      const a = f.querySelector('.more')?.getBoundingClientRect()
      const b = f.querySelector('.fs-btn')?.getBoundingClientRect()
      if (!a || !b) return null
      return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top)
    })(),
  }
})

const readMenu = () => page.evaluate(() => {
  const rec = (globalThis.__siyuanMenus || []).at(-1)
  if (!rec) return null
  return {
    id: rec.id,
    opened: rec.opened,
    at: rec.at,
    items: rec.items.map((i) => i.type === 'separator'
      ? { sep: true }
      : {
          icon: i.icon ?? null,
          label: i.label,
          type: i.type || 'item',
          checked: i.checked ?? null,
          sub: i.submenu ? i.submenu.map((s) => ({ label: s.label, checked: s.checked })) : null,
        }),
  }
})

// 2a) 右键：菜单项交给思源
await page.evaluate(() => { (globalThis.__siyuanMenus || []).length = 0 })
await page.locator('.frame').nth(1).click({ button: 'right' })
await page.waitForTimeout(400)
const menu = await readMenu()

// 2b) 「⋯」按钮：没有鼠标坐标时贴到按钮左下角
await page.evaluate(() => { (globalThis.__siyuanMenus || []).length = 0 })
await page.locator('.frame').nth(1).hover()
await page.evaluate(() => {
  document.querySelectorAll('.frame')[1]?.querySelector('.more')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(400)
const menuFromMore = await readMenu()
const moreBox = await page.evaluate(() => {
  const r = document.querySelectorAll('.frame')[1]?.querySelector('.more')?.getBoundingClientRect()
  return r ? { left: Math.round(r.left), bottom: Math.round(r.bottom) } : null
})

// 3) 弹层关闭按钮（lucide X）
await page.evaluate(() => {
  document.querySelectorAll('.frame')[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(1000)
const close = await page.evaluate(() => {
  const b = document.querySelector('.desk-sheet-close')
  if (!b) return null
  return { svg: b.querySelectorAll('svg').length, text: b.textContent?.trim() }
})
await page.locator('.desk-sheet').screenshot({ path: path.join(OUT, 'docs-v20-sheet-chrome.png') })

await browser.close()
server.close()
console.log(JSON.stringify({ btns, menu, menuFromMore, moreBox, close, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
