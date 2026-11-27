/** 当前 UI 回归：设置/卡片库/材质/全部卡片/详情全屏/文档内嵌生命周期。 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, panels, out, report } from './browser.mjs'

const cards = [
  ['clock', '时钟', true], ['calendar', '日历', true], ['daily', '日记', true], ['quicknote', '快速记录', true], ['english', '每日英语', false],
  ['yiyan', '每日一言', false], ['shici', '每日诗词', false], ['weather', '天气', false],
  ['countdown', '倒数日', true], ['heatmap', '写作热力图', true], ['pomodoro', '番茄钟', true],
  ['memo', '日程备忘', true], ['docstats', '文档统计', true], ['quickopen', '快捷打开', true],
  ['recent', '最近文档', true], ['shortcut', '快捷方式', true], ['block', '思源块', true],
]
const harness = await openBrowser({ storage: { 'siyuan-sipage-petal:desk': { cards: panels } } })
const { page, errors } = harness
const checks = []
const screenshots = process.env.VERIFY_NO_SCREENSHOTS ? [] : ['ui-library.png', 'ui-desktop-dark.png']
const dialog = page.locator('.desk-sheet')
const nav = page.locator('.desk-set-nav')
async function openLibrary() {
  await page.locator('.tools').hover()
  await page.getByRole('button', { name: '添加卡片', exact: true }).click()
  await page.locator('.lib-row').first().waitFor()
}
async function closeSheet() {
  await dialog.locator('.desk-sheet-close').click()
  await dialog.waitFor({ state: 'detached' })
}
try {
  await harness.goto()
  await openLibrary()
  assert.equal(await page.locator('.lib-row').count(), cards.length, 'Add card opens the library directly')
  const preview = page.locator('.desk-set-card-live .frame')
  for (const [, name, solid] of cards) {
    await page.locator('.lib-row').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) }).click()
    await page.waitForFunction(({ name, solid }) => {
      const frame = document.querySelector('.desk-set-card-live .frame')
      return document.querySelector('.desk-set-card-name')?.textContent === name && frame?.classList.contains('is-solid') === solid
    }, { name, solid })
    assert.equal(await preview.locator('.body > *').count(), 1, `${name} preview renders`)
    assert.equal(await preview.locator(':scope > button.gb').count(), 0, 'Previews have no floating controls')
  }
  checks.push(`all ${cards.length} library previews render and switch solid/glass materials reactively`)

  await page.locator('.lib-row').filter({ has: page.locator('b', { hasText: /^日历$/ }) }).click()
  await page.getByRole('button', { name: '添加到桌面', exact: true }).click()
  assert.equal(await page.evaluate(() => globalThis.__sipageDesk.cards.filter(c => c.cardId === 'calendar').length), 1)
  await page.getByRole('button', { name: '移除一张', exact: true }).click()
  assert.equal(await page.evaluate(() => globalThis.__sipageDesk.cards.filter(c => c.cardId === 'calendar').length), 0)
  checks.push('library add/remove changes exactly one card')

  for (const name of ['壁纸', '组件设置', '关于', '卡片库']) {
    await nav.getByRole('button', { name: new RegExp(`^${name}`) }).click()
    assert.equal(await page.locator('.desk-set-main h2').textContent(), name)
  }
  await preview.click()
  assert.equal(await dialog.count(), 1, 'Preview cannot open another detail')
  if (screenshots.length) await page.screenshot({ path: path.join(out, 'ui-library.png') })
  await nav.getByRole('button', { name: '组件设置', exact: true }).click()
  const radius = page.locator('.slider').filter({ has: page.locator('.slider-label', { hasText: /^圆角$/ }) }).locator('input')
  await radius.focus()
  await radius.press('Home')
  await radius.press('ArrowRight')
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--desk-r-card').trim() === '2px')
  assert.equal(await page.locator('.desk-set-preview-card').evaluate(el => getComputedStyle(el).borderRadius), '2px')
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--desk-r-card').trim() === '18px')
  checks.push('all settings tabs work; appearance slider updates shared CSS variables and reset restores defaults')

  /* 四套材质：切换只改令牌，不动布局 */
  for (const [label, style, blur, radius] of [['原生', 'native', '0px', null], ['MD3', 'md3', '0px', '20px'], ['玻璃', 'liquid', '18px', null]]) {
    await page.getByRole('tab', { name: label, exact: true }).click()
    await page.waitForFunction((want) => document.body.dataset.deskStyle === want, style)
    assert.equal(
      await page.locator('.desk-set-preview-card').first().evaluate((el) => getComputedStyle(el).backdropFilter),
      blur === '0px' ? 'none' : 'blur(18px) saturate(1.35)',
      `${style} swaps the surface material`,
    )
    /* 控件也跟着换：非玻璃风格没有镜片、也没有模糊 */
    const chrome = await page.locator('.desk-set-nav-item').first().evaluate((el) => {
      const cs = getComputedStyle(el)
      return { filter: cs.backdropFilter, radius: cs.borderTopLeftRadius }
    })
    assert.equal(chrome.filter, blur === '0px' ? 'none' : chrome.filter, `${style} swaps control chrome`)
    if (radius) assert.equal(chrome.radius, radius, `${style} uses its own control radius`)
  }
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  await page.waitForFunction(() => document.body.dataset.deskStyle === 'liquid')
  checks.push('three surfaces (liquid / native / md3) switch by tokens without touching layout')

  // 每次注入旧运行时图像，再用真实来源按钮切换，验证统一入口清理缓存。
  await nav.getByRole('button', { name: '壁纸', exact: true }).click()
  const source = name => page.locator('.source').filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) })
  const oldImage = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>').toString('base64')
  const prime = () => page.evaluate(value => { globalThis.__sipageWallpaper.resolved = value }, oldImage)
  const wall = () => page.evaluate(() => {
    const el = document.querySelector('.desk-wallpaper')
    return {
      ...globalThis.__sipageWallpaper,
      /* 跟随思源不画底片：这一层根本不存在 */
      background: el ? getComputedStyle(el).background : '',
      image: el ? getComputedStyle(el).backgroundImage : 'none',
    }
  })
  const assertSource = async type => {
    await page.waitForFunction(type => globalThis.__sipageWallpaper.type === type && globalThis.__sipageWallpaper.resolved === undefined, type)
    const state = await wall()
    assert.ok(!state.image.includes(oldImage), `${type}: previous resolved image is gone`)
    return state
  }
  const fixtureImage = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><path fill="#567" d="M0 0h64v36H0z"/></svg>'
  await page.route('**/api/search/searchAsset', route => route.fulfill({ json: { code: 0, data: [{ path: 'assets/verify-wallpaper.png' }] } }))
  await page.route('**/assets/verify-wallpaper.png', route => route.fulfill({ contentType: 'image/svg+xml', body: fixtureImage }))
  await page.route('https://fixture.invalid/wallpaper.png', route => route.fulfill({ contentType: 'image/svg+xml', body: fixtureImage }))
  await prime()
  await source('纯色').click()
  const solidWall = await assertSource('solid')
  assert.equal(solidWall.image, 'none')
  assert.ok(solidWall.background, 'Solid color reaches the desktop background')
  await prime()
  await source('跟随思源').click()
  const themeWall = await assertSource('theme')
  /* 跟随思源 = 什么都不画：桌面层透明、没有遮罩，直接透出思源背景 */
  assert.equal(themeWall.image, 'none', 'theme mode paints no background layer')
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.desk-root')).backgroundColor), 'rgba(0, 0, 0, 0)')
  assert.equal(await page.locator('.desk-wallpaper-mask').count(), 0, 'theme mode drops the photo mask')
  await prime()
  await source('思源头图').click()
  assert.match((await assertSource('cover')).image, /\/appearance\/covers\//)
  await prime()
  await source('思源资源').click()
  assert.match((await assertSource('siyuan')).image, /\/assets\/verify-wallpaper\.png/)
  await prime()
  await source('图片链接').click()
  await page.locator('.url-row input').fill('https://fixture.invalid/wallpaper.png')
  await prime()
  await page.locator('.url-row').getByRole('button', { name: '使用', exact: true }).click()
  assert.match((await assertSource('url')).image, /fixture\.invalid\/wallpaper\.png/)
  checks.push('solid/theme/cover/assets/URL selections clear stale resolved data and update desktop background')

  // 第二张原图故意晚返回，第三张先返回；最终选择必须保留第三张。
  let releaseSlow
  let sawSlow
  const slowStarted = new Promise(resolve => { sawSlow = resolve })
  const proxyHandler = async route => {
    const request = route.request().postDataJSON()
    if (!String(request.url).includes('picsum.photos')) return route.fallback()
    if (String(request.url).includes('/ridge/1920/1080')) {
      sawSlow()
      await new Promise(resolve => { releaseSlow = resolve })
    }
    const body = Buffer.from(fixtureImage.replace('#567', request.url.includes('harbor') ? '#789' : '#345')).toString('base64')
    return route.fulfill({ json: { code: 0, data: { contentType: 'image/svg+xml', body } } })
  }
  await page.route('**/api/network/forwardProxy', proxyHandler)
  await source('Picsum').click()
  await page.waitForFunction(() => globalThis.__sipageWallpaper.source === 'picsum')
  await page.getByRole('button', { name: 'Picsum · ridge', exact: true }).click()
  await slowStarted
  await page.getByRole('button', { name: 'Picsum · harbor', exact: true }).click()
  await page.waitForFunction(() => globalThis.__sipageWallpaper.value.includes('/harbor/'))
  const slowResponse = page.waitForResponse(response => response.url().endsWith('/api/network/forwardProxy') && response.request().postDataJSON().url.includes('/ridge/1920/1080'))
  releaseSlow()
  await slowResponse
  await page.waitForTimeout(100)
  assert.match((await wall()).value, /\/harbor\//)
  assert.ok((await wall()).resolved?.startsWith('data:image/'))
  await page.unroute('**/api/network/forwardProxy', proxyHandler)
  checks.push('delayed Picsum responses cannot overwrite the last image selection')

  // 收藏镜像也只存在本测试页；模拟内核拒绝删除，确认项目不会先丢掉收藏状态。
  await page.evaluate(() => globalThis.__sipageFavorites.push('verify-kept.png'))
  await page.route('**/api/file/removeFile', route => route.fulfill({ json: { code: -1, msg: 'fixture deletion failed' } }))
  const deleteResponse = page.waitForResponse(response => response.url().endsWith('/api/file/removeFile'))
  await page.locator('.desk-set-fav-item').first().getByRole('button', { name: '删除收藏', exact: true }).click({ force: true })
  await deleteResponse
  await page.waitForFunction(() => [...document.querySelectorAll('body > div')].some(el => el.textContent.includes('删除收藏失败')))
  assert.ok(await page.evaluate(() => globalThis.__sipageFavorites.includes('verify-kept.png')))
  assert.equal(await page.locator('.desk-set-fav-item').count(), 1)
  await page.evaluate(() => globalThis.__sipageFavorites.splice(0))
  checks.push('failed favorite deletion preserves both the favorites mirror and visible item')
  await closeSheet()

  await page.evaluate(({ cards, panels }) => {
    globalThis.__sipageDesk.cards = [...panels, ...cards.map(([cardId], index) => ({ uid: `verify-${cardId}`, cardId, w: 6, h: 6, x: 1 + index % 6 * 8, y: 8 + Math.floor(index / 6) * 8 }))]
  }, { cards, panels })
  const frames = page.locator('.desk-root .item:not(.is-panel) > .frame')
  await page.waitForFunction((n) => document.querySelectorAll('.desk-root .item:not(.is-panel) > .frame').length === n, cards.length)
  for (const [w, h] of [[6, 6], [12, 6], [6, 12]]) {
    await page.evaluate(({ w, h }) => {
      for (const card of globalThis.__sipageDesk.cards) if (!card.cardId.startsWith('@')) { card.w = w; card.h = h }
    }, { w, h })
    await page.waitForTimeout(280)
    const boxes = await frames.evaluateAll(elements => elements.map(frame => {
      const content = frame.querySelector('.body > *')
      const box = content?.getBoundingClientRect()
      return { content: !!content, width: box?.width, height: box?.height }
    }))
    assert.ok(boxes.every(box => box.content && box.width > 0 && box.height > 0), `All cards have nonzero content boxes at ${w}×${h}`)
  }
  checks.push(`all ${cards.length} desktop cards render square, wide and tall content boxes without runtime errors`)
  // 操作较小的日历，避免测试点击落到视口外。
  await page.evaluate(() => {
    for (const c of globalThis.__sipageDesk.cards) if (!c.cardId.startsWith('@')) { c.w = 6; c.h = 6 }
  })
  await page.waitForTimeout(280)
  const calendar = frames.nth(1)
  await calendar.scrollIntoViewIfNeeded()
  /* 卡片上没有悬浮控件：hover 之后也只能找到 0 个按钮，点卡面就是详情 */
  assert.equal(await calendar.locator(':scope > button').count(), 0, 'cards carry no hover controls')
  await calendar.locator('.body').click({ position: { x: 50, y: 50 } })
  await dialog.waitFor()
  assert.equal(await dialog.locator('.desk-sheet-head-title').textContent(), '日历')
  await dialog.getByRole('button', { name: '全屏', exact: true }).click()
  await page.locator('.desk-full').waitFor()
  await dialog.waitFor({ state: 'detached' })
  assert.equal(await dialog.count(), 0, 'Detail fullscreen closes the sheet')
  await page.keyboard.press('Escape')
  await page.locator('.desk-full').waitFor({ state: 'detached' })
  checks.push('cards have no hover controls; a click opens the detail, fullscreen lives in the sheet header')

  // 验证框架销毁嵌套内嵌实例：保留 DOM 引用后移除整个父容器。
  await page.evaluate(() => {
    const host = document.createElement('section')
    host.id = 'verify-embed-host'
    host.innerHTML = '<div data-sipage-card="clock" data-size="2x2"></div>'
    document.body.append(host)
    globalThis.__verifyEmbed = host.firstElementChild
  })
  await page.waitForFunction(() => !!globalThis.__verifyEmbed?.__vue_app__)
  await page.evaluate(() => document.querySelector('#verify-embed-host').remove())
  await page.waitForFunction(() => !globalThis.__verifyEmbed.__vue_app__)
  checks.push('removing a parent container unmounts its nested document card')

  await page.evaluate(() => document.body.classList.add('body--dark'))
  if (screenshots.length) await page.screenshot({ path: path.join(out, 'ui-desktop-dark.png') })
  report(process.env.VERIFY_NO_SCREENSHOTS ? 'ui-isolated' : 'ui', checks, errors, screenshots)
} finally {
  await harness.close()
}
