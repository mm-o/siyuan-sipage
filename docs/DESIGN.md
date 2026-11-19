# 设计语言（依据 apple-design-skill）

本项目的视觉与交互统一由 **apple-design-skill** 的 HIG 规范驱动。
技能来源：`skills/apple-design-skill/`（github.com/dickwu/apple-design-skill，3.2k★）
约束：所有组件只消费 `src/styles/index.css` 里的变量，不在组件里写死数值。

## 引用来源（技能要求：引用到文件与章节）

| 令牌 | 数值 | 出处 |
| --- | --- | --- |
| `--desk-blur-regular` | 24px | `references/hig/liquid-glass.md` — "Backdrop blur: regular about 20 to 40 px" |
| `--desk-blur-clear` | 12px | 同上 — "clear about 8 to 16 px" |
| `--desk-glass-fill` | 72% | 同上 — "Fill: regular about 60 to 80% opacity" |
| `--desk-glass-clear` | 32% | 同上 — "clear about 20 to 40%" |
| `--desk-saturate` | 1.4 | 同上 — "approximate glass with `backdrop-filter: blur(24px) saturate(1.4)`" |
| `--desk-dim` | 35% | 同上 + `materials.md` — "a dark dimming layer of 35% opacity" |
| `--desk-fs-body` | 13px | `references/hig/typography.md` — macOS body 13pt |
| `--desk-fs-caption` | 11px | 同上 — Caption 11pt |
| `--desk-fs-title` | 15px | 同上 — Headline 档 |
| `--desk-hit` | 28px | `references/hig/liquid-glass.md` — "28 by 28 pt default … 20 by 20 pt minimum" |
| `--desk-r-card` / `--desk-r-sheet` | 16 / 18px | 自定（HIG 未规定圆角，取系统卡片观感） |
| 间距 4/8/12/16/24/32 | 4pt 栅格 | `references/hig/layout.md` 的间距一致性原则 |

## 三条硬规则（来自技能的评审要点）

1. **克制玻璃面**：`liquid-glass.md` — "Count the custom glass surfaces. More than the few most important functional elements is a defect."
   → 全局只允许两处玻璃：卡片外框、卡片详情弹层。设置面板用实色。
2. **不割裂层级**：卡片详情没有独立标题栏，标题与关闭键浮在内容之上；弹层背景与卡片同一材质。
3. **命中区不缩水**：所有可点元素 ≥ 28pt（desktop），最小不低于 20pt。

## 动效

| 场景 | 时长 / 曲线 | 依据 |
| --- | --- | --- |
| 弹层遮罩 | 240ms `cubic-bezier(.2,.8,.2,1)` | `motion.md` 的「短、可预期」 |
| 卡片 → 详情 FLIP | 280ms `cubic-bezier(.16,1,.3,1)` | 同上；关闭 220ms |
| hover / 按下 | 160–240ms，位移 ≤ 2px，缩放 ≥ 0.985 | 轻反馈 |
| 降级 | `prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast` 全部有分支 | `accessibility.md` |

## 组件映射

| 组件 | 使用的令牌 |
| --- | --- |
| `ui/CardFrame.vue` | `--desk-glass-fill` `--desk-blur-regular` `--desk-r-card` `--desk-hit` |
| `ui/Sheet.vue` | `--desk-r-sheet` `--desk-shadow-3` `--desk-glass-fill` `--desk-blur-regular` `--desk-hit` |
| `ui/primitives/GlassButton.vue` | `--desk-hit`（28）/ `--desk-blur-clear` / `--desk-saturate` |
| `ui/Sheet.vue` 的动效段 | `--desk-dur*` `--desk-ease*` `--desk-shadow-3` |
| `ui/DeskShell.vue` 的样式段 | 桌面壳（壁纸两层 / 顶部时钟 / 右上工具区 / 画布 / 整理模式格网） |

## 如何应用

```bash
# 1. 技能已放在项目里
ls skills/apple-design-skill/references/hig   # 123 页 HIG

# 2. 改设计时先读对应页，再改 styles/index.css
# 3. 组件里只写 var(--desk-*)，图标只用 lucide-vue-next

# 4. 改完用真截图自证（都是 Playwright，跑在 dev-dist 上）
pnpm dev:card
node tools/verify/shot-sizes.mjs        # 1x1 / 2x1 / 4x2
node tools/verify/shot-calendar.mjs     # 日历卡 + 详情（可加 light|dark）
```

后续新增卡片时，弹窗、外框、菜单、动效全部自动继承这套语言，不需要逐卡调整。

## 弹窗结构规则（底层约定，v3.49 起）

这三条是**框架层**的约定，写在这里就是为了以后不再逐卡各写一份：改规则只改 `ui.css` 与 `Sheet.vue`，各卡片只标位置类。

### 1. 结构：顶栏 pane + 内容 pane(s)

```
Sheet（壳，无底色/描边/投影/模糊）
├─ .desk-sheet-head.desk-pane.is-top      ← 图标 + 标题 + 钉住/全屏/关闭
└─ .desk-sheet-body
   └─ 各卡片自己的栏，每栏一块 .desk-pane
```

- 栏与栏、栏与顶栏之间用 `--desk-detail-gap`（8px）隔开，缝里透出模态背景；
- 面（底色 / 1px 边 / 阴影 / 模糊）只长在 `.desk-pane` 上，`.desk-sheet` 永远是透明壳；
- 所有按钮一律 `GlassButton`（28px），标题栏右侧固定「钉住 / 全屏 / 关闭」。

### 2. 圆角：外缘 18 / 内接 6

四角顺序「左上 / 右上 / 右下 / 左下」，两个令牌：`--desk-r-pane`（18）、`--desk-r-pane-in`（6）。

| 位置类 | 圆角 | 用在哪 |
| --- | --- | --- |
| `.is-top` | 18 18 6 6 | 顶栏、上下叠放的上一栏 |
| `.is-bottom` | 6 6 18 18 | 上下叠放的下一栏 |
| `.is-left` | 6 6 6 18 | 左右并排的最左栏 |
| `.is-mid` | 6 6 6 6 | 中间栏（三栏布局） |
| `.is-right` | 6 6 18 6 | 最右栏 |
| `.is-solo` | 6 6 18 18 | 单栏内容（照片卡 / 设置面板） |

