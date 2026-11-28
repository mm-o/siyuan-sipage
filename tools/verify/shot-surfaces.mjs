/** 共享表面/字段/开关/滑轨：使用真实页面与交互，所有数据留在隔离浏览器。 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, panels, out, report } from './browser.mjs'

const harness = await openBrowser({ storage: {
  'siyuan-sipage-petal:desk': { cards: panels },
  'siyuan-sipage-petal:agenda': { group: 'inbox', seeded: true, items: [{ id: 'surfaces-memo', text: '字段初始内容', note: '', date: '', time: '', done: false, doneAt: 0, at: 1795344000000, syncedAt: 0 }] },
} })
const { page, errors } = harness
const checks = []
const screenshots = []
const dialog = page.locator('.desk-sheet')
async function screenshot(name) {
  if (process.env.VERIFY_NO_SCREENSHOTS) return
  await page.screenshot({ path: path.join(out, name) })
  screenshots.push(name)
}
async function theme(dark) {
  await page.evaluate(dark => document.body.classList.toggle('body--dark', dark), dark)
  await page.waitForTimeout(180)
}
async function close() {
  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })
}
async function cardDetail(cardId, selector) {
  await page.evaluate(({ cardId, panels }) => {
    globalThis.__sipageDesk.cards = [...panels, { uid: `surfaces-${cardId}`, cardId, x: 1, y: 8, w: 12, h: 8 }]
  }, { cardId, panels })
  const frame = page.locator('.desk-root .item:not(.is-panel) .frame')
  await frame.waitFor()
  await frame.locator('.body').click({ position: { x: 90, y: 90 } })
  await dialog.locator(selector).waitFor()
  return frame
}
async function fields() {
  const controls = await dialog.locator('input:not([type="range"]), textarea, button.gs-trigger').evaluateAll(elements => elements.map(el => ({
    tag: el.tagName, shared: el.classList.contains('gf') && el.classList.contains('desk-field'), label: el.getAttribute('aria-label'),
  })))
  assert.ok(controls.length > 0)
  assert.ok(controls.every(control => control.shared && control.label), JSON.stringify(controls))
  return controls
}
const surface = locator => locator.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, image: getComputedStyle(el).backgroundImage, filter: getComputedStyle(el).backdropFilter }))
try {
  await harness.goto()
  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '设置', exact: true }).last().click()
  await dialog.waitFor()
  await dialog.locator('.desk-set-nav').getByRole('button', { name: '组件设置', exact: true }).click()
  const toggle = dialog.getByRole('switch', { name: '入场动效', exact: true })
  assert.equal(await toggle.getAttribute('aria-checked'), 'false')
  await toggle.click()
  await page.waitForFunction(() => globalThis.__sipageAppearance.motion === true)
  assert.equal(await toggle.getAttribute('aria-checked'), 'true')
  await toggle.focus()
  await toggle.press('Space')
  await page.waitForFunction(() => globalThis.__sipageAppearance.motion === false)
  assert.equal(await toggle.getAttribute('aria-checked'), 'false')
  checks.push('settings switch supports pointer and Space with aria-checked and real appearance state')

  const cell = dialog.getByRole('slider', { name: '单格边长', exact: true })
  await cell.focus()
  await cell.press('Home')
  await page.waitForFunction(() => globalThis.__sipageAppearance.cell === 24)
  assert.equal(await cell.evaluate(el => el.style.getPropertyValue('--range-progress')), '0%')
  await cell.press('End')
  await page.waitForFunction(() => globalThis.__sipageAppearance.cell === 36)
  assert.equal(await cell.evaluate(el => el.style.getPropertyValue('--range-progress')), '100%')
  await cell.press('ArrowLeft')
  await page.waitForFunction(() => globalThis.__sipageAppearance.cell === 35)
  const progress = await cell.evaluate(el => parseFloat(el.style.getPropertyValue('--range-progress')))
  assert.ok(Math.abs(progress - 11 / 12 * 100) < .001)
  await cell.dblclick()
  await page.waitForFunction(() => globalThis.__sipageAppearance.cell === 27)
  assert.equal(await cell.evaluate(el => el.style.getPropertyValue('--range-progress')), '25%')
  assert.equal(await cell.getAttribute('aria-valuetext'), '27px')
  checks.push('slider Home/End/arrows change model and fill; double-click restores the default')

  const pane = dialog.locator('.desk-set-main')
  await theme(false)
  const lightPane = await surface(pane)
  await screenshot('surfaces-settings-light.png')
  await theme(true)
  const darkPane = await surface(pane)
  assert.notDeepEqual(lightPane, darkPane, 'Shared pane material follows runtime SiYuan theme')
  await screenshot('surfaces-settings-dark.png')
  await close()
  checks.push('settings content panes adapt their material to runtime light/dark appearance')

  await theme(false)
  const memoFrame = await cardDetail('memo', '.mm-panel')
  await fields()
  const editor = dialog.getByRole('textbox', { name: '日程标题', exact: true })
  await editor.fill('公共字段输入即时更新模型')
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('siyuan-sipage-petal:agenda') || '{}').items?.some(item => item.id === 'surfaces-memo' && item.text === '公共字段输入即时更新模型'))
  assert.equal(await dialog.locator('.desk-block-list .mm-text').first().textContent(), '公共字段输入即时更新模型')
  await screenshot('surfaces-memo-fields.png')
  const frameLight = await surface(memoFrame)
  await theme(true)
  const frameDark = await surface(memoFrame)
  assert.notDeepEqual(frameLight, frameDark, 'Actual card frame switches material in dark appearance')
  await close()
  checks.push('memo title field updates the shared agenda model as you type; actual card surface follows theme')

  await theme(false)
  await cardDetail('calendar', '.cal-panel')
  const calendarFields = await fields()
  assert.equal(calendarFields.filter(field => field.tag === 'BUTTON').length, 3, 'three custom selects replace native selects')
  const toolbarTops = await dialog.locator('.cal-toolbar > *').evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)))
  assert.ok(Math.max(...toolbarTops) - Math.min(...toolbarTops) <= 2, `calendar toolbar keeps one row: ${toolbarTops}`)
  const year = dialog.getByRole('button', { name: '年份', exact: true })
  const month = dialog.getByRole('button', { name: '月份', exact: true })
  const currentYear = new Date().getFullYear()
  await year.click()
  const popup = page.locator('.desk-pop')
  await popup.waitFor()
  assert.equal(await popup.getByRole('option').count(), 21, 'custom dropdown lists every option')
  assert.match(await popup.evaluate(el => getComputedStyle(el).backgroundImage), /gradient/, 'dropdown uses the glass surface')
  await popup.getByRole('option', { name: `${currentYear + 1}年`, exact: true }).click()
  await popup.waitFor({ state: 'detached' })
  assert.match(await year.textContent(), new RegExp(String(currentYear + 1)))
  assert.match(await dialog.locator('.cal-day-date').textContent(), new RegExp(String(currentYear + 1)))
  await month.click()
  await popup.getByRole('option', { name: '1月', exact: true }).click()
  await popup.waitFor({ state: 'detached' })
  assert.match(await dialog.locator('.cal-day-date').textContent(), new RegExp(`^${currentYear + 1}-0?1-`))
  await year.focus()
  await year.press('Enter')
  await popup.waitFor()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await popup.waitFor({ state: 'detached' })
  assert.equal(await year.getAttribute('aria-expanded'), 'false', 'keyboard closes the dropdown after choosing')
  await screenshot('surfaces-calendar-fields.png')
  checks.push('calendar uses the custom glass dropdown; pointer and keyboard selection update the date')

  // 钉住：遮罩不再拦截指针（背后可点），点外部也不关；取消钉住后恢复拦截。
  const mask = page.locator('.desk-sheet-mask')
  await dialog.getByRole('button', { name: '钉住（看到背景）', exact: true }).click()
  await page.waitForTimeout(150)
  assert.equal(await mask.evaluate(el => getComputedStyle(el).pointerEvents), 'none', 'pinned mask stops intercepting pointers')
  assert.ok(await page.evaluate(() => document.elementFromPoint(20, 20)?.closest('.desk-sheet-mask') === null), 'pinned mask lets clicks reach the desktop')
  await page.mouse.click(20, 20)
  await page.waitForTimeout(320)
  assert.equal(await dialog.count(), 1, 'pinned sheet survives an outside click')
  await dialog.getByRole('button', { name: '取消钉住', exact: true }).click()
  await page.waitForTimeout(200)
  assert.equal(await mask.evaluate(el => getComputedStyle(el).pointerEvents), 'auto', 'unpinned mask intercepts pointers again')
  checks.push('pinning releases the mask: outside clicks reach the desktop and never close the sheet')

  // 弹窗：顶栏拖动、四角缩放、双击顶栏复位。
  const sheetBox = () => dialog.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  })
  const head = dialog.locator('.desk-sheet-head')
  const start = await sheetBox()
  await head.hover()
  await page.mouse.down()
  await page.mouse.move(start.l + 220, start.t + 130, { steps: 5 })
  await page.mouse.up()
  const moved = await sheetBox()
  assert.ok(Math.abs(moved.l - start.l) > 20 && Math.abs(moved.t - start.t) > 20, `header drags the sheet: ${JSON.stringify({ start, moved })}`)
  const grip = dialog.locator('.desk-sheet-grip.is-se')
  const gripBox = await grip.boundingBox()
  await page.mouse.move(gripBox.x + 7, gripBox.y + 7)
  await page.mouse.down()
  await page.mouse.move(gripBox.x + 77, gripBox.y + 47, { steps: 5 })
  await page.mouse.up()
  const resized = await sheetBox()
  assert.ok(resized.w > moved.w + 20 && resized.h > moved.h + 10, `corner grip resizes the sheet: ${JSON.stringify({ moved, resized })}`)
  await head.dblclick()
  const restored = await sheetBox()
  assert.ok(Math.abs(restored.l - start.l) <= 2 && Math.abs(restored.w - start.w) <= 2, 'double-click restores the centred box')
  checks.push('dialog header drags the sheet, corner grips resize it, double-click restores the centred box')

  // 高对比和减少透明度针对共享材质层，而不是仅验证 media query 是否触发。
  const calendarSurface = dialog.locator('.cal-main')
  await page.emulateMedia({ contrast: 'more' })
  assert.equal((await surface(calendarSurface)).filter, 'none')
  assert.equal(await year.evaluate(el => getComputedStyle(el).backdropFilter), 'none')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  assert.equal((await surface(calendarSurface)).filter, 'none')
  await cdp.send('Emulation.setEmulatedMedia', { features: [] })
  await cdp.detach()
  await page.emulateMedia({ contrast: 'no-preference' })
  await close()
  checks.push('high contrast and reduced transparency remove blur from shared panes and fields')

  await cardDetail('countdown', '.cd-panel')
  await dialog.getByRole('button', { name: '新建', exact: true }).click()
  const form = dialog.locator('form.cd-form')
  await form.waitFor()
  await fields()
  await form.getByRole('textbox', { name: '倒数日标题', exact: true }).fill('公共开关验证')
  await form.getByLabel('倒数日日期', { exact: true }).fill('2027-02-06')
  await form.getByRole('tab', { name: '每年', exact: true }).click()
  const lunar = form.getByRole('switch', { name: '按农历重复', exact: true })
  const pinned = form.getByRole('switch', { name: '置顶倒数日', exact: true })
  await lunar.click()
  assert.equal(await lunar.getAttribute('aria-checked'), 'true')
  await pinned.focus()
  await pinned.press('Space')
  assert.equal(await pinned.getAttribute('aria-checked'), 'true')
  await form.getByRole('button', { name: '保存', exact: true }).click()
  await form.waitFor({ state: 'detached' })
  const saved = await page.evaluate(() => globalThis.__sipageCountdown.events.find(item => item.title === '公共开关验证'))
  assert.equal(saved.lunar, true)
  assert.equal(saved.pinned, true)
  const detailPin = dialog.getByRole('switch', { name: '置顶倒数日', exact: true })
  await detailPin.click()
  await page.waitForFunction(() => globalThis.__sipageCountdown.events.find(item => item.title === '公共开关验证')?.pinned === false)
  assert.equal(await detailPin.getAttribute('aria-checked'), 'false')
  checks.push('countdown lunar/draft-pin/detail-pin switches keep native semantics and parent pin-event behavior')

  // 钉住：不被别的卡片顶替，可以同时钉多个；Esc 只关最上层。
  await close()
  await page.evaluate(() => {
    globalThis.__sipageDesk.cards = [
      { uid: 'multi-a', cardId: 'calendar', w: 12, h: 8, x: 1, y: 8 },
      { uid: 'multi-b', cardId: 'clock', w: 8, h: 6, x: 18, y: 8 },
      { uid: 'multi-c', cardId: 'countdown', w: 12, h: 8, x: 28, y: 8 },
    ]
  })
  await page.waitForFunction(() => document.querySelectorAll('.desk-root .frame').length === 3)
  const sheetTitles = () => page.locator('.desk-sheet .desk-sheet-head-title').allTextContents()
  const openCard = async (i) => {
    /* 居中弹窗会盖住卡片，直接派发 click 绕开命中测试，和其他脚本一致。 */
    await page.evaluate((index) => {
      document.querySelectorAll('.desk-root .frame')[index].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, i)
    await page.waitForTimeout(350)
  }
  const pinTop = async () => {
    await page.locator('.desk-sheet').last().getByRole('button', { name: '钉住（看到背景）', exact: true }).click()
    await page.waitForTimeout(200)
  }
  await openCard(0)
  await pinTop()
  await openCard(1)
  assert.deepEqual(await sheetTitles(), ['日历', '时钟'], 'a pinned sheet is not replaced by another card')
  await pinTop()
  await openCard(2)
  assert.equal(await page.locator('.desk-sheet').count(), 3, 'two pinned sheets plus one new modal')
  assert.equal(await page.locator('.desk-sheet-mask.is-pinned').count(), 2, 'both pinned sheets stay pinned')
  await page.keyboard.press('Escape')
  /* 关闭有动画：等标题落到期望值，而不是赌一个固定的 600ms（会偶发失败） */
  for (let i = 0; i < 30; i += 1) {
    if (JSON.stringify(await sheetTitles()) === JSON.stringify(['日历', '时钟'])) break
    await page.waitForTimeout(100)
  }
  assert.deepEqual(await sheetTitles(), ['日历', '时钟'], 'Escape closes only the topmost sheet')
  checks.push('pinned sheets survive other cards and stack; Escape closes only the topmost')

  report('surfaces', checks, errors, screenshots)
} finally { await harness.close() }
