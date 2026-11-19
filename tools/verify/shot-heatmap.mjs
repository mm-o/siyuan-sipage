/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 写作热力图：卡片五档 + 两栏详情（一年 53 周 + 统计栏）
 *
 * 数据接口用 `/api/query/sql`（和 siyuan-dashboard 同一条路），这里按 SQL 里的 since 生成确定性的
 * 每日块数代答，所以截图与数字可复现；真实环境由思源内核执行这条 SQL。
 *
 * 断言：
 *   1. 五档尺寸内容不溢出、格子数 = 周数×7
 *   2. 详情两栏（图 + 240px 统计）、53 周 = 371 格、月份标签、图例、hover 读数、四个关键数字
 *   3. 失败态：占位 + 重试（点了能恢复）
 *   4. 窄屏（<720 容器）：上下两段
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
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))

/* ── SQL 代答：按 since 生成确定性的「每天块数」─────────── */
let failNext = false
let lastStmt = ''
const pad = (n) => String(n).padStart(2, '0')
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 131 + ch.charCodeAt(0)) % 100003; return h }

await page.route('**/api/query/sql', async (route) => {
  const body = JSON.parse(route.request().postData() || '{}')
  lastStmt = String(body.stmt || '')
  if (failNext) {
    failNext = false
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: -1, msg: 'sql failed', data: null }) })
    return
  }
  const since = /created >= '(\d{8})'/.exec(lastStmt)?.[1] || '20240101'
  const rows = []
  const cur = new Date(Number(since.slice(0, 4)), Number(since.slice(4, 6)) - 1, Number(since.slice(6, 8)))
  const today = new Date()
  while (cur <= today) {
    const key = `${cur.getFullYear()}${pad(cur.getMonth() + 1)}${pad(cur.getDate())}`
    const h = hash(key)
    // 约 62% 的日子有写作，量 1–220；周末偏少
    const weekend = cur.getDay() === 0 || cur.getDay() === 6
    const active = h % 100 < (weekend ? 45 : 72)
    const n = active ? 1 + (h % 220) : 0
    if (n > 0) rows.push({ day: key, n })
    cur.setDate(cur.getDate() + 1)
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, msg: '', data: rows }) })
})

const seed = (size) => page.evaluate((s) => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'hm', cardId: 'heatmap', size: s }] }))
}, size)

const boxOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top), radius: cs.borderRadius }
}, sel)

/* ── 1. 卡片五档 ─────────────────────────────────────── */
const sizes = ['1x1', '2x1', '2x2', '4x2', '2x4']
const sizeShots = {}
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })

for (const size of sizes) {
  await seed(size)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForSelector('.hm-card .hg-cell', { state: 'attached', timeout: 15000 })
  await page.waitForTimeout(250)
  await page.locator('.frame').screenshot({ path: path.join(OUT, `heatmap-${size}.png`) })
  sizeShots[size] = await page.evaluate(() => {
    const card = document.querySelector('.hm-card')
    const body = card.querySelector('.hm-body')
    const cb = card.getBoundingClientRect()
    const round = Math.round
    const overflow = []
    for (const el of card.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width && !r.height) continue
      const out = round(Math.max(0, cb.top - r.top, r.bottom - cb.bottom, cb.left - r.left, r.right - cb.right))
      if (out > 1) overflow.push(`${el.className}:${out}`)
    }
    const cells = card.querySelectorAll('.hg-cell').length
    const weeks = card.querySelectorAll('.hg-week').length
    return {
      box: { w: round(cb.width), h: round(cb.height) },
      scroll: { sh: body.scrollHeight, ch: body.clientHeight, sw: body.scrollWidth, cw: body.clientWidth },
      clipped: body.scrollHeight - body.clientHeight > 1 || body.scrollWidth - body.clientWidth > 1,
      overflow,
      weeks,
      cells,
      months: card.querySelectorAll('.hg-month').length,
      levels: [...new Set([...card.querySelectorAll('.hg-week .hg-cell')].map((c) => c.className.replace('hg-cell ', '')))].sort(),
    }
  })
}

/* ── 2. 真桌面尺寸（6 张卡 → 单格 ~76px，2x2 只有 152×152）：按像素降档 ── */
const SMALL_DESK = (size) => ({
  cards: [
    { uid: 'a', cardId: 'yiyan', size: '2x2' },
    { uid: 'b', cardId: 'english', size: '2x2' },
    { uid: 'c', cardId: 'clock', size: '2x2' },
    { uid: 'd', cardId: 'shici', size: '4x2' },
    { uid: 'e', cardId: 'calendar', size: '4x2' },
    { uid: 'w', cardId: 'heatmap', size },
  ],
})
const small = {}
await page.setViewportSize({ width: 1440, height: 900 })
for (const size of sizes) {
  await page.evaluate((d) => localStorage.setItem('desk-cards:desk', JSON.stringify(d)), SMALL_DESK(size))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForSelector('.hm-card .hg-cell', { state: 'attached', timeout: 15000 })
  await page.waitForTimeout(250)
  await page.locator('.frame:has(.hm-card)').screenshot({ path: path.join(OUT, `heatmap-small-${size}.png`) })
  small[size] = await page.evaluate(() => {
    const card = document.querySelector('.hm-card')
    const body = card.querySelector('.hm-body')
    const cb = card.getBoundingClientRect()
    const clipped = [...card.querySelectorAll('.hm-title, .hm-range, .hm-stat, .hm-figure b, .hm-figure span')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.className)
    return {
      box: { w: Math.round(cb.width), h: Math.round(cb.height) },
      scroll: { sh: body.scrollHeight, ch: body.clientHeight },
      clipped: body.scrollHeight - body.clientHeight > 1,
      figuresShown: (() => { const el = card.querySelector('.hm-figures'); return el ? getComputedStyle(el).display !== 'none' : null })(),
      clippedText: clipped,
    }
  })
}
await page.evaluate(() => localStorage.removeItem('desk-cards:desk'))

