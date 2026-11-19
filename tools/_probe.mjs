const t = "bct45z7gltevi22s"
const H = { Authorization: `Token ${t}` }

// 1) 系统界面资源：图标/emoji？（不需要）
// 2) 思源内已有图片：assets 列表接口
for (const u of [
  "http://127.0.0.1:6806/api/asset/getUnusedAssets",
  "http://127.0.0.1:6806/api/search/searchAsset?k=image",
  "http://127.0.0.1:6806/api/file/readDir",
]) {
  try {
    const r = await fetch(u, { method: u.includes("readDir") ? "POST" : "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ path: "assets", k: "image" }) })
    const j = await r.json()
    const s = JSON.stringify(j)
    console.log(u.split("/api/")[1], "code", j.code, "len", s.length, s.slice(0, 160))
  } catch (e) {
    console.log(u.split("/api/")[1], "ERR", e.message)
  }
}