/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 两条反馈的实证：
 *   A. 卡片与详情是否**同一份内容 + 同一张背景**（一言 / 英语 / 诗词）
 *   B. 翻页数字：牌上下都圆角、两半数字层对齐、翻页中间帧不重叠
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
for (const host of ['base.desk.link', 'files.desk.link']) {
  await page.route(`**/${host}/**`, async (route) => {
    try {
      const r = await fetch(route.request().url())
      route.fulfill({ status: r.status, contentType: r.headers.get('content-type') || 'image/webp', body: Buffer.from(await r.arrayBuffer()) })
    } catch { route.fulfill({ status: 502, body: '{}' }) }
  })
}

await page.goto(`http://127.0.0.1:${port}/index.html?theme=light`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({
    cards: [
      { uid: 'y', cardId: 'yiyan', size: '2x2' },
      { uid: 'e', cardId: 'english', size: '2x2' },
      { uid: 's', cardId: 'shici', size: '2x2' },
    ],
  }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(2600)
await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, 'docs-v21-cards-2x2.png') })

const readCard = (sel) => page.evaluate((s) => {
  const root = document.querySelector(s)
  const photo = root?.querySelector('.desk-photo')
  const body = root?.querySelector('.desk-photo-body')
  return {
    bg: (photo && getComputedStyle(photo).backgroundImage) || '',
    text: (body?.textContent || '').replace(/\s+/g, ' ').trim(),
    box: (() => { const r = body?.getBoundingClientRect(); return r ? { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) } : null })(),
  }
}, sel)

const result = {}
const pairs = [['yiyan', '.yiyan'], ['english', '.en'], ['shici', '.shici']]

for (const [key, sel] of pairs) {
  const card = await readCard(sel)
  // 打开详情
  await page.evaluate((s) => {
    const f = [...document.querySelectorAll('.frame')].find((x) => x.querySelector(s))
    f?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, sel)
  await page.waitForTimeout(1200)
  const detail = await page.evaluate(() => {
    const sheet = document.querySelector('.desk-sheet')
    const photo = sheet?.querySelector('.desk-photo')
    const panel = sheet?.querySelector('.desk-detail-panel')
    return {
      bg: (photo && getComputedStyle(photo).backgroundImage) || '',
      text: (panel?.textContent || '').replace(/\s+/g, ' ').trim(),
      hasDate: /\d{4}[-.]\d{1,2}[-.]\d{1,2}/.test(panel?.textContent || ''),
    }
  })
  await page.locator('.desk-sheet').screenshot({ path: path.join(OUT, `docs-v21-detail-${key}.png`) })
  result[key] = {
    sameBg: card.bg === detail.bg,
    bgTail: card.bg.slice(-60),
    cardText: card.text.slice(0, 40),
    detailText: detail.text.slice(0, 40),
    detailShowsDate: detail.hasDate,
    detailContainsCardText: detail.text.includes(card.text.slice(0, 12)),
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
}

// ── A2. 详情里的「上一条 / 下一条」：内容必须真的变，且能回到原处 ──
const nav = {}
const sheetText = () => page.evaluate(() =>
  (document.querySelector('.desk-sheet .desk-detail-panel')?.textContent || '').replace(/\s+/g, ' ').trim())
const clickNav = (dir) => page.evaluate((d) => {
  const btn = [...document.querySelectorAll('.desk-sheet .gb')]
    .find((b) => (b.getAttribute('aria-label') || '').includes(d))
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return !!btn
}, dir)

for (const [key, sel] of pairs) {
  await page.evaluate((s) => {
    const f = [...document.querySelectorAll('.frame')].find((x) => x.querySelector(s))
    f?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, sel)
  await page.waitForTimeout(1300)
  const first = await sheetText()
  const hasNext = await clickNav('下一')
  await page.waitForTimeout(1300)
  const next = await sheetText()
  await clickNav('上一')
  await page.waitForTimeout(1300)
  const back = await sheetText()
  nav[key] = {
    hasNext,
    changedOnNext: first !== next && !!next,
    backToFirst: back === first,
    first: first.slice(0, 24),
    next: next.slice(0, 24),
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
}

// ── A3. 背景：跟着内容切换、可手动换、卡片与详情始终同一张 ──
const bg = {}
const sheetBg = () => page.evaluate(() =>
  getComputedStyle(document.querySelector('.desk-sheet .desk-photo')).backgroundImage)
const cardBg = (sel) => page.evaluate((s) => {
  const el = document.querySelector(`${s} .desk-photo`)
  return el ? getComputedStyle(el).backgroundImage : ''
}, sel)
const clickShuffle = () => page.evaluate(() => {
  const btn = [...document.querySelectorAll('.desk-sheet .gb')]
    .find((b) => (b.getAttribute('aria-label') || '').includes('换一张背景'))
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return !!btn
})

for (const [key, sel] of pairs) {
  const cardBefore = await cardBg(sel)
  await page.evaluate((s) => {
    const f = [...document.querySelectorAll('.frame')].find((x) => x.querySelector(s))
    f?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, sel)
  await page.waitForTimeout(1400)
  const detail0 = await sheetBg()
  await clickNav('下一')
  await page.waitForTimeout(1400)
  const detail1 = await sheetBg()
  const hasShuffle = await clickShuffle()
  await page.waitForTimeout(900)
  const detail2 = await sheetBg()
  bg[key] = {
    // 卡片与详情同源
    sameAsCard: cardBefore === detail0,
    // 翻页时背景跟着换
    changedOnNext: detail0 !== detail1,
    // 手动换背景生效
    hasShuffle,
    changedOnShuffle: detail1 !== detail2,
    // 三张卡都用思源本地题头图（不是远端图床）
    localCover: /appearance\/covers\/cover_\d+\.webp/.test(detail2),
    sample: detail2.slice(-46),
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)
  // 关掉详情后，卡片背景应等于详情里最后那张
  const cardAfter = await cardBg(sel)
  bg[key].cardFollowsDetail = cardAfter === detail2
}

// ── B. 翻页牌 ────────────────────────────────────────────
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 'c', cardId: 'clock', size: '4x2' }] }))
  // 放大单格，让翻页牌的折叠过程在截图里看得清
  localStorage.setItem('desk-cards:appearance', JSON.stringify({ radius: 18, blur: 24, opacity: 0.62, shadow: 0.34, lift: 2, gap: 12, cell: 240 }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(2000)

const frame = page.locator('.frame:has(.clock)')
await frame.screenshot({ path: path.join(OUT, 'docs-v21-clock-static.png') })

const geom = await page.evaluate(() => {
  const tile = document.querySelector('.flip')
  const up = tile.querySelector('.up')
  const down = tile.querySelector('.down')
  const upInn = up.querySelector('.inn')
  const downInn = down.querySelector('.inn')
  const b = (el) => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) } }
  const cs = getComputedStyle(tile)
  const innCs = getComputedStyle(upInn)
  return {
    tile: b(tile),
    radius: cs.borderRadius,
    items: tile.querySelectorAll('.item').length,
    seamHeight: getComputedStyle(up, '::after').height,
    upInnCenterY: Math.round((b(upInn).t + b(upInn).b) / 2),
    downInnCenterY: Math.round((b(downInn).t + b(downInn).b) / 2),
    tileCenterY: Math.round((b(tile).t + b(tile).b) / 2),
    innHeight: innCs.height,
    fontSize: innCs.fontSize,
    downInn: b(downInn),
    up: b(up),
    down: b(down),
  }
})

