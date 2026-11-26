/** 整理模式的真实浏览器回归；使用隔离验证页与固定数据，不写思源工作空间。 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, out, report } from './browser.mjs'

const harness = await openBrowser()
const { page, errors } = harness
const results = []
const luminance = rgb => rgb.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
async function doneContrast(toolbar) {
  const colors = await toolbar.getByRole('button', { name: '完成', exact: true }).evaluate(el => {
    const style = getComputedStyle(el)
    const lens = el.querySelector('.gb-lens')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    return [style.color, getComputedStyle(lens).backgroundColor].map(value => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
    })
  })
  const ratio = contrast(...colors)
  assert.ok(ratio >= 4.5, `Done label contrast: ${ratio.toFixed(2)}:1`)
  return +ratio.toFixed(2)
}
try {
  await page.addInitScript(() => {
    localStorage.setItem('siyuan-sipage-petal:appearance', JSON.stringify({ cell: 27, motion: false }))
    localStorage.setItem('siyuan-sipage-petal:desk', JSON.stringify({ cards: [
      { uid: 'panel-clock', cardId: '@clock', w: 12, h: 6, x: 20, y: 0, auto: true },
      { uid: 'panel-tools', cardId: '@tools', w: 2, h: 2, x: 49, y: 0, auto: true },
      { uid: 'calendar', cardId: 'calendar', w: 10, h: 8, x: 1, y: 8 },
      { uid: 'memo', cardId: 'memo', w: 10, h: 8, x: 12, y: 8 },
      { uid: 'clock', cardId: 'clock', w: 10, h: 8, x: 23, y: 8 },
      { uid: 'countdown', cardId: 'countdown', w: 12, h: 8, x: 34, y: 8 },
      { uid: 'heatmap', cardId: 'heatmap', w: 16, h: 6, x: 1, y: 17 },
      { uid: 'shortcut', cardId: 'shortcut', w: 8, h: 6, x: 18, y: 17 },
    ] }))
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    localStorage.setItem('siyuan-sipage-petal:agenda', JSON.stringify({ group: 'today', seeded: true, items: [
      { id: '1', text: '留一点空白，给新的想法', note: '', date: key, time: '', done: false, doneAt: 0, at: 1, syncedAt: 0 },
      { id: '2', text: '把常用的卡片放在手边', note: '', date: key, time: '', done: false, doneAt: 0, at: 2, syncedAt: 0 },
      { id: '3', text: '今天，慢慢做好一件事', note: '', date: key, time: '', done: true, doneAt: 3, at: 3, syncedAt: 0 },
      { id: '4', text: '备忘先放收件箱', note: '', date: '', time: '', done: false, doneAt: 0, at: 4, syncedAt: 0 },
    ] }))
  })
  await harness.goto()
  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '整理桌面', exact: true }).click()
  const toolbar = page.getByRole('toolbar', { name: '整理桌面' })
  await toolbar.waitFor()
  const memo = page.locator('.item[aria-label^="日程备忘"]')
  await memo.hover()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'arrange-light.png') })
  const lightContrast = await doneContrast(toolbar)
  const unit = 1440 / Math.round(1440 / 27)
  const before = await memo.boundingBox()
  await page.mouse.move(before.x + 48, before.y + 48)
  await page.mouse.down()
  await page.mouse.move(before.x + 48 - unit * 12, before.y + 48 + unit, { steps: 8 })
  assert.equal(await page.locator('.arrange-origin').count(), 1, 'Dragging keeps an origin outline')
  await page.screenshot({ path: path.join(out, 'arrange-drag.png') })
  await page.mouse.up()
  const after = await memo.boundingBox()
  assert.ok(Math.abs(after.x - before.x + unit * 12) < 1, 'Move snaps horizontally')
  assert.ok(Math.abs(after.y - before.y - unit) < 1, 'Move snaps vertically')
  assert.equal(await page.locator('.arrange-origin').count(), 0)
  results.push('pointer move snaps to grid; origin clears after release')

  const rightEdge = memo.locator('.edge.is-e')
  await memo.hover()
  const handle = await rightEdge.boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + unit * 2, handle.y + handle.height / 2, { steps: 8 })
  await page.mouse.up()
  assert.ok(Math.abs((await memo.boundingBox()).width - after.width - unit * 2) < 1, 'Pointer resize changes width')
  results.push('pointer resize updates card dimensions')

  await memo.focus()
  const keyBefore = await memo.boundingBox()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(280)
  assert.ok(Math.abs((await memo.boundingBox()).x - keyBefore.x - unit) < 1)
  await page.keyboard.press('Shift+ArrowRight')
  await page.waitForTimeout(280)
  assert.ok(Math.abs((await memo.boundingBox()).width - keyBefore.width - unit) < 1)
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight')
  await page.waitForTimeout(280)
  assert.match(await memo.getAttribute('aria-label'), /16 列/)
  await memo.hover()
  const maxWidth = (await memo.boundingBox()).width
  const maxHandle = await rightEdge.boundingBox()
  await page.mouse.move(maxHandle.x + 14, maxHandle.y + 14)
  await page.mouse.down()
  await page.mouse.move(maxHandle.x + 14 - unit * 2, maxHandle.y + 14, { steps: 6 })
  await page.mouse.up()
  assert.ok(Math.abs((await memo.boundingBox()).width - maxWidth + unit * 2) < 1, 'At maximum the handle still shrinks')
  results.push('keyboard move/resize; boundary handle can shrink')
  await toolbar.getByRole('button', { name: '一键整理' }).click()
  await page.waitForTimeout(300)
  assert.match(await toolbar.textContent(), /6 张卡片/)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  assert.equal(await toolbar.count(), 0)
  assert.equal(await page.locator('.gridlines').count(), 0)
  results.push('tidy action and Escape exit')

  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '整理桌面', exact: true }).click()
  await page.evaluate(() => document.body.classList.add('body--dark'))
  await page.mouse.move(1000, 900)
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'arrange-dark.png') })
  const darkContrast = await doneContrast(toolbar)
  results.push(`Done label contrast light ${lightContrast}:1, dark ${darkContrast}:1`)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  const compactBox = await toolbar.boundingBox()
  assert.ok(compactBox.x >= 0 && compactBox.x + compactBox.width <= 390, 'Compact toolbar fits')
  await page.screenshot({ path: path.join(out, 'arrange-compact.png') })
  await toolbar.getByRole('button', { name: '完成', exact: true }).click()
  await page.waitForTimeout(300)
  assert.equal(await toolbar.count(), 0)
  results.push('390px toolbar fits and Done remains usable')
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '整理桌面', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' })
  const fallback = await toolbar.evaluate(el => ({ backdrop: getComputedStyle(el).backdropFilter, transition: getComputedStyle(el).transitionDuration }))
  assert.equal(fallback.backdrop, 'none')
  assert.equal(fallback.transition, '0s')
  results.push('high-contrast opaque material and reduced-motion fallback')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  assert.equal(await toolbar.evaluate(el => getComputedStyle(el).backdropFilter), 'none')
  await cdp.detach()
  results.push('reduced-transparency preference uses opaque controls')
  report('arrange', results, errors, ['arrange-light.png', 'arrange-dark.png', 'arrange-drag.png', 'arrange-compact.png'])
} finally {
  await harness.close()
}
