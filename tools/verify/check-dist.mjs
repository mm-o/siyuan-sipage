/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（Playwright 截图、产物守卫）。
 * 构建入口只有 src/index.ts；运行 pnpm check:dist 可自证 dist 里没有 .mjs。
 */
/**
 * 构建产物守卫
 *
 * 目的：证明「构建不会把测试脚本 / 参考源码打进去」。
 * 规则：
 *   1. dist 里只允许白名单扩展名（.js .css .json .png .webp .md .svg .woff .woff2）
 *   2. 任何 .mjs / .ts / .vue / .map 出现即失败
 *   3. index.js 里只允许 require("siyuan") 这一条外部依赖
 *
 * 用法：pnpm check:dist
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(process.cwd(), 'dist')
const ALLOW = new Set(['.js', '.css', '.json', '.png', '.webp', '.jpg', '.svg', '.md', '.woff', '.woff2', '.ico'])

if (!fs.existsSync(DIST)) {
  console.error('dist 不存在，先 pnpm build')
  process.exit(1)
}

const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else files.push(p)
  }
}
walk(DIST)

const bad = files.filter((f) => !ALLOW.has(path.extname(f).toLowerCase()))
const entry = path.join(DIST, 'index.js')
const requires = fs.existsSync(entry)
  ? [...fs.readFileSync(entry, 'utf8').matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1])
  : []
const foreign = requires.filter((r) => r !== 'siyuan' && !r.startsWith('./'))

const report = {
  文件数: files.length,
  不允许的扩展名: bad.map((f) => path.relative(DIST, f)),
  入口外部依赖: [...new Set(requires)],
  异常依赖: foreign,
}

console.log(JSON.stringify(report, null, 2))

if (bad.length || foreign.length) {
  console.error('构建产物守卫未通过')
  process.exit(1)
}
console.log('OK 构建产物干净：无 .mjs / .ts / .vue，入口只依赖 siyuan')