**只有这六条规则**，定义在 `src/ui/ui.css`，禁止在卡片里内联 `border-radius` 覆盖它们（写死数值就会再次出现「内角 18 对着外角 18」的错位）。

### 3. 滚动：卡片裁切、弹窗滚动

| 场景 | 规则 |
| --- | --- |
| 卡片内 | `overflow: hidden`，绝不出现滚动条（框架硬规则） |
| 弹窗内 | 允许滚动，但**滚动层必须在 `overflow: hidden` 的 pane 内部**再套一层，否则滚动条会画到圆角外面 |

标准写法：

```html
<section class="pane desk-pane is-bottom">   <!-- overflow: hidden，负责圆角裁切 -->
  <div class="scroll">                        <!-- overflow: auto，真正滚动 -->
    内容…
  </div>
</section>
```

滚动条统一 8px 宽、`--desk-r-pill` 圆角、`--desk-text 22%` 半透明滑块，并加 `overscroll-behavior: contain` 防止滚动穿透到桌面。

### 4. 尺寸与标题栏

- `detailSize` 由卡片在 `registry` 里给（默认 `min(760px, 86vw) × min(560px, 78vh)`）；
- 标题栏高 48px、左右内边距 `--desk-detail-pad`（20），图标 18px + 标题 `--desk-fs-title`；
- 标题栏与内容栏同宽（同一个 `--desk-detail-inset` 外圈），论坛里看到的「顶栏比下面长一截」就是外圈 inset 被重复计算导致的。

## 详情弹窗规范（v2.2 · 一套结构 + 一套间距）

**所有弹层只有一个**：`ui/Sheet.vue`。卡片详情、设置（壁纸 / 组件设置 / 卡片库 / 关于）都走它，
所以「弹窗长什么样」只有一处可改。

| | 详情 | 设置 |
| --- | --- | --- |
| 组件 | `<Sheet :origin>` + 卡片自己（`mode="detail"`） | `<Sheet :origin>` + `SettingsSheet` 的左导航 + 面板 |
| 尺寸 | `min(760px, 86vw) × min(560px, 78vh)` | `min(780px, 92vw) × min(620px, 84vh)` |
| 结构 | 一块玻璃面 + 悬浮关闭键 + 内容自己排版 | 同左（标题「设置」写在左栏顶部，**没有标题栏**） |
| 间距 | 外圈 `--desk-detail-inset 12`，栏内 `--desk-detail-pad 20` | 同左（`.nav` 与 `.pane` 各 20） |
| 展开 | 从被点卡片的矩形 FLIP 放大 | 从被点按钮的矩形 FLIP 放大（同一个 `origin` 机制） |

`Sheet` 里**没有** `variant`、没有标题栏、没有 `.desk-sheet-head`：标题属于内容。
关闭键永远悬浮在右上（28pt），Esc / 点遮罩都能关，关闭时缩回 `origin`。

三张内容卡（每日一言 / 每日英语 / 每日诗词）的详情**结构完全相同**，代码在 `ui/ui.css`：

```html
<div class="desk-detail on-photo">          <!-- 卡片根：inset 12px，照片 + 遮罩 -->
  <div class="desk-detail-panel">           <!-- 面板：padding 20，gap 12，垂直居中 -->
    <p class="desk-detail-meta">11px 62% 白</p>
    <div class="desk-detail-body">          <!-- 文字列：≤66ch、居中、超高才滚 -->
      <p class="desk-detail-quote">22px / 1.55 / 300</p>   <!-- 英语 .desk-detail-en；诗词 .verse 17px/1.9 -->
      <p class="desk-detail-author">13px 55% 白</p>
    </div>
    <div class="desk-detail-foot">          <!-- 分隔线 + 两组圆形玻璃按钮 -->
      <div class="desk-fab">…</div>          <!-- 主组靠右；副组（翻页）靠左 -->
    </div>
  </div>
</div>
```

### 间距刻度（唯一来源：`styles/index.css`）

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--desk-card-pad-y` / `-x` | `clamp(10px,6cqh,18px)` / `clamp(12px,6cqw,20px)` | 卡片内留白（容器单位，随尺寸缩放） |
| `--desk-card-gap` | `clamp(4px,3cqh,10px)` | 卡片内元素间距 |
| `--desk-detail-inset` | 12px | 详情面板距卡片边（让玻璃边可见） |
| `--desk-detail-pad` | 20px | 详情面板内留白 |
| `--desk-detail-gap` | 12px | 详情内元素间距（含文字列与动作条之间，**不再叠加 margin**） |

### 卡片内字号（唯一来源：`styles/index.css`）

所有卡片文字只吃这六个令牌，卡片的 scoped 里**不许再写 `font-size: 12px` 这种字面值**
（写了全屏就会被上限卡住——v2.17.0 全屏字小就是这么来的）：

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--desk-fs-card-title` | `clamp(11px, 7.4cqh, 56px)` | 标题 / 诗词标题 |
| `--desk-fs-card-title-wide` | `clamp(15px, 8cqh, 56px)` | 4x2 宽版标题 |
| `--desk-fs-card-text` | `clamp(11px, 8cqh, 64px)` | 正文 / 引文 / 诗行 |
| `--desk-fs-card-text-wide` | `clamp(16px, 9cqh, 64px)` | 4x2 宽版正文 |
| `--desk-fs-card-meta` | `clamp(9px, 4.6cqh, 28px)` | 出处 / 朝代·作者 / 释义 |
| `--desk-fs-card-sub` | `clamp(9px, 4.4cqh, 26px)` | 次级说明 |

`cqh` 在令牌里是**使用处**解析的（相对最近的卡片容器），所以同一套令牌在 1x1、4x2、全屏三种上下文都成立：
常规 2x2 正文 16px，全屏（1440×900）正文 64px、出处 26px。

### 盒模型

插件不使用任何全局 reset（v2.8 起连 Tailwind 整条链都删掉了）。`styles/index.css` 只给三个根节点做 border-box 重置：
`.desk-root` / `.desk-sheet-mask` / `.desk-embed-card` 及其后代。
少了这一步，`height:100% + padding` 的元素会按 content-box 多出 2×padding，表现为按钮贴边、内容被切。

### 依据（apple-design-skill）

