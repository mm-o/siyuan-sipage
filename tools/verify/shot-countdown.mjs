/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 倒数日：卡片五档尺寸 + 三栏详情（分类 / 列表 / 详情 + 编辑表单）
 *
 * 断言：
 *   1. 五档尺寸内容不溢出（scrollHeight/clientHeight，容差 1px；再查子元素是否越出卡片）
 *   2. 详情三栏宽度（200 / 自适应 / 300）、页面留白 8 / 栏间距 8、圆角 20
 *   3. 新建 → 列表 +1、分类计数 +1、详情显示大数字；切分类 / 切时间段 / 切单位 / 置顶 / 删除
 *   4. 窄屏（<760 容器）分类收进胶囊、详情盖在列表上、可返回
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
await page.route('**/appearance/covers/**', async (route) => {
  const tail = route.request().url().split('/appearance/covers/')[1]
  try {
    const r = await fetch(`http://127.0.0.1:6806/appearance/covers/${tail}`)
    route.fulfill({ status: r.status, contentType: tail.endsWith('.json') ? 'application/json' : 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
  } catch { route.fulfill({ status: 404, body: '' }) }
})

const today = new Date()
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const offset = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return iso(d) }

/** 卡片用**默认内容**截图（不写 countdown 键，走 store 里现算的春节/中秋/国庆/元旦） */
const seed = async (size) => {
  await page.evaluate((s) => {
    localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'cd', cardId: 'countdown', size: s }] }))
    localStorage.removeItem('desk-cards:countdown')
  }, size)
}

const open = async () => {
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForTimeout(900)
}

const boxOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top), radius: cs.borderRadius, bg: cs.backgroundColor }
}, sel)

/* ── 1. 卡片五档尺寸 ─────────────────────────────────── */
const sizes = ['1x1', '2x1', '2x2', '4x2', '2x4']
const sizeShots = {}
await open()

for (const size of sizes) {
  await seed(size)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForSelector('.cd-card .cd-hero', { timeout: 15000 })
  await page.waitForTimeout(250)
  await page.locator('.frame').screenshot({ path: path.join(OUT, `countdown-${size}.png`) })
  sizeShots[size] = await page.evaluate(() => {
    const card = document.querySelector('.cd-card')
    const body = card.querySelector('.cd-body')
    const cb = card.getBoundingClientRect()
    const round = Math.round
    const overflow = []
    for (const el of card.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width && !r.height) continue
      const out = round(Math.max(0, cb.top - r.top, r.bottom - cb.bottom, cb.left - r.left, r.right - cb.right))
      if (out > 1) overflow.push(`${el.className}:${out}`)
    }
    return {
      box: { w: round(cb.width), h: round(cb.height) },
      scroll: { sh: body.scrollHeight, ch: body.clientHeight, sw: body.scrollWidth, cw: body.clientWidth },
      clipped: body.scrollHeight - body.clientHeight > 1 || body.scrollWidth - body.clientWidth > 1,
      overflow,
      rows: card.querySelectorAll('.cd-row').length,
      text: card.textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
    }
  })
}

/* ── 2. 真桌面尺寸（6 张卡 → 单格 ~76px，2x2 只有 152×152）：多日列表要按像素降档 ── */
const SMALL_DESK = (size) => ({
  cards: [
    { uid: 'a', cardId: 'yiyan', size: '2x2' },
    { uid: 'b', cardId: 'english', size: '2x2' },
    { uid: 'c', cardId: 'clock', size: '2x2' },
    { uid: 'd', cardId: 'shici', size: '4x2' },
    { uid: 'e', cardId: 'calendar', size: '4x2' },
    { uid: 'w', cardId: 'countdown', size },
  ],
})
const small = {}
await page.setViewportSize({ width: 1440, height: 900 })
for (const size of sizes) {
  await page.evaluate((d) => {
    localStorage.setItem('desk-cards:desk', JSON.stringify(d))
    localStorage.removeItem('desk-cards:countdown')
  }, SMALL_DESK(size))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForSelector('.cd-card .cd-hero', { timeout: 15000 })
  await page.waitForTimeout(250)
  await page.locator('.frame:has(.cd-card)').screenshot({ path: path.join(OUT, `countdown-small-${size}.png`) })
  small[size] = await page.evaluate(() => {
    const card = document.querySelector('.cd-card')
    const body = card.querySelector('.cd-body')
    const cb = card.getBoundingClientRect()
    const round = Math.round
    const rows = [...card.querySelectorAll('.cd-row')].filter((el) => el.getBoundingClientRect().width > 0).length
    const clipped = [...card.querySelectorAll('.cd-hero-title, .cd-hero-days, .cd-hero-date, .cd-row-title, .cd-row-date')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.className)
    return {
      box: { w: round(cb.width), h: round(cb.height) },
      scroll: { sh: body.scrollHeight, ch: body.clientHeight },
      clipped: body.scrollHeight - body.clientHeight > 1,
      rows,
      clippedText: clipped,
    }
  })
}
await page.evaluate(() => localStorage.removeItem('desk-cards:desk'))

