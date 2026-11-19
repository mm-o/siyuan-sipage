import { chromium } from "playwright-core"

const b = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
})
const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
const logs = []
p.on("console", (m) => { if (/desk-cards|error/i.test(m.text())) logs.push(m.text().slice(0, 140)) })
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message.slice(0, 140)))

await p.goto("http://127.0.0.1:6806/?token=bct45z7gltevi22s", { waitUntil: "domcontentloaded" })
await p.waitForTimeout(8000)
await p.evaluate(() => document.querySelector("#message")?.remove())
await p.evaluate(() =>
  [...document.querySelectorAll("#toolbar .b3-tooltips, .toolbar__item")]
    .find((x) => /desk|桌面|参考实现/i.test(x.getAttribute("aria-label") || x.getAttribute("title") || ""))
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
)
await p.waitForTimeout(2800)

const r = await p.evaluate(() => {
  const root = document.querySelector(".desk-root")
  const wp = document.querySelector(".desk-wallpaper")
  const scroll = document.querySelector(".desk-scroll")
  const canvas = document.querySelector(".desk-canvas")
  const box = (el) => el ? (({ left, top, width, height }) => [Math.round(left), Math.round(top), Math.round(width), Math.round(height)])(el.getBoundingClientRect()) : null
  const rb = root.getBoundingClientRect()
  const wb = wp.getBoundingClientRect()
  return {
    root: box(root),
    wallpaper: box(wp),
    wallpaperCoversRoot:
      Math.abs(wb.left - rb.left) < 1 && Math.abs(wb.top - rb.top) < 1 &&
      Math.abs(wb.right - rb.right) < 1 && Math.abs(wb.bottom - rb.bottom) < 1,
    canvas: box(canvas),
    scroll: box(scroll),
    canvasVsScroll: canvas.getBoundingClientRect().width - scroll.getBoundingClientRect().width,
    items: document.querySelectorAll(".grid-item").length,
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