| 决策 | 出处 |
| --- | --- |
| 图上文字固定白色 + 上下渐变遮罩（卡片 18→52%，详情 52%） | `accessibility.md`（对比度）；`materials.md`（dimming layer） |
| 玻璃 `blur(30px) saturate(1.6)`、填充 60–80%、1px 描边 + 内侧高光 | `liquid-glass.md`「regular 20–40px / webview 近似」 |
| 内容列 ≤66ch、面板留白 20px、间距 12px | `layout.md` |
| 动作只在详情出现、命中区 ≥28pt | `liquid-glass.md`（控件克制）、`buttons.md` |
| 文字层级 11 / 13 / 15 / 22 | `typography.md` |

### 动作按钮（`GlassButton`）

全项目**只允许一种圆形按钮，也只有一档尺寸**，参数写在 `ui/primitives/GlassButton.vue`：

| 尺寸 | 用在 | 材质 |
| --- | --- | --- |
| 28px（`--desk-hit`） | 卡片上的「全屏 / 更多」、弹层右上角的「全屏 / 关闭」、全屏层的「退出全屏」、详情动作条 | `rgb(20 22 28/34%)` + `blur 12px saturate 1.4` + 26% 白描边 |

规则：
- **一个图标一个按钮**，不做长条工具栏；主组靠右、副组（翻页）靠左，同一条底线。
- 图标**只用 `lucide-vue-next`**（`stroke-width 1.7`，14px），**不手画 SVG、不用字符画**（原来的「▶ / ⋯ / ‹ ›」全部换掉）。
- 弹层右上角的动作行由 `Sheet` 的 `#actions` 插槽排布（`display:flex; gap: 8px`），调用方只塞按钮，**不再各写 `top/right` 硬算位置**——之前「全屏 34 + 关闭 28」并排、位置靠 `calc(12px + 28px + 8px)` 算，就是从这里统一掉的。
- 文字按钮（例如日历的「新建日程」）走 `.desk-btn` + lucide 图标，不用圆形变体。

| 卡片 | 详情动作 |
| --- | --- |
| 每日一言 | 上一条 · 下一条 ｜ 喜欢 · 复制 · 换背景 |
| 每日英语 | 上一条 · 下一条 ｜ 朗读 · 复制 · 在词典中查看 · 换一句 |
| 每日诗词 | 上一首 · 下一首 ｜ 复制全文（全文 / 译文 / 注释 用 `Chips` 切换） |
| 日历 | 新建日程（写入今日日记的待办，`.desk-btn`）；月份翻页用 28px 图标按钮 |

翻页的统一实现：三张卡都用 `core/daily.ts` 的 `dailySeries()` ——
卡片只提供「按偏移量取一条」的 loader（一言随机、英语本地句库、诗词按日期），
缓存、共享状态、背景、上一条/下一条都由它管，卡片里不再各写一套。

## 照片型内容卡（一言 / 英语 / 诗词，同一套结构）

三张每日卡**结构完全一致**，结构写在 `ui/ui.css`，卡片只覆盖字号与行数：

```html
<div class="desk-photo-card">            <!-- 容器：container-type:size，字号用 cqh/cqw -->
  <div class="desk-photo" />             <!-- 照片 + 压暗：卡片 38%，详情（.is-detail）44% + 渐变 -->
  <div class="desk-photo-body">          <!-- 卡片态：垂直居中，留白只来自令牌 -->
    <p class="desk-photo-title|text|meta|sub">…</p>
  </div>
  <div class="desk-detail-panel">        <!-- 详情态：与三张卡同一套详情规范 -->
    <div class="desk-detail-body">…</div>
    <div class="desk-detail-foot">…</div>
  </div>
</div>
```

两条硬约束：

1. **卡片上不出现日期**。卡片只放内容本身（引文 / 英文句 + 释义 / 标题 + 朝代·作者 + 诗行）；
   元信息行一律去掉，避免三张卡排版各说各话。
2. **卡片与详情必须是同一份内容、同一张图**。两条实例共用 `core/daily.ts`：
   `dailySeries(key, { initial, load })` 提供共享内容、共享背景、上一条/下一条。

### 背景（三张卡同一条规则）

| 规则 | 说明 |
| --- | --- |
| 来源 | 只用**思源本地题头图** `/appearance/covers/cover_*.webp`（离线可用）；不再用接口图床 |
| 跟随内容 | 每条内容对应一张背景（`Map<offset, url>`），翻页自动换；回到同一条时是同一张 |
| 手动换 | 详情动作条最后一个按钮「换一张背景」只重掷**当前这一条**，卡片与详情同步 |
| 压暗 | 卡片 38%，详情 44% + 上下渐变；图上文字固定白色 |

实现全在 `core/daily.ts` 的 `dailySeries()` 里：卡片只提供 `load(offset)`，背景随机、缓存、
跟随切换、手动重掷都由它负责；`photoBg(cover)` 生成样式，三张卡调用同一个函数。

垂直居中：`.desk-photo-body` 固定 `justify-content:center` + `overflow:hidden`，
所以 1x1 / 2x1 / 4x2 三种尺寸下文字块都居中，超出行数上限时裁在卡片内、不会顶到卡片外。

## 标签（Chips）

`ui/primitives/Chips.vue` 有两种底色，按**放在什么背景上**选，不要靠外部样式去改：

| tone | 用在哪 | 未选中 | 选中 |
| --- | --- | --- | --- |
| `plain`（默认） | 玻璃/实色面板（设置、卡片库） | 透明底 + `--desk-text-2` 字 + 14% 描边 | 强调色填充 + 白字 |
| `on-photo` | 照片上的详情（诗词的 全文 / 译文 / 注释） | **白字** + `rgb(16 18 24 / 52%)` 药丸 + 30% 白描边 + 背景模糊 | 白底 + 深字 |

两条约束：

- 照片底上**未选中态也必须有底色兜底**，不能只靠主题色（浅色主题下 `--desk-text-2` 是深灰，压在图上等于隐形）。
- 高度用 `--desk-hit`（28px），与其它可点元素同一命中区。

## 全屏（框架能力，所有卡片都能用）

**整张卡片铺满屏幕，没有外框**：`.desk-full` 是 `fixed inset 0`，`.desk-full-inner` 100%×100%、`border-radius: 0`、无阴影、无遮罩留边；卡片内容靠容器查询自动放大。

两个入口，同一个 `openFull()`：

| 入口 | 位置 |
| --- | --- |
| 卡片上的「全屏」键 | `CardFrame` 左上角（`Maximize2`，hover 出现，与右上「更多」成对角） |
| 详情里的「全屏」键 | `Sheet` 右上角动作行，和关闭键同一行（都 28px，间距 8px），点了先收详情再全屏 |

