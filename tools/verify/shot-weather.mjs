/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 天气卡 + 天气详情（WeatherPanel）复核
 *
 * 断言：
 *   1. 五个尺寸下内容不溢出（scrollHeight/clientHeight，容差 1px；再查子元素是否越出卡片）
 *   2. 真桌面尺寸（6 张卡、单格 ~76px）下再跑一遍：4x2 只有 ~316×152，多日列不许重叠
 *   3. 详情左右两段的实际宽度、右侧栏宽、<720px 是否变上下布局
 *   4. 搜「上海」的结果条数、点击后地点数 +1、切换后卡片标题变化
 *   5. 失败态：占位 + 「重试」按钮（点了能恢复）
 *
 * 接口：页面里的跨域请求走 /api/network/forwardProxy，这里用 Node 直连上游代答，
 * 所以跑这个脚本需要能访问 open-meteo（真机里由思源内核代取）。
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

const theme = process.argv[2] === 'dark' ? 'dark' : 'light'
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))

/* ── 内核转发替身：页面 → 这里 → 上游 ──────────────────── */
let failForecast = false
let proxyCalls = 0
await page.route('**/api/network/forwardProxy', async (route) => {
  const req = JSON.parse(route.request().postData() || '{}')
  const target = String(req.url || '')
  proxyCalls += 1
  if (failForecast && target.includes('api.open-meteo.com')) {
    failForecast = false
    // 复刻思源内核真实失败形状（code 8 + Go 的 TLS 错误串），验证卡片只显示一句人话
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 8, msg: `forward request failed: Get "${target}": net/http: TLS handshake timeout`, data: null }),
    })
    return
  }
  try {
    const r = await fetch(target, { headers: { 'user-agent': 'desk-cards-verify' } })
    const body = await r.text()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, msg: '', data: { body, contentType: r.headers.get('content-type') || 'application/json' } }) })
  } catch (e) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: -1, msg: String(e) }) })
  }
})

const seed = (size) => page.evaluate((s) => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'wx', cardId: 'weather', size: s }] }))
}, size)

const open = async () => {
  await page.goto(`http://127.0.0.1:${port}/index.html?theme=${theme}`, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
}

const boxOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top) }
}, sel)

/* ── 1. 五个尺寸（单格 180）：内容不溢出 ──────────────── */
const sizes = ['1x1', '2x1', '2x2', '4x2', '2x4']
const sizeShots = {}

await open()
await seed('2x2')

for (const size of sizes) {
  await seed(size)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForSelector('.wx-card .wx-temp', { timeout: 40000 })
  await page.waitForTimeout(250)

  await page.locator('.frame').screenshot({ path: path.join(OUT, `weather-${size}.png`) })

  sizeShots[size] = await page.evaluate(() => {
    const card = document.querySelector('.wx-card')
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
      size: card.querySelector('.wx-body').className.replace('wx-body is-', ''),
      box: { w: round(cb.width), h: round(cb.height) },
      scroll: { sh: card.scrollHeight, ch: card.clientHeight, sw: card.scrollWidth, cw: card.clientWidth },
      overflow,
      clipped: card.scrollHeight - card.clientHeight > 1 || card.scrollWidth - card.clientWidth > 1,
      font: getComputedStyle(card.querySelector('.wx-temp')).fontSize,
      text: card.textContent.replace(/\s+/g, ' ').trim(),
      days: card.querySelectorAll('.wx-day').length,
    }
  })
}

