/** 桌面时间组件回归：整分钟刷新、跨日、ISO 时间属性、卸载无异常。隔离验证页 + 假时钟。 */
import assert from 'node:assert/strict'
import { openBrowser, panels, report } from './browser.mjs'

const harness = await openBrowser({
  viewport: { width: 1200, height: 800 },
  clock: new Date(2026, 10, 22, 23, 59, 30),
  storage: { 'siyuan-sipage-petal:desk': { cards: panels } },
})
const { page, errors } = harness
try {
  await harness.goto()
  const time = page.locator('.desk-clock time')
  const date = page.locator('.desk-clock .date')
  await time.waitFor()
  assert.equal(await time.textContent(), '23:59')
  assert.equal(await date.textContent(), '11月22日 星期日')

  await page.clock.runFor(30_000)
  assert.equal(await time.textContent(), '00:00')
  assert.equal(await date.textContent(), '11月23日 星期一')
  const iso = await time.getAttribute('datetime')
  assert.ok(!Number.isNaN(Date.parse(iso)), `datetime is parseable: ${iso}`)
  /* datetime 取整分钟那一刻：与当前时间的「分钟起点」严格一致，不受时区影响 */
  const minuteStart = await page.evaluate(() => Math.floor(Date.now() / 60_000) * 60_000)
  assert.equal(Date.parse(iso), minuteStart)

  /* 后续每分钟只走一次，不累计漂移 */
  await page.clock.runFor(120_000)
  assert.equal(await time.textContent(), '00:02')

  const cleared = await page.evaluate(async () => {
    const clear = window.clearTimeout
    let count = 0
    window.clearTimeout = id => { count++; clear.call(window, id) }
    try {
      globalThis.__sipageDesk.cards = globalThis.__sipageDesk.cards.filter(card => card.cardId !== '@clock')
      await Promise.resolve()
      return count
    } finally { window.clearTimeout = clear }
  })
  assert.equal(await page.locator('.desk-clock').count(), 0)
  assert.ok(cleared > 0, 'Vue unmount clears the clock timer')
  await page.clock.runFor(60_000)
  report('deskclock', [
    'shows hour/minute and Chinese date',
    'minute boundary refresh and midnight date rollover',
    'datetime attribute matches the current minute boundary',
    'keeps one-minute cadence without drift',
    'Vue unmount clears the clock timer without errors',
  ], errors)
} finally {
  await harness.close()
}
