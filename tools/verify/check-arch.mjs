/**
 * ⚠️ 非源码 / 不参与打包 —— 开发期验证脚本（架构守卫）。
 *
 * 用 `pnpm check:arch` 跑。它把 docs/ARCHITECTURE.md 里的分层规则变成可执行断言：
 *
 *   1. core/**      不得依赖 ui/ cards/ embed/（core 与 UI 无关）
 *   2. ui/**        不得依赖 cards/（UI 不能反向依赖卡片）
 *   3. ui/controls 不得依赖 cards/，core 里只许 i18n（基础控件只吃 props + 文案）
 *   4. cards/<id>/** 不得依赖别的卡片目录
 *   5. cards/**     只允许依赖 core/ ui/ 自身目录 + vue/lucide
 *   6. 每个 cards/<id>/ 恰有一个 *Card.vue（一个卡片一个主组件）
 *
 * 唯一豁免：`core/registry.ts` —— 它是装配点（id → 组件），必须 import 所有卡片；
 * 除此之外 core 不许出现任何 UI/卡片依赖。
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(process.cwd(), 'src')
const violations = []

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name)
  return e.isDirectory() ? walk(p) : [p]
})

const files = walk(SRC).filter((f) => /\.(ts|vue)$/.test(f))
const rel = (f) => path.relative(SRC, f).replace(/\\/g, '/')

/** 解析 import 的来源：@/x → src/x；./x → 同目录；裸包名原样 */
const importsOf = (file) => {
  const src = fs.readFileSync(file, 'utf8')
  const out = []
  for (const m of src.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)) {
    const raw = m[1]
    if (raw.endsWith('.css')) continue // 样式不参与分层判断
    if (raw.startsWith('@/')) out.push({ raw, target: raw.slice(2) })
    else if (raw.startsWith('.')) {
      const abs = path.resolve(path.dirname(file), raw)
      out.push({ raw, target: path.relative(SRC, abs).replace(/\\/g, '/') })
    } else out.push({ raw, target: null, bare: true })
  }
  return out
}

const isCore = (t) => t.startsWith('core/')
const isUi = (t) => t.startsWith('ui/')
const isCards = (t) => t.startsWith('cards/')
const cardIdOf = (t) => (t.startsWith('cards/') ? t.split('/')[1] : null)

/** 装配点：registry 必须 import 所有卡片，这是唯一允许 core → cards 的地方 */
const ASSEMBLY_POINT = 'core/registry.ts'

for (const file of files) {
  const from = rel(file)
  for (const imp of importsOf(file)) {
    if (imp.bare || !imp.target) continue
    const to = imp.target
    const where = `${from} → ${imp.raw}`

    // 1. core 不得依赖 UI / 卡片 / 入口（registry 是装配点，唯一豁免）
    if (from !== ASSEMBLY_POINT && isCore(from) && (isUi(to) || isCards(to) || to.startsWith('embed/') || to === 'index.ts')) {
      violations.push(`[1 core→UI] ${where}`)
    }
    // 2. ui 不得依赖卡片
    if (isUi(from) && isCards(to)) violations.push(`[2 ui→cards] ${where}`)
    // 3. 基础控件只吃 props：cards 一律不许碰；core 只许 i18n（文案），不许碰状态/数据
    //    `@/x` 的目标不带扩展名，`./x` 的带，两种写法都要认
    if (from === 'ui/controls.ts') {
      const allowed = new Set(['core/i18n', 'core/i18n.ts'])
      if (isCards(to)) violations.push(`[3 primitive→cards] ${where}`)
      if (isCore(to) && !allowed.has(to)) violations.push(`[3 primitive→core] ${where}`)
    }
    // 4. 卡片之间不许互相 import
    if (isCards(from) && isCards(to) && cardIdOf(from) !== cardIdOf(to)) {
      violations.push(`[4 card→card] ${where}`)
    }
    // 5. 卡片只依赖 core / ui / 自身
    if (isCards(from) && !isCore(to) && !isUi(to) && !isCards(to)) {
      violations.push(`[5 card→other] ${where}`)
    }
  }
}

// 6. 一个卡片一个主组件
const cardDirs = fs.readdirSync(path.join(SRC, 'cards'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
for (const id of cardDirs) {
  const entries = fs.readdirSync(path.join(SRC, 'cards', id))
  const mains = entries.filter((n) => /Card\.vue$/.test(n))
  if (mains.length !== 1) {
    violations.push(`[6 一个卡片一个 Card.vue] cards/${id}/ 有 ${mains.length} 个 *Card.vue：${mains.join(', ') || '无'}`)
  }
}

const summary = {
  检查文件数: files.length,
  卡片目录: cardDirs,
  违规: violations,
}
console.log(JSON.stringify(summary, null, 2))
if (violations.length) {
  console.error(`架构守卫未通过：${violations.length} 条违规`)
  process.exit(1)
}
console.log('OK 分层干净：core 不依赖 UI、ui 不依赖卡片、控件只吃 props、卡片之间零依赖、每张卡一个 Card.vue')
