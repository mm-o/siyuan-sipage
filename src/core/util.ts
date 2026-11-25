/**
 * 共用底座：跨模块的基础动作集中在这一个文件。
 *
 * `post` / `sql` 是内核 HTTP 的唯一出口（POST JSON → 校验 code → 返回 data）；
 * `pad` 是两位补零，时钟、倒数日、热力图、统计、日记键共用。
 * 都是几行的通用件，单独成文件只会让 import 分散，所以并到这里。
 */

/** 思源 HTTP API：POST JSON、校验 code、返回 data。全项目的内核调用都走这里。 */
export async function post<T = unknown>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => null)
  if (json?.code !== 0) throw new Error(json?.msg || "请求失败")
  return (json?.data ?? null) as T
}

/** 内核 SQL：文档索引、热力图、文档统计、图谱、块标题共用同一实现。 */
export async function sql(stmt: string) {
  return (await post<Record<string, unknown>[]>("/api/query/sql", { stmt })) || []
}

/** 两位补零 */
export const pad = (n: number) => String(n).padStart(2, "0")

/**
 * 正文块类型：字数、块数与「今天写了多少」只数这些。
 * 文档块（type='d'）的 length 是标题本身，混进来会把总字数算成「所有标题的长度」。
 */
export const BODY_TYPES = "('p','h','c','m','t','callout','html')"
