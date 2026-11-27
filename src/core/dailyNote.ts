/**
 * 鏃ヨ锛堝崱鐗囦笌璇︽儏鍏辩敤锛?
 *
 * 鎬濇簮鐨勬棩璁板氨鏄竴绡囨枃妗ｏ紝鏍囪瘑鍦?`attributes` 閲岋細`custom-dailynote-YYYYMMDD = root_id`銆?
 * 鎵€浠ャ€屾壘鏌愬ぉ鐨勬棩璁般€嶆槸涓€鏉?SQL锛屻€屾柊寤轰粖澶╃殑鏃ヨ銆嶈蛋鍐呮牳 `/api/filetree/createDailyNote`銆?
 *
 * 鍗＄墖缁欍€屽瓧鏁?/ 寰呭姙 / 鍓嶅嚑琛屻€嶏紝璇︽儏鐢?Protyle 灏卞湴缂栬緫锛?
 * 涓よ€呴兘鎸夊疄渚嬪亸绉绘壘鏃ユ湡锛屽寮犳棩璁板崱鍙互鍚勭湅鍚勭殑閭ｄ竴澶┿€?
 */
import { dateKey } from "@/core/agenda"
import { t } from "@/core/i18n"
import { BODY_TYPES, post, sql } from "@/core/util"

interface DailyNote {
  id: string
  title: string
}

interface DailyTodo {
  /** 寰呭姙鍧楃殑 id锛氱偣涓€涓嬭兘婊氬埌姝ｆ枃閭ｄ竴琛?*/
  id: string
  text: string
  done: boolean
}

export interface DailyPreview extends DailyNote {
  words: number
  blocks: number
  todos: DailyTodo[]
}

/** 鐩稿浠婂ぉ鍋忕Щ鍑犲ぉ */
export function dayOf(offset: number, base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset)
}

const attrOf = (date: Date) => `custom-dailynote-${dateKey(date).replace(/-/g, "")}`

/** 鎵炬煇澶╃殑鏃ヨ鏂囨。锛涙病鏈夊氨杩斿洖 null */
async function findDaily(date: Date): Promise<DailyNote | null> {
  const rows = await sql(
    `select root_id as id from attributes where type = 'b' and name = '${attrOf(date)}' limit 1`,
  ).catch(() => [])
  const id = String((rows[0] as { id?: string } | undefined)?.id || "")
  if (!id) return null
  const docs = await sql(`select content as title from blocks where id = '${id}' limit 1`).catch(() => [])
  return { id, title: String((docs[0] as { title?: string } | undefined)?.title || dateKey(date)) }
}

/** 鏃ヨ璇ュ缓鍦ㄥ摢涓瑪璁版湰锛氫紭鍏堢敤鏈€杩戜竴绡囨棩璁版墍鍦ㄧ殑搴擄紝娌℃湁鎵嶉€€鍒扮涓€涓?*/
async function dailyNotebook(): Promise<string> {
  const rows = await sql(`select box from attributes where name like 'custom-dailynote-%' order by name desc limit 1`).catch(() => [])
  const box = String((rows[0] as { box?: string } | undefined)?.box || "")
  if (box) return box
  const books = await post<{ notebooks?: { id: string }[] }>("/api/notebook/lsNotebooks")
  return books?.notebooks?.[0]?.id || ""
}

/** 鏈€杩戜竴绡囨棩璁版墍鍦ㄧ殑绗旇鏈笌鐩綍锛氭柊寤哄埆鐨勬棩鏈熸椂鏀惧湪鍚屾牱鐨勪綅缃?*/
async function dailySeed(): Promise<{ box: string; dir: string }> {
  const rows = await sql(`select b.box as box, b.path as path from attributes a join blocks b on b.id = a.block_id
    where a.name like 'custom-dailynote-%' order by a.name desc limit 1`).catch(() => [])
  const row = (rows[0] || {}) as { box?: string; path?: string }
  const dir = String(row.path || "").replace(/\/[^/]+$/, "")
  return { box: String(row.box || ""), dir }
}

