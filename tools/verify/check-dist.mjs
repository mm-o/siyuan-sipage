/** 发布产物守卫：必要文件非空、清单一致、无源码/测试泄漏、外部依赖仅 siyuan。 */
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const allow = new Set(['.js', '.css', '.json', '.png', '.webp', '.jpg', '.svg', '.md', '.woff', '.woff2', '.ico'])
const files = fs.existsSync(dist) ? fs.readdirSync(dist, { recursive: true }).map(name => path.join(dist, name)).filter(file => fs.statSync(file).isFile()) : []
const missing = ['index.js', 'index.css', 'plugin.json'].filter(name => !files.includes(path.join(dist, name)) || fs.statSync(path.join(dist, name)).size === 0)
const bad = files.filter(file => !allow.has(path.extname(file).toLowerCase())).map(file => path.relative(dist, file))
const entry = path.join(dist, 'index.js')
const requires = fs.existsSync(entry) ? [...fs.readFileSync(entry, 'utf8').matchAll(/require\(["']([^"']+)["']\)/g)].map(match => match[1]) : []
const foreign = requires.filter(name => name !== 'siyuan' && !name.startsWith('./'))
/* 思源的插件加载器只解析 siyuan：相对 require（分包产物）一定加载失败 */
const relative = requires.filter(name => name.startsWith('./'))
const issues = []
try {
  const source = JSON.parse(fs.readFileSync('plugin.json', 'utf8'))
  const built = JSON.parse(fs.readFileSync(path.join(dist, 'plugin.json'), 'utf8'))
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  if (built.name !== source.name || built.version !== source.version || built.version !== pkg.version) issues.push('插件名称或版本与源码不一致')
  for (const key of ['icon', 'preview']) if (built[key] && !files.includes(path.join(dist, built[key]))) issues.push(`缺少 ${key}: ${built[key]}`)
} catch (error) { issues.push(`清单读取失败: ${error.message}`) }
console.log(JSON.stringify({ 文件数: files.length, 缺失文件: missing, 不允许的扩展名: bad, 入口外部依赖: [...new Set(requires)], 异常依赖: foreign, 清单问题: issues }, null, 2))
if (relative.length) issues.push(`入口含相对依赖（思源无法解析，需单文件打包）: ${relative.join(', ')}`)
if (missing.length || bad.length || foreign.length || issues.length) process.exit(1)
console.log('OK 产物完整、清单一致、入口仅依赖 siyuan')