- 全屏层带卡片的面材质：`surface: "solid"` 的卡（日历）给 `--desk-surface` 实底，照片卡由卡片自己画照片。
- 退出：**右下角** 28px 玻璃圆键 / Esc（右上角是思源自己的窗口/页签按钮，别撞）。
- 卡片**不实现**全屏：时钟原来的「屏保 + 自己一套 sa-* 样式」已删除。
- 全屏层属于插件第四个根（`.desk-full`），`box-sizing`、`svg { fill: none }`、`button > svg { display: block }` 都已覆盖。

## 网格排版（`core/store.ts` 的 `flowDesk()` / `alignPanels()`）

iTab 的「网格落位」+ **按内容定列数**。卡片少而大，照抄 iTab「按宽度推列数」会让行尾空一大块，所以列数反过来由卡片决定：

1. **列数 = 卡片总格数**（`cols = clamp(Σw, 4, 16)`）：桌面有多少格就开多少列，一行正好装完。
2. **单格 = 可用宽 / 列数**，上限 `appearance.cell`（设置里的「单格边长」，默认 180）：
   `unit = max(48, min(cell, (容器宽 - 间距×(列-1)) / 列))`。
3. **落位**：按卡片顺序 dense 装（先最小 y，再从左往右）= iTab 的 `findFitPosition()`。
4. **尺寸**：卡片 = 格数 × 单格 + 间距，形状永远不变（iTab 也不拉伸）。
5. **居中**：单格顶到上限、或总格数超过 16 列时，网格比容器窄，`margin: 0 auto` 居中（对称留白）。

实测（5 张卡：2x2 ×4 + 4x2 = 12 格，间距 12）：

| 容器宽 | 单格上限 | 列 | 单格 | 网格宽 | 两侧留白 | 卡片 | 行尾 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2444（2500 视口） | 180 | 12 | 180 | 2292 | 76 / 76 | 372 ×4 · 756 | 0 |
| 1384（1440 视口） | 180 | 12 | 113 | 1384 | 0 / 0 | 221 ×4 · 453 | 0 |
| 1044（1100 视口） | 180 | 12 | 76 | 1044 | 0 / 0 | 164 ×4 · 340 | 0 |
| 2444 | 260 | 12 | 197 | 2444 | 0 / 0 | 397 ×4 · 807 | 0 |
| 2444 | 120 | 12 | 120 | 1572 | 436 / 436 | 252 ×4 · 516 | 0 |

规律：**单格上限越大 → 卡片越大、桌面越满**；上限小到装不满时，桌面居中收窄（不会只有右边空）。


## 尺寸版式（按形状，不按格数）

卡片可自由缩放，版式只看**形状档**（`ui/sizes.ts`）：

| 形状档 | 判定 | 内容密度 |
| --- | --- | --- |
| `mini` | 面积 ≤ 2 格 | 只留一句主文案，居中 |
| `wide` | 宽高比 ≥ 1.6 | 横排：主文案 + 一句副信息 |
| `tall` | 高宽比 ≥ 1.6 | 竖排：标题 + 多行正文 |
| `square` | 其余 | 标题 + 正文，行数居中 |
| `is-big`（叠加） | 面积 ≥ 8 格 | 正文字号升一档（`--desk-fs-card-text-wide`），行数上限 +1 |

共同规则：

- **单列垂直居中**：都用 `.desk-photo-body`；
- **宽卡的正文字号只在一处给**：`ui.css` 的 `.is-big .desk-photo-text`；
- 内留白只来自 `--desk-card-pad-y/-x` 与 `--desk-card-gap`（容器单位）；
- 文字行数上限来自 `.desk-photo-text` 的 `-webkit-line-clamp`；
- 卡片上不放日期；朗读键只在中/大卡出现。

> 早先按 `1x1 / 2x1 / 4x2` 枚举版式，卡片一旦被拖成 8×4 就落回默认样式，
> v0.5 起统一改形状档，断点只用 120 / 200 / 260 / 460 / 720 五档。

## 天气卡（`cards/weather/`）

模块拆分（对外只有 `weather.ts` 一个出口）：

| 文件 | 职责 |
| --- | --- |
| `WeatherCard.vue` | 卡面：地名 + 大温度 + 高低温，底部 6 天 |
| `WeatherPanel.vue` | 详情：左「当前 + 指标 + 逐时 + 7 日」，右「地点列表」双栏 |
| `types.ts` | 数据形状 |
| `codes.ts` | 天气码 → 中文描述 / 图标 / 天空渐变；中文描述转码 `cnCode()` |
| `net.ts` | 内存 + 落盘缓存、两个后端、`loadWeather` 调度 |
| `locate.ts` | 区县级精确定位、国内区县索引（3221 条）、国际地理编码 |
| `hooks.ts` | `useWeather()` / `usePlaceWeather()` |

**两条数据通路**：

| 地点类型 | 后端 | 提供 |
| --- | --- | --- |
| 国内（有 9 位 AREAID） | `base.itab.link/api/getWeather` + `/api/weather/24` | 当前、逐时 24、7 日、日出日落 |
| 其它（只有坐标） | `api.open-meteo.com/v1/forecast` | 当前、逐时 24、7 日 |

**定位**只有一条路：`preciseLocate()` → `base.itab.link/api/getLocation`（服务端按 IP 查区县库）。
浏览器 `navigator.geolocation` 与 `ip-api` 都已删除（桌面端前者只给 IP 级精度，后者落在出口城市）。

**版式按容器查询切**，不再有尺寸档表：

| 条件 | 变化 |
| --- | --- |
| `min-width: 200px` | 出现地名 / 天气描述 / 高低温 |
| `min-width: 260px` | 出现指标（温度区间 / 湿度 / 体感 / 日出日落） |
| `min-height: 120px` | 允许 6 天预报贴底 |

字号全部 `cqmin`，因此 8×4 / 10×5 / 12×6 是同一套版式的等比放大。

## 倒数日（`cards/countdown/`）

三份文件：`CountdownCard.vue`（卡片）、`CountdownPanel.vue`（详情）、`countdown.ts`（分类表 / 天数与单位换算 / 排序 / 封面）。