/* ── 2. 真桌面尺寸（6 张卡 → 单格 ~76px）：按实际像素降档 ── */
const SMALL_DESK = (size) => ({
  cards: [
    { uid: 'a', cardId: 'yiyan', size: '2x2' },
    { uid: 'b', cardId: 'english', size: '2x2' },
    { uid: 'c', cardId: 'clock', size: '2x2' },
    { uid: 'd', cardId: 'shici', size: '4x2' },
    { uid: 'e', cardId: 'calendar', size: '4x2' },
    { uid: 'w', cardId: 'weather', size },
  ],
})
const small = {}
await page.setViewportSize({ width: 1440, height: 900 })
for (const size of sizes) {
  await page.evaluate((d) => localStorage.setItem('desk-cards:desk', JSON.stringify(d)), SMALL_DESK(size))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForSelector('.wx-card .wx-temp', { timeout: 40000 })
  await page.waitForTimeout(300)

  await page.locator('.frame:has(.wx-card)').screenshot({ path: path.join(OUT, `weather-small-${size}.png`) })
  small[size] = await page.evaluate(() => {
    const card = document.querySelector('.wx-card')
    const body = card.querySelector('.wx-body')
    const cb = card.getBoundingClientRect()
    const round = Math.round
    const days = [...card.querySelectorAll('.wx-day')].filter((el) => el.getBoundingClientRect().width > 0)
    const overlaps = []
    for (let i = 1; i < days.length; i += 1) {
      const a = days[i - 1].getBoundingClientRect()
      const b = days[i].getBoundingClientRect()
      // 横竖两种排法都要判：只在 x/y 都相交时才算重叠（竖版列表是整行，x 必然相交）
      if (a.right - b.left > 1 && b.right - a.left > 1 && a.bottom - b.top > 1 && b.bottom - a.top > 1) overlaps.push(i)
    }
    const clippedText = [...card.querySelectorAll('.wx-place, .wx-temp, .wx-desc, .wx-meta, .wx-range, .wx-day-temp')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.className)
    return {
      box: { w: round(cb.width), h: round(cb.height) },
      scroll: { sh: body.scrollHeight, ch: body.clientHeight, sw: body.scrollWidth, cw: body.clientWidth },
      clipped: body.scrollHeight - body.clientHeight > 1 || body.scrollWidth - body.clientWidth > 1,
      visibleDays: days.length,
      overlaps,
      clippedText,
      text: card.textContent.replace(/\s+/g, ' ').trim(),
    }
  })
}
await page.evaluate(() => localStorage.removeItem('desk-cards:desk'))

/* ── 3. 失败态：占位 + 重试（不白屏、不静默）──────────── */
await seed('2x2')
failForecast = true
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForSelector('.wx-card .wx-state', { timeout: 20000 })
const failure = await page.evaluate(() => {
  const box = document.querySelector('.wx-card .wx-state')
  return {
    text: box.querySelector('.wx-state-text').textContent.trim(),
    retryVisible: !!box.querySelector('.wx-retry') && box.querySelector('.wx-retry').getBoundingClientRect().width > 0,
  }
})
await page.locator('.frame').screenshot({ path: path.join(OUT, 'weather-error.png') })
await page.click('.wx-card .wx-retry')
await page.waitForSelector('.wx-card .wx-temp', { timeout: 40000 })
failure.recovered = await page.locator('.wx-card .wx-temp').isVisible()

/* ── 4. 详情：两段宽度 + 右栏 240px ───────────────────── */
await page.locator('.frame').click()
await page.waitForSelector('.wx-panel .wx-main-temp', { timeout: 40000 })
await page.waitForTimeout(400)

const wide = {
  sheet: await boxOf('.desk-sheet'),
  panel: await boxOf('.wx-panel'),
  main: await boxOf('.wx-main'),
  places: await boxOf('.wx-places'),
  direction: await page.evaluate(() => getComputedStyle(document.querySelector('.wx-panel-inner')).flexDirection),
  railBg: await page.evaluate(() => getComputedStyle(document.querySelector('.wx-places')).backgroundColor),
  panelSky: await page.evaluate(() => getComputedStyle(document.querySelector('.wx-panel')).backgroundImage.slice(0, 46)),
  blocks: await page.evaluate(() => document.querySelectorAll('.wx-panel .wx-block').length),
  hours: await page.evaluate(() => document.querySelectorAll('.wx-panel .wx-hour').length),
  days: await page.evaluate(() => document.querySelectorAll('.wx-main-day').length),
}
await page.screenshot({ path: path.join(OUT, 'weather-panel.png') })

