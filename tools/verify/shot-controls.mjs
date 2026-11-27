/** 校验快捷方式图标为描边、弹层无描边、下拉为玻璃面。 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, out, report } from './browser.mjs'

const harness = await openBrowser({ storage: { 'siyuan-sipage-petal:desk': { cards: [
  { uid: 'panel-clock', cardId: '@clock', w: 12, h: 6, x: 20, y: 0, auto: true },
  { uid: 'panel-tools', cardId: '@tools', w: 2, h: 2, x: 49, y: 0, auto: true },
  { uid: 'shortcut', cardId: 'shortcut', w: 8, h: 8, x: 1, y: 8 },
  { uid: 'calendar', cardId: 'calendar', w: 12, h: 8, x: 11, y: 8 },
] },
  /* 右栏文档来自 /api/query/sql，静态预览取不到；这里预置两个相同占位用于「重复占位」。 */
  'siyuan-sipage-petal:cardState': { data: { qp: { docs: [{ id: 'seed-doc', title: '验证文档' }, { id: 'seed-doc', title: '验证文档' }] } } },
} })
const { page, errors } = harness
const checks = []
const screenshot = name => process.env.VERIFY_NO_SCREENSHOTS ? Promise.resolve() : page.screenshot({ path: path.join(out, name) })
try {
  await harness.goto()
  const icons = await page.locator('.desk-slot-ic svg').evaluateAll(elements => elements.map(svg => {
    const style = getComputedStyle(svg)
    return { fill: style.fill, stroke: style.stroke, width: svg.getBoundingClientRect().width }
  }))
  assert.ok(icons.length > 0, 'shortcut icons render')
  assert.equal(icons.filter(icon => icon.fill !== 'none').length, 0, 'shortcut icons keep stroke style, not filled')
  assert.ok(icons.every(icon => icon.width > 0), 'shortcut icons have size')
  await screenshot('controls-shortcut.png')
  checks.push('shortcut card renders stroke icons without fill')

  await page.locator('.desk-root .frame').nth(1).locator('.body').click({ position: { x: 40, y: 40 } })
  const dialog = page.locator('.desk-sheet')
  await dialog.waitFor()
  const paneBorder = await dialog.locator('.desk-pane').first().evaluate(el => getComputedStyle(el).borderTopWidth)
  assert.equal(paneBorder, '0px', 'dialog panes have no border')
  checks.push('dialog panes render without a border')

  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })
  const second = page.locator('.desk-root .frame').nth(1)
  await second.locator('.body').click({ position: { x: 40, y: 40 } })
  await dialog.waitFor()
  const select = dialog.locator('button.gs-trigger').first()
  await select.waitFor()
  const selectStyle = await select.evaluate(el => {
    const style = getComputedStyle(el)
    return { arrow: getComputedStyle(el.querySelector('.gs-arrow')).transform, border: style.borderTopWidth, label: el.getAttribute('aria-label') }
  })
  assert.ok(selectStyle.label, 'dropdown trigger keeps an accessible name')
  assert.notEqual(selectStyle.border, '0px', 'dropdown trigger keeps the field edge')
  await select.click()
  const popup = page.locator('.desk-pop')
  await popup.waitFor()
  const popupStyle = await popup.evaluate(el => ({ background: getComputedStyle(el).backgroundImage, filter: getComputedStyle(el).backdropFilter, radius: getComputedStyle(el).borderTopLeftRadius }))
  assert.match(popupStyle.background, /gradient/, 'dropdown paints glass surface')
  assert.match(popupStyle.filter, /blur/, 'dropdown keeps backdrop blur')
  assert.notEqual(popupStyle.radius, '0px')
  await screenshot('controls-dropdown.png')
  await page.keyboard.press('Escape')
  await popup.waitFor({ state: 'detached' })
  await page.waitForTimeout(350)
  await screenshot('controls-calendar-light.png')
  await page.evaluate(() => document.body.classList.add('body--dark'))
  await page.waitForTimeout(150)
  await screenshot('controls-calendar-dark.png')
  checks.push('calendar uses the custom glass dropdown with a themed chevron')
  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })

  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '添加卡片', exact: true }).click()
  await page.locator('.lib-list').waitFor()
  const badge = dialog.locator('.desk-set-count')
  assert.match(await badge.textContent(), /尚未添加/, 'library shows an explicit empty state')
  const before = await badge.evaluate(el => el.getBoundingClientRect().width)
  await dialog.getByRole('button', { name: '添加到桌面', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.desk-set-count')?.textContent.includes('已添加'))
  const badgeAfter = await badge.evaluate(el => ({ width: el.getBoundingClientRect().width, color: getComputedStyle(el).color }))
  assert.ok(badgeAfter.width > 0 && Math.abs(badgeAfter.width - before) < 200, 'badge stays compact')
  assert.match(await badge.getAttribute('class'), /is-on/)
  assert.equal(await dialog.getByRole('button', { name: '移除一张', exact: true }).count(), 1)
  assert.ok(await page.locator('.lib-row .lib-count').count() >= 1, 'library row marks the added card')
  await screenshot('controls-library-added.png')
  checks.push('library add state and counts use the shared glass badge')

  // 倒数日中间栏：主事件与事件行左右内缩一致、行间距统一。
  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })
  await page.evaluate(() => {
    globalThis.__sipageDesk.cards = [{ uid: 'cd', cardId: 'countdown', w: 12, h: 8, x: 1, y: 20 }]
  })
  await page.waitForFunction(() => document.querySelectorAll('.desk-root .frame').length === 1)
  await page.evaluate(() => document.querySelector('.desk-root .frame').dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await dialog.locator('.cd-panel').waitFor()
  const box = await dialog.locator('.cd-items').evaluate(list => {
    const rects = [...list.children].map(el => el.getBoundingClientRect())
    const listRect = list.getBoundingClientRect()
    return { left: rects.map(r => Math.round(r.left - listRect.left)), right: rects.map(r => Math.round(listRect.right - r.right)), gaps: rects.slice(1).map((r, i) => Math.round(r.top - rects[i].bottom)) }
  })
  assert.equal(new Set(box.left).size, 1, `all rows share one left inset: ${box.left}`)
  assert.equal(new Set(box.right).size, 1, `all rows share one right inset: ${box.right}`)
  assert.equal(new Set(box.gaps).size, 1, `all rows share one gap: ${box.gaps}`)
  await screenshot('controls-countdown-spacing.png')
  checks.push('countdown middle column uses one inset and one gap')

  // 快捷打开：同一篇文档可以重复占位，按次移除，列表与持久化一致。
  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })
  await page.evaluate(() => { globalThis.__sipageDesk.cards = [{ uid: 'qp', cardId: 'quickopen', w: 12, h: 8, x: 1, y: 1 }] })
  await page.waitForFunction(() => !!document.querySelector('.desk-root .frame'))
  await page.evaluate(() => document.querySelector('.desk-root .frame').dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await dialog.locator('.qp-panel').waitFor()
  const added = dialog.locator('.qp-col.is-left .qp-item')
  assert.equal(await added.count(), 2, 'the same document can occupy two slots')
  assert.match(await dialog.locator('.qp-col.is-left .qp-sub').textContent(), /已添加 2\/8/, 'the header counts every slot')
  await added.first().getByRole('button', { name: '移除', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.qp-col.is-left .qp-item').length === 1)
  await page.waitForTimeout(250)
  /* 实例状态：每张卡一份，存在插件存储的 cardStates 里（验证页用内存镜像） */
  assert.equal(await page.evaluate(() => globalThis.__sipageCardStates.data.qp.docs.length), 1, 'removal drops exactly one occurrence')
  await screenshot('controls-quickopen.png')
  checks.push('quick open keeps repeated slots, counts them, and removes one occurrence per click')

  report('controls', checks, errors, ['controls-shortcut.png', 'controls-dropdown.png', 'controls-calendar-light.png', 'controls-calendar-dark.png', 'controls-library-added.png', 'controls-countdown-spacing.png', 'controls-quickopen.png'])
} finally { await harness.close() }