**卡面**：实色卡（`surface: "solid"`，和日历一样是纸面），**没有外圈留白**——主事件块直接铺满卡片（圆角由外框裁），白的只出现在块与块的缝隙里；主事件是「封面压暗 + 白字」的大块（标题 + 还剩·已经 + 数字 + 目标日），其余事件是「分类图标块 + 标题日期 + 数字」的行（行左右留 4–10px，别贴死卡片边）。尺寸按块裁（`CountdownCard.vue` 的 `PLAN`）：

| 尺寸 | 版式 | 块 |
| --- | --- | --- |
| `1x1` | 主事件 | 标题 + 数字 |
| `2x1` | 主事件横排 | + 目标日 |
| `2x2` | 主事件 + 列表 | + 2 行 |
| `4x2` | 左主事件、右列表 | + 3 行 |
| `2x4` | 主事件在上、列表在下 | + 5 行 |

**详情三栏**（结构、尺寸、间距照 参考实现 的 daysMatter）：

| 栏 | 宽 | 内容 |
| --- | --- | --- |
| 左「分类」 | **200px** | 7 个按钮（全部分类 / 纪念日 / 节日 / 生活 / 工作 / 目标 / 其他）：19px 图标（分类色）+ 名称 + 数量，选中变主题色 + 6% 底 |
| 中「列表」 | 自适应（1080 弹层里 546） | 分类胶囊（窄屏才显示）+ 「全部 / 即将到来 / 已过去」分段 + 「+ 新建 倒数日」药丸；列表第一项是主事件大卡（封面 + 投影），其余是行（44px 图标块 + 16px 标题 + 右侧数字 + 箭头） |
| 右「详情」 | **300px** | 128px 封面头 → 标题 + 还剩/已经 → 40px 大数字（主题色）→ 目标日 → 日/周/月/年 分段（四等分）→ 目标日 / 重复 / 置顶（40×22 开关）→ 底部「编辑」（为主）+「删除」（危险色） |

排版取值全部照抄它的：页面留白 `8`、栏间距 `8`、三栏卡片 `20px` 圆角 + 1px 边 + 白面、主事件 `margin: 8px 12px 0` + `padding: 16`、行 `padding: 10 12` + `gap: 12`、主按钮/分段控件高 `28`（药丸）、封面头 `128px`。颜色不搬它的 `--d-*`，映射到本项目的 `--desk-*`（`--d-label → --desk-text`、`--d-bg-panel → --desk-surface`、`--d-card-border-color → --desk-stroke`、`--primary-color → --desk-accent`），深色外观自动跟随。

**三栏要地方**：`registry` 的 `detailSize?: { width, height }` 是这个面板唯一的框架诉求（`min(1080px, 92vw)` × `min(680px, 86vh)`），默认弹层仍是 760×560，别的卡片不受影响。

**容器查询**（面板宽 <760）：左栏收起、分类变成顶部胶囊行、「新建倒数日」缩成「新建」；右栏默认隐藏，点列表项时整块盖在列表上（带「返回」），和它的 568px 行为一致。

**数据与算法**（`countdown.ts` + `core/dates.ts`）：

- **默认内容**：第一次用时写入 4 个节日（春节 / 中秋 / 国庆节 / 元旦，分类「节日」、每年重复）；春节、中秋是农历，日期由 `nextLunarKey` 现算（实测：2026-11-15 打开 → 元旦 2027-01-01（47 天）、春节 **2027-02-06**（83 天）、中秋 2027-09-15（304 天）、国庆节 2027-10-01（320 天））。状态里带 `seeded` 标记：只种一次，用户全删掉之后不会自己长回来。
- 分类名与颜色取它的原值：纪念日 `#ef4444`、节日 `#f59e0b`、生活 `#8b5cf6`、工作 `#3b82f6`、目标 `#22c55e`、其他 `#6b7280`。
- 天数：目标日 − 今天（本地零点，`Math.round` 差值，绕开夏令时）；未来「还剩」，过去「已经」，当天「今天」。
- 四种单位：天 / 周（÷7 取整）/ 个月 / 年（日历整月、整年，向下取整）。
- 「每年」+「按农历」：`lunar: true` 时把存的日期换成农历月/日，再找今年/明年最近的一次（iTab 的事件本来就带 `isLunar`，这里对齐）；详情「重复」会显示「每年（农历）」。
- 排序：置顶优先 → 未来（近的在前）→ 今天 → 过去（近的在前）。
- 封面不引入图片上传：按事件 id 从思源题头图里稳定挑一张（卡片与详情同一张），压暗层用它的两套（大卡横向、封面头纵向）。

## 写作热力图（`cards/heatmap/`）

四份文件：`HeatmapCard.vue`（卡片）、`HeatmapPanel.vue`（详情）、`heatmap.ts`（取数 / 分档 / 统计）、`heatmap.css`（格子，卡片与详情共用）。

**取数**（与 siyuan-dashboard 同一条路，但按思源接口的规矩改写）：思源**没有** `/api/stats/*` 这类聚合接口（`kernel/api/router.go` 里只有 `getTreeStat` 这种单文档统计），官方聚合入口就是 `POST /api/query/sql`，所以走 SQL 就是标准做法。三个要点：

```sql
select day, count(distinct id) as n from (
  select substr(created, 1, 8) as day, id from blocks where created >= '起点'
  union all
  select substr(updated, 1, 8) as day, id from blocks where updated >= '起点'
) group by day order by day limit 371
```

1. **必须写 `limit`**：思源 SQL 接口默认只回 **64 行**（实测 `select id from blocks` → 64 行，带 `limit 100000` → 13625 行）。不写的话活跃日超过 64 天的库会被静默截断，热力图只剩前半段——这是个隐藏 bug，已修。
2. **`union all` + `count(distinct id)`** 与原来的 `union` + `count(*)` 语义相同（「当天新增或修改过的块数」），但少一次去重物化：同库实测 **72ms → 62ms**（5 次中位数）。
3. 执行计划是 `SCAN blocks`（`created/updated` 没有索引），所以窗口只取需要的那些天、返回 ≤ 371 行，别把整表拉回渲染进程。

卡片与详情共用同一次查询，按周数缓存 **60 秒**；失败显示「读取写作记录失败 + 重试」，不自动重试。

**分档**：0 档 + 4 档实色，档位按**有写的那些天的四分位**切，不是按最大值线性映射——个别高产日（一次批量导入能有上万块）不会把整年压成一种颜色。

**外观（克制：单一色相 + 平涂 mark + 玻璃容器）**：

