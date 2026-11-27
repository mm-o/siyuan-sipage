<template>
  <section class="about desk-set-page">
    <header class="about-head">
      <h2 class="set-h2">{{ t('ui.about.title') }}</h2>
      <GlassButton text :icon="ExternalLink" :label="LOG_LABEL" @click="openLog" />
    </header>
    <article class="about-body" v-html="html" />
  </section>
</template>

<script setup lang="ts">
/**
 * 关于：展示仓库里的说明文档（随插件一起发布，离线可看）。
 * 文档跟随思源语言：中文用 README.zh-CN.md，其它语言用 README.md。
 * 更新日志不进包，标题右边给在线入口。
 */
import { GlassButton } from "@/ui/controls"
import { computed, onMounted, ref } from "vue"
import { ExternalLink } from "lucide-vue-next"
import { t } from "@/core/i18n"
import info from "../../plugin.json"

const LOG = "https://github.com/mm-o/siyuan-sipage/blob/main/CHANGELOG.md"

/** 思源语言：zh_CN / en_US …（拿不到就按中文） */
const lang = String((window as any).siyuan?.config?.lang || document.documentElement.lang || "zh_CN").toLowerCase()
const zh = lang.startsWith("zh")
const FILE = zh ? "README.zh-CN.md" : "README.md"
const LOG_LABEL = t("ui.about.changelog")

const text = ref("")

onMounted(async () => {
  try {
    const res = await fetch(`/plugins/${info.name}/${FILE}`, { cache: "no-cache" })
    text.value = res.ok ? await res.text() : t("ui.about.readFailed", { file: FILE })
  } catch {
    text.value = t("ui.about.readFailed", { file: FILE })
  }
})

const openLog = () => window.open(LOG, "_blank", "noopener")

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    /* 只认站外链接：文档里的相对链接（比如 README 的 English）点了没有意义 */
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, href: string) =>
      /^https?:/i.test(href) ? `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>` : text,
    )

/** 够用的极简 markdown：标题 / 列表 / 代码块 / 表格行 / 分隔线 / 行内样式 */
function toHtml(src: string) {
  const out: string[] = []
  let fence = false
  let list: "" | "ul" | "ol" = ""
  const endList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = ""
    }
  }
  for (const line of src.split(/\r?\n/)) {
    if (line.startsWith("```")) {
      endList()
      out.push(fence ? "</pre>" : "<pre>")
      fence = !fence
      continue
    }
    if (fence) {
      out.push(esc(line))
      continue
    }
    const head = /^(#{1,4})\s+(.*)$/.exec(line)
    if (head) {
      endList()
      out.push(`<h${head[1].length}>${inline(head[2])}</h${head[1].length}>`)
      continue
    }
    const item = /^\s*([-*]|\d+\.)\s+/.exec(line)
    if (item) {
      const tag = /\d/.test(item[1]) ? "ol" : "ul"
      /* 编号从原文取：中间被段落打断时也能接着数 */
      const num = Number(item[1].replace(/\D/g, "")) || 1
      if (list !== tag) {
        endList()
        out.push(tag === "ol" && num > 1 ? `<ol start="${num}">` : `<${tag}>`)
        list = tag
      }
      out.push(`<li>${inline(line.trim().slice(item[1].length).trim())}</li>`)
      continue
    }
    endList()
    if (/^\s*\|/.test(line)) {
      /* 表格：分隔行丢掉，其余按等宽行展示 */
      if (!/^\s*\|[\s:|-]+\|?\s*$/.test(line)) out.push(`<p class="tr">${inline(line.trim())}</p>`)
      continue
    }
    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>")
      continue
    }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`)
  }
  endList()
  if (fence) out.push("</pre>")
  return out.join("")
}

const html = computed(() => toHtml(text.value))
</script>

<style scoped>
.about {
  height: 100%;
  min-height: 0;
}

.about-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--desk-sp-3);
}

/* 文档本体：自己滚，头部固定 */
.about-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: var(--desk-sp-2);
  color: color-mix(in srgb, var(--dg-ink) 82%, transparent);
  font-size: var(--desk-fs-body);
  line-height: 1.75;
}

.about-body :deep(h1) {
  margin: 0 0 var(--desk-sp-3);
  font-size: var(--desk-fs-lg);
  font-weight: 600;
  color: var(--dg-ink);
}

.about-body :deep(h2) {
  margin: var(--desk-sp-4) 0 var(--desk-sp-2);
  font-size: var(--desk-fs-body);
  font-weight: 600;
  color: var(--dg-ink);
}

.about-body :deep(h3),
.about-body :deep(h4) {
  margin: var(--desk-sp-3) 0 var(--desk-sp-1h);
  font-size: var(--desk-fs-caption);
  font-weight: 600;
  color: var(--dg-ink);
}

.about-body :deep(p) {
  margin: 0 0 var(--desk-sp-2);
}

.about-body :deep(ul),
.about-body :deep(ol) {
  margin: 0 0 var(--desk-sp-2);
  padding-left: 1.4em;
}

.about-body :deep(li) {
  margin: 2px 0;
}

.about-body :deep(code) {
  padding: 1px 4px;
  border-radius: var(--desk-r-xs);
  background: color-mix(in srgb, var(--dg-ink) 7%, transparent);
  font-size: var(--desk-fs-caption);
}

.about-body :deep(pre) {
  margin: 0 0 var(--desk-sp-2);
  padding: var(--desk-sp-2);
  border: 1px solid var(--dg-content-rim);
  border-radius: var(--desk-r-md);
  background: var(--dg-content-fill);
  font-size: var(--desk-fs-caption);
  line-height: 1.6;
  white-space: pre-wrap;
}

.about-body :deep(a) {
  color: var(--dg-primary);
  text-decoration: none;
}

.about-body :deep(b) {
  font-weight: 600;
  color: var(--dg-ink);
}

.about-body :deep(.tr) {
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--desk-fs-2xs);
  white-space: pre-wrap;
  color: var(--dg-field-muted);
}

.about-body :deep(hr) {
  height: 1px;
  margin: var(--desk-sp-3) 0;
  border: 0;
  background: var(--dg-track);
}
</style>
