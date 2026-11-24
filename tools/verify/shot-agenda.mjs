/**
 * 日程备忘：一张表两种身份（有日期是日程、没日期是备忘），卡片 / 详情 / 日历三处读同一份数据。
 *
 * 断言整条闭环：卡片分段 → 收件箱点「今天」进日历 → 详情新建 → 勾掉 → 日历当天清单与格子圆点。
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, out, report } from './browser.mjs'

const pad = n => String(n).padStart(2, '0')
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const now = new Date()
const today = key(now)
const day = offset => key(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))
const item = (id, text, date = '', time = '') => ({
  id, text, note: '', date, time, done: false, doneAt: 0, at: Number(id.replace(/\D/g, '')) || 1, syncedAt: 0,
})

const harness = await openBrowser({ storage: {
  'desk-cards:desk': { cards: [
    { uid: 'panel-clock', cardId: '@clock', w: 12, h: 6, x: 20, y: 0, auto: true },
    { uid: 'panel-tools', cardId: '@tools', w: 2, h: 2, x: 49, y: 0, auto: true },
    /* 卡片放到底部：弹窗居中，背后只有壁纸，截图不会被桌面卡片串味 */
    { uid: 'agenda-card', cardId: 'memo', w: 16, h: 10, x: 1, y: 26 },
    { uid: 'agenda-cal', cardId: 'calendar', w: 12, h: 8, x: 20, y: 26 },
  ] },
  'desk:agenda': { group: 'today', seeded: true, items: [
    item('ag1', '今天的站会', today, '09:30'),
    item('ag2', '收件箱里的一条备忘'),
    item('ag3', '昨天没做完的事', day(-1)),
    item('ag4', '明天的评审', day(1), '14:00'),
  ] },
} })

const { page, errors } = harness
const checks = []
const screenshots = []
const sheet = page.locator('.desk-sheet')
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('desk:agenda') || '{}'))

async function screenshot(name) {
  if (process.env.VERIFY_NO_SCREENSHOTS) return
  /* 玻璃栏会透出背后的桌面卡片（卡片上的大日号会被糊成一团 23），截图时只留壁纸 */
  await page.evaluate(() => {
    document.querySelectorAll('.desk-root .item').forEach(el => { el.style.visibility = 'hidden' })
  })
  await page.mouse.move(4, 4)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, name) })
  await page.evaluate(() => {
    document.querySelectorAll('.desk-root .item').forEach(el => { el.style.visibility = '' })
  })
  screenshots.push(name)
}