| 做法 | 依据 |
| --- | --- |
| **一个色相 4 档**（思源主色 34 / 56 / 78 / 96% 透明度叠在玻璃上），0 档是文字色 6% 的近透明格 | `charts.md › Color`「色相是类别通道，强度应该用同一通道的深浅」；`color.md`「一种颜色只表示一件事」——之前那版青→蓝→靛→紫的彩虹会让 4 档读成 4 个类别 |
| 格子是**平涂小圆角方块**（radius 3，间隙 3px），不加渐变/高光/虚化 | 数据标记要干净；毛玻璃质感属于容器（`Sheet` 的玻璃面），两者混在一起就变成「糖豆」 |
| 4 档全部由 `--desk-accent` + 透明度混出来，不写死 hex | `dark-mode.md › Dark Mode colors`「custom colors need bright and dim variants… avoid hard-coded values」——浅色/深色外观各自成立 |
| 格间留 3px 缝、hover 只描边不改色 | `charts.md › Color`「add visual separation between contiguous areas of color」；颜色只表示强度 |
| 数字与「最近活跃」列表和颜色并列给出结论 | `accessibility.md`「doesn't rely on any single method to convey information」 |

**打开时依次淡入**：`@keyframes hg-bloom`（`opacity 0→1`、`scale .72→1`）480ms，`animation-delay: calc(var(--col)*6ms + var(--row)*5ms)`——53 列合计 **0.342s** 的错峰，画面上像数据从年头往年尾一行行落下来；`prefers-reduced-motion: reduce` 时整段 `animation: none`（`motion.md`「Respect people's motion preferences」）。卡片上不放动画（桌面常驻，重绘没意义）。

**尺寸**（`HeatmapCard.vue` 的 `PLAN`，唯一裁剪真源）：

| 尺寸 | 周数 | 网格之外 |
| --- | --- | --- |
| `1x1` | 10 | — |
| `2x1` | 20 | 底部一句「N 天有写」 |
| `2x2` | 18 | 标题 + 三个数字（最长连续 / 单日最多 / 块合计） |
| `4x2` | 53（一年） | 月份标签 + 三个数字 + 图例 |
| `2x4` | 26 | 标题 + 月份标签 + 三个数字 |

**详情两栏**（弹层 `min(1040px,92vw)` × `min(360px,78vh)`）：

| 栏 | 宽 | 内容 |
| --- | --- | --- |
| 左「图」 | 自适应（762） | 标题 + 窗口范围（2025-11-10 → 2026-11-15）+ 说明行「按天统计当天新增或修改的块数」；一年 53 周网格，顶部月份、左侧周一/三/五；底部「hover 读数 / 单日最多」+ 5 档图例 |
| 右「统计」 | **240px** | 四个数字（天有写 / 天连续 / 最长连续 / 块合计，2×2）+「最近活跃」6 行（日期 + 条形 + 块数） |

**设计依据（apple-design-skill 原文）**：

| 引用 | 落到这里的做法 |
| --- | --- |
| `charting-data.md` › Best practices「Keep a chart simple, letting people choose when they want additional details」 | 卡片只给网格 + 三个数字；具体某天多少块放在 `title` 与详情右栏，不塞进格子 |
| `charting-data.md` › Anatomy「supply descriptive content… titles, subtitles, annotations… a legend」 | 详情有标题、窗口范围、口径说明（「新增或修改的块数」）、图例；卡片上「近 N 周」标清窗口 |
| `accessibility.md` › Vision「doesn't rely on any single method to convey information」 | 深浅之外同时给数字与「最近活跃」列表；每格带 `aria`/`title` 文案；详情 hover 有文字读数 |
| `color.md` › Best practices「Avoid using the same color to mean different things」+ 深浅两套 | 整张图只用主色一个色相（5 档明度），0 档用文字色 8%；`--desk-accent` 跟随思源主题，深色外观自动换 |
| `layout.md` › Visual hierarchy「Order content by relative importance / group related items」 | 左图右数、数字列 2×2 等基线、图例贴右下、留白只用 `--desk-sp-*` 与 `--desk-detail-*` |
| `typography.md`「macOS 13pt default, 10pt minimum; avoid light weights」 | 正文 13 / 读数 11–12 / 月份与星期 10，全部 400+ 字重，不出现细体 |
| `charts.md` › Marks「Bar marks work well … each value can represent a sum」 | 「最近活跃」用条形对比单日总量；主图用色块（对应 point/square mark）而不是折线，因为要表达的是「密度」不是「趋势」 |
| `motion.md`「Respect people's motion preferences」 | 逐列淡入只在详情开一次，`prefers-reduced-motion: reduce` 时完全关闭 |

**窄屏**（面板宽 <720）：上下两段——图在上、统计块落到下方，分隔线从竖线换横线。

## 翻页时钟（`cards/clock/FlipDigit.vue`）

一张牌 = 上半 + 下半，**两半里各放一张「整牌高」的数字层**，靠 `overflow:hidden` 只露出自己那一半：

```
.flip                    width .92em / height 1.35em / radius .13em / overflow:hidden
  .item.before           旧数字（翻页时出现）
    .up   rotateX(0→-90°)   transform-origin: 50% 100%（折叠处）
    .down                   保持旧数字下半张，等新牌盖下来
  .item.active           新数字
    .up                     新数字上半张，随旧牌翻走露出来
    .down rotateX(90→0°)    新数字下半张落下，延迟 0.5s
.inn                      height: 200% + display:grid + place-items:center
```

关键点（上一版就是这里错）：
- `.inn` 用 **grid 居中**，不要用 `line-height: var(--height)`——`--height` 的 em 会按 `.inn` 自己的字号解析，数字会被顶偏、在折叠处叠出两份。
- `--radius` 同时作用于 `.up .inn`（上圆角）与 `.down .inn`（下圆角），牌的四角都是圆的。
- 中缝是贴在上半张底边的 1–2px 暗线；上半张略亮、下半张略暗，翻页时再用 `filter: brightness()` 过渡。
- `.flip` 必须 `overflow:hidden`：上半张朝观察者抬起时带透视放大，不裁会「漏」到卡片上。

## 图标

