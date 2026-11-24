/**
 * 跟随思源：桌面不画自己的底片，直接搬思源当前背景（主题色 / 主题背景图）。
 *
 * 断言的是「和思源是一个底」这件事：桌面底色等于 body 底色、没有照片遮罩、
 * 时钟与工具组换回主题墨色；切到深色后三项一起跟着走。
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { openBrowser, out, report } from './browser.mjs'

const harness = await openBrowser({ storage: {
  'desk-cards:wallpaper': { type: 'theme', value: '', blur: 12, mask: 0.42 },
  'desk-cards:desk': { cards: [
    { uid: 'panel-clock', cardId: '@clock', w: 12, h: 6, x: 20, y: 0, auto: true },
    { uid: 'panel-tools', cardId: '@tools', w: 2, h: 2, x: 49, y: 0, auto: true },
    { uid: 'cal', cardId: 'calendar', w: 10, h: 6, x: 2, y: 9 },
    { uid: 'memo', cardId: 'memo', w: 10, h: 6, x: 14, y: 9 },
  ] },
} })

const { page, errors } = harness
const checks = []
const screenshots = []

const backdrop = () => page.evaluate(() => {
  const root = document.querySelector('.desk-root')
  const wall = document.querySelector('.desk-wallpaper')
  const body = getComputedStyle(document.body)
  return {
    rootColor: getComputedStyle(root).backgroundColor,
    wallColor: wall ? getComputedStyle(wall).backgroundColor : null,
    hasWall: !!wall,
    bodyColor: body.backgroundColor,
    image: wall ? getComputedStyle(wall).backgroundImage : null,
  }
})
const ink = selector => page.locator(selector).first().evaluate(el => getComputedStyle(el).color)

async function screenshot(name) {
  if (process.env.VERIFY_NO_SCREENSHOTS) return
  await page.mouse.move(4, 4)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, name) })
  screenshots.push(name)
}

try {
  await harness.goto()
  await page.locator('.desk-clock').waitFor()

  /* 1. 跟随思源：桌面不画底片，整层透出思源背景，遮罩与模糊都不存在 */
  assert.equal(await page.locator('.desk-root').evaluate(el => el.classList.contains('is-theme')), true)
  assert.equal(await page.locator('.desk-wallpaper-mask').count(), 0, 'photo mask is not rendered in theme mode')
  const light = await backdrop()
  assert.equal(light.hasWall, false, 'no wallpaper layer of our own')
  assert.equal(light.rootColor, 'rgba(0, 0, 0, 0)', 'desk root is transparent, so SiYuan’s own background shows')
  checks.push('theme mode paints nothing: the desk is SiYuan’s own background')

  /* 2. 字与控件跟随主题：浅色下深墨，深色下浅墨 */
  const LIGHT_INK = 'rgb(29, 31, 36)'
  const DARK_INK = 'rgb(242, 244, 248)'
  const lightInk = await ink('.desk-clock .time')
  const lightTool = await ink('.tools .gb')
  assert.equal(lightInk, LIGHT_INK, 'clock uses the theme ink instead of photo white')
  assert.equal(lightTool, LIGHT_INK, 'floating tools use the theme ink instead of photo white')
  await screenshot('theme-light.png')

  await page.evaluate(() => document.body.classList.add('body--dark'))
  await page.waitForTimeout(400)
  assert.equal(await ink('.desk-clock .time'), DARK_INK, 'clock ink follows the runtime theme')
  assert.equal(await ink('.tools .gb'), DARK_INK, 'tool ink follows the runtime theme')
  await screenshot('theme-dark.png')
  checks.push('clock/tool ink follows the runtime light/dark theme')

  /* 3. 换回照片底：图片、模糊、遮罩都回来，主题类摘掉 */
  await page.evaluate(() => document.body.classList.remove('body--dark'))
  await page.evaluate(() => {
    const { type, ...rest } = globalThis.__deskWallpaper
    Object.assign(globalThis.__deskWallpaper, { ...rest, type: 'cover', value: '/appearance/covers/cover_002.webp', resolved: undefined })
  })
  await page.waitForFunction(() => globalThis.__deskWallpaper.type === 'cover')
  await page.locator('.desk-wallpaper-mask').waitFor()
  assert.equal(await page.locator('.desk-root').evaluate(el => el.classList.contains('is-theme')), false)
  const photo = await backdrop()
  assert.equal(photo.hasWall, true)
  assert.match(photo.image, /cover_002/, 'switching back to a photo restores the image wallpaper')
  checks.push('switching away from theme mode restores the image wallpaper and mask')

  report('theme', checks, errors, screenshots)
} finally {
  await harness.close()
}