/* ── 5. 搜索「上海」→ 加入 → 切换 → 卡片标题变化 ──────── */
const cardTitleBefore = await page.evaluate(() => document.querySelector('.wx-place')?.textContent?.trim())
const locsBefore = await page.evaluate(() => document.querySelectorAll('.wx-places .wx-loc').length)

await page.fill('.wx-search', '上海')
await page.waitForSelector('.wx-places .wx-hit', { timeout: 20000 })
await page.waitForTimeout(300)
const hits = await page.evaluate(() => [...document.querySelectorAll('.wx-places .wx-hit')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()))
await page.screenshot({ path: path.join(OUT, 'weather-search.png') })

await page.locator('.wx-places .wx-hit').first().click()
await page.waitForTimeout(600)
const afterAdd = await page.evaluate(() => ({
  locs: document.querySelectorAll('.wx-places .wx-loc').length,
  active: document.querySelector('.wx-places .wx-loc.is-active')?.textContent?.replace(/\s+/g, ' ').trim(),
  input: document.querySelector('.wx-search').value,
  panelPlace: document.querySelector('.wx-main-place')?.textContent?.replace(/\s+/g, ' ').trim(),
}))
await page.screenshot({ path: path.join(OUT, 'weather-panel-added.png') })

await page.locator('.wx-places .wx-loc', { hasText: '北京' }).click()
await page.waitForTimeout(600)
const switched = await page.evaluate(() => ({
  active: document.querySelector('.wx-places .wx-loc.is-active')?.textContent?.replace(/\s+/g, ' ').trim(),
  panelPlace: document.querySelector('.wx-main-place')?.textContent?.replace(/\s+/g, ' ').trim(),
}))

await page.locator('.wx-places .wx-loc', { hasText: '上海' }).click()
await page.waitForTimeout(500)
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
const cardTitleAfter = await page.evaluate(() => document.querySelector('.wx-place')?.textContent?.trim())

/* ── 6. 窄屏（<720px）：上下两段 + 「管理地点」─────────── */
await page.setViewportSize({ width: 700, height: 900 })
await page.waitForTimeout(400)
await page.locator('.frame').click()
await page.waitForSelector('.wx-panel .wx-main-temp', { timeout: 40000 })
await page.waitForTimeout(400)

const narrow = {
  sheet: await boxOf('.desk-sheet'),
  panel: await boxOf('.wx-panel'),
  direction: await page.evaluate(() => getComputedStyle(document.querySelector('.wx-panel-inner')).flexDirection),
  manageVisible: await page.evaluate(() => {
    const btn = document.querySelector('.wx-manage')
    return !!btn && getComputedStyle(btn).display !== 'none' && btn.getBoundingClientRect().width > 0
  }),
  placesHidden: await page.evaluate(() => getComputedStyle(document.querySelector('.wx-places')).display === 'none'),
}
await page.screenshot({ path: path.join(OUT, 'weather-panel-narrow.png') })

await page.locator('.wx-manage').click()
await page.waitForTimeout(400)
narrow.mainAfterToggle = await boxOf('.wx-main')
narrow.placesAfterToggle = await boxOf('.wx-places')
narrow.stacked = !!(narrow.mainAfterToggle && narrow.placesAfterToggle
  && narrow.placesAfterToggle.t >= narrow.mainAfterToggle.t + narrow.mainAfterToggle.h - 1)
await page.screenshot({ path: path.join(OUT, 'weather-panel-narrow-places.png') })

await page.keyboard.press('Escape')
await browser.close()
server.close()

const overflowAny = Object.values(sizeShots).filter((s) => s.clipped || s.overflow.length)
const smallBad = Object.entries(small).filter(([, s]) => s.clipped || s.overlaps.length || s.clippedText.length)
console.log(JSON.stringify({
  theme,
  sizes: sizeShots,
  small,
  failure,
  wide,
  search: { cardTitleBefore, locsBefore, hits: hits.length, hitsSample: hits.slice(0, 3), afterAdd, switched, cardTitleAfter },
  narrow,
  overflowCount: overflowAny.length + smallBad.length,
  proxyCalls,
  errorCount: errors.length,
  errors: [...new Set(errors)].slice(0, 3),
}, null, 2))