try {
  await harness.goto()

  /* 1. 卡片：今天 → 逾期 → 备忘 三段，未来日子留给日历 */
  const card = page.locator('.desk-root .item:not(.is-panel)').first()
  await card.locator('.mm-text').first().waitFor()
  const cardTexts = await card.locator('.mm-text').allTextContents()
  assert.ok(cardTexts.includes('今天的站会'), cardTexts.join('|'))
  assert.ok(cardTexts.includes('昨天没做完的事'), cardTexts.join('|'))
  assert.ok(cardTexts.includes('收件箱里的一条备忘'), cardTexts.join('|'))
  assert.equal(cardTexts.includes('明天的评审'), false, 'the card leaves future days to the calendar')
  assert.deepEqual(await card.locator('.mm-sec').allTextContents(), ['逾期1', '备忘1'], 'section heads carry their counts')
  if (!process.env.VERIFY_NO_SCREENSHOTS) {
    await page.waitForTimeout(300)
    await card.screenshot({ path: path.join(out, 'agenda-card.png') })
    screenshots.push('agenda-card.png')
  }
  checks.push('desk card stacks today → overdue → inbox, and future days stay in the calendar')

  /* 2. 详情：五个分组各算各的条数 */
  /* 悬浮控件盖住头部，直接派发 click 绕过命中测试 */
  await page.evaluate(() => {
    document.querySelectorAll('.desk-root .item:not(.is-panel)')[0].querySelector('.frame').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await sheet.locator('.mm-panel').waitFor()
  const nav = await sheet.locator('.mm-nav-btn').evaluateAll(nodes => nodes.map(node => ({
    name: node.querySelector('.mm-nav-name').textContent,
    count: node.querySelector('.desk-badge').textContent,
  })))
  assert.deepEqual(nav.map(entry => entry.name), ['今天', '逾期', '即将', '收件箱', '已完成'])
  assert.deepEqual(nav.map(entry => entry.count), ['1', '1', '1', '1', '0'])
  checks.push('panel groups count today/late/upcoming/inbox/done independently')

  /* 3. 收件箱 → 今天：备忘被安排成日程，日历当天立刻有它 */
  await sheet.locator('.mm-nav-btn', { hasText: '收件箱' }).click()
  await sheet.locator('.mm-list .mm-row', { hasText: '收件箱里的一条备忘' }).locator('.mm-text').click()
  await sheet.locator('.chips').getByRole('button', { name: '今天', exact: true }).click()
  await page.waitForFunction(([id, date]) => JSON.parse(localStorage.getItem('desk:agenda')).items.find(entry => entry.id === id)?.date === date, ['ag2', today])
  assert.equal((await store()).items.find(entry => entry.id === 'ag2').date, today)
  checks.push('inbox memo becomes a scheduled item the moment it is moved to today')

  /* 4. 新建 → 勾掉：条目与完成状态都落到同一个模型 */
  await sheet.locator('.mm-nav-btn', { hasText: '今天' }).click()
  await sheet.locator('.mm-new .desk-field').fill('新加的一条日程')
  await sheet.locator('.mm-new').getByRole('button', { name: '添加', exact: true }).click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('desk:agenda')).items.some(entry => entry.text === '新加的一条日程' && entry.date))
  await sheet.locator('.mm-list .mm-row', { hasText: '新加的一条日程' }).locator('.mm-dot').click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('desk:agenda')).items.find(entry => entry.text === '新加的一条日程')?.done === true)
  const created = (await store()).items.find(entry => entry.text === '新加的一条日程')
  assert.equal(created.date, today, 'new items in 今天 land on today')
  assert.equal(created.done, true)
  await screenshot('agenda-memo-panel.png')
  await page.evaluate(() => document.body.classList.add('body--dark'))
  await screenshot('agenda-memo-panel-dark.png')
  await page.evaluate(() => document.body.classList.remove('body--dark'))
  checks.push('panel creates on the group’s day and the dot writes through to the shared model')

  await sheet.locator('.desk-sheet-close').click()
  await sheet.waitFor({ state: 'detached' })

  /* 5. 日历：当天清单与格子圆点读的是同一份数据 */
  await page.evaluate(() => {
    document.querySelectorAll('.desk-root .item:not(.is-panel)')[1].querySelector('.frame').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await sheet.locator('.cal-panel').waitFor()
  await sheet.locator('.cal-cell.is-today').click()
  const agenda = await sheet.locator('.cal-list .mm-text').allTextContents()
  assert.ok(agenda.includes('今天的站会'), agenda.join('|'))
  assert.ok(agenda.includes('收件箱里的一条备忘'), agenda.join('|'))
  assert.ok(agenda.includes('新加的一条日程'), agenda.join('|'))
  assert.ok(await sheet.locator('.cal-cell.is-today .cal-dot.is-open').count() >= 1, 'today carries schedule dots')
  await screenshot('agenda-calendar-panel.png')
  checks.push('calendar day list and cell dots come from the same agenda store')

  /* 6. 写日记：没有笔记本时只提示失败，本地条目一条不少 */
  await sheet.getByRole('button', { name: '写入今天的日记', exact: true }).click()
  const toast = page.locator('.desk-toast')
  await toast.waitFor()
  assert.match(await toast.textContent(), /写入日记失败/)
  assert.equal((await store()).items.length, 5, 'a failed daily-note write never drops local items')
  checks.push('daily-note bridge fails soft: a toast, no local data loss')

  /* 7. 老版 desk:memo：迁进收件箱，旧键删掉，不会两边各一份 */
  await page.evaluate(() => {
    localStorage.setItem('desk:memo', JSON.stringify({ items: [{ id: 'legacy', text: '旧备忘录的一条', done: false, at: 1 }], filter: 'all' }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('desk:agenda') || '{}').items?.some(item => item.text === '旧备忘录的一条'))
  const migrated = await page.evaluate(() => ({
    legacy: localStorage.getItem('desk:memo'),
    item: JSON.parse(localStorage.getItem('desk:agenda')).items.find(entry => entry.text === '旧备忘录的一条'),
  }))
  assert.equal(migrated.legacy, null, 'the old key is dropped after migrating')
  assert.equal(migrated.item.date, '', 'legacy memos land in the inbox')
  checks.push('old desk:memo items migrate into the inbox once and the old key is dropped')

  report('agenda', checks, errors, screenshots)
} catch (error) {
  await harness.close()
  throw error
}
await harness.close()