// 翻页中间帧：把动画放慢 8 倍（CDP），再抓折叠过程的三帧
const cdp = await page.context().newCDPSession(page)
await cdp.send('Animation.enable')
await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.25 })

// 翻页中间帧：只把动画时长放慢（几何完全不变），用来截「折叠中」的画面
await page.addStyleTag({
  content: `
    .flip.play .item.before .up { animation-duration: 6s !important; }
    .flip.play .item.active .down { animation-duration: 6s !important; animation-delay: 0.4s !important; }
    .flip.play .item.active { animation: none !important; z-index: 4 !important; }
  `,
})

await page.waitForFunction(() => !!document.querySelector('.flip.play'), null, { polling: 10, timeout: 8000 })
const flipping = page.locator('.flip.play').first()
await flipping.screenshot({ path: path.join(OUT, 'docs-v21-flip-1.png') })
await page.waitForTimeout(1200)
await flipping.screenshot({ path: path.join(OUT, 'docs-v21-flip-2.png') })
await page.waitForTimeout(1200)
await flipping.screenshot({ path: path.join(OUT, 'docs-v21-flip-3.png') })
await page.waitForTimeout(1200)
await flipping.screenshot({ path: path.join(OUT, 'docs-v21-flip-4.png') })
const mid = await page.evaluate(() => {
  const el = document.querySelector('.flip.play')
  return {
    playing: !!el,
    items: el?.querySelectorAll('.item').length || 0,
    beforeUpTransform: el ? getComputedStyle(el.querySelector('.item.before .up')).transform : null,
    activeDownTransform: el ? getComputedStyle(el.querySelector('.item.active .down')).transform : null,
  }
})
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })

await browser.close()
server.close()
console.log(JSON.stringify({ result, nav, bg, geom, mid, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
