/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 真机验证「状态持久化」：
 *   1. 记下桌面原有卡片
 *   2. 加一张日历、把尺寸切成 2x4
 *   3. 等落盘 → 读工作空间的 petal 目录，确认文件里真的写着这张卡
 *   4. 整页重载（= 插件重新 onload，等同重启的读取路径）→ 卡片与尺寸还在
 *   5. 移除这张卡 → 文件回到原样，桌面复原
 * 另外断言：localStorage 里不再写状态（旧实现就在这儿丢数据）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const OUT = path.resolve(import.meta.dirname, '../../docs/screens')
const PETAL = 'E:\\Siyuan\\data\\storage\\petal'
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const TOKEN = 'bct45z7gltevi22s'

/** petal 下属于本插件的文件（键名可能是 desk / desk.json，两种都认） */
function readPetal() {
  const dir = path.join(PETAL, 'desk-cards')
  if (!fs.existsSync(dir)) return { dir, files: [] }
  const files = fs.readdirSync(dir).map((name) => {
    const full = path.join(dir, name)
    const raw = fs.readFileSync(full, 'utf8')
    let json = null
    try {
      json = JSON.parse(raw)
    } catch {}
    return { name, size: raw.length, raw: raw.slice(0, 300), json }
  })
  return { dir, files }
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)))

const openDesk = async () => {
  await page.evaluate(() => {
    document.querySelector('#message')?.remove()
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
  await page.evaluate(() => document.querySelector('.desk-sheet-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.waitForTimeout(600)
}
const deskState = () => page.evaluate(() => ({
  frames: document.querySelectorAll('.desk-root .frame').length,
  calendar: document.querySelector('.desk-root .frame .desk-calendar')?.className || '',
  cards: [...document.querySelectorAll('.desk-root .frame')].map((f) => {
    const inner = f.querySelector('[class*="desk-"], .desk-photo-card, .clock')
    return inner ? inner.className.split(' ').filter((c) => c !== 'light' && c !== 'dark').join(' ') : '?'
  }),
}))

await page.goto(`http://127.0.0.1:6806/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5500)
await openDesk()

const out = { before: await deskState(), petalBefore: readPetal() }

// 加日历 + 切成 2x4
await openLibrary()
out.added = await clickRow('日历', '添加')
await clickSize('日历', '2x4')
await closeSheet()
await page.waitForTimeout(700)
out.afterAdd = await deskState()
await page.waitForTimeout(600)
out.petalAfterAdd = readPetal()
out.localStorage = await page.evaluate(() => {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('desk-cards')) keys.push(k)
  }
  return keys
})

// 整页重载：插件重新 onload → bootStore() 从 petal 读回
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5500)
await openDesk()
out.afterReload = await deskState()
await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, 'persist-after-reload.png') })

// 复原：移除日历
await openLibrary()
out.removed = await clickRow('日历', '移除')
await closeSheet()
await page.waitForTimeout(700)
out.petalAfterRemove = readPetal()
out.afterRemove = await deskState()

await browser.close()
console.log(JSON.stringify({ ...out, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
