/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/** 日历卡 + 日历详情（CalendarPanel）的版式与对齐复核 */
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

const theme = process.argv[2] === 'dark' ? 'dark' : 'light'
await page.goto(`http://127.0.0.1:${port}/index.html?theme=${theme}`, { waitUntil: 'domcontentloaded' })

// ── 四种尺寸：1x1 今日 / 2x2 月历 / 2x4 竖版 / 4x2 横版 ──
const sizes = ['1x1', '2x2', '2x4', '4x2']
const sizeShots = {}
for (const size of sizes) {
  await page.evaluate((s) => {
    localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'cal', cardId: 'calendar', size: s }] }))
  }, size)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForTimeout(1200)
  const frame = page.locator('.frame:has(.desk-calendar)')
  await frame.screenshot({ path: path.join(OUT, `cal-card-${size}-${theme}.png`) })
  sizeShots[size] = await page.evaluate(() => {
    const root = document.querySelector('.desk-calendar')
    const r = root.getBoundingClientRect()
    const texts = [...root.querySelectorAll('.cal-day-num, .cal-day-week, .cal-day-lunar, .cal-side-day, .cal-side-lunar, .cal-side-weak, .cal-month-head')]
    // 只报「真的被裁」的：overflow:hidden 且不是刻意的省略号（大号数字的字面框会略高于行盒，不算裁切）
    const clipped = texts.filter((t) => {
      const cs = getComputedStyle(t)
      if (cs.overflow !== 'hidden' || cs.textOverflow === 'ellipsis') return false
      return t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1
    })
    return {
      box: { w: Math.round(r.width), h: Math.round(r.height) },
      cls: root.className,
      clipped: clipped.map((t) => t.className),
      fonts: texts.map((t) => `${t.className}:${getComputedStyle(t).fontSize}`),
    }
  })
}

// ── 卡片材质（纯色面 vs 玻璃）+ 白卡上的「⋯」可见性 ──
const material = await page.evaluate(() => {
  const frame = document.querySelector('.frame')
  const more = frame?.querySelector('.more')
  const cs = frame ? getComputedStyle(frame) : null
  const ms = more ? getComputedStyle(more) : null
  return {
    solidClass: frame?.classList.contains('is-solid') ?? null,
    background: cs?.backgroundColor ?? '',
    backdrop: cs?.backdropFilter ?? '',
    boxShadow: cs?.boxShadow ?? '',
    moreBg: ms?.backgroundColor ?? '',
    moreBorder: ms?.borderColor ?? '',
  }
})
await page.hover('.frame')
await page.waitForTimeout(400)
const moreOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.frame .more')).opacity)
await page.locator('.frame').screenshot({ path: path.join(OUT, `cal-card-hover-${theme}.png`) })

// 回到 4x2 打开详情面板
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'cal', cardId: 'calendar', size: '4x2' }] }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(1600)
await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, `docs-v20-cal-card-${theme}.png`) })

await page.evaluate(() => {
  const f = document.querySelector('.frame')
  f?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(1100)
await page.screenshot({ path: path.join(OUT, `docs-v20-cal-panel-${theme}.png`) })

const box = (el) => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }
}

const metrics = await page.evaluate((boxSrc) => {
  const box = new Function(`return ${boxSrc}`)()
  const q = (s) => document.querySelector(`.desk-sheet ${s}`)
  const aside = q('.cal-aside')
  const head = q('.cal-aside-head')
  const badge = q('.cal-aside-badge')
  const list = q('.cal-detail-list')
  const actions = q('.cal-actions')
  const actionBtn = q('.cal-actions .desk-da') || q('.cal-actions button')
  const main = q('.cal-main')
  const toolbar = q('.cal-toolbar')
  const grid = q('.cal-grid')
  const badgeBox = box(badge)
  const asideBox = box(aside)
  return {
    aside: asideBox,
    main: box(main),
    head: box(head),
    badge: badgeBox,
    list: box(list),
    actions: box(actions),
    actionBtn: box(actionBtn),
    actionBtnText: actionBtn?.textContent?.trim(),
    actionBtnRadius: actionBtn ? getComputedStyle(actionBtn).borderRadius : '',
    toolbar: box(toolbar),
    grid: box(grid),
    asidePad: aside ? getComputedStyle(aside).padding : '',
    // 头像是否与侧栏水平中线对齐
    badgeCenterOffset: badgeBox && asideBox ? Math.round((badgeBox.l + badgeBox.w / 2) - (asideBox.l + asideBox.w / 2)) : null,
    // 动作条按钮右缘到侧栏内容右缘的距离
    btnRightGap: asideBox && box(actionBtn) ? Math.round(asideBox.r - 14 - box(actionBtn).r) : null,
    // 动作条与列表底部间距
    listToActions: list && actions ? Math.round(actions.t - list.b) : null,
  }
}, box.toString())

await page.keyboard.press('Escape')
await browser.close()
server.close()
console.log(JSON.stringify({ theme, sizeShots, material, moreOpacity, metrics, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
