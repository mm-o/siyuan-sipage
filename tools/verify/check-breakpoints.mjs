/**
 * 断点守卫：@container 条件只允许 120 / 200 / 260 / 460 / 720 五个刻度。
 * 设计文档里说明「卡片版式只改形状档，不新增断点」；新增断点必须同时更新 styles/index.css 的刻度表。
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const OK = new Set([120, 200, 260, 460, 720])
const files = []
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (/\.(vue|css)$/.test(n)) files.push(p)
  }
}
walk("src")

const bad = []
for (const f of files) {
  const src = readFileSync(f, "utf8")
  for (const m of src.matchAll(/@container\s*\(([^)]+)\)/g)) {
    const nums = [...m[1].matchAll(/(\d+)px/g)].map((x) => Number(x[1]))
    for (const n of nums) if (!OK.has(n)) bad.push(`${f}: ${m[1].trim()}`)
  }
}

if (bad.length) {
  console.error("断点越界（只允许 120 / 200 / 260 / 460 / 720）：")
  for (const b of bad) console.error("  ✗ " + b)
  process.exit(1)
}
console.log("OK 断点收敛：@container 只用五个标准刻度")
