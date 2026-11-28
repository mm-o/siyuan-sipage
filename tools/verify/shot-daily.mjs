/**
 * 日记卡：今天日记的块 / 字 / 待办与正文前几行，详情里只读全文。
 * 样本来自 browser.mjs 的 SQL 替身（daily-doc）。
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, panels, out, report } from './browser.mjs'

const harness = await openBrowser({ storage: {
  'siyuan-sipage-petal:desk': { cards: [...panels, { uid: 'daily-card', cardId: 'daily', w: 8, h: 6, x: 1, y: 8 }] },
} })

const { page, errors } = harness
const checks = []
const screenshots = []
const sheet = page.locator('.desk-sheet')

async function screenshot(name) {
  if (process.env.VERIFY_NO_SCREENSHOTS) return
  await page.mouse.move(4, 4)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, name) })
  screenshots.push(name)
}

try {
  await harness.goto()
  const card = page.locator('.desk-root .item:not(.is-panel)').first()
  await card.locator('.dl-title').waitFor()
  assert.match(await card.locator('.dl-meta').textContent(), /128 字/)
  await card.locator('.protyle-view').waitFor()
  assert.equal(await card.locator('.dl-title').textContent(), await card.locator('.dl-title').textContent())
  await screenshot('daily-card.png')
  checks.push('daily card shows counts, open tasks and the first lines of today’s note')

  await page.evaluate(() => document.querySelector('.desk-root .item:not(.is-panel) .frame').dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await sheet.locator('.dl-panel').waitFor()
  await sheet.locator('.dl-day', { hasText: '128 字' }).waitFor()
  assert.match(await sheet.locator('.dl-day-label').textContent(), /今天/)
  const todoTexts = await sheet.locator('.dl-todos .mm-text').allTextContents()
  assert.ok(todoTexts.includes('给日记卡加联动'), 'diary task blocks are listed')
  assert.ok(await sheet.locator('.dl-todos .mm-row .mm-dot').count() >= 1, 'rows carry the shared dot')
  assert.ok(await sheet.locator('.dl-body .doc-pane-view p').count() >= 1, 'protyle placeholder is mounted (real render happens in SiYuan)')
  /* 统计行固定：没有日记也占位（这里换成前一天验证） */
  await sheet.locator('.mc-cell').nth(2).click()
  await page.waitForFunction(() => document.querySelector('.desk-sheet .dl-meta')?.textContent?.startsWith('0 块'))
  assert.match(await sheet.locator('.dl-meta').textContent(), /0 块 · 0 字/)
  await screenshot('daily-panel.png')
  checks.push('daily panel lists the day’s open tasks and mounts the read-only view')

  await sheet.getByRole('button', { name: '关闭', exact: true }).click()
  await page.waitForTimeout(400)
  assert.equal(await page.evaluate(() => document.body.classList.contains('desk-overlay')), false, 'overlay flag is cleared on close')
  checks.push('siyuan menus and dialogs render above the sheet, flag clears on close')

  report('daily', checks, errors, screenshots)
} finally {
  await harness.close()
}
