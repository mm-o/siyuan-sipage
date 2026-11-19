/**
 * 热重载：构建产物拷进思源后，调内核接口重载 UI，省掉手动 F5。
 *
 *   node tools/reload.mjs [--url http://127.0.0.1:6806] [--token xxx]
 *
 * 用法：改完代码执行 `pnpm dev:reload`（= 构建 + 拷贝 + 本脚本），
 * 桌面 tab 会就地重建，不需要你手动刷新。
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const argv = process.argv.slice(2)
const get = (flag, fallback) => {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const base = get("--url", "http://127.0.0.1:6806").replace(/\/$/, "")
const token = get("--token", process.env.SIYUAN_TOKEN || "")

/* 目标目录：优先参数，其次 env，最后默认本地思源 */
const target = get("--dest", process.env.SIYUAN_PLUGIN_DIR || "E:\\Siyuan\\data\\plugins\\desk-cards")

/* 1) 拷贝构建产物 */
try {
  execFileSync("robocopy", ["dist", target, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/R:2", "/W:1"], { stdio: "ignore" })
} catch {
  /* robocopy 成功时返回码 1，execFileSync 会抛，忽略即可 */
}

/* 2) 让思源重载界面 */
const url = `${base}/api/ui/reloadUI${token ? `?token=${encodeURIComponent(token)}` : ""}`
try {
  const res = await fetch(url, { method: "POST" })
  const body = await res.text()
  console.log(`reloadUI ${res.status} ${body.slice(0, 80)}`)
  if (!res.ok) process.exitCode = 1
} catch (e) {
  console.error(`无法连接思源：${url}\n${e.message}`)
  console.error("提示：可以用 --token 或环境变量 SIYUAN_TOKEN 传令牌")
  process.exitCode = 1
}

/* 3) 顺带打印产物版本，便于确认拷贝成功 */
try {
  console.log("deployed:", JSON.parse(readFileSync(`${target}/plugin.json`, "utf8")).version)
} catch {
  console.log("deployed: plugin.json 读取失败")
}