/**
 * 鍙栨煇澶╃殑鏃ヨ锛屾病鏈夊氨寤轰竴涓?
 *
 * 浠婂ぉ浜ょ粰鍐呮牳锛堝畠浼氭寜鏃ヨ妯℃澘寤猴級锛涘埆鐨勬棩鏈熷湪銆屾渶杩戜竴绡囨棩璁般€嶇殑鍚屼竴涓瑪璁版湰銆佸悓涓€灞傜洰褰曚笅寤猴紝
 * 寤哄畬琛ヤ笂 `custom-dailynote-YYYYMMDD` 灞炴€э紝涔嬪悗 findDaily 灏辫兘鎵惧埌瀹冦€?
 */
export async function ensureDaily(date: Date): Promise<DailyNote> {
  const hit = await findDaily(date)
  if (hit) return hit
  const key = dateKey(date)
  const notebook = await dailyNotebook()
  if (!notebook) throw new Error(t("core.daily.noNotebook"))
  if (key === dateKey(new Date())) {
    const doc = await post<{ id: string }>("/api/filetree/createDailyNote", { notebook, app: "" })
    if (!doc?.id) throw new Error(t("core.daily.createFailed"))
    return { id: doc.id, title: key }
  }
  const seed = await dailySeed()
  /* 杩欎釜鎺ュ彛鐨?data 鐩存帴鏄枃妗?id锛堝瓧绗︿覆锛夛紝璺?createDailyNote 鐨?{ id } 涓嶄竴鏍?*/
  const created = await post<string | { id?: string }>("/api/filetree/createDocWithMd", {
    notebook,
    path: `${seed.dir}/${key}`,
    markdown: "",
  })
  const id = typeof created === "string" ? created : created?.id || ""
  if (!id) throw new Error(t("core.daily.createFailed"))
  await post("/api/attr/setBlockAttrs", {
    id,
    attrs: { [`custom-dailynote-${key.replace(/-/g, "")}`]: "" },
  })
  return { id, title: key }
}

/** 鏌愮瘒鏃ヨ鐨勫瓧鏁颁笌鍧楁暟锛堢紪杈戞椂灏卞湴鍒锋柊缁熻锛屼笉閲嶆寕 Protyle锛?*/
export async function dailyStat(id: string): Promise<{ words: number; blocks: number }> {
  const [row] = await sql(
    `select coalesce(sum(length), 0) as words, count(*) as blocks from blocks
     where root_id = '${id}' and type in ${BODY_TYPES} limit 1`,
  ).catch(() => [])
  const hit = (row || {}) as { words?: number; blocks?: number }
  return { words: Number(hit.words) || 0, blocks: Number(hit.blocks) || 0 }
}

/** 鏃ヨ閲岀殑寰呭姙锛堝崟鐙煡锛氫笉鍙楁鏂囪鏁伴檺鍒讹紝缂栬緫鏃跺彲鍗曠嫭鍒锋柊锛?*/
export async function dailyTodos(id: string): Promise<DailyTodo[]> {
  const rows = await sql(
    `select id, content from blocks
     where root_id = '${id}' and type = 'i' and content != '' order by sort asc limit 60`,
  ).catch(() => [])
  const out: DailyTodo[] = []
  for (const row of rows as { id?: string; content?: string }[]) {
    const text = String(row.content || "").split("\n").map((line) => line.trim()).find(Boolean) || ""
    const todo = /^\[([ xX])\]\s*(.+)$/.exec(text)
    if (todo) out.push({ id: String(row.id || ""), text: todo[2], done: todo[1] !== " " })
  }
  return out
}

/** 宸茬煡鏂囨。鏃剁洿鎺ュ彇鎽樿锛氭柊寤虹殑鏃ヨ涓嶅繀绛夊睘鎬х储寮曞埛鏂?*/
export async function previewOf(note: DailyNote): Promise<DailyPreview> {
  const [stat, todos] = await Promise.all([dailyStat(note.id), dailyTodos(note.id)])
  return { ...note, words: stat.words, blocks: stat.blocks, todos }
}

/** 鏌愬ぉ鐨勬棩璁版憳瑕侊紙鎵句笉鍒板氨鏄?null锛涙鏂囩敱 Protyle 鐩存帴娓叉煋锛?*/
export async function loadDaily(date: Date): Promise<DailyPreview | null> {
  const note = await findDaily(date)
  return note ? previewOf(note) : null
}

/** 鎵撳紑鏃ヨ鏂囨。锛堝湪鏈〉绛鹃噷鎵撳紑锛?*/
export async function openDaily(id: string) {
  const { openDoc } = await import("@/core/quickdocs")
  await openDoc(id)
}