/* ── 3. 三栏详情 ─────────────────────────────────────── */
await seed('2x2')
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForSelector('.cd-card .cd-hero', { timeout: 15000 })
await page.locator('.frame').click()
await page.waitForSelector('.cd-panel', { timeout: 15000 })
await page.waitForTimeout(500)

const wide = {
  sheet: await boxOf('.desk-sheet'),
  panel: await boxOf('.cd-panel'),
  aside: await boxOf('.cd-aside'),
  list: await boxOf('.cd-list'),
  detail: await boxOf('.cd-detail'),
  items: await page.evaluate(() => document.querySelectorAll('.cd-list .cd-item').length),
  navCounts: await page.evaluate(() => [...document.querySelectorAll('.cd-nav-btn')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())),
  listTitles: await page.evaluate(() => [...document.querySelectorAll('.cd-list .cd-item')].map((li) => li.textContent.replace(/\s+/g, ' ').trim())),
  detailDays: await page.evaluate(() => document.querySelector('.cd-detail-days')?.textContent?.replace(/\s+/g, ' ').trim()),
  detailMeta: await page.evaluate(() => [...document.querySelectorAll('.cd-meta-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim())),
}
await page.screenshot({ path: path.join(OUT, 'countdown-panel.png') })

/* 新建两条（一条未来「目标」、一条过去「生活」，过去那条用来验已过去筛选） */
const createEvent = async (title, date, categoryName) => {
  await page.evaluate(() => document.querySelector('.cd-primary')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.waitForSelector('.cd-form', { timeout: 5000 })
  await page.fill('.cd-form .desk-input', title)
  await page.evaluate((d) => {
    const date = document.querySelector('.cd-form input[type="date"]')
    date.value = d
    date.dispatchEvent(new Event('input', { bubbles: true }))
  }, date)
  await page.evaluate((c) => {
    const chip = [...document.querySelectorAll('.cd-form .cd-chip')].find((x) => x.textContent.includes(c))
    chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, categoryName)
  await page.waitForTimeout(200)
}

await createEvent('敦煌旅行', '2027-05-01', '目标')
await page.screenshot({ path: path.join(OUT, 'countdown-form.png') })
await page.evaluate(() => document.querySelector('.cd-btn--primary[type="submit"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(500)

const afterCreate = {
  items: await page.evaluate(() => document.querySelectorAll('.cd-list .cd-item').length),
  countAll: await page.evaluate(() => [...document.querySelectorAll('.cd-nav-btn')].find((b) => b.textContent.includes('全部分类'))?.textContent.replace(/\s+/g, ' ').trim()),
  countGoal: await page.evaluate(() => [...document.querySelectorAll('.cd-nav-btn')].find((b) => b.textContent.includes('目标'))?.textContent.replace(/\s+/g, ' ').trim()),
  title: await page.evaluate(() => document.querySelector('.cd-detail-title')?.textContent?.replace(/\s+/g, ' ').trim()),
}
await page.screenshot({ path: path.join(OUT, 'countdown-panel-added.png') })

await createEvent('旅行出发', offset(-12), '生活')
await page.evaluate(() => document.querySelector('.cd-btn--primary[type="submit"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(500)

/* 切分类 / 切时间段 / 切单位 / 置顶 / 农历开关 */
const filters = {}
await page.evaluate(() => [...document.querySelectorAll('.cd-nav-btn')].find((b) => b.textContent.includes('节日'))?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(300)
filters.byCategoryHoliday = await page.evaluate(() => document.querySelectorAll('.cd-list .cd-item').length)

await page.evaluate(() => [...document.querySelectorAll('.cd-nav-btn')].find((b) => b.textContent.includes('全部分类'))?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(200)
await page.evaluate(() => [...document.querySelectorAll('.cd-time-tabs .seg-item')].find((b) => b.textContent.trim() === '已过去')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(300)
filters.past = await page.evaluate(() => document.querySelectorAll('.cd-list .cd-item').length)
await page.evaluate(() => [...document.querySelectorAll('.cd-time-tabs .seg-item')].find((b) => b.textContent.trim() === '全部')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(300)

filters.units = {}
for (const label of ['周', '月', '年', '日']) {
  await page.evaluate((l) => {
    const btn = [...document.querySelectorAll('.cd-unit-tabs .seg-item')].find((b) => b.textContent.trim() === l)
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, label)
  await page.waitForTimeout(200)
  filters.units[label] = await page.evaluate(() => document.querySelector('.cd-detail-days')?.textContent?.replace(/\s+/g, ' ').trim())
}

const pinnedBefore = await page.evaluate(() => document.querySelector('.cd-meta-row .cd-switch')?.getAttribute('aria-checked'))
await page.evaluate(() => [...document.querySelectorAll('.cd-meta-row')].find((r) => r.textContent.includes('置顶'))?.querySelector('.cd-switch')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(300)
const pinnedAfter = await page.evaluate(() => [...document.querySelectorAll('.cd-meta-row')].find((r) => r.textContent.includes('置顶'))?.querySelector('.cd-switch')?.getAttribute('aria-checked'))

/* 农历开关：编辑春节（每年 + 农历），表单里应出现「按农历」且是开的 */
await page.evaluate(() => [...document.querySelectorAll('.cd-nav-btn')].find((b) => b.textContent.includes('节日'))?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(250)
await page.evaluate(() => [...document.querySelectorAll('.cd-list .cd-item')].find((li) => li.textContent.includes('春节'))?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(250)
await page.evaluate(() => document.querySelector('.cd-btn--primary.cd-btn--grow')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(350)
filters.lunar = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.cd-form .cd-field-row')].find((r) => r.textContent.includes('按农历'))
  return {
    visible: !!row,
    on: row?.querySelector('.cd-switch')?.getAttribute('aria-checked'),
    repeat: document.querySelector('.cd-form .seg-item.active')?.textContent?.trim(),
  }
})
await page.screenshot({ path: path.join(OUT, 'countdown-form-lunar.png') })
await page.evaluate(() => [...document.querySelectorAll('.cd-form .cd-btn')].find((b) => b.textContent.trim() === '取消')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(300)

/* 删除当前事件 */
const beforeDelete = await page.evaluate(() => document.querySelectorAll('.cd-list .cd-item').length)
await page.evaluate(() => document.querySelector('.cd-btn--danger')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(400)
const afterDelete = await page.evaluate(() => document.querySelectorAll('.cd-list .cd-item').length)

/* ── 3. 窄屏：分类收进胶囊、详情盖层 ───────────────────── */
await page.setViewportSize({ width: 760, height: 900 })
await page.waitForTimeout(400)
const narrow = {
  panelWidth: await page.evaluate(() => Math.round(document.querySelector('.cd-panel').getBoundingClientRect().width)),
  asideHidden: await page.evaluate(() => getComputedStyle(document.querySelector('.cd-aside')).display === 'none'),
  chipsShown: await page.evaluate(() => getComputedStyle(document.querySelector('.cd-cat-chips')).display !== 'none'),
  detailShownOnEnter: await page.evaluate(() => getComputedStyle(document.querySelector('.cd-detail')).display !== 'none'),
}
/* 先返回列表，再看「点一条 → 详情盖上来 → 返回」 */
await page.evaluate(() => document.querySelector('.cd-detail-back')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(350)
narrow.detailHiddenAfterBack = await page.evaluate(() => getComputedStyle(document.querySelector('.cd-detail')).display === 'none')
await page.screenshot({ path: path.join(OUT, 'countdown-panel-narrow.png') })

await page.evaluate(() => document.querySelector('.cd-list .cd-item')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(400)
narrow.detailShownAfterSelect = await page.evaluate(() => getComputedStyle(document.querySelector('.cd-detail')).display !== 'none')
await page.screenshot({ path: path.join(OUT, 'countdown-panel-narrow-detail.png') })

await page.evaluate(() => document.querySelector('.cd-detail-back')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await page.waitForTimeout(300)
narrow.backTo = await page.evaluate(() => getComputedStyle(document.querySelector('.cd-detail')).display === 'none')

await browser.close()
server.close()

const bad = Object.entries(sizeShots).filter(([, s]) => s.clipped || s.overflow.length)
const badSmall = Object.entries(small).filter(([, s]) => s.clipped || s.clippedText.length)
console.log(JSON.stringify({
  sizes: sizeShots,
  small,
  wide,
  afterCreate,
  filters: { ...filters, pinnedBefore, pinnedAfter, beforeDelete, afterDelete },
  narrow,
  overflowCount: bad.length + badSmall.length,
  errorCount: errors.length,
  errors: [...new Set(errors)].slice(0, 4),
}, null, 2))
