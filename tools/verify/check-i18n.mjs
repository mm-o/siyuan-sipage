/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（i18n 守卫）。
 *
 * 用 `pnpm check:i18n` 跑。三条断言：
 *   1. zh_CN 与 en_US 的键**完全一致**（多一个少一个都算坏）
 *   2. 源码里 `t("x.y")` 用到的字面量键两边都存在
 *   3. （提示项）还有哪些用户可见的中文没进词条 —— 加 `--strict` 时升级为失败
 *
 * 提示项的判定是「够用」而不是「精确」：注释、CSS 的 content、来自思源/tyme4ts
 * 的数据不算。真的需要保留中文时，把行尾写上 `// i18n-keep` 即可豁免。
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(process.cwd(), 'src')
const STRICT = process.argv.includes('--strict')
const CJK = /[\u4e00-\u9fa5]/

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', name), 'utf8'))
const zh = readJson('zh_CN.json')
const en = readJson('en_US.json')

/* 1. 键集合一致 */
const zhKeys = new Set(Object.keys(zh))
const enKeys = new Set(Object.keys(en))
const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k))
const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k))
const emptyValues = [...zhKeys].filter((k) => !String(zh[k]).trim() || !String(en[k] ?? '').trim())

/* 2. 源码里用到的键都存在 */
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name)
  return e.isDirectory() ? walk(p) : [p]
})
const files = walk(SRC).filter((f) => /\.(ts|vue)$/.test(f))
const used = new Map()
const dynamic = []
const sources = []
const leftovers = []

const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, (m) => (m.includes('i18n-keep') ? m : ''))

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  sources.push(raw)
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/')

  for (const m of raw.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set())
    used.get(m[1]).add(rel)
  }
  /* 模板字符串拼出来的键（t(`card.calendar.week.${i})`）记成前缀模式，别误报缺词 */
  for (const m of raw.matchAll(/\bt\(\s*`([^`]*)\$\{/g)) dynamic.push(m[1])

  /* 提示项：模板文本节点 + 引号字符串里的中文 */
  let keepBlock = false
  const isVue = file.endsWith('.vue')
  const templateEnd = isVue ? raw.indexOf('<script') : -1
  const template = isVue && templateEnd > 0 ? raw.slice(0, templateEnd) : isVue ? raw : ''
  const script = isVue ? raw.slice(Math.max(templateEnd, 0)) : raw

  const templateText = stripComments(template)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-z-]+[^>]*>/gi, ' ')
  templateText.split(/\r?\n/).forEach((line, i) => {
    if (CJK.test(line) && !line.includes('i18n-keep')) leftovers.push(`${rel}:${i + 1}  ${line.trim().slice(0, 80)}`)
  })

  stripComments(script).split(/\r?\n/).forEach((line, i) => {
    /* 内容型数据（句库、诗库、节气表）整段豁免：i18n-keep-begin / i18n-keep-end */
    if (line.includes('i18n-keep-begin')) keepBlock = true
    if (keepBlock) {
      if (line.includes('i18n-keep-end')) keepBlock = false
      return
    }
    /* 行尾注释不算文案（http:// 除外） */
    const code = line.replace(/(^|[^:])\/\/.*$/, '$1')
    if (!CJK.test(code) || line.includes('i18n-keep')) return
    const t = line.trim()
    if (t.startsWith('*') || t.startsWith('//')) return
    if (!/["'`]/.test(line)) return
    leftovers.push(`${rel}:${i + 1}  ${t.slice(0, 80)}`)
  })
}

const isDynamic = (key) => dynamic.some((prefix) => key.startsWith(prefix))
/* 键也可能以「字符串数组 / 查表」的形式出现，所以再按字面量全文搜一遍 */
const mentioned = (key) => sources.some((text) => text.includes(`"${key}"`) || text.includes(`'${key}'`) || text.includes(`\`${key}\``))
const missing = [...used.keys()].filter((k) => !zhKeys.has(k) || !enKeys.has(k))
  .filter((k) => !isDynamic(k))
  .map((k) => `${k}  ← ${[...used.get(k)].join(', ')}`)
const unused = [...zhKeys].filter((k) => !used.has(k)
  && !mentioned(k)
  && !isDynamic(k)
  && !/^card\.[\w]+\.(name|desc)$/.test(k) // 注册表经 cardName()/cardDesc() 取
  && !/^(openDesk|insertDeskCard)$/.test(k)) // 思源按 langKey 取

const report = {
  词条数: { zh_CN: zhKeys.size, en_US: enKeys.size },
  仅中文有: onlyZh,
  仅英文有: onlyEn,
  空值: emptyValues,
  源码缺失的键: missing,
  没被引用的键: unused.length > 12 ? `${unused.length} 个（…${unused.slice(0, 6).join(', ')}）` : unused,
  未迁文案数: leftovers.length,
}
console.log(JSON.stringify(report, null, 2))
if (leftovers.length) console.log(`\n未迁文案（前 200 条）：\n${leftovers.slice(0, 200).join('\n')}`)

const fatal = onlyZh.length || onlyEn.length || emptyValues.length || missing.length || (STRICT && leftovers.length)
if (fatal) {
  console.error('\ni18n 守卫未通过')
  process.exit(1)
}
console.log('\nOK 词条齐全：中英键一致、源码用到的键都存在')
