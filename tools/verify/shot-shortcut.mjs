/** 快捷方式面板：分类图标描边、可重复添加、已添加徽章与移除。 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, panels, out, report } from './browser.mjs'

const harness = await openBrowser({ storage: {
  'desk-cards:desk': { cards: [...panels, { uid: 'shortcut', cardId: 'shortcut', w: 8, h: 8, x: 1, y: 8 }] },
  'desk:shortcut': { enabled: ['search', 'back'] },
} })
const { page, errors } = harness
const checks = []
const dialog = page.locator('.desk-sheet')
const stored = () => page.evaluate(() => globalThis.__deskCardStates.data.shortcut.enabled)
try {
  await harness.goto()
  // 卡片内部全是快捷按钮，直接向卡框派发点击打开详情。
  await page.evaluate(() => document.querySelector('.desk-root .frame').dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await dialog.locator('.sc-panel').waitFor()
  const icons = await dialog.locator('.sc-col.is-left .tile svg').evaluateAll(elements => elements.map(svg => getComputedStyle(svg).fill))
  assert.ok(icons.length >= 5)
  assert.equal(icons.filter(fill => fill !== 'none').length, 0, 'category icons stay stroke-only')
  checks.push('shortcut category icons render as stroke, not filled')

  const search = dialog.locator('.sc-col.is-mid .row', { hasText: '全局搜索' })
  assert.equal(await search.locator('.desk-badge').textContent(), '1', 'added action shows its count')
  assert.equal(await dialog.locator('.sc-col.is-right .row').count(), 2)
  await search.getByRole('button', { name: '加入', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.sc-col.is-right .row').length === 3)
  assert.equal(await search.locator('.desk-badge').textContent(), '2', 'same action can be added again')
  await page.waitForTimeout(300)
  assert.equal((await stored()).filter(id => id === 'search').length, 2)
  checks.push('middle column allows repeated adds and reflects the count badge')

  await dialog.locator('.sc-col.is-right .row').first().getByRole('button', { name: '移除', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.sc-col.is-right .row').length === 2)
  assert.equal(await search.locator('.desk-badge').textContent(), '1', 'removing one occurrence keeps the remaining one')
  checks.push('right column removes exactly one occurrence')
  if (!process.env.VERIFY_NO_SCREENSHOTS) await page.screenshot({ path: path.join(out, 'controls-shortcut-panel.png') })
  report('shortcut', checks, errors, ['controls-shortcut-panel.png'])
} finally { await harness.close() }
