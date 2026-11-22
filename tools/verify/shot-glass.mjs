/** 公共液态玻璃按钮：真实设置/倒数日表单、主题、材质降级与 DOM 契约。 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, panels, out, report } from './browser.mjs'

const harness = await openBrowser({ storage: { 'desk-cards:desk': { cards: panels } } })
const { page, errors } = harness
const checks = []
const screenshots = []
const dialog = page.locator('.desk-sheet')
const color = button => button.evaluate(el => getComputedStyle(el).color)
async function theme(dark) {
  await page.evaluate(dark => document.body.classList.toggle('body--dark', dark), dark)
  await page.waitForTimeout(200)
}
async function shot(name) {
  if (process.env.VERIFY_NO_SCREENSHOTS) return
  await page.screenshot({ path: path.join(out, name) })
  screenshots.push(name)
}
async function structure() {
  const result = await page.evaluate(() => ({
    roots: document.querySelectorAll('#desk-glass-filters').length,
    filters: document.querySelectorAll('#desk-glass-filters filter').length,
    buttons: document.querySelectorAll('button.gb').length,
    malformed: [...document.querySelectorAll('button.gb')].filter(button => button.querySelectorAll(':scope > .gb-lens').length !== 1).length,
    nested: document.querySelectorAll('button button').length,
  }))
  assert.equal(result.roots, 1, 'One shared filter root per page')
  assert.equal(result.filters, 2, 'Only icon and pill refraction maps exist')
  assert.ok(result.buttons > 0)
  assert.equal(result.malformed, 0, 'Each button has exactly one lens')
  assert.equal(result.nested, 0, 'No nested native buttons')
}
try {
  await harness.goto()
  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '添加卡片', exact: true }).click()
  await page.locator('.lib-list').waitFor()
  const add = dialog.getByRole('button', { name: '添加到桌面', exact: true })
  const secondary = dialog.getByRole('button', { name: '恢复默认', exact: true })
  const close = dialog.locator('.desk-sheet-close')
  assert.equal(await add.locator('.gb-label').textContent(), '添加到桌面')
  assert.equal(await close.locator(':scope > svg').count(), 1)
  assert.equal(await close.locator('.gb-label').count(), 0)
  assert.match(await add.getAttribute('class'), /is-primary/)
  assert.equal(await secondary.getAttribute('type'), 'button')
  await structure()
  const light = await color(secondary)
  await shot('glass-library-light.png')
  await theme(true)
  const dark = await color(secondary)
  assert.notEqual(light, dark, 'Auto button ink responds to SiYuan runtime appearance')
  await shot('glass-library-dark.png')
  await close.click()
  await dialog.waitFor({ state: 'detached' })
  checks.push('text/icon/default/primary buttons share one lens and two page-level filters; auto ink adapts to runtime theme')

  // 使用真实倒数日卡片打开详情，再通过真实表单验证禁用与原生提交行为。
  await page.evaluate(panels => {
    globalThis.__deskDesk.cards = [...panels, { uid: 'glass-countdown', cardId: 'countdown', x: 1, y: 8, w: 12, h: 8 }]
  }, panels)
  const card = page.locator('.desk-root .item:not(.is-panel) .frame')
  await card.locator('.body').click({ position: { x: 40, y: 40 } })
  await dialog.locator('.cd-panel').waitFor()
  await dialog.getByRole('button', { name: '新建', exact: true }).click()
  const form = dialog.locator('form.cd-form')
  await form.waitFor()
  const save = form.getByRole('button', { name: '保存', exact: true })
  const cancel = form.getByRole('button', { name: '取消', exact: true })
  assert.equal(await save.getAttribute('type'), 'submit')
  assert.equal(await cancel.getAttribute('type'), 'button')
  assert.equal(await save.isDisabled(), true)
  const before = await page.evaluate(() => globalThis.__deskCountdown.events.length)
  await form.getByPlaceholder('例如：妈妈的生日').fill('玻璃按钮验证')
  await form.locator('input[type="date"]').fill('2027-01-01')
  await page.waitForFunction(() => !document.querySelector('.cd-form button[type="submit"]').disabled)
  await save.click()
  await form.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => globalThis.__deskCountdown.events.length), before + 1, 'Native submit creates exactly one event')
  const danger = dialog.getByRole('button', { name: '删除', exact: true })
  assert.match(await danger.getAttribute('class'), /is-danger/)
  assert.equal(await danger.locator(':scope > svg').count(), 1)
  await structure()
  await theme(false)
  await shot('glass-countdown-light.png')
  await theme(true)
  await shot('glass-countdown-dark.png')
  checks.push('countdown save is disabled until valid; submit creates exactly one event; secondary cancel and dangerous delete preserve semantics')

  // 键盘模式聚焦，通过 Tab 到达公共按钮并检查焦点环。
  await page.keyboard.press('Tab')
  await danger.focus()
  assert.equal(await danger.evaluate(el => el.matches(':focus-visible')), true)
  const outline = await danger.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }))
  assert.equal(outline.style, 'solid')
  assert.ok(outline.width >= 2)
  checks.push('keyboard focus-visible has a solid visible focus ring')
  await page.emulateMedia({ contrast: 'more' })
  assert.equal(await danger.locator('.gb-lens').evaluate(el => getComputedStyle(el).backdropFilter), 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await danger.hover()
  assert.equal(await danger.evaluate(el => getComputedStyle(el).transform), 'none')
  assert.equal(await danger.evaluate(el => getComputedStyle(el).transitionDuration), '0s')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  assert.equal(await danger.locator('.gb-lens').evaluate(el => getComputedStyle(el).backdropFilter), 'none')
  await cdp.send('Emulation.setEmulatedMedia', { features: [] })
  await cdp.detach()
  await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'no-preference' })
  checks.push('increased contrast and reduced transparency remove backdrop filters; reduced motion removes hover transform and transitions')
  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })

  // 天气错误分支生成真实 photo tone 重试按钮，避开外部天气服务。
  await page.evaluate(panels => {
    globalThis.__deskWeather.locations = []
    globalThis.__deskWeather.activeId = ''
    globalThis.__deskDesk.cards = [...panels, { uid: 'glass-weather', cardId: 'weather', x: 1, y: 8, w: 12, h: 8 }]
  }, panels)
  await page.locator('.desk-root .frame .body').click({ position: { x: 90, y: 90 } })
  await dialog.locator('.wx-panel').waitFor()
  // 地点定位按钮稳定存在，无需等待天气错误，且不是主按钮以免白字来源混淆。
  await page.setViewportSize({ width: 760, height: 900 })
  const photo = dialog.getByRole('button', { name: /管理地点|收起地点/ })
  await photo.waitFor({ state: 'visible' })
  await theme(false)
  const photoLight = await color(photo)
  await theme(true)
  assert.equal(await color(photo), photoLight, 'Photo tone ink stays unchanged across themes')
  assert.equal(photoLight, 'rgb(255, 255, 255)')
  await structure()
  checks.push('photo/sky actions retain white ink through light and dark appearance changes')
  report('glass', checks, errors, screenshots)
} finally { await harness.close() }
