import { chromium } from "playwright-core"

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const TOKEN = "bct45z7gltevi22s"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
await page.goto(`http://127.0.0.1:6806/?id=${TOKEN}`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(18000)
await page.evaluate(() => document.querySelector("#message")?.remove())

// 打开桌面
let ok = false
for (let i = 0; i < 8 && !ok; i++) {
  const btn = page.locator('[aria-label="桌面卡片"]').first()
  if (await btn.count()) {
    await btn.click({ force: true }).catch(() => {})
    try {
      await page.waitForSelector(".desk-root .item", { timeout: 3000 })
      ok = true
    } catch {}
  }
  if (!ok) await sleep(2000)
}
console.log("desk open:", ok)
if (!ok) { await browser.close(); process.exit(1) }

// 右键菜单 → 设置
const root = await page.locator(".desk-root").first().boundingBox()
await page.mouse.click(root.x + 60, root.y + root.height - 40, { button: "right" })
await page.waitForTimeout(800)
const item = page.locator(".b3-menu__item").filter({ hasText: /设置|偏好/ }).first()
console.log("menu item:", await item.count())
await item.click()
await page.waitForTimeout(1200)

const box = await page.locator(".set").first().boundingBox()
console.log("sheet:", box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "none")

// 来源网格：3 列两行
const grid = await page.evaluate(() => {
  const el = document.querySelector(".sources")
  if (!el) return null
  const cs = getComputedStyle(el)
  const items = [...el.children].map((c) => {
    const b = c.getBoundingClientRect()
    return { label: c.querySelector("strong")?.textContent, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) }
  })
  return { cols: cs.gridTemplateColumns, count: el.children.length, items }
})
console.log("sources grid:", JSON.stringify(grid, null, 1))

// 跟随思源：点击并读桌面壁纸样式
const themeBtn = page.locator(".source", { hasText: "跟随思源" }).first()
console.log("跟随思源 存在:", await themeBtn.count())
await themeBtn.click()
await page.waitForTimeout(600)
console.log("theme active:", await themeBtn.evaluate((el) => el.classList.contains("is-active")))
console.log("hint:", await page.locator(".desk-hint").first().textContent().catch(() => "-"))
console.log("meta:", await page.locator(".set-meta").first().innerText().catch(() => "-"))
console.log("recent items:", await page.locator(".set-recent-item").count())
const wallAfterTheme = await page.evaluate(() => document.querySelector(".desk-wallpaper")?.getAttribute("style") ?? "")
console.log("wall style:", wallAfterTheme)

// Picsum：点来源，看缩略图列表
await page.locator(".source", { hasText: "Picsum" }).first().click()
await page.waitForTimeout(1500)
const pic = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll(".picsum .desk-tile")]
  return {
    tiles: tiles.length,
    first: tiles[0]?.getAttribute("style") ?? "",
    bar: document.querySelector(".picsum-bar .desk-hint")?.textContent ?? "",
    urlRow: !!document.querySelector(".url-row"),
    loaded: tiles.filter((t) => {
      const m = (t.style.backgroundImage || "").match(/url\("?([^")]+)"?\)/)
      return !!m
    }).length,
  }
})
console.log("picsum:", JSON.stringify(pic))
await page.locator(".picsum .desk-tile").nth(2).click()
await page.waitForTimeout(500)
console.log("after pick:", await page.evaluate(() => document.querySelector(".desk-wallpaper")?.getAttribute("style") ?? ""))
console.log("meta2:", await page.locator(".set-meta").first().innerText())
console.log("recent2:", await page.locator(".set-recent-item").count())

await page.screenshot({ path: "tools/_wall.png" })
// 桌面侧：关掉设置看一眼
await page.keyboard.press("Escape")
await page.waitForTimeout(800)
await page.screenshot({ path: "tools/_desk.png" })
await browser.close()