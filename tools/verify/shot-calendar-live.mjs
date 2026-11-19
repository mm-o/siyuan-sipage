/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机验证日历卡四种尺寸（真实思源 127.0.0.1:6806）：
 *   加日历卡 → 用卡片库的尺寸标签切 1x1 / 2x2 / 2x4 / 4x2 → 每档截图并量盒 → 开详情 → 移除 → 核对卡片数恢复。
 * 跑完桌面恢复原样；中途失败也会走 finally 里的移除。
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
await page.evaluate(() => document.querySelector('#message')?.remove())

const openDesk = async () => {
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
const clickSize = (name, size) => page.evaluate(([n, s]) => {
  const row = [...document.querySelectorAll('.desk-sheet .row')]
    .find((r) => (r.querySelector('.row-main strong')?.textContent || '').trim() === n)
  const chip = [...(row?.querySelectorAll('.chip') || [])].find((c) => c.textContent.trim() === s)
  chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return !!chip
}, [name, size])
const closeSheet = async () => {
  await page.evaluate(() => {
    document.querySelector('.desk-sheet-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(600)
}
const frameCount = () => page.evaluate(() => document.querySelectorAll('.desk-root .frame').length)
const calFrame = () => page.locator('.desk-root .frame:has(.desk-calendar)').first()

const out = { sizes: {} }
const before = { count: 0, hasCal: false }
let added = false

try {
  await openDesk()
  before.count = await frameCount()
  before.hasCal = await page.evaluate(() => !!document.querySelector('.desk-root .frame .desk-calendar'))

  await openLibrary()
  added = await clickRow('日历', '添加')
  await closeSheet()
  await page.waitForTimeout(1500)
  out.added = added
  out.calPresent = await page.evaluate(() => !!document.querySelector('.desk-root .frame .desk-calendar'))

  for (const size of ['1x1', '2x2', '2x4', '4x2']) {
    await openLibrary()
    out.sizes[size] = { chip: await clickSize('日历', size) }
    await closeSheet()
    await page.waitForTimeout(1200)

    const f = calFrame()
    if (await f.count() === 0) {
      out.sizes[size].missing = true
      continue
    }
    await f.screenshot({ path: path.join(OUT, `cal-live-${size}.png`) })
    out.sizes[size] = {
      ...out.sizes[size],
      ...(await page.evaluate(() => {
        const root = document.querySelector('.desk-root .frame .desk-calendar')
        const fr = root?.closest('.frame')?.getBoundingClientRect()
        const r = root?.getBoundingClientRect()
        const texts = [...(root?.querySelectorAll('.cal-day-num, .cal-day-week, .cal-day-lunar, .cal-side-day, .cal-side-lunar, .cal-side-weak, .cal-month-head') || [])]
        const clipped = texts.filter((t) => {
          const cs = getComputedStyle(t)
          if (cs.overflow !== 'hidden' || cs.textOverflow === 'ellipsis') return false
          return t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1
        })
        return {
          cls: root?.className || '',
          frame: fr ? { w: Math.round(fr.width), h: Math.round(fr.height) } : null,
          card: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
          text: (root?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          clipped: clipped.map((t) => t.className),
        }
      })),
    }
  }

  // 桌面全景：纯色面的日历与旁边的玻璃卡是否协调
  await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, 'cal-live-desk.png') })
  out.deskMaterial = await page.evaluate(() => [...document.querySelectorAll('.desk-root .frame')].map((f) => ({
    card: f.querySelector('[class*="desk-"]')?.className.split(' ')[0] || f.querySelector('.desk-photo-card')?.className.split(' ')[0] || '?',
    solid: f.classList.contains('is-solid'),
    bg: getComputedStyle(f).backgroundColor,
    backdrop: getComputedStyle(f).backdropFilter,
  })))

  // 详情：回到 4x2 再点开
  await openLibrary()
  await clickSize('日历', '4x2')
  await closeSheet()
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    const frame = [...document.querySelectorAll('.desk-root .frame')].find((f) => f.querySelector('.desk-calendar'))
    frame?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(1600)
  out.detail = await page.evaluate(() => {
    const sheet = document.querySelector('.desk-sheet')
    return {
      open: !!sheet,
      grid: !!sheet?.querySelector('.cal-grid'),
      cells: sheet?.querySelectorAll('.cal-grid .cal-cell, .cal-grid button').length ?? 0,
      actions: sheet?.querySelector('.cal-actions')?.textContent?.trim().slice(0, 20) ?? '',
    }
  })
  await page.screenshot({ path: path.join(OUT, 'cal-live-detail.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)
} catch (e) {
  out.error = String(e).split('\n')[0].slice(0, 200)
} finally {
  try {
    if (added) {
      await openLibrary()
      out.removed = await clickRow('日历', '移除')
      await closeSheet()
      await page.waitForTimeout(1200)
    }
    out.after = { count: await frameCount(), hasCal: await page.evaluate(() => !!document.querySelector('.desk-root .frame .desk-calendar')) }
    out.before = before
    out.restored = before.count === out.after.count && before.hasCal === out.after.hasCal
  } catch (e) {
    out.cleanupError = String(e).split('\n')[0].slice(0, 160)
  }
  await browser.close()
}

console.log(JSON.stringify({ ...out, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