/* ── 3. 两栏详情 ─────────────────────────────────────── */
await seed('2x2')
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForSelector('.hm-card .hg-cell', { state: 'attached', timeout: 15000 })
await page.locator('.frame').click()
await page.waitForSelector('.hm-panel', { timeout: 15000 })
/* 打开时的淡入：先是契约（动画名/时长/最大延迟 + 减少动态时关闭），再抓一帧看中途 */
const bloom = await page.evaluate(() => {
  /* 只看网格里的格子（图例里那 5 个不带 --col/--row） */
  const cells = [...document.querySelectorAll('.hm-panel .hg-weeks .hg-cell')]
  const first = cells[0]
  const last = cells[cells.length - 1]
  const cs = first ? getComputedStyle(first) : null
  const csLast = last ? getComputedStyle(last) : null
  return {
    total: cells.length,
    animationName: cs?.animationName ?? '',
    duration: cs?.animationDuration ?? '',
    maxDelay: csLast?.animationDelay ?? '',
    running: first ? first.getAnimations().some((a) => a.playState === 'running') : false,
    midFlight: cells.filter((c) => {
      const s = getComputedStyle(c)
      const o = Number(s.opacity)
      return s.animationName === 'hg-bloom' && o > 0.02 && o < 0.998
    }).length,
  }
})
await page.screenshot({ path: path.join(OUT, 'heatmap-bloom.png') })
/* 减少动态时整段关掉（motion.md） */
await page.emulateMedia({ reducedMotion: 'reduce' })
bloom.reducedMotionOff = await page.evaluate(() => getComputedStyle(document.querySelector('.hm-panel .hg-cell')).animationName === 'none')
await page.emulateMedia({ reducedMotion: 'no-preference' })
await page.waitForTimeout(900)

const wide = {
  sheet: await boxOf('.desk-sheet'),
  main: await boxOf('.hm-main'),
  side: await boxOf('.hm-side'),
  direction: await page.evaluate(() => getComputedStyle(document.querySelector('.hm-panel .hm-body')).flexDirection),
  weeks: await page.evaluate(() => document.querySelectorAll('.hm-panel .hg-week').length),
  cells: await page.evaluate(() => document.querySelectorAll('.hm-panel .hg-weeks .hg-cell').length),
  months: await page.evaluate(() => document.querySelectorAll('.hm-panel .hg-month').length),
  figures: await page.evaluate(() => [...document.querySelectorAll('.hm-figure')].map((f) => f.textContent.replace(/\s+/g, ' ').trim())),
  recent: await page.evaluate(() => document.querySelectorAll('.hm-recent-row').length),
  caption: await page.evaluate(() => document.querySelector('.hm-caption')?.textContent?.replace(/\s+/g, ' ').trim()),
  sql: lastStmt,
}
await page.screenshot({ path: path.join(OUT, 'heatmap-panel.png') })

/* hover 一格 → 读数跟着变 */
const hover = await page.evaluate(() => {
  const cell = [...document.querySelectorAll('.hm-panel .hg-weeks .hg-cell')].reverse().find((c) => !c.className.includes('is-0'))
  if (!cell) return null
  cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
  return cell.getAttribute('title')
})
await page.waitForTimeout(250)
wide.captionAfterHover = await page.evaluate(() => document.querySelector('.hm-caption')?.textContent?.replace(/\s+/g, ' ').trim())
wide.hovered = hover
await page.screenshot({ path: path.join(OUT, 'heatmap-panel-hover.png') })

/* ── 3. 失败态 ───────────────────────────────────────── */
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
failNext = true
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForSelector('.hm-card .hm-state', { timeout: 15000 })
const failure = await page.evaluate(() => {
  const box = document.querySelector('.hm-card .hm-state')
  return {
    text: box.querySelector('.hm-state-text')?.textContent?.trim(),
    retryVisible: !!box.querySelector('.hm-retry') && box.querySelector('.hm-retry').getBoundingClientRect().width > 0,
  }
})
await page.locator('.frame').screenshot({ path: path.join(OUT, 'heatmap-error.png') })
await page.click('.hm-card .hm-retry')
await page.waitForSelector('.hm-card .hg-cell', { state: 'attached', timeout: 15000 })
failure.recovered = await page.locator('.hm-card .hg-cell').first().isVisible()

/* ── 4. 窄屏 ─────────────────────────────────────────── */
await page.locator('.frame').click()
await page.waitForSelector('.hm-panel', { timeout: 15000 })
await page.setViewportSize({ width: 760, height: 900 })
await page.waitForTimeout(500)
const narrow = {
  panelWidth: await page.evaluate(() => Math.round(document.querySelector('.hm-panel').getBoundingClientRect().width)),
  direction: await page.evaluate(() => getComputedStyle(document.querySelector('.hm-panel .hm-body')).flexDirection),
  sideWidth: await page.evaluate(() => Math.round(document.querySelector('.hm-side').getBoundingClientRect().width)),
}
await page.screenshot({ path: path.join(OUT, 'heatmap-panel-narrow.png') })

await browser.close()
server.close()

const bad = Object.entries(sizeShots).filter(([, s]) => s.clipped || s.overflow.length)
const badSmall = Object.entries(small).filter(([, s]) => s.clipped || s.clippedText.length)
console.log(JSON.stringify({
  sizes: sizeShots,
  small,
  bloom,
  wide,
  failure,
  narrow,
  overflowCount: bad.length + badSmall.length,
  errorCount: errors.length,
  errors: [...new Set(errors)].slice(0, 4),
}, null, 2))
