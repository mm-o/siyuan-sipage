/**
 * 快速记录卡：三个写入动作 + 目标文档渲染 的浏览器回归
 *
 * 跑法：pnpm dev:card && node tools/verify/shot-quicknote.mjs
 * 断言：
 *   1. 渲染卡片不许建日记；没有日记时显示"写下第一条会创建"
 *   2. 回车 = 沿用上次写法；点「待办 / 时间」直接写入对应前缀
 *   3. 写完卡片里出现目标文档本体（Protyle 挂载点），详情右栏也是文档本体
 */
import { openBrowser, report } from './browser.mjs'

const storage = {
  'siyuan-sipage-petal:desk': {
    cards: [
      { uid: 'qn-1', cardId: 'quicknote', w: 6, h: 8, x: 0, y: 0 },
      { uid: 'qn-2', cardId: 'quicknote', w: 10, h: 10, x: 8, y: 0 },
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
const appends = () => calls.filter((c) => c.includes('/api/block/appendBlock'))
const lastBody = () => {
  const raw = appends().at(-1) || ''
  const m = raw.match(/"data":"((?:[^"\\]|\\.)*)"/)
  return m ? JSON.parse(`"${m[1]}"`) : ''
}

try {
  await goto()
  await page.waitForSelector('.qn-card', { timeout: 15000 })
  checks.push('快速记录卡已渲染')
  checks.push(`动作按钮: ${await page.locator('.qn-card .qn-act').count()} 个`)

  const created0 = calls.filter((c) => c.includes('createDailyNote')).length
  checks.push(`渲染期 createDailyNote 调用次数: ${created0}`)
  if (created0 !== 0) throw new Error('卡片渲染就调用了 createDailyNote（会凭空建日记）')

  const previewCount = await page.locator('.qn-card .doc-pane').count()
  checks.push(`卡内文档预览(已有日记): ${previewCount} 个`)
  if (previewCount === 0) throw new Error('已有今天的日记时，卡片里应当直接渲染文档')

  /* 空输入时按钮仍可点：点了只提示、不写入（不做"点了没反应"的死按钮） */
  const clickable = await page.locator('.qn-card .qn-act').evaluateAll((els) => els.every((el) => !el.disabled))
  checks.push(`空输入时按钮可点: ${clickable}`)
  if (!clickable) throw new Error('空输入时按钮不该被禁用')
  const before = appends().length
  await page.locator('.qn-card .qn-act').first().click()
  await page.waitForTimeout(300)
  checks.push(`空输入点按钮: 新增写入 ${appends().length - before} 次（应为 0）`)
  if (appends().length !== before) throw new Error('空输入时点按钮不该写入')

  /* 1) 回车：首次纯文本（按 append 次数等，别被上一条 toast 骗了） */
  await page.fill('.qn-card .gf', '第一行：回车应该写纯文本')
  await page.press('.qn-card .gf', 'Enter')
  await page.waitForFunction(() => true)
  for (let i = 0; i < 20 && appends().length < before + 1; i += 1) await page.waitForTimeout(100)
  const first = lastBody()
  checks.push(`回车写入体: ${first}`)
  if (!first || first.startsWith('-')) throw new Error('首次回车应当写入纯文本')

  /* 写完卡片里出现文档本体（dev 里是 Protyle 替身） */
  await page.waitForSelector('.qn-card .doc-pane', { timeout: 8000 })
  checks.push(`卡内文档预览已挂载: ${await page.locator('.qn-card .doc-pane .protyle-view').count()} 个`)

  /* 2) 点「待办」 */
  await page.fill('.qn-card .gf', '第二行：点待办按钮')
  await page.locator('.qn-card .qn-act').nth(1).click()
  await page.waitForTimeout(700)
  const second = lastBody()
  checks.push(`待办写入体: ${second}`)
  if (!second.startsWith('- [ ] ')) throw new Error('待办没有 - [ ] 前缀')

  /* 3) 回车沿用上次（待办） */
  await page.fill('.qn-card .gf', '第三行：回车应沿用待办')
  await page.press('.qn-card .gf', 'Enter')
  await page.waitForTimeout(700)
  const third = lastBody()
  checks.push(`回车沿用写入体: ${third}`)
  if (!third.startsWith('- [ ] ')) throw new Error('回车没有沿用上次的待办写法')

  /* 4) 点「时间」 */
  await page.fill('.qn-card .gf', '第四行：点时间按钮')
  await page.locator('.qn-card .qn-act').nth(2).click()
  await page.waitForTimeout(700)
  const fourth = lastBody()
  checks.push(`时间戳写入体: ${fourth}`)
  if (!/^- \d{2}:\d{2} /.test(fourth)) throw new Error('时间戳前缀格式不对')

  shots.push(await page.screenshot({ path: 'docs/screens/quicknote-card.png' }))

  /* 5) 详情：左目标 + 输入条（三动作）+ 文档本体（与日记详情共用 DocPane） */
  await page.click('.qn-card .qn-head')
  await page.waitForSelector('.qnp', { timeout: 8000 })
  checks.push(`详情文档区: ${await page.locator('.qnp-doc .doc-pane').count()} 个`)
  checks.push(`详情动作按钮: ${await page.locator('.qnp-doc-compose .qn-act').count()} 个`)
  checks.push(`详情目标: ${(await page.textContent('.qnp-target-name'))?.trim()}`)
  shots.push(await page.screenshot({ path: 'docs/screens/quicknote-panel.png' }))

  report('quicknote', checks, errors, shots)
} catch (error) {
  console.error('SMOKE FAILED:', error.message)
  console.error('checks so far:', checks)
  if (errors.length) console.error('browser errors:', errors)
  process.exitCode = 1
} finally {
  await close()
}
