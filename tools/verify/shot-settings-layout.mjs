/** 设置面板布局回归：三栏（左导航 / 中间内容 / 右侧预览）必须是横向 flex，不许退化成上下堆叠 */
import assert from 'node:assert/strict'
import { openBrowser, panels } from './browser.mjs'

const { page, errors, goto, close } = await openBrowser({ storage: { 'siyuan-sipage-petal:desk': { cards: panels } } })
try {
  await goto()
  await page.hover('.tools')
  await page.getByRole('button', { name: '设置', exact: true }).first().click({ force: true })
  await page.waitForSelector('.desk-set', { timeout: 8000 })
  await page.waitForTimeout(400)

  const info = await page.evaluate(() => {
    const root = document.querySelector('.desk-set')
    const nav = document.querySelector('.desk-set-nav')
    const main = document.querySelector('.desk-set-main')
    const side = document.querySelector('.desk-set-side')
    const r = (el) => { const b = el?.getBoundingClientRect(); return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null }
    return {
      display: root ? getComputedStyle(root).display : null,
      dir: root ? getComputedStyle(root).flexDirection : null,
      root: r(root), nav: r(nav), main: r(main), side: r(side),
    }
  })

  console.log(JSON.stringify(info, null, 2))
  assert.equal(info.display, 'flex', '设置根容器必须是 flex（横向三栏）')
  assert.ok(info.nav && info.main && info.side, '三栏元素都在')
  assert.ok(info.main.x >= info.nav.x + info.nav.w - 2, '中间栏在导航右侧（不是下方）')
  assert.ok(info.side.x >= info.main.x + info.main.w - 2, '右栏在中间栏右侧')
  assert.ok(Math.abs(info.nav.y - info.main.y) < 4, '三栏同一行（y 对齐）')

  await page.screenshot({ path: 'docs/screens/settings-layout.png' })
  if (errors.length) throw new Error(`browser errors: ${errors.join('; ')}`)
  console.log('OK 设置面板三栏横向布局正常')
} catch (e) {
  console.error('LAYOUT FAILED:', e.message)
  process.exitCode = 1
} finally {
  await close()
}
