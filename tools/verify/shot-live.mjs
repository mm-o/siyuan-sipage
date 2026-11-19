/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机验证（真实思源 127.0.0.1:6806，一次跑完三件事）：
 *   1. 顶栏插件图标是线性描边（思源全局 svg{fill:currentColor} 不会把它填实）
 *   2. 打开详情：卡片与详情是同一张背景、同一句话；动作按钮全部 fill:none
 *   3. 诗词详情标签（全文/译文/注释）未选中态看得清
 *
 * 第 3 步刻意做成「加卡片 → 截图 → 移除卡片」，跑完桌面恢复原样。
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const OUT = path.resolve(import.meta.dirname, '../../docs/screens')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const TOKEN = 'bct45z7gltevi22s'

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))

await page.goto(`http://127.0.0.1:6806/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5500)
// 思源自己的「仅支持 Chrome」提示条会盖住右上角，先关掉
await page.evaluate(() => document.querySelector('#message')?.remove())

const clickTopBar = async () => {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('#toolbar .b3-tooltips, .toolbar__item')]
      .find((x) => /参考实现/i.test(x.getAttribute('aria-label') || x.getAttribute('title') || ''))
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(2500)
}
const openLibrary = async () => {
  await page.evaluate(() => {
    document.querySelector('#message')?.remove()
    document.querySelector('.desk-hero-tools')?.dispatchEvent(new MouseEvent('mouseenter'))
  })
  await page.waitForTimeout(250)
  await page.evaluate(() => {
    document.querySelector('.desk-hero-action[aria-label="添加卡片"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(900)
}
const clickRow = (name, label) => page.evaluate(([n, l]) => {
  const row = [...document.querySelectorAll('.desk-sheet .row')]
    .find((r) => (r.querySelector('.row-main strong')?.textContent || '').trim() === n)
  const btn = [...(row?.querySelectorAll('.desk-btn') || [])].find((b) => b.textContent.trim() === l)
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return !!btn
}, [name, label])
const closeSheet = async () => {
  await page.evaluate(() => {
    document.querySelector('.desk-sheet-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(500)
}
const openCard = async (selector) => {
  await page.evaluate((sel) => {
    const frame = sel
      ? [...document.querySelectorAll('.desk-root .frame')].find((f) => f.querySelector(sel))
      : document.querySelector('.desk-root .frame')
    frame?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, selector)
  await page.waitForTimeout(1500)
}

await clickTopBar()
const out = {}

// ── 1. 顶栏图标 ──────────────────────────────────────────
out.icon = await page.evaluate(() => {
  const el = [...document.querySelectorAll('#toolbar [aria-label], .toolbar__item')]
    .find((x) => /参考实现/i.test(x.getAttribute('aria-label') || x.getAttribute('title') || ''))
  const svg = el?.querySelector('svg')
  return {
    found: !!svg,
    groupFill: svg?.querySelector('g')?.getAttribute('fill') ?? null,
    groupStroke: svg?.querySelector('g')?.getAttribute('stroke') ?? null,
  }
})
await page.screenshot({ path: path.join(OUT, 'docs-v25-live-topbar.png'), clip: { x: 900, y: 0, width: 540, height: 60 } })

// ── 2. 卡片 ↔ 详情同源 + 动作图标 fill ───────────────────
const card = await page.evaluate(() => {
  const root = document.querySelector('.desk-root .frame .desk-photo-card')
  const photo = root?.querySelector('.desk-photo')
  return {
    bg: photo ? getComputedStyle(photo).backgroundImage : '',
    text: (root?.querySelector('.desk-photo-body')?.textContent || '').replace(/\s+/g, ' ').trim(),
  }
})
await openCard()
const detail = await page.evaluate(() => {
  const sheet = document.querySelector('.desk-sheet')
  const photo = sheet?.querySelector('.desk-photo')
  return {
    bg: photo ? getComputedStyle(photo).backgroundImage : '',
    text: (sheet?.querySelector('.desk-detail-panel')?.textContent || '').replace(/\s+/g, ' ').trim(),
    fab: [...document.querySelectorAll('.desk-sheet .gb svg')].map((s) => ({
      label: s.closest('button')?.getAttribute('aria-label'),
      fill: getComputedStyle(s).fill,
    })),
  }
})
await page.screenshot({ path: path.join(OUT, 'docs-v25-live-detail.png') })
out.sameBg = !!card.bg && card.bg === detail.bg
out.sameText = !!card.text && detail.text.includes(card.text.slice(0, 10))
out.cardText = card.text.slice(0, 24)
out.fabFill = [...new Set(detail.fab.map((f) => f.fill))]

// 背景：翻页跟着换 + 手动「换一张背景」生效
const sheetBg = () => page.evaluate(() => getComputedStyle(document.querySelector('.desk-sheet .desk-photo')).backgroundImage)
const bg0 = await sheetBg()
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.desk-sheet .gb')]
    .find((b) => (b.getAttribute('aria-label') || '').includes('下一'))
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(1500)
const bg1 = await sheetBg()
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.desk-sheet .gb')]
    .find((b) => (b.getAttribute('aria-label') || '').includes('换一张背景'))
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(1000)
const bg2 = await sheetBg()
out.bg = {
  changedOnNext: bg0 !== bg1,
  changedOnShuffle: bg1 !== bg2,
  localCover: /appearance\/covers\/cover_\d+\.webp/.test(bg2),
  sample: bg2.slice(-42),
}
await page.keyboard.press('Escape')
await page.waitForTimeout(700)

// ── 3. 诗词详情标签对比度（加卡片 → 截图 → 移除）─────────
const before = await page.evaluate(() => document.querySelectorAll('.desk-root .frame').length)
await openLibrary()
out.added = await clickRow('每日诗词', '添加')
await closeSheet()
await page.waitForTimeout(1400)
await openCard('.shici')
out.chips = await page.evaluate(() => [...document.querySelectorAll('.desk-sheet .chip')].map((c) => {
  const cs = getComputedStyle(c)
  return { label: c.textContent.trim(), active: c.classList.contains('active'), color: cs.color, background: cs.backgroundColor }
}))
const chipsRow = await page.locator('.desk-sheet .chips').boundingBox()
await page.screenshot({
  path: path.join(OUT, 'docs-v25-live-chips.png'),
  clip: { x: chipsRow.x - 16, y: chipsRow.y - 14, width: chipsRow.width + 32, height: chipsRow.height + 28 },
})

// 真机复核「下一首」：点一下，标题要变；再点「上一首」要回到原处
const titleOf = () => page.evaluate(() => (document.querySelector('.desk-sheet .title')?.textContent || '').trim())
const clickNav = (dir) => page.evaluate((d) => {
  const btn = [...document.querySelectorAll('.desk-sheet .gb')].find((b) => (b.getAttribute('aria-label') || '').includes(d))
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return !!btn
}, dir)
const t0 = await titleOf()
out.hasNext = await clickNav('下一')
await page.waitForTimeout(1500)
const t1 = await titleOf()
await clickNav('上一')
await page.waitForTimeout(1500)
const t2 = await titleOf()
out.nav = { first: t0, next: t1, back: t2, changed: t0 !== t1, backToFirst: t0 === t2 }

await page.keyboard.press('Escape')
await page.waitForTimeout(700)
await openLibrary()
out.removed = await clickRow('每日诗词', '移除')
await closeSheet()
await page.waitForTimeout(1000)
const after = await page.evaluate(() => document.querySelectorAll('.desk-root .frame').length)
out.restored = before === after

await browser.close()
console.log(JSON.stringify({ ...out, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
