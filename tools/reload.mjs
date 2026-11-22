/** 构建后复制到 .env 指定的思源工作空间，并请求 UI 重载。 */
import { cpSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env }
const plugin = JSON.parse(readFileSync('plugin.json', 'utf8'))
const workspace = env.VITE_SIYUAN_WORKSPACE_PATH
const target = option('--dest', env.SIYUAN_PLUGIN_DIR || (workspace && path.join(workspace, 'data/plugins', plugin.name)))
const base = option('--url', env.SIYUAN_URL || 'http://127.0.0.1:6806').replace(/\/$/, '')
const token = option('--token', env.SIYUAN_TOKEN || '')

if (!target) throw new Error('请在 .env 设置 VITE_SIYUAN_WORKSPACE_PATH，或通过 --dest 指定插件目录')
cpSync(path.resolve('dist'), path.resolve(target), { recursive: true })
console.log(`deployed: ${plugin.name} v${plugin.version} → ${path.resolve(target)}`)

const response = await fetch(`${base}/api/ui/reloadUI`, {
  method: 'POST',
  headers: token ? { Authorization: `Token ${token}` } : {},
  signal: AbortSignal.timeout(10_000),
})
if (!response.ok) throw new Error(`reloadUI HTTP ${response.status}`)
const body = await response.text()
if (body.trim()) {
  const result = JSON.parse(body)
  if (result.code !== 0) throw new Error(result.msg || `reloadUI code ${result.code}`)
}
console.log('reloadUI: complete')