- 所有功能图标只用 `lucide-vue-next`（`stroke-width 1.7`、`fill: none`），不手画 SVG、不用字符画（`▶ ⋯ ‹ › × ⤢` 已全部移除）。
- **图标必须落在按钮正中**。三步，全部由骨架给，卡片里不许各写一套：
  1. 按钮 `display: grid; place-items: center; padding: 0; line-height: 0;`
     —— 行高归零，否则 inline svg 的基线下沉，图标会偏上 1~2px；
  2. 图标 `display: block`（`styles/index.css` 里对所有插件根统一给：
     `.desk-root button > svg` / `.desk-sheet-mask button > svg` / `.desk-embed-card button > svg` / `.desk-full button > svg`）；
  3. 只放图标不放文字（`font-size: 0`），按钮尺寸 = 命中区 28px（唯一一档）。
  实测（`shot-layout` / `shot-layout-live`）：顶栏按钮、卡片「全屏 / 更多」、弹层关闭键、全屏层关闭键，
  `svg 中心 − 按钮中心` 全部是 `0 / 0`。
- 插件的品牌标（顶栏 / 页签 / 桌面壳右上角）也做成**线性描边**的四个圆角方块（`src/icons.ts`），
  与界面图标同一语言；`.desk-hero-leaf svg` 不能再写 `fill: currentColor`，否则会变成实心块。
- **必须知道的一条**：思源全局样式里有 `svg { fill: currentColor }`，它会把 lucide 的线性图标
  直接填成实心块。harness（dev-dist）没有思源样式，所以这个坑只能在真机里看出来。
  `styles/index.css` 里给插件的三个根做了兜底：

  ```css
  .desk-root svg,
  .desk-sheet-mask svg,
  .desk-embed-card svg { fill: none; }
  ```

  新增任何在插件里渲染的 `<svg>` 时，都不要依赖默认 fill；要填色就显式写在元素上。

- **因此菜单不自绘**：自绘菜单必然 `Teleport` 到 `body`，一出去就脱离上面三个根的兜底，图标立刻变实心。
  右键 / 更多 / 插入卡片一律用思源原生 `Menu`（见下节）。

## 菜单（直接用思源的）

三个入口（卡片右键、卡片「⋯」、命令「插入卡片」）全部走 `siyuan` 包的 `Menu`：

```ts
const menu = new Menu("desk-card")
menu.addItem({ icon: "iconOpen", label: "打开", click: ... })
menu.addItem({ icon: "iconRefresh", label: "刷新", click: ... })
menu.addItem({ icon: "iconLayoutGrid", label: "尺寸", type: "submenu",
               submenu: def.sizes.map((s) => ({ label: s, checked: s === props.size, click: ... })) })
menu.addSeparator()
menu.addItem({ icon: "iconTrashcan", label: "移除", click: ... })
menu.open({ x, y })
```

- **图标用思源的图标名**，不是 lucide 组件：`iconOpen` / `iconRefresh` / `iconLayoutGrid` / `iconTrashcan`
  （名单来自 `conf/appearance/icons/litheness/icon.js` 的 `<symbol id>`；当前图标主题本身就是 lucide 的线性描边，`stroke-width 1.7`，和插件一致）。
- **子菜单勾选**交给思源：`checked: true` 由思源自带 `iconCheck`，不自绘。
- **坐标**：右键用 `clientX/clientY`；「⋯」是按钮触发、鼠标可能没动过（`0,0`），这时落到按钮左下角 `{ x: left, y: bottom + 4 }`。
- 菜单的样式、行高、键盘（↑↓/Enter/Esc）、点外关闭、层级全部由思源负责，插件里没有一行菜单 CSS。

## 提示（Tooltip）

**所有提示统一走思源的 `ariaLabel` 机制**，不用浏览器原生 `title`，也不用 `b3-tooltips`：

```html
<button class="desk-btn ariaLabel"
        data-position="north"
        data-tooltip-encoding="none"
        aria-label="在今日日记里新建一条待办">…</button>
```

| 点 | 说明 |
| --- | --- |
| 渲染方式 | 思源在**文档根部**用 `#tooltip`（`position: fixed`）渲染，样式沿用思源自己的提示样式 |
| 为什么不用 `b3-tooltips` | 那是按钮自身的 CSS 伪元素，会被滚动面板 / 弹层 / 卡片外框的 `overflow` 裁掉 |
| 方向 | 统一 `data-position="north"`（提示在控件上方） |
| 文案 | 直接写进 `aria-label`；`data-tooltip-encoding="none"` 表示按纯文本显示，不转义 |
| 组件封装 | `GlassButton` 已内置（`label` 写进 `aria-label`）；其它控件手写三个属性即可 |

因为提示浮在根部，**外框可以正常 `overflow: hidden`**：卡片 `.frame`、弹层 `.desk-sheet`、
滚动面板 `.pane` 都不需要为提示开口子。

校验：`tools/verify/shot-tooltip.mjs` 在真机里 hover 后读 `#tooltip`——
`display: block`、`position: fixed`、文案与 `aria-label` 一致、在控件上方，且插件三个根里
`b3-tooltips` 与 `title` 的数量都为 0。

## 卡片材质（玻璃 / 纯色）

`CardDef.surface` 决定卡片外框的材质，`CardFrame` 按它切 `.is-solid`：

| surface | 谁用 | 面 | 依据 |
| --- | --- | --- | --- |
| `glass`（默认） | 照片卡（一言 / 英语 / 诗词）、时钟 | `color-mix(白 76% × 外观不透明度)` + `backdrop-filter: blur(24px) saturate(1.4)` | `liquid-glass.md`：fill 60–80%、blur 20–40px |
| `solid` | 日历 | `--desk-surface`：浅 `#fff` / 深 `#222`，`backdrop-filter: none`，阴影换 `--desk-surface-shadow`（1px/3px + 4px/16px） | 参考实现 的 `--bg-card`（`reference/src/bind/content.mjs`：`.light{--bg-card:#fff}` / `.dark{--bg-card:#222}`） |

**为什么日历不用玻璃**：参考实现 的 widget 一律白卡（内容区 `--d-bg-page`、面板 `--d-bg-panel`）。日历里全是小号文字和 1px 分隔线，半透明面压在壁纸上会把字和线一起糊掉（之前 4x2 左栏的日号发灰、格线发虚就是这个原因）。照片卡相反——它自带一张照片，玻璃只是让照片边缘融进壁纸。

两条附带规则：

