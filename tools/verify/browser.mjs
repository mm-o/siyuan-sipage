/** 隔离浏览器验证：只服务 dev-dist，所有 API/外部请求都在浏览器内拦截，不访问真实思源。 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

export const root = path.resolve(import.meta.dirname, '../..')
export const out = path.join(root, 'docs/screens')
const dist = path.join(root, 'dev-dist')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#9bbaca"/><stop offset=".6" stop-color="#d9cbbd"/><stop offset="1" stop-color="#789399"/></linearGradient><linearGradient id="hill" x2="0" y2="1"><stop stop-color="#607e87"/><stop offset="1" stop-color="#253f4a"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h1600v1000H0z"/><path fill="#839da5" d="M0 510Q300 320 570 580T1100 520T1600 480V1000H0z"/><path fill="url(#hill)" d="M0 690Q310 510 610 760T1200 680T1600 700V1000H0z"/></svg>`
export const panels = [
  { uid: 'panel-clock', cardId: '@clock', w: 12, h: 6, x: 20, y: 0, auto: true },
  { uid: 'panel-tools', cardId: '@tools', w: 2, h: 2, x: 49, y: 0, auto: true },
]

function apiData(request) {
  const pathname = new URL(request.url()).pathname
  const body = request.postDataJSON() || {}
  if (pathname === '/api/network/forwardProxy') {
    const url = String(body.url || '')
    if (body.responseEncoding === 'base64') return { code: 0, data: { contentType: 'image/svg+xml', body: Buffer.from(wallpaper).toString('base64') } }
    const data = url.includes('getLocation') ? { code: 0, data: {} } : {}
    return { code: 0, data: { body: JSON.stringify(data) } }
  }
  if (pathname === '/api/query/sql') {
    const stmt = String(body.stmt || '')
    /* 日记卡：固定的「今天日记」样本（attributes → 文档 → 统计 / 正文） */
    if (/from attributes where type = 'b' and name = 'custom-dailynote-/.test(stmt)) return { code: 0, data: [{ id: 'daily-doc' }] }
    if (/from blocks where id = 'daily-doc'/.test(stmt)) return { code: 0, data: [{ title: '2026-11-24' }] }
    if (/root_id = 'daily-doc'/.test(stmt)) {
      if (/sum\(length\)/.test(stmt)) return { code: 0, data: [{ words: 128, blocks: 4 }] }
      return { code: 0, data: [
        { type: 'p', content: '上午整理桌面卡片\n第二行不进卡片', updated: '20261124100000' },
        { type: 'p', content: '下午写日记卡', updated: '20261124110000' },
        { type: 'i', content: '[ ] 给日记卡加联动', updated: '20261124120000' },
      ] }
    }
    if (/count\(\*\) as docs/i.test(stmt)) return { code: 0, data: [{ docs: 0, words: 0, today: 0, week: 0, month: 0 }] }
  }
  if (pathname === '/api/notebook/lsNotebooks') return { code: 0, data: { notebooks: [] } }
  return { code: 0, data: [] }
}

export async function openBrowser({ viewport = { width: 1440, height: 960 }, storage = {}, clock } = {}) {
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Run pnpm dev:card before browser verification')
  fs.mkdirSync(out, { recursive: true })
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'
    const file = path.resolve(dist, rel)
    if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  let browser
  try {
    const edge = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    browser = await chromium.launch({ executablePath: edge, headless: true })
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    const url = `http://127.0.0.1:${server.address().port}`
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && message.text().includes('[desk-cards]')) errors.push(message.text()) })
    if (clock) await page.clock.install({ time: clock })
    await page.route('**/*', route => {
      const request = route.request()
      const target = new URL(request.url())
      if (target.pathname.startsWith('/appearance/covers/')) return target.pathname.endsWith('.json')
        ? route.fulfill({ json: [] }) : route.fulfill({ contentType: 'image/svg+xml', body: wallpaper })
      if (target.origin === url && target.pathname.startsWith('/api/')) return route.fulfill({ json: apiData(request) })
      if (target.origin === url) return route.continue()
      if (target.hostname === 'base.itab.link') {
        const data = target.pathname.includes('todayEnglish') ? { content: 'Simplicity is prerequisite for reliability.', note: '简单是可靠的前提。', tts: '' }
          : target.pathname.includes('todayShici') ? { title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。', translate: '月光洒在床前。', annotation: '举头：抬头。' }
            : { hitokoto: '留一点空白，给新的想法。', from: '验证示例' }
        return route.fulfill({ json: { code: 0, data } })
      }
      return route.fulfill({ json: { code: 0, data: [] } })
    })
    await page.addInitScript(seed => {
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, JSON.stringify(value))
    }, { 'desk-cards:appearance': { cell: 27, motion: false }, ...storage })
    return {
      page, errors, url,
      async goto(query = '') {
        await page.goto(`${url}/index.html${query}`, { waitUntil: 'networkidle' })
        await page.addStyleTag({ content: '.doc-demo{display:none!important}' })
      },
      async close() { await browser.close(); await new Promise(resolve => server.close(resolve)) },
    }
  } catch (error) {
    await browser?.close()
    await new Promise(resolve => server.close(resolve))
    throw error
  }
}

export function report(name, checks, errors, screenshots = []) {
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
  const result = { checks, browserErrors: errors, screenshots }
  fs.writeFileSync(path.join(out, `${name}-report.json`), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
