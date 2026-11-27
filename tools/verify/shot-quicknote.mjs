/**
 * 快速记录卡：桌面 / 详情 / 写入格式 的浏览器回归
 *
 * 跑法：pnpm dev:card && node tools/verify/shot-quicknote.mjs
 * 断言三件事：
 *   1. 渲染卡片不许建日记（createDailyNote 必须在提交后才出现）
 *   2. 回车提交走 /api/block/appendBlock（markdown），历史与计数同步
 *   3. 详情能开、格式切到「待办」后写入带 `- [ ]` 前缀
 */
import { openBrowser, report } from './browser.mjs'

const storage = {
  'siyuan-sipage-petal:desk': {
    cards: [
      { uid: 'qn-1', cardId: 'quicknote', w: 6, h: 6, x: 0, y: 0 },
      { uid: 'qn-2', cardId: 'quicknote', w: 10, h: 8, x: 6, y: 0 },
    ],
  },
  'siyuan-sipage-petal:appearance': { cell: 27, motion: false, style: 'liquid' },
}

const { page, errors, goto, close } = await openBrowser({ storage })
const calls = []
page.on('request', (req) => {
  const url = req.url()
  if (url.includes('/api/')) calls.push(`${new URL(url).pathname} ${req.postData() || ''}`)
})

const checks = []
const shots = []

try {
  await goto()
  await page.waitForSelector('.qn-card', { timeout: 15000 })
  checks.push('快速记录卡已渲染')

  const createdBefore = calls.filter((c) => c.includes('createDailyNote')).length
  checks.push(`渲染期 createDailyNote 调用次数: ${createdBefore}`)
  if (createdBefore !== 0) throw new Error('卡片渲染就调用了 createDailyNote（会凭空建日记）')

  await page.fill('.qn-card .gf', '烟测：这一行应该进今天的日记')
  await page.press('.qn-card .gf', 'Enter')
  await page.waitForSelector('.desk-toast', { timeout: 8000 })
  checks.push(`toast: ${(await page.textContent('.desk-toast'))?.trim()}`)
  await page.waitForFunction(() => document.querySelectorAll('.qn-card .qn-row').length >= 1, null, { timeout: 8000 })
  checks.push('历史出现 1 行')
  checks.push(`计数: ${(await page.textContent('.qn-card .qn-count'))?.trim()}`)

  const appended = calls.filter((c) => c.includes('/api/block/appendBlock'))
  checks.push(`appendBlock 调用: ${appended.length} 次`)
  if (!appended.length) throw new Error('提交后没有调用 appendBlock')
  if (!appended[0].includes('markdown')) throw new Error('appendBlock 未使用 markdown')

  const disabled = await page.getAttribute('.qn-card form .gb', 'disabled')
  checks.push(`提交后（输入已清空）按钮 disabled=${disabled === '' ? 'yes' : 'no'}`)

  shots.push(await page.screenshot({ path: 'docs/screens/quicknote-card.png' }))

  await page.click('.qn-card .qn-head')
  await page.waitForSelector('.qnp', { timeout: 8000 })
  checks.push('详情已打开')
  checks.push(`目标: ${(await page.textContent('.qnp-target-name'))?.trim()}`)
  checks.push(`格式项: ${await page.locator('.qnp .seg-item').count()}`)
  shots.push(await page.screenshot({ path: 'docs/screens/quicknote-panel.png' }))

  /* 6 格高的卡只显示 1 行历史，第二次写入按计数断言 */
  await page.click('.qnp .seg-item >> nth=1')
  await page.keyboard.press('Escape')
  await page.waitForSelector('.qnp', { state: 'detached', timeout: 5000 }).catch(() => {})
  await page.fill('.qn-card .gf', '待办格式的一条')
  await page.press('.qn-card .gf', 'Enter')
  await page.waitForFunction(() => document.querySelector('.qn-card .qn-count')?.textContent?.includes('2'), null, { timeout: 8000 })
  const lastAppend = calls.filter((c) => c.includes('appendBlock')).at(-1) || ''
  checks.push(`第二次写入体: ${lastAppend.slice(0, 140)}`)
  if (!lastAppend.includes('- [ ]')) throw new Error('待办格式没有加 - [ ] 前缀')

  report('quicknote', checks, errors, shots)
} catch (error) {
  console.error('SMOKE FAILED:', error.message)
  console.error('checks so far:', checks)
  if (errors.length) console.error('browser errors:', errors)
  process.exitCode = 1
} finally {
  await close()
}
