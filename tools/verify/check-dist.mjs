/** 发布产物守卫：必要文件非空、清单一致、无源码/测试泄漏、外部依赖仅 siyuan，以及集市（bazaar）的硬性规范。 */
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const allow = new Set(['.js', '.css', '.json', '.png', '.webp', '.jpg', '.svg', '.md', '.woff', '.woff2', '.ico'])
const files = fs.existsSync(dist) ? fs.readdirSync(dist, { recursive: true }).map(name => path.join(dist, name)).filter(file => fs.statSync(file).isFile()) : []
const rel = (file) => path.relative(dist, file).replace(/\\/g, '/')
const missing = ['index.js', 'index.css', 'plugin.json'].filter(name => !files.includes(path.join(dist, name)) || fs.statSync(path.join(dist, name)).size === 0)
const bad = files.filter(file => !allow.has(path.extname(file).toLowerCase())).map(rel)
const entry = path.join(dist, 'index.js')
const requires = fs.existsSync(entry) ? [...fs.readFileSync(entry, 'utf8').matchAll(/require\(["']([^"']+)["']\)/g)].map(match => match[1]) : []
const foreign = requires.filter(name => name !== 'siyuan' && !name.startsWith('./'))
/* 思源的插件加载器只解析 siyuan：相对 require（分包产物）一定加载失败 */
const relative = requires.filter(name => name.startsWith('./'))
const issues = []

/* ── 清单一致性 ───────────────────────────────────────── */
let source = {}
try {
  source = JSON.parse(fs.readFileSync('plugin.json', 'utf8'))
  const built = JSON.parse(fs.readFileSync(path.join(dist, 'plugin.json'), 'utf8'))
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  if (built.name !== source.name || built.version !== source.version || built.version !== pkg.version) issues.push('插件名称或版本与源码不一致')
  if (pkg.name !== source.name) issues.push(`package.json name (${pkg.name}) 与 plugin.json name (${source.name}) 不一致`)
  for (const key of ['icon', 'preview']) if (built[key] && !files.includes(path.join(dist, built[key]))) issues.push(`缺少 ${key}: ${built[key]}`)
} catch (error) {
  issues.push(`清单读取失败: ${error.message}`)
}

/* ── 集市规范（REF https://github.com/siyuan-note/plugin-sample 与 siyuan-note/bazaar）── */
const has = (name) => files.includes(path.join(dist, name))
const bazaar = []

const nameOk = /^[a-z0-9][a-z0-9-]*$/.test(source.name || '')
if (!nameOk) bazaar.push(`name「${source.name}」必须是小写字母 / 数字 / 连字符，且需与 GitHub 仓库名一致`)
if (!/^\d+\.\d+\.\d+/.test(source.version || '')) bazaar.push(`version「${source.version}」不符合 semver`)
for (const key of ['author', 'url', 'minAppVersion']) if (!source[key]) bazaar.push(`缺少 ${key}`)
if (!String(source.url || '').includes(source.name)) bazaar.push('url 应指向与本包同名的仓库')

/* 多语言元信息：default 必须有，其余键须是 BCP 47 */
const bcp47 = /^(default|en|[a-z]{2,3}(-[A-Za-z0-9]{2,8})*)$/
for (const key of ['displayName', 'description', 'readme']) {
  const value = source[key]
  if (!value || typeof value !== 'object') { bazaar.push(`缺少 ${key}`); continue }
  if (!value.default) bazaar.push(`${key}.default 必须有（英文）`)
  for (const lang of Object.keys(value)) if (!bcp47.test(lang)) bazaar.push(`${key}.${lang} 不是 BCP 47 语言标签`)
}
if (!Array.isArray(source.keywords) || !source.keywords.length) bazaar.push('keywords 不应为空')

/* 包内必须有：入口、清单、README 两种语言、i18n 词典、许可与第三方声明 */
for (const required of ['README.md', 'README.zh-CN.md', 'LICENSE.md', 'THIRD_PARTY_NOTICES.md', 'i18n/zh_CN.json', 'i18n/en_US.json']) {
  if (!has(required)) bazaar.push(`package.zip 缺少 ${required}`)
}

/* 仓库根目录必须有 LICENSE（GitHub 与集市只认这个文件名；包内保留 LICENSE.md 供集市区看），
   两份同文，改一处忘另一处会在这里被拦住 */
const rootLicense = path.join(process.cwd(), 'LICENSE')
if (!fs.existsSync(rootLicense)) {
  bazaar.push('仓库根目录缺少 LICENSE（集市校验要求 LICENSE 或 LICENSE.txt）')
} else if (has('LICENSE.md')) {
  const norm = (text) => text.replace(/\r\n/g, '\n').trim()
  if (norm(fs.readFileSync(rootLicense, 'utf8')) !== norm(fs.readFileSync(path.join(dist, 'LICENSE.md'), 'utf8'))) {
    bazaar.push('根目录 LICENSE 与包内 LICENSE.md 内容不一致')
  }
}

/* 图片体积与尺寸（集市：icon 160×160 ≤64KiB；preview 1024×768 ≤512KiB） */
function imageInfo(file) {
  if (!fs.existsSync(file)) return null
  const buf = fs.readFileSync(file)
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png' && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length }
  }
  if (ext === '.webp' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const format = buf.toString('ascii', 12, 16)
    if (format === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), bytes: buf.length }
    if (format === 'VP8 ') {
      const at = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]))
      return { width: buf.readUInt16LE(at + 3) & 0x3fff, height: buf.readUInt16LE(at + 5) & 0x3fff, bytes: buf.length }
    }
    if (format === 'VP8L') {
      const bits = buf.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, bytes: buf.length }
    }
  }
  return null
}
const icon = source.icon ? imageInfo(path.join(dist, source.icon)) : null
if (source.icon && !icon) bazaar.push(`icon ${source.icon} 读不出尺寸（集市只支持 PNG / JPEG / WebP / AVIF）`)
else if (icon) {
  if (icon.width !== 160 || icon.height !== 160) bazaar.push(`icon 尺寸 ${icon.width}×${icon.height}，集市要求 160×160`)
  if (icon.bytes > 64 * 1024) bazaar.push(`icon ${icon.bytes} B，超过 64KiB`)
}
const preview = source.preview ? imageInfo(path.join(dist, source.preview)) : null
if (source.preview && !preview) bazaar.push(`preview ${source.preview} 读不出尺寸`)
else if (preview) {
  if (preview.width !== 1024 || preview.height !== 768) bazaar.push(`preview 尺寸 ${preview.width}×${preview.height}，建议 1024×768`)
  if (preview.bytes > 512 * 1024) bazaar.push(`preview ${preview.bytes} B，超过 512KiB`)
}

console.log(JSON.stringify({
  文件数: files.length,
  缺失文件: missing,
  不允许的扩展名: bad,
  入口外部依赖: [...new Set(requires)],
  异常依赖: foreign,
  清单问题: issues,
  集市规范: bazaar,
}, null, 2))
if (relative.length) issues.push(`入口含相对依赖（思源无法解析，需单文件打包）: ${relative.join(', ')}`)
if (missing.length || bad.length || foreign.length || issues.length || bazaar.length) process.exit(1)
console.log('OK 产物完整、清单一致、入口仅依赖 siyuan，且符合集市规范')
