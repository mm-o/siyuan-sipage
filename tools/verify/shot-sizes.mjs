/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 三张内容卡在 1x1 / 2x1 / 4x2 三个尺寸下的实际版式复核。
 *
 * 输出：
 *   docs-v20-sizes-1x1.png / -2x1.png / -4x2.png   （三卡并排整体截图）
 *   docs-v20-card-<id>-<size>.png                  （单卡像素级截图，2x）
 *   stdout JSON：每卡的盒子、留白、字号、文字是否被裁
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

const CARDS = [['yiyan', '.yiyan'], ['english', '.en'], ['shici', '.shici']]
const SIZES = ['1x1', '2x1', '4x2']

await page.goto(`http://127.0.0.1:${port}/index.html?theme=light`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(600)

const report = {}

for (const size of SIZES) {
  await page.evaluate((s) => {
    localStorage.setItem('desk-cards:desk', JSON.stringify({
      cards: ['yiyan', 'english', 'shici'].map((id, i) => ({ uid: `${id}-${i}`, cardId: id, size: s })),
    }))
  }, size)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
  await page.waitForTimeout(2400)

  const canvas = page.locator('.desk-canvas')
  await canvas.screenshot({ path: path.join(OUT, `docs-v20-sizes-${size}.png`) })
  // 桌面壳整体（壁纸 + 顶部时钟 + 右上工具区）在 2x1 这一轮顺手留一张
  if (size === '2x1') await page.locator('.desk-root').screenshot({ path: path.join(OUT, 'docs-v20-desk-light.png') })

  report[size] = await page.evaluate(([cards]) => {
    const round = (n) => Math.round(n)
    const out = {}
    for (const [id, sel] of cards) {
      const root = document.querySelector(sel)
      if (!root) { out[id] = { missing: true }; continue }
      const frame = root.closest('.frame')
      const body = root.querySelector('.desk-photo-body')
      const texts = [...root.querySelectorAll('.quote, .from, .line, .note, .title, .meta, .lines')]
      const fr = frame.getBoundingClientRect()
      const br = body ? body.getBoundingClientRect() : null
      const last = texts.at(-1)
      const lr = last?.getBoundingClientRect()
      const clipped = texts.map((t) => {
        const cs = getComputedStyle(t)
        return {
          cls: t.className,
          fs: cs.fontSize,
          // 被 -webkit-line-clamp 裁掉时 scrollHeight 会大于 clientHeight
          over: t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1,
          h: round(t.getBoundingClientRect().height),
        }
      })
      out[id] = {
        frame: { w: round(fr.width), h: round(fr.height) },
        cardPad: body ? getComputedStyle(body).padding : '',
        bodyH: br ? round(br.height) : 0,
        textBottomGap: lr ? round(fr.bottom - lr.bottom) : null,
        textRightGap: lr ? round(fr.right - lr.right) : null,
        clipped,
      }
    }
    // 桌面壳骨架：hero 高度 / main 起点 / 第一张卡片是否落在 hero 之下
    const box = (s) => {
      const r = document.querySelector(s)?.getBoundingClientRect()
      return r ? { top: round(r.top), h: round(r.height) } : null
    }
    const hero = box('.desk-hero')
    const card = box('.frame')
    out.layout = { hero, main: box('.desk-main'), card, cardBelowHero: !!(hero && card && card.top >= hero.top + hero.h) }
    return out
  }, [CARDS])

  for (const [id, sel] of CARDS) {
    const el = page.locator(`.frame:has(${sel})`)
    await el.screenshot({ path: path.join(OUT, `docs-v20-card-${id}-${size}.png`) })
  }

  // 卡片悬浮控件（GlassButton mini）：只在 2x1 复核一次
  if (size === '2x1') {
    const frame = page.locator('.frame:has(.en)')
    await frame.hover()
    await page.waitForTimeout(400)
    report[size].more = await page.evaluate(() => {
      const b = document.querySelector('.frame:has(.en) .more')
      if (!b) return null
      const r = b.getBoundingClientRect()
      const f = document.querySelector('.frame:has(.en)')?.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        right: f ? Math.round(f.right - r.right) : null,
        top: f ? Math.round(r.top - f.top) : null,
        opacity: getComputedStyle(b).opacity,
        tag: b.tagName,
      }
    })
    await frame.screenshot({ path: path.join(OUT, 'docs-v20-card-hover.png') })
  }
}

// 4x2 单卡在深色主题下再看一眼（玻璃/文字对比度）
await page.evaluate(() => {
  localStorage.setItem('desk-cards:desk', JSON.stringify({ cards: [{ uid: 's', cardId: 'shici', size: '4x2' }] }))
})
await page.goto(`http://127.0.0.1:${port}/index.html?theme=dark`, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
await page.waitForTimeout(2200)
await page.locator('.desk-canvas').screenshot({ path: path.join(OUT, 'docs-v20-sizes-4x2-dark.png') })
await page.locator('.desk-root').screenshot({ path: path.join(OUT, 'docs-v20-desk-dark.png') })

await browser.close()
server.close()
console.log(JSON.stringify({ report, errorCount: errors.length, errors: [...new Set(errors)].slice(0, 3) }, null, 2))