- 纯色面**不吃**外观里的「玻璃不透明度 / 玻璃模糊」（设置面板文案已改成「玻璃不透明度」，避免误会）。
- 纯色面上的悬浮控件不能再用默认那层「32% 黑」（白底上糊成一片）：`.frame.is-solid .more` 换成 `--desk-surface-ctl` / `--desk-surface-ctl-stroke`（浅色深灰 62% + 6% 黑边，深色白 16% + 白 18% 边）。
- 纯色面上的分隔线用 `--desk-stroke-strong`（16% 黑）：8% 那档在白底上等于 #ebebeb，看不出分界；玻璃面上的分隔线仍用 `--desk-stroke`。

校验：`node tools/verify/shot-calendar.mjs light|dark` 会打印 `material`——
`background: rgb(255,255,255)` / `rgb(34,34,34)`、`backdrop: none`、`.more` 的底色随外观切换，并输出 `cal-card-hover-<theme>.png`。

## 日历卡尺寸（`cards/calendar/CalendarCard.vue`）

尺寸取自 参考实现 源码，不是自己拍的：

- 参考实现 通用右键尺寸菜单是 `["1x1","1x2","2x1","2x2","2x4"]`（`reference/src/bind/d-contextmenu-CbzAeAFB.mjs`）；
- 日历卡默认 `size: "2x2"`（`reference/src/bind/defaultNavConfig-B7uRQ5vb.mjs`）；
- 日历内容组件分两套：`CalendarDay.vue`（小格「今日」）与 `Calendar.vue`（月历）。

我们只保留**四种**（`core/registry.ts` 的 `sizes`），去掉 1x2 / 2x1 两个「月历塞不进去、只剩半行」的尺寸：

| 尺寸 | 版式 | 内容 | 对应 参考实现 |
| --- | --- | --- | --- |
| `1x1` | 单列居中 | 日号（34cqh）+ 周几 + 农历 | `CalendarDay` |
| `2x2` | 只月历 | 年月头 + 7×6 网格 | `Calendar` |
| `2x4` | 竖版两段 | 上：月历；下：日号 / 农历 / 干支·周几 / 周序·日序 | `Calendar` + `DayDetail` |
| `4x2` | 横版两栏 | 左：今日信息（`row-reverse` 把 `.cal-side` 放左）；右：月历 | `Calendar` + `DayDetail` |

共同规则：

- **1x1 就是今日卡**：不显示月历、不显示年份，日号 `clamp(22px, 34cqh, 34px)`、周几 `clamp(9px, 5cqh, 11px)`、农历 `clamp(8px, 4.6cqh, 10px)`，三行都 `flex: 0 0 auto`（否则 flex 会把日号压扁）。
- 月历网格由卡片自己内联渲染（7×6），不再另开子组件；
- 大尺寸＝形状档 `wide`/`square` + `is-big`，左今日格 + 右月历；小尺寸只留今日格。
- 卡内类名统一 `.cal-day*` / `.cal-month*` / `.cal-side*`；面板里那颗「今天」按钮叫 `.cal-today`，两边不复用类名（曾经复用导致 1x1 卡里冒出一个蓝色药丸）。
- 日号 `line-height: 1.15`：数字的墨迹框比行框高，行高再紧就会被判成「裁切」。

校验：`node tools/verify/shot-calendar.mjs`（可加 `light|dark`）循环四种尺寸，报告 `clipped` 必须为空。

## 日历详情（`cards/calendar/CalendarPanel.vue`）

黄历数据**全部直接调 tyme4ts**（没有任何封装文件），面板里只有三个转换小函数：`solarOf(date)`、`keyOf(date)`（YYYYMMDD 数字键）、`termDayOf(date)`（「清明第1天」→ 名字+第几天）：

| 行 | 来源 | 例（2026-11-15） |
| --- | --- | --- |
| 节气 | `SolarDay.getTermDay()` | 立冬 · 第 9 天 |
| 生肖 | `Zodiac.fromIndex(年支)` | 马 |
| 星座 | `SolarDay.getConstellation()` | 天蝎座 |
| 月相 | `LunarDay.getPhase()` | 蛾眉月 |
| 建除 | `LunarDay.getDuty()` + `getTwelveStar()` + `getNineStar()` | 破日 · 勾陈 · 四绿木 |
| 星宿 | `LunarDay.getTwentyEightStar()` + `SixtyCycle.getSound()` | 房宿 · 纳音 长流水 |
| 宜 / 忌 | `LunarDay.getRecommends()` / `getAvoids()` | 破屋 坏垣 求医 治病 馀事勿取 / 嫁娶 安葬 |

月视图与节日也不再手算：42 格来自 `SolarMonth.fromYm(y, m).getWeeks(mondayFirst).flatMap(w => w.getDays())`；
7 个导航节日是扫一遍库的节日表（`SolarDay.getFestival()` / `LunarDay.getFestival()`），按年缓存。
`cards/calendar/calendar-data.ts` 因此只剩 63 行「胶水」。

日历详情**不另开一套结构**，沿用详情规范：一块玻璃面（`Sheet` 提供）+ `--desk-detail-inset 12` + 每栏 `--desk-detail-pad 20`。

```
.cal-panel                  inset 12，左右两栏
  .cal-main                 padding 20，右边 1px 分隔 —— 工具栏 / 星期表头 / 月网格
    .cal-toolbar            年 select · ‹月›（28px lucide 图标按钮）· 节假日 select · 今天
    .cal-grid-week/.cal-grid 7×6，单元格圆角 --desk-r-control，周末用 --desk-danger
  .cal-aside                padding 20
    .cal-aside-head         「头像」= 60px 强调色淡染方块显示日号 + 三行元信息
    .cal-detail-list        节日 / 节气(含第几天) / 生肖 / 星座 / 月相 / 建除·十二神·九星 / 星宿·纳音 / 宜 / 忌（pill 标签）
    .cal-week-row           一周开始：两个等价选项 → Segmented（设计规则 4）
    .cal-actions            1px 分隔 + 12px 间距 + 「新建日程」（.desk-btn + Plus 图标）
```

- 「头像」不再是纯色蓝方块 + 两个白点：改成 `color-mix(accent 14%)` 淡染 + 1px 强调色描边 + 圆角 `--desk-r-card`，与卡片玻璃同族。
- 「今天」始终可见；当前已经是今天时置为 muted（不再用 `opacity:0` 藏起来）。
- 面板不再自带背景/模糊：玻璃由 `Sheet` 的 seamless 材质提供，只有一层玻璃，不叠第二层。
