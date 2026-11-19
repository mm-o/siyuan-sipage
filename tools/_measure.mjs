import { chromium } from "playwright-core"

const EXE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const URL = "http://127.0.0.1:6806/stage/build/desktop/?windowTypes=file&token=bct45z7gltevi22s"

const b = await chromium.launch({ executablePath: EXE, headless: true })
const p = await b.newPage({ viewport: { width: 1500, height: 950 } })
p.on("console", (m) => m.type() === "error" && /report|sireader/.test(m.text()) === false && console.log("CONSOLE", m.text().slice(0, 160)))

await p.goto("http://127.0.0.1:6806", { waitUntil: "domcontentloaded" })
await p.waitForTimeout(18000)

// 打开桌面
for (let i = 0; i < 8; i++) {
  const btn = await p.$('[aria-label="桌面卡片"]')
  if (btn) { await btn.click().catch(() => {}); await p.waitForTimeout(2500) }
  if (await p.$(".desk-root .item")) break
}
console.log("desk:", !!(await p.$(".desk-root .item")))

// 打开设置 → 壁纸
const box = await p.$eval(".desk-root", (el) => { const r = el.getBoundingClientRect(); return { l: r.left, b: r.bottom } })
await p.mouse.click(box.l + 60, box.b - 40, { button: "right" })
await p.waitForTimeout(900)
const items = await p.$$(".b3-menu__item")
for (const it of items) {
  const t = (await it.innerText()).trim()
  if (/设置|偏好/.test(t)) { await it.click(); break }
}
await p.waitForTimeout(1600)

const probe = () =>
  p.evaluate(() => {
    const g = (s) => document.querySelector(s)
    const rows = (sel) => {
      const el = g(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      const cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length
      const kids = [...el.children]
      const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)))
      return { n: kids.length, cols, rows: tops.size, w: Math.round(el.getBoundingClientRect().width) }
    }
    const box = (sel) => {
      const el = g(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { h: Math.round(r.height), w: Math.round(r.width), scroll: el.scrollHeight, overflow: getComputedStyle(el).overflow }
    }
    return {
      sources: rows(".sources"),
      srcBtn: box(".source"),
      srcLabels: [...document.querySelectorAll(".source strong")].map((e) => e.textContent),
      main: box(".set-main"),
      side: box(".set-side"),
      tiles: rows(".picker .desk-tiles"),
      pickerHTML: g(".picker") ? g(".picker").textContent.replace(/\s+/g, " ").trim().slice(0, 90) : null,
    }
  })

console.log("STAGE1", JSON.stringify(await probe()))

for (const label of ["思源资源", "国内图源", "跟随思源", "纯色", "必应每日", "本地随机", "Picsum"]) {
  const btns = await p.$$(".source")
  for (const btn of btns) {
    const t = (await btn.innerText()).replace(/\s+/g, " ")
    if (t.startsWith(label)) { await btn.click(); break }
  }
  await p.waitForTimeout(label === "必应每日" ? 3200 : 1800)
  const r = await probe()
  console.log("SRC", label, "tiles", JSON.stringify(r.tiles), "main", JSON.stringify(r.main))
}

// 应用思源资源 → 看桌面背景
const btns = await p.$$(".source")
for (const btn of btns) {
  const t = (await btn.innerText()).replace(/\s+/g, " ")
  if (t.startsWith("思源资源")) { await btn.click(); break }
}
await p.waitForTimeout(1500)
const tiles = await p.$$(".picker .desk-tile")
if (tiles.length) await tiles[0].click()
await p.waitForTimeout(1200)
const state = await p.evaluate(() => {
  const w = document.querySelector(".desk-wall")
  const src = document.querySelector(".set-preview")
  return {
    wallBg: w ? getComputedStyle(w).backgroundImage.slice(0, 100) : null,
    previewBg: src ? getComputedStyle(src).backgroundImage.slice(0, 100) : null,
    label: document.querySelector(".set-preview-tag")?.textContent?.trim(),
    size: document.querySelector(".set-meta-size")?.textContent?.trim(),
  }
})
console.log("APPLIED", JSON.stringify(state))

await b.close()