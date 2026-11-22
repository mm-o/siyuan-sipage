/** 只更新版本；构建、提交与发布统一走 release:ship。 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

const files = ['package.json', 'plugin.json']
const current = JSON.parse(readFileSync(files[0], 'utf8')).version
const prompt = createInterface({ input: process.stdin, output: process.stdout })
try {
  let mode = process.argv.find(arg => arg.startsWith('--mode='))?.slice(7)
  if (!mode) {
    const choice = (await prompt.question(`当前 v${current}；1 patch / 2 minor / 3 major / 4 手动 / 0 退出 [1]：`)).trim() || '1'
    if (choice === '0') process.exit(0)
    mode = { 1: 'patch', 2: 'minor', 3: 'major', 4: 'manual' }[choice]
  }
  let next
  if (mode === 'manual') next = (await prompt.question('新版本（a.b.c）：')).trim()
  else {
    const index = ['major', 'minor', 'patch'].indexOf(mode)
    if (index < 0) throw new Error('版本模式无效')
    const parts = current.split('.').map(Number)
    parts[index]++
    parts.fill(0, index + 1)
    next = parts.join('.')
  }
  if (!/^\d+\.\d+\.\d+$/.test(next)) throw new Error('版本格式应为 a.b.c')
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    writeFileSync(file, text.replace(/"version"\s*:\s*"[^"]+"/, `"version": "${next}"`))
  }
  console.log(`版本已更新为 ${next}。检查改动后运行 pnpm release:ship "说明"。`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally { prompt.close() }
