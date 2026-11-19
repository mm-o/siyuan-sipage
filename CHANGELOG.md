# Changelog

## v0.5.8 — 天气模块分层 + 缓存收口（第 4、5 步）

- `weather.ts`(601) 按职责拆成五个模块，对外仍只有一个汇总出口（import 路径不变）：
  `types.ts`(40) / `codes.ts`(133) / `net.ts`(203) / `locate.ts`(156) / `hooks.ts`(76) / `weather.ts`(16 汇总)
- 新增 `core/cache.ts`：localStorage 的唯一入口，命名空间 `desk-cache:` + TTL + 失败静默
- `net.ts` / `locate.ts` 里 6 处裸 `localStorage` 全部改走 `core/cache`（实测键变成 `desk-cache:weather:36.56,105.65`，无残留旧键）
- 文档约定回到「用户状态存 petal，只有派生缓存可落 localStorage」

## v0.5.7 — 断点收敛（重构第 3 步）

- 9 个文件的 `@container` 断点统一到五个刻度：120 / 200 / 260 / 460 / 720
  （此前分散为 110/149/170/180/199/259/719/759 等 13 种随手值）
- `styles/index.css` 新增刻度表 `--desk-bp-short/narrow/mid/wide/panel`（作为唯一说明源）
- 新增守卫 `pnpm check:bp`：断点越界即失败，并接入发版门禁

## v0.5.6 — 文件合并（每层少 4 个碎文件）

- `core/icons.ts`(21) → 并入 `index.ts`
- `embed/insert.ts`(60) → 并入 `embed/cards.ts`
- `ui/settings/AboutPanel.vue`(50) → 并入 `SettingsSheet.vue`（静态页不必单开文件）
- `ui/settings/CardsLibraryPanel.vue`(77) → 并入 `CardsPanel.vue`（「组件设置」页底部接「卡片库」）
- 设置导航从 4 页收敛为 3 页：壁纸 / 组件设置 / 关于

## v0.5.4 — 恢复类型契约 + 类型检查进门禁（重构第 1 步）

- 补回被误删的 `CardSize` 类型（11 个文件在 import 一个不存在的类型，vite 不报错所以一直静默）
- 新增 `src/shims.d.ts`（`.vue` / `.css` 模块声明），`tsconfig` 改用 Bundler 解析、去掉 node 类型依赖
- `package.json` 加回 `typescript` 与 `check:types` 脚本
- `release-ship.sh` 前置三道门禁：`check:types` → `check:dist` → `check:arch`，任一失败不发版
- 顺手修掉 7 处存量类型错误（embed 重复 import、countdown 的 Component 类型、store 单例 any 收口、platform 类型）

## v0.5.3 — 版号归零 + 许可与元数据修正

- 版本号改为语义化的 `0.5.3`（此前沿用了内部迭代号 5.x）
- `LICENSE` 版权人改为项目作者；`package.json` 补 `author` / `repository` / `homepage` / `bugs`
- `plugin.json` 修正 `url`（原指向模板仓库）、中文 `displayName` / `description`
- 修复天气面板指标行被清理误删导致的单列排布（`.wx-meta` / `.wx-now` / `.wx-hour-time` 回归）
- 收进私有仓库 `mm-o/desk-cards`，每条发版打 tag + Release，可随时回退

## v3.49.2 — 弹窗结构规则落档（DESIGN.md）

把「壳透明 + 栏是面 + 外 18 内 6 + 卡片裁切/弹窗滚动」四条写成 `docs/DESIGN.md` 的《弹窗结构规则（底层约定）》：
六种位置类 `is-top/is-bottom/is-left/is-right/is-mid/is-solo` 的定义、滚动层的标准套法、标题栏 48px 与同宽 inset 的来由，
并明确禁止卡片内联覆盖 `border-radius`。代码侧无改动（规则本就只在 `ui.css` / `Sheet.vue` 各一份）。


## v3.11.0 — 所有弹窗加顶部标题栏（图标 + 标题 + 钉住/全屏/关闭），标题栏自己一块

- `Sheet` 新增 `title` / `icon` 两个 props：顶部固定一条 **52px 标题栏**（`.desk-sheet-head.desk-pane`），左边线性图标 + 卡片名，右边依次是**钉住 / 全屏（调用方的动作）/ 关闭**——三项都是 28px `GlassButton`，不再悬浮在内容上。
- 标题栏与内容栏之间留 `--desk-detail-gap` 的缝；`ui.css` 里给栏加的「顶部 46px 让位」补丁随之删除（标题栏占位后不再需要）。
- 卡片有了图标：`CardDef.icon`（时钟 `Clock` / 日历 `CalendarDays` / 天气 `CloudSun` / 倒数日 `CalendarClock` / 热力图 `Grid3x3` / 一言 `Quote` / 英语 `Languages` / 诗词 `ScrollText`），详情标题栏与后续卡片库共用这一份。
- 设置弹窗走同一套：`title="设置"` + `Settings` 图标，左导航 / 右面板各自一块 `.desk-pane`。
- 白天/夜间：卡片与弹窗配色全部走 `--desk-*`（`--desk-surface` 在 `.body--dark` 下自动变 `#222`，`--desk-pane` 由它算出来），玻璃材质与文字对比两套外观都成立。

**实测**：`shot-heatmap / countdown / weather / calendar / chrome / layout / sizes / consistency` 的 `errorCount` 与 `overflowCount` 全 **0**；`shot-settings` 的 1 条仍是 dev 页 `/api/network/forwardProxy` 404（harness 无内核代理，既有现象）。`check:dist`、`check:arch`（0 违规）通过。

## v3.10.1 — 修热力图分段错位 / 日历右栏透明；弹窗栏不透明度统一 80% 且可调；设置也分两栏

**1）热力图 12/5/6/11 月「没有格子」**：上一版把两段网格按 `aspect-ratio` 居中了，月份标签却按整行宽度百分比定位，标签落到网格外面，看起来像那几个月的格子没了。改成两段各自**铺满宽度**（格子略扁但严格对齐），12 个月分两段完整显示。

**2）日历右侧纯透明**：上一版只给左栏加了 `.desk-pane`，右栏漏了。补上同一块近纯色毛玻璃。

**3）弹窗栏的不透明度统一成 80%，并做成设置项**：

- 令牌 `--desk-pane` 改成 `color-mix(面板色 calc(var(--desk-pane-opacity) * 100%), 透明)`，默认 `0.8`；
- `Appearance.paneOpacity`（默认 0.8）+ 设置 → 组件设置 →「弹窗 · 栏不透明度」滑轨（60%–100%），改完所有详情栏与设置栏立即跟着变；
- 详情与设置共用同一个 `.desk-pane`，不再各写一份透明底。

**4）设置也分两栏**：`SettingsSheet` 的左导航 / 右面板各自是一块 `.desk-pane`，去掉原来的竖分隔线，栏间留 `--desk-detail-gap` 的缝（和详情同一套刻度）。

**实测**：热力图详情 1040×460、两段 27/26 周、12 个月标签全部落在网格内；`shot-heatmap / countdown / weather / calendar / sizes / consistency / layout / chrome` 的 `errorCount` 与 `overflowCount` 全 **0**；`shot-settings` 的唯一 1 条是 dev 页里 `/api/network/forwardProxy` 的 404（harness 没有内核代理，既有现象）。

## v3.10.0 — 全面统一：卡面材质、详情分栏、栏的对比度、钉住、热力图两段

**1）卡面材质统一**（`registry.surface` 一处决定，卡片不自己写底色）

| 卡 | 之前 | 现在 |
| --- | --- | --- |
| 日历 | solid | **solid**（不变） |
| 热力图 | glass（无底色） | **solid** |
| 倒数日 | solid | **solid**（不变） |
| 天气 | glass + 渐变 | **solid + 天气图片背景**：`skyBackdrop()` = 同色系渐变叠在思源题头图上（按天气码稳定挑图），昼夜/天气状况仍可读 |
| 时钟 / 一言 / 英语 / 诗词 | glass | **glass**（照片卡，内容本身就是图） |

**2）详情弹窗：栏分开，不再垫一层大玻璃**

- `Sheet` 外壳改成透明（去掉 `--desk-glass-fill` 底、描边、阴影、`backdrop-filter`），面下沉到每一栏。
- 新增 `ui.css` 的 `.desk-pane`：**近纯色毛玻璃**（`--desk-pane` = 面板色 92% + `blur(18px)` + 1px 边 + 轻阴影），对比从「玻璃上的 76% 白」提到 92%，字终于看得清。
- 四张卡详情都改成栏式：日历（左月历 / 右详情）、天气（左图 / 右地点）、倒数日（三栏）、热力图（左图 / 右统计），栏与栏之间 `--desk-detail-gap` 的缝，`padding-top: 46px` 给右上动作行让位。

**3）钉住（所有详情弹窗统一）**

`Sheet` 右上动作行固定三项：**钉住 / 调用方的动作（全屏）/ 关闭**，全是 28px `GlassButton`。点钉住后：

| 项 | 未钉 | 钉住 |
| --- | --- | --- |
| 遮罩 | `rgba(2,6,23,.42)` + `blur(8px) saturate(1.2)` | **透明 + `backdrop-filter: none`** |
| 点遮罩 | 关闭 | **不关**（`maskClosable` 让位） |
| 按钮 | 描边图标 | `is-on` 高亮 + 文案变「取消钉住」 |

实测：`background: rgba(2,6,23,0.42) → rgba(0,0,0,0)`、`backdrop: blur(8px) saturate(1.2) → none`、点遮罩后弹窗仍在（`stillOpen: true`）。

**4）热力图 12 个月分两段**

`heatmap.ts` 的 `splitGrid()` 把 53 周拆成 ≤27 周的两段，每段自带月份标签；段内按「高度 × 周数/7」定宽并居中，格子仍是正方形。详情从一条 53 周的长带变成上下两张半年图；4x2 卡片同样分两段。

**实测**：热力图五档 `clipped: false`（1x1 70 格 / 2x1 140 / 2x2 126 / 4x2 376 / 2x4 182），详情 1040×460、左栏 764（`.desk-pane` 圆角 18）、371 格；`shot-heatmap / shot-countdown / shot-weather / shot-calendar / shot-sizes / shot-consistency / shot-layout / shot-chrome` 的 `errorCount` 与 `overflowCount` 全 **0**。

## v3.9.1 — 热力图视觉按 HIG 重做：单一色相 + 平涂 mark + 玻璃容器

上一版把「毛玻璃 / 液态玻璃 / 水墨」全叠在**数据标记**上了：每格一个径向渐变 + 内高光 + 0.3px 虚化，颜色还走青→蓝→靛→紫四段。问题有两个——数据标记成了糖豆；色相是类别通道，拿四段色相表示强度会让 4 档读成 4 个类别。

按 apple-design-skill 重做：

| 项 | 改前 | 改后 | 依据 |
| --- | --- | --- | --- |
| 色阶 | 青 `#22d3ee` → 蓝 → 靛 → 紫 `#8b5cf6` 四段色相 | **单一色相 4 档**：主色 34 / 56 / 78 / 96% 透明度叠在玻璃上；0 档 = 文字色 6% 近透明 | `charts.md › Color`、`color.md`「一种颜色只表示一件事」 |
| 标记 | 径向渐变 + 内高光 + 外发光 + `blur(.3px)` + `border-radius: 32%` | **平涂小圆角方块**（radius 3、间隙 3px），无渐变无高光 | 数据标记要干净，质感属于容器 |
| 颜色来源 | 写死 hex（深色外观下不成立） | 全部 `color-mix(--desk-accent, transparent)`，跟思源主题与深浅外观走 | `dark-mode.md › Dark Mode colors`「avoid hard-coded values」 |
| 打开动画 | `scale .4` + `blur 5px` + `opacity`，640ms | `opacity + scale .72`，**480ms**，错峰 `列×6ms + 行×5ms`（合计 **0.342s**） | `motion.md`「Respect people's motion preferences」 |
| 右侧条形 | 主色实色、6px | 主色 72% + 面板色、5px | 与主图同一档色 |

**实测**（`shot-heatmap`）：371 个网格格子 `animationName: hg-bloom`、`duration: 0.48s`、最后一格 `animation-delay: 0.342s`、`running: true`；`emulateMedia({ reducedMotion: 'reduce' })` 后 `animationName === 'none'`（`reducedMotionOff: true`）。五档卡片 + 6 张小格 `overflowCount: 0`，`errorCount: 0`；其余六个验证脚本同样全 0。

## v3.9.0 — 写作热力图：查了思源有没有更标准的取数法（顺手修一个隐藏 bug）+ 水墨液态玻璃重做

### 取数：SQL 仍是唯一标准入口，但写法与参数都改了

先查了内核路由（`kernel/api/router.go`）：思源**没有** `/api/stats/*` 这类聚合接口，只有 `getTreeStat`（单文档）这类；官方聚合入口就是 `POST /api/query/sql`。所以问题不在「有没有别的接口」，而在**这条 SQL 有没有按规矩写**。

| 项 | 改前 | 改后 | 依据 |
| --- | --- | --- | --- |
| 行数上限 | **没写 `limit`** | `limit 371` | 思源 SQL 默认只回 **64 行**：实测 `select id from blocks` → 64 行，带 `limit 100000` → 13625 行。活跃日 >64 天的库会被静默截断，热力图只剩前半段 |
| 去重写法 | `union` + `count(*)` | `union all` + `count(distinct id)` | 语义相同（当天新增或修改过的块数），少一次去重物化：同库 5 次中位数 **72ms → 62ms** |
| 执行计划 | — | `SCAN blocks`（`created/updated` 无索引） | 因此只取窗口内的天、返回 ≤371 行，不把整表拉回渲染进程 |

### 视觉：毛玻璃 + 液态玻璃 + 水墨晕开 + 雨点式铺开

- 一格 = 一滴墨（`border-radius: 32%` + 0.3px 虚化），不再是小方块；每格 `radial-gradient(中心亮 → 本色 → 边缘更深)`，像墨落进水里化开。
- 色阶改成 **青 → 蓝 → 靛 → 紫**（`#22d3ee → #38bdf8 → #6366f1 → #8b5cf6`），**不透明度同时 55% → 95%**：色彩更丰富，但仍是单通道强度（色相只沿一条线走）。
- 顶部 `inset` 内高光 + 极淡外发光：压在玻璃卡面上有液态玻璃的厚度感；0 档是玻璃上的小凹面。
- **打开像雨点晕染**：`@keyframes hg-bloom`（`scale .4→1` / `blur 5px→0` / `opacity 0→1`），`animation-delay: calc(var(--col)*7ms + var(--row)*9ms)`，53 列约 0.4s 扫过；`prefers-reduced-motion: reduce` 时关闭。卡片上不放动画。

**实测**（`shot-heatmap`）：打开后 **160ms** 时 376 格里 **185 格**正在动画中途（`midFlight: 185`），`animationName === hg-bloom` 为真；铺满后 `overflowCount: 0`、`errorCount: 0`；`shot-sizes` / `shot-consistency` / `shot-layout` / `shot-chrome` / `shot-weather` / `shot-countdown` 同样全 0。

## v3.8.0 — 新卡片「写作热力图」：内核 SQL 取数，两栏详情看一整年

**新增**：`cards/heatmap/`（`HeatmapCard.vue` + `HeatmapPanel.vue` + `heatmap.ts` + `heatmap.css`），注册表加一行，`detail: HeatmapPanel`。

- **取数照 siyuan-dashboard 的做法**：直接 `POST /api/query/sql`，`blocks.created / updated` 取前 8 位归到天，`created` 与 `updated` 用 `UNION` 去重 → **当天新增或修改过的块数**。一条 SQL 拿到整年，卡片与详情共用，缓存 60 秒；失败给「读取写作记录失败 + 重试」。
- **分档**：0 + 主色 25/45/68/100% 四档，档位按有写的那些天的**四分位**切（个别高产日不会把整年压成一个颜色）。
- **卡片五档**：1x1 10 周 / 2x1 20 周 + 一句统计 / 2x2 18 周 + 三个数字 / 4x2 53 周（一年 + 月份 + 图例）/ 2x4 26 周 + 月份。
- **详情两栏**（`min(1040px,92vw)` × `min(360px,78vh)`）：左 762 一年热力图（月份、周一/三/五、hover 读数、图例），右 240 四个数字 + 「最近活跃」条形列表；窄屏上下两段。
- **设计走 apple-design-skill**：`charting-data`（一张图只讲一件事、细节按需展开、必备标题/图例/口径说明）、`accessibility`（不靠颜色单通道，数字与列表同时给结论）、`color`（单一色相 5 档，0 档用文字色）、`layout`（左图右数、等基线、分组留白）、`typography`（13/11/10，不用细体）、`charts`（最近活跃用条形表达总量）。

**实测**（`node tools/verify/shot-heatmap.mjs`，SQL 用确定性代答；真实库另测）：

| 尺寸 | 卡片 | body scroll | 溢出 | 周数 / 格子 |
| --- | --- | --- | --- | --- |
| 1x1 | 178×178 | 142 / 142 | 0 | 10 / 70 |
| 2x1 | 370×178 | 142 / 142 | 0 | 20 / 140 |
| 2x2 | 370×370 | 334 / 334 | 0 | 18 / 126 |
| 4x2 | 754×370 | 334 / 334 | 0 | 53 / 371（+5 图例块） |
| 2x4 | 370×754 | 718 / 718 | 0 | 26 / 182 |

详情：弹层 **1040×360**、左 **762** / 右 **240**、53 周 = **371** 格、月份标签 **12** 个、四个数字 `235 天有写 / 6 天连续 / 32 最长连续 / 25774 块合计`、最近活跃 6 行；hover 后底部读数从「单日最多 220 块」变成 `2026-11-15 · 28 块`；失败态显示占位 + 重试，点了能恢复；窄屏（面板 697）转上下两段。`overflowCount: 0`、`errorCount: 0`。

真实内核（本机 13625 个块）：同一语句 **76ms** 返回 50 个活跃日，单日峰值 **116 块**。

## v3.7.2 — 修倒数日空态：「新建第一个」按钮不居中

**问题**：空列表时「还没有倒数日 / 新建第一个」里，标题居中、按钮却偏右。量出来按钮中心比列表栏中心右移 **228px**、`margin-left` 算成 **455px**。

**根因**：`.cd-primary` 这条药丸按钮规则里带了 `margin-left: auto`——那是给工具栏「+ 新建 倒数日」靠右用的，被空态里同一个类复用，于是把按钮推到了右侧。

**改法**：`.cd-primary` 本体去掉外边距，靠右只在工具栏上下文给（`.cd-toolbar .cd-primary { margin-left: auto }`）。

**实测**（`dev-dist`，1080 弹层）：

| 面板 | 列表栏中心 | 标题中心 | 按钮中心 | 偏移 |
| --- | --- | --- | --- | --- |
| 1080（宽屏，544px 列表栏） | 670 | 670 | **670** | **0** |
| 760（窄屏，679px 列表栏） | 380 | 380 | **380** | **0** |

改前同一处：按钮中心 898、偏移 **+228**。

## v3.7.1 — 倒数日：去掉卡片白边，默认给上节日（春节按农历算）

**问题 1**：卡片外圈有一圈白边。根因是卡片吃了 `--desk-card-pad-y/-x`（12–20px 的外留白），主事件块又被 12px 圆角包住，白面在四周露出一整圈。

**改法**：`.cd-card` 的 `padding` 归零、主事件块 `border-radius: 0`（圆角交给外框裁），白的只留在块与块的缝隙里；列表行左右各留 4–10px（别贴死卡片边）。`1x1` 现在就是「整卡封面 + 标题/数字」。

**问题 2**：新装是空列表。iTab 的倒数日是带内容进入的，而且它的事件模型里本来就有 `isLunar`。

**改法**：默认写入 4 个节日（春节 / 中秋 / 国庆节 / 元旦，分类「节日」、每年重复），春节与中秋走**农历**；状态里加 `seeded` 标记，只种一次（用户全删后不再长回来）。为此新增 `core/dates.ts`（日期键 / 天数差 / 公历·农历的「下一次」），`countdown.ts` 与 `store.ts` 共用，不重复写历法。

**实测**（`shot-countdown.mjs`，单格 180 / 1440 视口）：

| 尺寸 | 卡片 | body scroll | 溢出 | 列表行 |
| --- | --- | --- | --- | --- |
| 1x1 | 178×178 | 178 / 178 | 0 | 0 |
| 2x1 | 370×178 | 178 / 178 | 0 | 0 |
| 2x2 | 370×370 | 370 / 370 | 0 | 2 |
| 4x2 | 754×370 | 370 / 370 | 0 | 3 |
| 2x4 | 370×754 | 754 / 754 | 0 | 3 |

默认内容（今天 2026-11-15）：`元旦 2027-01-01 周五 还剩47天` · `春节 2027-02-06 周六 还剩83天` · `中秋 2027-09-15 周三 还剩304天` · `国庆节 2027-10-01 周五 还剩320天`；分类计数 `全部分类4 / 节日4`。编辑春节时表单里出现「按农历」且为开、重复=每年。`overflowCount: 0`、`errorCount: 0`。

## v3.7.0 — 新卡片「倒数日」：三栏详情照 daysMatter 的源码重做

**新增**：`cards/countdown/`（`CountdownCard.vue` + `CountdownPanel.vue` + `countdown.ts`），注册表加一行，`detail: CountdownPanel`。

- **详情三栏，尺寸/间距/圆角按 参考实现 的 daysMatter 照抄**：左「分类」200px（7 个分类按钮：图标用分类色 + 名称 + 数量）｜中「列表」自适应（分类胶囊 + 全部/即将到来/已过去 分段 + 「+ 新建 倒数日」药丸 + 主事件大卡 + 事件行）｜右「详情」300px（128px 封面头 + 标题 + 还剩/已经 + 40px 大数字 + 日/周/月/年 分段 + 目标日/重复/置顶 + 编辑/删除）。页面留白 8、栏间距 8、三栏卡片 20px 圆角。
- **卡片五档尺寸**：1x1 标题+数字 / 2x1 +目标日 / 2x2 +2 行 / 4x2 左主事件右 3 行 / 2x4 主事件 + 5 行；主事件是「封面压暗 + 白字」大块，其余是「分类图标块 + 标题日期 + 数字」行。卡面实色（`surface: "solid"`）。
- **数据**：`core/store.ts` 第五组状态 `countdown`（键 `countdown`，`bootStore()` 读一次 + `watch` 存盘）；分类名/颜色取它的原值；天数按本地零点算；四种单位（天 / 周 / 个月 / 年）；「每年」自动取今年或明年；排序=置顶 → 未来 → 今天 → 过去。
- **框架新增一个字段**：`registry.detailSize?: { width, height }`（这个面板要 `min(1080px, 92vw)` × `min(680px, 86vh)`），默认弹层仍是 760×560。
- 编辑不弹二级弹层：详情栏整块切成表单（标题 / 日期 / 分类胶囊 / 重复 / 置顶），窄屏下面板宽 <760 时左栏收进胶囊行、详情盖在列表上并可「返回」。

**实测**（`node tools/verify/shot-countdown.mjs`，单格 180 / 1440 视口）：

| 尺寸 | 卡片 | body scroll | 溢出 | 列表行 |
| --- | --- | --- | --- | --- |
| 1x1 | 178×178 | 142 / 142 | 0 | 0 |
| 2x1 | 370×178 | 142 / 142 | 0 | 0 |
| 2x2 | 370×370 | 334 / 334 | 0 | 2 |
| 4x2 | 754×370 | 334 / 334 | 0 | 3 |
| 2x4 | 370×754 | 718 / 718 | 0 | 4（共 5 条事件） |

详情：弹层 **1080×680**、左 **200** / 中 **546** / 右 **300**、圆角 `20px`、5 条事件、分类计数 `全部分类5 / 纪念日2 / 节日1 / 生活1 / 工作1 / 目标0 / 其他0`。
新建「敦煌旅行 / 2027-05-01 / 目标」后：列表 5 → **6**、全部分类 6、目标 1、详情显示该事件；切分类「纪念日」→ 2 条；切「已过去」→ 2 条；单位 `日 12天 → 周 1周 → 月 0个月 → 年 0年`；置顶 `false → true`；删除 6 → 5。
窄屏（面板 697px）：左栏 `display:none`、胶囊行出现、详情默认隐藏 → 点一条盖上 → 「返回」收起。`overflowCount: 0`、`errorCount: 0`。

## v3.6.3 — 修 v3.6.2 的回归：详情底部动作组散架（按钮不在一条线）

**问题**：v3.6.2 里我把 `ui.css` 的 `.desk-fab`（`display:flex; align-items:center; gap:8px`）当成死代码删了 —— 判断依据是一次跑偏的 grep（`src\**\*.vue` 在 PowerShell 里不是递归匹配，结果为空）。实际有 4 处在用：`SeriesNav.vue` 的 ‹ › 翻页组，以及 每日一言 / 每日英语 / 每日诗词 三张卡详情底部的动作组。少了这条，组内按钮退回行内流，跟着各自行高落位 → 看起来不在一条线上。

**改法**：把 `.desk-fab` 规则原样放回 `ui.css`（并加注释说明谁在用）。`--desk-fab`（34px 尺寸令牌）确实没人用，保持删除。

**实测**（dev harness，详情底部）：

| 动作组 | display | gap | 组高 | 按钮 | 同一行 |
| --- | --- | --- | --- | --- | --- |
| 上一条 / 下一条 | `flex` | 8px | 28 | 28×28，y 都是 497 | `oneRow: true` |
| 喜欢 / 复制 / 换一张背景 | `flex` | 8px | 28 | 28×28，y 都是 497 | `oneRow: true` |

`shot-consistency`（三张卡 卡片↔详情同源 + 翻页）全绿；本次同时把 `.desk-fab` 写回 `DESIGN.md` 的结构示例。

## v3.6.2 — 圆形按钮只留一档：详情右上角的「全屏 / 关闭」终于一样大

**问题**：卡片详情的右上角并排两个键——「全屏」是 `GlassButton` 默认档 **34×34**（38% 深色 + `blur 18`，图标 16），「关闭」是手写 `<button>` **28×28**（45% 深色 + `blur 12` + 14% 白描边，图标 15）。大小、材质、描边、图标尺寸全不一样，位置还是用 `right: calc(12px + 28px + 8px)` 硬算出来的。

**改法**（一处真源，不再各写）：

1. `GlassButton` **删掉 `mini` 变体**，只留一档 28px（`--desk-hit`）+ 34% 深色 + `blur 12` + 26% 白描边 + 14px 图标；`--desk-fab`（34px）令牌随之删除。
2. `Sheet` 新增 `#actions` 插槽：右上角变成一行 `display:flex; gap: 8px` 的动作行，**关闭键（`GlassButton`）也在这一行里**，调用方只塞按钮，不再算位置。
3. `DeskShell` 把详情里的「全屏」塞进插槽；删除 `.desk-detail-full` 的绝对定位与 34px 覆盖；全屏层的「退出全屏」也从 34 降到 28。
4. 顺带删掉 `ui.css` 里没人用的 `.desk-fab` 规则；验证脚本里的旧选择器 `.desk-sheet-float-close` 统一改成 `.desk-sheet-close`。

**实测**（`shot-icons` / `shot-chrome` / `shot-layout` / `shot-tooltip` 真机）：

| 按钮 | 改前 | 改后 |
| --- | --- | --- |
| 详情「全屏」 | 34×34，`rgb(20 22 28/38%)`，图标 16 | **28×28**，`rgb(20 22 28/34%)`，图标 14 |
| 详情「关闭」 | 28×28，`rgb(15 23 42/45%)` + 14% 描边，图标 15 | **28×28**，同左 | 
| 全屏层「退出全屏」 | 34×34 | **28×28** |
| 位置 | `right = 12 + 28 + 8` 硬算 | 同一 flex 行，`gap: 8`（实测 全屏 x=943 / 关闭 x=979，y 都是 183） |

`shot-icons` 实测弹层与卡片上 9 个圆形键（全屏 / 更多 / 全屏 / 关闭 / 上一条 / 下一条 / 喜欢 / 复制 / 换一张背景）全部 `fill: none`、`stroke 1.7px`、`size 14`；`shot-chrome` / `shot-layout` / `shot-sizes` / `shot-consistency` / `shot-weather` 的 `errorCount` 均为 0；`shot-tooltip` 真机读 `#tooltip`，关闭键提示「关闭」、位置在按钮上方。

## v3.6.1 — 修天气卡「开机就失败」：内核代理 12s 超时不够冷启动

**现象**：刚打开思源时天气卡显示「天气加载失败」，报 `code: 8 / forward request failed … TLS handshake timeout`。

**根因**：`forwardProxy` 默认 `timeout: 12000`，而本机对 `api.open-meteo.com` 的**冷连接**（TLS 握手 + Cloudflare 边缘）要 10s 以上。实测同一个 URL、连续 5 次：

| 内核代理 timeout | 成功次数 | 单次耗时 |
| --- | --- | --- |
| 12000ms | **0 / 5** | 每次卡在 10.04s 报 TLS handshake timeout |
| 30000ms | **5 / 5** | 冷启动 5.18s，热连接 1.45–1.53s |

**改法**（`cards/weather/weather.ts`）：

1. 两个请求（天气 / 地理搜索）显式传 `30_000`，不再用 12s 默认值。
2. 刷新失败时**先用这个地点上一份缓存**（哪怕已过期）：卡片已经拿到过数据就不会再闪成失败态，下次打开再试。
3. 失败文案收成一句人话（`网络超时，稍后重试` / `天气服务暂不可用` / `天气加载失败`），不再把 Go 的整串错误塞进卡片。
4. 右侧地点列表改**并行**取（原来是串行 await）：命中缓存的地点当帧就显示，不被另一个地点的冷启动堵在后面。

**实测**：真机（真思源，1440×940）整页加载后 **8.91s** 卡片出数据（=冷启动 TLS），`failing: false`；详情左 518px / 右 240px / 小时 24 条 / 7 日 7 列；右侧两个地点都带各自温度（北京 阴 9° 最高11° 最低4°；中卫 晴 3° 最高7° 最低1°）。`shot-weather` 里失败用例已改成复刻内核真实错误形状，卡片显示「网络超时，稍后重试」+ 重试按钮，点重试能恢复；`overflowCount: 0`、`errorCount: 0`。

**同版本第二个修复：小格桌面上多日预报挤到重叠**。尺寸档只说明「几格」，像素宽度由桌面卡片数决定——6 张卡的桌面单格只有 ~76px，`4x2` 实际只有 **316×152**（不是 754×370），7 列会互相压字。改法：把排版层拆成 `.wx-body`（容器查询挂在 `.wx-card` 上、排版层在内层，因为容器不能查询自己），按**实际宽度**再降档：

| 内容宽 | 处理 |
| --- | --- |
| `≥460px` | 按尺寸档正常排 |
| `<460px` | `4x2` 退回竖版、只留 3 日、隐藏指标行；多日一律 3 列 / 3 行；`2x4` 行内只留「星期·图标·温度」 |
| `<200px` | 只剩地点 + 图标 + 温度（`2x2` 居中），`2x4` 例外（一行一天，窄也放 3 行） |

实测（`shot-weather.mjs` 新增 `small` 段落：桌面放 6 张卡、单格 ~76px）：`4x2` 335×161 显示 3 列、`2x4` 161×335 显示 3 行、`2x2` 161×161 只剩地点+温度；`scrollHeight=clientHeight`、相邻多日列 x/y 均不相交（`overlaps: []`）、`clipped: false`，`overflowCount: 0`。

## v3.6.0 — 新卡片「天气」：对齐 参考实现 的天空渐变卡面 + 两段式详情（天气列表）

**新增**：`cards/weather/`（`WeatherCard.vue` + `WeatherPanel.vue` + `weather.ts`），注册表加一行，`detail: WeatherPanel`。

- **样式按源码重做**：卡面与详情都铺「天气状况」渐变（晴天/多云/阴/雾/雨/雪/雷暴 × 白天/夜间共 14 套，取值照它 `.weather-*` 的渐变，rain/snow/thunder 它用 webp 贴图，这里改成同色系渐变）+ 白字；详情区块 `rgb(255 255 255 / 8%)` 圆角块、80px 温度、7 日 7 列 + 折线，右栏 `w-60`（240px）「天气列表」地点卡片（22px 温度 + 最高最低，当前项亮边）。
- 数据源（免 key）：地理搜索 `geocoding-api.open-meteo.com/v1/search`、天气 `api.open-meteo.com/v1/forecast`（当前 + `hourly` 24 小时 + 7 日，同一个接口追加 hourly 参数）；两者都走 `core/image.ts` 的 `forwardProxy`。参考实现的 `api.itab.link` 要 key、走自家代理，只借 UI 不借接口。
- 状态：`core/store.ts` 第四组状态 `weather`（键 `weather`，`bootStore()` 读一次 + `watch` 存盘），默认一个地点（北京 39.9075 / 116.39723 / Asia/Shanghai），只剩一个时不许删。
- 每个地点缓存 10 分钟（内存 Map），飞行中的请求共享一个 Promise；切地点保留旧数据到新数据到；失败显示「占位 + 重试」，不自动重试。
- WMO 天气码 26 个全映射（未知码「—」），`0/1/2` 夜间换夜间图标。
- 五档尺寸按内容裁：1x1 图标+温度 / 2x1 +地点+今日高低温 / 2x2 +描述+体感湿度风+3 日 / 4x2 左当前右 7 日 / 2x4 竖版+5 日列表；多日预报统一套白/8 圆角块。`2x4` 又窄又高，字号改用 `cqw` 跟随宽度。

**实测**（`node tools/verify/shot-weather.mjs`，单格 180 / 间距 12 / 1280 视口）：

| 尺寸 | 卡片 | scrollHeight / clientHeight | 溢出元素 | 3~7 日 |
| --- | --- | --- | --- | --- |
| 1x1 | 178×178 | 178 / 178 | 0 | — |
| 2x1 | 370×178 | 178 / 178 | 0 | — |
| 2x2 | 370×370 | 370 / 370 | 0 | 3 |
| 4x2 | 754×370 | 370 / 370 | 0 | 7 |
| 2x4 | 370×754 | 754 / 754 | 0 | 5 |

详情（760×560 弹层）：左「天气」**518px**、右「天气列表」**240px**（`rgba(255,255,255,0.07)` 底 + 毛玻璃、无分隔线）、`flexDirection: row`、圆角块 **2** 个、「天气状况」小时列 **24** 条、7 日 **7** 列、面板背景实测为当前天气的渐变（阴天 `linear-gradient(35deg, rgb(53,69,100) 30%, …)`）。
窄到 602px 弹层：`column`，右栏 `display:none`、「管理地点」出现，展开后右栏落在左栏下方（`stacked: true`）。
搜索「上海」返回 7 条候选，点第一条后地点数 1 → 2、`activeId` 切到上海、卡片标题 北京 → 上海；再点「北京」切回、`activeId` 跟回北京；右侧地点卡显示各自 `11° / 最高11° 最低4°`。`errorCount: 0`、`overflowCount: 0`。

## v3.5.0 — 列数按卡片总格数定：一行铺满整个宽度

**问题**：v3.4.0 把桌面锁成 1350px 居中，2500 宽下两侧各空 598px，行尾还空 2 格 —— 右侧看着还是空。

**根因**：列数是「按宽度推」的（iTab 那样）。iTab 桌面是几十个小图标、格子 60px，按宽度推列数行永远是满的；卡片少而大时，按宽度推出来的列数总是多于卡片需要的格数，行尾必然空一截。

**改法**：列数反过来由内容定，单格再去填满宽度：

1. `cols = clamp(Σ卡片格数, 4, 16)` —— 5 张卡共 12 格就开 12 列，一行正好装完；
2. `unit = max(48, min(appearance.cell, (容器宽 - 间距×(cols-1)) / cols))` —— 单格铺满容器，到「单格边长」上限就封顶；
3. 网格仍是定宽 + `margin: 0 auto`，只有单格顶到上限时才居中收窄（对称留白）；
4. `DEFAULT_CELL` 120 → 180；设置里去掉 v3.4.0 加的「桌面宽度」，只留「单格边长」（88–260）—— 它现在同时决定卡片大小和桌面宽度。

**实测**（5 张卡：2x2 ×4 + 4x2 = 12 格，间距 12）：

| 视口 | 单格上限 | 单格 | 网格宽 | 两侧留白 | 卡片 | 行尾 |
| --- | --- | --- | --- | --- | --- | --- |
| 2500 | 180 | 180 | 2292 | 76 / 76 | 372 ×4 · 756 | 0 |
| 1440 | 180 | 113 | 1384 | 0 / 0 | 221 ×4 · 453 | 0 |
| 1100 | 180 | 76 | 1044 | 0 / 0 | 164 ×4 · 340 | 0 |
| 2500 | 260 | 197 | 2444 | 0 / 0 | 397 ×4 · 807 | 0 |
| 2500 | 120 | 120 | 1572 | 436 / 436 | 252 ×4 · 516 | 0 |

## v3.4.0 — 桌面定宽居中：右侧不再只有一边空

**问题**：v3.3.0 把列数从「单格」推出来，但网格仍铺满整个容器。4 张卡（10 格）在 2444px 宽的画布上是 10/14 列 → 右边空出一大块，看着不协调。

**再看 iTab 的 CSS**（`styles/main-hoR8XHF2.css` 的 `.app-grid`）：

```css
.app-grid {
  width: var(--app-grid-width);              /* 单格 × 列数 + 间距 × (列数-1)，像素定值 */
  grid-template-columns: repeat(cols, 60px); /* 单格是固定像素，不随容器缩放 */
  grid-auto-rows: 60px;
  grid-auto-flow: dense;
  margin: 0 auto;                            /* ← 定宽 + 居中 */
}
```

它的可用宽度是 `min(视口宽, 内容区上限 1350) - 两侧内边距`，所以**超宽屏下两侧留白对称**，卡片也不会被摊大。

**改法**：

1. `layoutDesk()` 增加 `maxWidth` 参数（默认 `DESK_MAX_WIDTH = 1350`，= iTab 的默认内容区宽度）；
2. `appearance.width` 新设置项（设置 → 布局 → 桌面宽度，900–2400），改它即时重排；
3. 网格改成定宽：`width: cols × 单格 + 间距 × (cols-1)`，CSS `margin: 0 auto` 居中；
4. `DEFAULT_CELL` 88 → 120（2x2 卡片 252px，和 iTab 的卡片观感一致），设置里「单格边长」上限 360 → 220（和代码里的夹取范围对齐）。

**实测**（4 张卡：2x2 / 2x2 / 2x2 / 4x2 = 10 格，单格 120 / 间距 12 / 宽度上限 1350）：

| 容器宽 | 列 | 网格宽 | 两侧留白 | 卡片 | 行尾 |
| --- | --- | --- | --- | --- | --- |
| 2444（2500 视口） | 10 | 1308 | 568 / 568 | 252 ×3 · 516 | 铺满 |
| 1384（1440 视口） | 10 | 1308 | 38 / 38 | 252 ×3 · 516 | 铺满 |
| 1044（1100 视口） | 8 | 1044 | 0 / 0 | 252 ×3 · 516 | 第 4 张换行 |

harness：`dev/main.ts` 补了外观预置（原来只能预置桌面，宽度/单格改不动），`shot-layout` 0 报错。

## v3.3.0 — 排版照搬 iTab：固定列网格 + 落位，卡片不拉伸

**问题**：v3.2.0 用「按行 flex + 剩余宽度按比例分给整行」来消灭右侧留白，代价是卡片尺寸随窗口乱飘（宽屏一行三张 2x2 各 453px，4x2 变 686×337），整页被三张卡占满。

**去看 iTab 源码**（`reference/src/bind/globStorageState-Ci2MglOw.mjs` 的 `class P`）：

- 桌面就是一个 `cols` 列的网格，每个 widget 存 `pos { x, y, w, h }`，单位是「格」；
- `findFitPosition(w, h)` 从 y=0 逐行扫，找第一个装得下的空位；autoSort 时是 dense，会把洞填掉；
- 卡片尺寸只由格数和列宽决定，**iTab 从不拉伸卡片**，装不满的行就空着；
- 尺寸菜单只有 `1x1 / 1x2 / 2x1 / 2x2 / 2x4`。

**改法**：`packRows()` + 按行 flex 全部删掉，只留 `layoutDesk()`（`core/store.ts`）：

1. `target = clamp(单格, 160, 240)`，`cols = clamp(round((宽 + 间距) / (target + 间距)), 4, 32)`，`unit = (宽 - (cols-1) × 间距) / cols`；
2. 按卡片顺序 dense 落位，第一个装得下的空格就是位置（= iTab 的 `findFitPosition`）；
3. `DeskShell` 用绝对定位摆 `.grid-cell`：`宽 = w × unit + (w-1) × 间距`，`高 = h × unit + (h-1) × 间距`；
4. 形状永远不变，剩下的空格就空着。

夹住单格是这一步的关键：单格 88 会推出 24 列（2x2 只有 193px），单格 360 只推出 6 列（2x2 变 792px）。

**实测**（5 张卡：2x2 / 2x2 / 2x2 / 4x2 / 4x2，容器宽 2444 / 1384 / 1044）：

| 容器宽 | 列 | 行数 | 卡片尺寸 | 右侧留白 |
| --- | --- | --- | --- | --- |
| 2444 | 14 | 1 | 339 ×3 · 690 ×2 | 0 |
| 1384 | 8 | 2 | 337 ×3 · 686 ×2 | 0 / 0 |
| 1044 | 6 | 3 | 340 ×3 · 692 · 692 | 0 / 0 / 0 |

harness：`shot-layout`（改成量绝对落位）等全 0 报错。

## v3.2.0 — 网格改成「按行 flex」：每行必然铺满，右侧不再留白

> 已被 v3.3.0 取代（按行拉伸会让卡片尺寸失控），这里只留记录。

**问题**：宽屏下第一行只排了 3 张 2x2，右侧空出一大块（`grid` 用固定列数 + 卡片固定跨列，行尾列没人用就只能空着）。上一版试过「把剩余列全给最后一张」，结果把一张 1x1 拉成 11 列宽的横幅，形状全毁。

**改法**：不再用列网格，改成**按行 flex**：

1. `packRows()`（`core/store.ts`，唯一排版算法）：按「单格」估算一行能放多少单位（`floor((宽+间距)/(单格+间距))`），从左往右装卡片，装不下换行；
2. 每行是 flex 容器，卡片 `flex: <宽度单位> 1 0%` → 剩余空间**按宽度比例分给该行所有卡片**，行必然铺满；
3. 高度由 `aspect-ratio: 宽 / 高` 跟着宽度走 → 2x2 还是方的、4x2 还是 2:1，形状不因铺满而变形；
4. 收尾：一行只剩一张时会被拉成巨型卡，所以从上一行末尾挪一张下来作伴（上一行仍 ≥2 张、装得下才挪）。


**实测**（5 张卡：2x2 / 2x2 / 2x2 / 4x2 / 4x2）：

| 容器宽 | 行数 | 每行卡片尺寸 | 右侧留白 |
| --- | --- | --- | --- |
| 1785（你的宽屏） | 1 | 248 / 248 / 248 / 496 / 496 | **0** |
| 1384 | 2 | 453 ×3 · 686 ×2 | 0 / 0 |
| 1044 | 2 | 340 ×3 · 516 ×2 | 0 / 0 |

harness：`shot-sizes` / `shot-calendar` / `shot-consistency` / `shot-chrome` / `shot-layout` 全 0 报错。

## v3.1.2 — 修：改名把外部接口域名也改了（一言/英语/诗词加载失败）

**根因**：v3.0.0 的全局改名把 `itab` → `desk` 一刀切，连**外部接口地址**也改掉了：

| 文件 | 被改成的（404） | 正确的 |
| --- | --- | --- |
| `YiyanCard.vue` | `https://base.desk.link/yiyan/random` | `https://base.itab.link/yiyan/random` |
| `EnglishCard.vue` | `https://base.desk.link/desk/todayEnglish` | `https://base.itab.link/itab/todayEnglish`（`/itab/` 是它的路由前缀） |
| `ShiciCard.vue` | `https://base.desk.link/todayShici` | `https://base.itab.link/todayShici` |

`base.desk.link` 根本不存在（DNS 直接失败），所以一言/诗词空着。

**改法**：主机只留一处 —— `core/daily.ts` 导出 `DAILY_API = "https://base.itab.link"`，
三张卡写 `` `${DAILY_API}/…` ``，并在常量上注明「外部域名，不能跟着插件改名」。

**实测**（harness，真网络）：三张卡都出内容，请求命中
`base.itab.link/yiyan/random`、`base.itab.link/itab/todayEnglish`、`base.itab.link/todayShici?date=…`；
产物里 `base.itab.link` 1 处、`base.desk.link` 0 处。

**全仓复查**：`src/` 里剩下的 `itab` 只有三处，都是外部服务的一部分（域名 `base.itab.link`、
英语路由 `/itab/todayEnglish`，以及 `daily.ts` 上说明这件事的注释）。

## v3.1.1 — 插件图标换回思桌那张彩色标

* 顶栏 / 页签图标保持现在的「整页」标（`iconDeskCards`：四个圆角方块，左上右下实心）。
* `plugin.json` 的 `icon.png`（集市/设置里显示的那张）换回思桌的彩色图标：深色圆角底 + 蓝/紫/粉/青四块。
* 实测：仓库 `icon.png` 与部署目录 `data/plugins/desk-cards/icon.png` 哈希一致（12096 B）。

## v3.1.0 — 删掉黄历封装文件；删掉所有兼容旧数据的代码

### 一、`core/almanac.ts` 整个删除（204 行）

黄历本来就全是 tyme4ts 算的，中间那层封装没有价值。现在**卡片直接问库**：

| 原函数 | 现在 |
| --- | --- |
| `getLunar(date)` | `SolarDay.fromYmd(...).getLunarDay()`（时钟、日历卡各 2 行） |
| `getAlmanac(date)` | 面板里直接组装：`getDuty/getTwentyEightStar/getTwelveStar/getNineStar/getPhase/getRecommends/getAvoids/getFestival…` |
| `getSolarTermName(date)` | 面板内 `termDayOf(date)`：`getTermDay().toString()` → 名字 + 第几天 |
| `monthDays(y, m, 周首)` | `SolarMonth.fromYm(y, m).getWeeks(...)`（月历卡与面板各 3 行） |
| `toDateKey(date)` | 删掉：改用 `YYYYMMDD` 数字键 `keyOf(date)`（比较更快，也不用格式化字符串） |
| `dayOfYear / weekOfYear / diffFromToday` | `getIndexInYear()+1` / `getSolarWeek(n).getIndexInYear()+1` / `JulianDay` 差值 |

`core/` 5 → **4** 个文件（registry / store / image / daily）；`src/` 39 → **38** 个文件。

### 二、删掉全部「兼容旧版本 / 旧数据」

插件还在开发阶段，不留后路：

- `readKey()` 不再做 `{...默认值, ...存档}` 的字段补齐，直接 `存档 ?? 默认值`；
- 删掉 `normalizeAppearance()`：旧的 `cell=260 / gap=16` 迁移、`cell/gap` 范围兜底全部去掉；
- 删掉 `localStorage` 旧键迁移（旧版本遗留的键，上一版删过一次，这次连注释痕迹也清干净）；
- `DeskShell` 里 `wallpaper.type === "gradient"` 的死分支删除（类型里根本没有 gradient）。

## v3.0.0 — 全面改名：插件里不再出现 iTab；图标换成「整页」标

### 一、命名

| 原来 | 现在 |
| --- | --- |
| 插件 id `itab-cards` / 名「iTab 卡片」 | **`desk-cards` / 「桌面卡片」（Desk Cards）** |
| 类 `ItabCardsPlugin`、`TAB_TYPE = "itabcards"` | `DeskCardsPlugin`、`deskcards` |
| 图标 id `iconItabCards`、`iconItabView` | `iconDeskCards` |
| CSS 变量 `--itab-*`、类 `.itab-*` | `--desk-*`、`.desk-*` |
| 桌面壳类 `.sz-*`（「思桌」遗留） | `.desk-*`（根节点 `.sz-desk` → `.desk-root`） |
| `globalThis.__itab*` 单例 | `__desk*` |
| i18n `openItab` / `insertItabCard` | `openDesk` / `insertDeskCard` |
| 内嵌属性 `data-itab-card` | `data-desk-card` |
| `localStorage` 旧键迁移（`itab-cards:*`） | **删除**：状态只走思源插件存储 |
| `package.json` name `plugin-sample-vite-vue`、README 还是模板内容 | `desk-cards`、重写的中英 README |

`src/` + `tools/` + `dev/` + 根配置文件里 **0 个 `itab` 标识符**（构建产物里只剩 `writable` / `suitable` 这类单词里的巧合字母）。

### 二、图标

换成「iTab 整页」插件的顶栏标（四个圆角方块：左上/右下实心、右上/左下半透明）：
`PLUGIN_ICON_SVG`（顶栏内联 SVG）、`PLUGIN_ICON_ID = iconDeskCards`（页签 + 桌面壳右上角 `<use>`）、`icon.png`（256×256 渲染图）。

### 三、数据与部署

- 插件目录：`data/plugins/desk-cards`（旧 `itab-cards` 已删除）；
- 状态目录：`data/storage/petal/desk-cards`（旧的 `petal/itab-cards` 三个文件已迁移过去，桌面/外观/壁纸不丢）；
- **插件 id 变了，思源需要重启一次才会加载新插件**。

## v2.17.1 — 全屏字号统一到一套令牌；退出键挪到右下角；网格只加宽半格

### 一、字号终于统一：一套令牌管所有卡片文字

原来字号上限散在 `ui.css`（19/22px）和三个卡的 scoped 里（12px / 11px / 10px / 9px 写死），全屏时全被上限卡住，所以「全屏文字还是那么小」。

现在只在一处给：

| 令牌（`styles/index.css`） | 值 | 用在哪 |
| --- | --- | --- |
| `--desk-fs-card-title` | `clamp(11px, 7.4cqh, 56px)` | `.desk-photo-title`、诗词标题 |
| `--desk-fs-card-title-wide` | `clamp(15px, 8cqh, 56px)` | 4x2 诗词标题 |
| `--desk-fs-card-text` | `clamp(11px, 8cqh, 64px)` | `.desk-photo-text`、1x1 引文/句子、2x1 诗行 |
| `--desk-fs-card-text-wide` | `clamp(16px, 9cqh, 64px)` | 4x2 正文 |
| `--desk-fs-card-meta` | `clamp(9px, 4.6cqh, 28px)` | `.desk-photo-meta`、朝代·作者、释义 |
| `--desk-fs-card-sub` | `clamp(9px, 4.4cqh, 26px)` | `.desk-photo-sub`、1x1 出处 |

三个卡的 scoped 里那 10 处写死的 `font-size: 12px/11px/10px/9px` 全部换成令牌（`ui.css` 的 5 处 clamp 也换成令牌）。
**常规尺寸不变**（实测 2x2 正文仍是 16.06px），**全屏自动放大**（实测 1440×900 下正文 64px、出处 26px）。

### 二、退出全屏键挪到右下角

右上角是思源自己的窗口/页签按钮，之前 20px 的退出键和它叠在一起。现在固定在**右下角** `right: 20px; bottom: 20px`（实测距右/下各 20px）。

顺带：全屏层改成**不透明**（`--desk-surface` 打底）——之前时钟这类半透明材质的卡全屏后能看见底下的桌面，现在不会了。

### 三、网格只加宽半格（避免把一张卡拉成横幅）

`packGrid()` 的行尾规则从「剩余列全给最后一张」改成「只给该行**最宽**的一张，且最多加它自身的一半」：

- 1x1 不加宽 → 形状永远是 1:1（之前一行只有 3 张 1x1 时，最后一张会被拉成 11 列宽的横幅）；
- 2x2 最多变 3 列、4x2 最多变 6 列，剩下的列留在行尾，不会再出现 3.6:1 的怪比例。

实测（harness）：1x1 三张全部 91×91、2x1 194×91（最宽那张 297×91）、4x2 400×194。

## v2.17.0 — `calendar-data.ts` 删除；全屏改成整卡铺满 + 详情也能全屏

### 一、`cards/calendar/calendar-data.ts` 整个删除

上一版它只剩 63 行「胶水」，这版连胶水也不留：

| 原来 | 现在 |
| --- | --- |
| `monthDays()`（3 行库调用） | 移进 `core/almanac.ts`（`SolarMonth.getWeeks()` 直出 42 格） |
| `getFestivalDates()` / `getActiveFestival()`（扫库节日表 + 按年缓存） | 移进 `CalendarPanel.vue`（只有这个面板用，`SolarYear` 扫一遍 + 缓存） |
| `FestivalDate` 类型 + `NAV_FESTIVALS` 表 | 同上，跟着进面板 |

`cards/calendar/` 现在只有 `CalendarCard.vue` / `CalendarMini.vue` / `CalendarPanel.vue` / `calendar.css`；
`src/` 39 个文件 5807 行，`check:arch` 34 文件 0 违规。

### 二、全屏：整张卡片铺满，不要外框

* 去掉 `.desk-full-box`（圆角 + 阴影 + 按宽高比缩到屏内的框）：现在 `.desk-full` 是 `fixed inset 0`，
  `.desk-full-inner` 100%×100%、`border-radius: 0`，卡片直接铺满整屏。
* 全屏层带卡片的面材质：`surface: "solid"`（日历）给实底，照片卡由卡片自己画照片。
* 日历的字号上限放宽（`clamp(…, 11px)` → 22px、大日号 40 → 110、34 → 120），全屏时数字/格子才跟着变大。
* 实测：全屏层 1440×900、`border-radius: 0px`、卡片内容 1440×900，与视口一致。

### 三、详情里也能全屏

* `Sheet` 右上角关闭键左边新增 34px「全屏」键（间距 8px，图标居中 0/0），点了先收详情再全屏。
* 实测：按钮 34×34、`aria-label="全屏"`，点击后 `.desk-full` 打开、`.desk-sheet` 关闭。

## v2.16.0 — 月视图与节日也交给库，`calendar-data` 只剩胶水

上一版把农历/节气/干支/星座/月相交给了 tyme4ts，但 42 格月视图和 7 个节日导航还是手写的。这版一并交出去：

| 原来手写 | 现在 |
| --- | --- |
| `getMonthGrid()`：算 1 号是周几、往前补几天、拼 42 个 `Date` | `SolarMonth.fromYm(y, m).getWeeks(mondayFirst ? 1 : 0).flatMap(w => w.getDays())` |
| `FESTIVAL_DEFS` 表 + 固定公历日期 + 农历月日反查 + `solarTermDate(清明)` | 扫一遍库的节日表（`SolarDay.getFestival()` / `LunarDay.getFestival()`），取「元旦/春节/清明节/劳动节/端午节/中秋节/国庆节」，按年缓存 |
| 节日 id（`yuandan` / `chunjie` …） | 直接用库给的节日名当 id（下拉值与显示名同源） |
| `core/almanac.ts` 里的 `solarTermDate()` + `SolarTerm` 依赖 | 删除（唯一调用方没了） |
| `core/date.ts`：手写日序号（含 1582 跳日修正）、年内周序、年内日序、日差 | 删除整个文件；改 `SolarDay.getIndexInYear()+1` / `SolarWeek.getIndexInYear()+1` / `JulianDay` 差值，`toDateKey` 也并进 `almanac.ts` |

* `cards/calendar/calendar-data.ts`：95 → **63** 行；`core/almanac.ts`：189 → **204** 行（并入日期工具）；`core/date.ts` 整个删除。
* `core/` 6 → **5** 个文件（registry / store / almanac / image / daily）；`src/` 5843 → **5801** 行、40 个文件。
* JS 364.15 → **363.69 kB**（gzip 130.10 kB）。
* 实测（harness）：节假日下拉 7 项 `元旦/春节/清明节/劳动节/端午节/中秋节/国庆节`，选「国庆节」跳到 `2026-10-01 周四`；四尺寸 `clipped` 全 0。
* 实测（真机）：日历四尺寸不裁、详情 42 格 + 8 行黄历（本年第 46 周 / 第 319 天仍与旧算法一致）、加卡移除复原（`restored: true`），0 报错；`check:dist` 仍只依赖 `siyuan`、`check:arch` 35 文件 0 违规。

## v2.15.0 — 日历改用 tyme4ts（和 参考实现 同款库），黄历能力全开

**为什么用库**：参考实现 的日历本来就是 `tyme4ts` 驱动的（`reference/src/modules/Content-QrOTiqmd.mjs` 里能搜到 `tyme4ts` / `getSixtyCycleDay` / `getConstellation` / `getPhase`）。我们之前手写了农历（Intl 反查）、节气（2412 字符的 2bit hex 表）、干支基准、星座表、月相表、农历→公历逐日试探——都是库已经算好的东西，还容易算错。

### 一、删掉的手写实现

| 文件 | 行数 | 处理 |
| --- | --- | --- |
| `core/lunar.ts`（Intl 农历 + 干支 + 缓存） | 311 | **删除**，换 `core/almanac.ts`（189 行 tyme4ts 封装） |
| `cards/calendar/calendar-data.ts`（节气 hex 表 + 星座/月相/干支日 + 农历反查） | 326 → **95** | 只留「42 格月视图 + 节日导航」，其余交给库 |
| `core/calendar.ts` 里手写的星座/月相/干支 | 已在上版拆走 | 同上，全部删除 |

### 二、库里用上的能力（日历详情一次显示）

`SolarDay` / `LunarDay` / `SolarTerm` / `SixtyCycle` / `Zodiac` / `LunarYear`：

| 行 | API | 实测（2026-11-15） |
| --- | --- | --- |
| 节气 + 第几天 | `SolarDay.getTermDay()` | 立冬 · 第 9 天 |
| 生肖 | `Zodiac.fromIndex(年支)` | 马 |
| 星座 | `SolarDay.getConstellation()` | 天蝎座 |
| 月相 | `LunarDay.getPhase()` | 蛾眉月 |
| 建除 / 十二神 / 九星 | `getDuty()` / `getTwelveStar()` / `getNineStar()` | 破日 · 勾陈 · 四绿木 |
| 二十八宿 / 纳音 | `getTwentyEightStar()` / `getSixtyCycle().getSound()` | 房宿 · 纳音 长流水 |
| 宜 / 忌 | `getRecommends()` / `getAvoids()` | 破屋 坏垣 求医 治病 馀事勿取 / 嫁娶 安葬 |
| 节日 | `getFestival()`（公历 + 农历） | 元旦 / 春节 … |
| 节日导航 | `LunarYear.fromYear().getMonths()` 反查 + `SolarTerm.fromName()` | 春节 2026-02-17、端午 06-19、中秋 09-25、清明 04-05 |

### 三、代价与守卫

* 依赖：`tyme4ts@1.5.6`（进 `dependencies`，构建时打进 bundle，**不是**运行时外部依赖）。
* 体积：JS 160.68 → **364.15 kB**（gzip 59.03 → 130.24 kB）；CSS 不变 39.36 kB。
* `src/` 6176 → **5885** 行；`check:dist` 仍只允许 `siyuan` 一个外部依赖，`check:arch` 36 文件 0 违规。
* 验证：harness 四尺寸 `clipped` 全 0；真机日历 42 格 + 8 行黄历（上面那张表逐行读的是真机 DOM）；加卡/移除后桌面复原（`restored: true`），0 报错。

## v2.14.0 — 存储直接读写、全屏变通用能力、图标居中、网格铺满

### 一、存储：去掉缓存层，直接读思源 API

* 删掉 `core/persist.ts`（116 行），存储逻辑并进 `core/store.ts`：
  * 读：`bootStore()` 里 `await plugin.loadData(key)` 一次，**直接赋给 reactive**，不留副本；
  * 写：状态一变就 `plugin.saveData(key, 状态)`；滑轨这类高频变化只合并 100ms 请求，**不缓存数据**；
  * 没有 `hydrate` 缓存、没有队列、没有 `flush`，内存里的 reactive 就是唯一真源 —— 不存在「缓存和磁盘谁对」的同步问题。
* 保留两个必要件：装载完成前不写（否则默认值会盖掉用户数据）、`globalThis` 单例（思源会把 bundle 载入 20 次）。
* 老数据仍一次性迁移：新存储没该键时回退读 `desk-cards:*` 的 localStorage。
* `core/` 7 → **6** 个文件（registry / store / date / lunar / image / daily），`src/` 41 个文件 6176 行。

### 二、全屏：从时钟的私货变成框架能力

* `CardFrame` 左上角固定一个「全屏」按钮（`Maximize2`，hover 出现，与右上角「更多」成对角），emit `fullscreen`。
* `DeskShell` 新增 `.desk-full` 层：遮罩 + `blur(18px)`，`.desk-full-box` 按卡片宽高比撑到屏内（`min(92vw, 88vh × 宽高比)`），右上角 34px 玻璃圆键退出，Esc / 点空白也能退。
* 时钟的 `isFull` / `screensaver` / `sa-*` 样式 / 自己的 Esc 监听全部删除（-40 行）；现在照片卡、日历、时钟都能全屏。
* 时钟数字上限从 `64px` 放宽到 `132px`，全屏时数字才真的变大（实测 792×792 层里数字约 100px）。

### 三、图标居中：一套骨架，四处同源

* 三个原因一起修：行高（`line-height: 1` 会让 inline svg 基线下沉）、`display`（`inline` 参与行盒）、内边距。
* 骨架：按钮 `display: grid; place-items: center; padding: 0; line-height: 0;`，图标 `display: block`（`styles/index.css` 对四个插件根统一给 `button > svg { display: block }`）。
* 实测 `svg 中心 − 按钮中心`：顶栏按钮 `0/0`、顶栏品牌标 `0/0`、卡片「更多」`0/0`、卡片「全屏」`0/0`、弹层关闭键 `0/0`、全屏层关闭键 `0/0`。

### 四、网格：宽度自适应、左右留白一致、行尾铺满

* 新增 `packGrid()`（`core/store.ts`，唯一排版算法）：列数 `floor((宽 + 间距) / (单格 + 间距))`、列宽 `1fr` 均分；逐行装卡片，**行尾剩余列全给该行最后一张**（只加宽不改高度），高度 = 高单位 × 列宽 + 间距。
* `DeskShell` 用 `ResizeObserver` 量容器宽度，宽度一变就重排。
* 画布左右内边距与顶部 hero 对齐（28 / 28）。
* 实测真机（901px 宽、4 张卡）：`cols = 7 × 118px`、`leftSlack = 0`、`rightSlack = 0`；harness（1384px、6 张卡）：`13 × 95px`、`0 / 0`，且四档卡片宽高比仍为 1 / 1 / 1 / 2。

## v2.13.0 — core 瘦身：13 → 7 个文件，卡片专属的算法回到卡片

**判断标准**（写进 `ARCHITECTURE.md` 硬规则 1）：`core/` 只放**多张卡共用**的骨架；
只有一张卡用的算法，放它自己的目录。

### 一、搬回卡片：只服务日历的那两个文件

| 原位置 | 新位置 | 依据 |
| --- | --- | --- |
| `core/calendar.ts`（326 行，11 个导出） | 拆成 `core/date.ts`（5 个通用日期工具）+ `cards/calendar/calendar-data.ts` | 只有 `toDateKey` 被诗词卡用，其余 10 个（月视图/星座/月相/干支日/节日）**只有日历卡用** |
| `core/solar-terms.ts`（99 行） | 并进 `cards/calendar/calendar-data.ts` | 唯一调用方就是上面那个文件 |

### 二、合并重复：三个「图片」文件 → 一个

`core/covers.ts`（题头图清单）+ `core/wallpapers.ts`（必应/Picsum/随机）+ `core/imageProxy.ts`（直连失败走内核转发）
说的是同一件事：**一张图从哪来、拿不到怎么办**。合成 `core/image.ts`，并把两处各写一遍的
`/api/network/forwardProxy` 收成一个 `forwardProxy(url, encoding)`（text / base64 只差一个参数）。

### 三、归位：不该在 core 的搬走

| 原位置 | 新位置 | 理由 |
| --- | --- | --- |
| `core/mount.ts` | `embed/mount.ts` | 唯一调用方是文档内嵌 |
| `core/theme.ts` | 并进 `ui/style.ts`（`photoBg` + `useTheme`） | 读 `document.body` 的 UI 探测，core 的约定是「与 UI 无关」 |
| `core/layout.ts`（29 行） | 并进 `core/store.ts` | 网格几何就是外观状态的一部分，88/12 仍只声明一处 |

### 四、结果

* `core/`：13 → **7** 个文件（registry / store / persist / date / lunar / image / daily），共 **1046** 行；
* `src/`：46 → **42** 个文件、6203 → **6171** 行；`check:arch` 检查文件数 41 → **37**，0 违规；
* 产物：CSS 39.14 kB、JS 160.51 kB（与合并前基本持平，gzip 59.09 kB）；
* 验证：`shot-calendar light`（四尺寸 `clipped` 全空、0 报错）、`shot-consistency`（三张照片卡 `sameBg: true`、详情含卡片文字）、`shot-settings`（780×620、无标题栏）全绿。

## v2.12.0 — 设置并入统一弹层 + 状态改存思源插件存储（重启不再丢）

### 一、弹窗统一

* `Sheet` 从「两种长相」收敛成**一套**：一块玻璃面 + 悬浮关闭键（28pt）+ 内容自己排版。
  `variant` 参数、`.desk-sheet-head` 标题栏、`.desk-sheet-close`、`title` 插槽全部删除。
* 设置（`SettingsSheet`）改成同一套结构：外圈 `--desk-detail-inset 12`，左栏 `.nav` 与右栏 `.pane` 各 `--desk-detail-pad 20`；标题「设置」写进左栏顶部，不再有独立标题栏。
* 展开方式统一：设置也传 `origin`，从被点的那个 32×32 按钮 FLIP 放大（280ms，关闭缩回同路径）。实测关键帧 `translate(544px, -377px) scale(0.0410, 0.0516) → none`。
* 实测（真机 `shot-settings-live.mjs`）：详情 760×560、设置 780×620，两者 `head = 0`、`floatClose = 1`、`bodyPad = 0px`、`border-radius = 18px`、`backdrop-filter` 一致；设置 `inset = 12px`、`panePad = 20px`；Esc 后 `.desk-sheet` 数 0。

### 二、持久化（重启丢卡片 / 丢尺寸的根因）

* 根因两条：
  1. 原来写 `localStorage`——思源桌面端的 localStorage 会随会话丢失，重启即空；
  2. 更致命：**思源会把插件 bundle 载入多次**（同一文档实测 20 次 `onload`、20 次 `core/store.ts` 求值），每份副本都建了自己的 reactive 状态和监听，后载入的副本用默认值把前面写的数据覆盖掉——所以就算存下来也会被冲回种子。
* 改法：
  * 存储换成思源插件存储 `plugin.saveData / loadData`，落在 `<工作空间>/data/storage/petal/desk-cards/{desk,wallpaper,appearance}`（键名会变成文件名，不能带冒号）；
  * `core/persist.ts` 重写成「驱动 + 内存缓存 + 防抖 150ms 写」：`hydrate()` 在 `onload` 里 await 一次，`markReady()` 之后才允许落盘，`flush()` 在 `onunload` 补写；
  * `core/store.ts` 的状态与监听器挂到 `globalThis` 单例（`__deskDesk` / `__deskWallpaper` / `__deskAppearance` / `__deskWatching` / `__deskBooted`）：20 个副本共享同一份状态，监听只注册一次；
  * 兼容：新存储没有该键时回退读旧 `localStorage` 键（`desk-cards:*`），老用户数据一次性迁移。
* 实测（真机 `shot-persist-live.mjs`）：加日历并切 2x4 → petal 的 `desk` 文件里出现 `{"cardId":"calendar","size":"2x4"}`；整页重载后桌面仍是 2 张卡、日历仍是 2x4；移除后文件与桌面同时回到 1 张卡；`localStorage` 里插件键 **0 个**；0 报错。

## v2.11.1 — 右键菜单改用思源原生 `Menu`

* **问题**：卡片右键菜单的图标又变成实心块。根因在自绘的 `ui/primitives/Menu.vue`——它必须 `Teleport to="body"` 才能盖在卡片上，一出去就落在思源全局 `svg { fill: currentColor }` 的射程里，`styles/index.css` 给三个插件根的 `fill: none` 兜底够不着。
* **做法**：删掉自绘菜单（237 行），`CardFrame` 改用 `siyuan` 的 `Menu`：`addItem({ icon, label, click })` + `addSeparator()` + `open({x, y})`，子菜单用 `type: "submenu"` + `checked`。
* 图标换成**思源的图标名**：`iconOpen` / `iconRefresh` / `iconLayoutGrid` / `iconTrashcan`（名单取自 `conf/appearance/icons/litheness/icon.js` 的 `<symbol id>`；当前图标主题本身就是 lucide 线性描边 1.7，与插件同一语言）。子菜单的勾由思源给（`b3-menu__checked` + `#iconSelect`），不自绘。
* 坐标：右键用 `clientX/clientY`；「⋯」若是键盘/脚本触发、`clientX/Y` 为 0，落到按钮左下角 `{x: left, y: bottom + 4}`。
* 菜单的样式、行高（28px）、键盘（↑↓/Enter/Esc）、点外关闭、层级全部交给思源，插件里没有一行菜单 CSS。
* **顺手压掉**：`ui/motion.css` 63 → 20 行（`.desk-pop-*` 与 `.desk-card-frame` 无人用，`:root` 里的时长令牌和 `styles/index.css` 重复）。
* 产物：CSS 42.24 → 40.09 kB、JS 164.56 → 160.08 kB；`src/` 41 个文件（原 42）。
* 验证：
  - harness（`shot-chrome.mjs`）改为断言「交给思源的那份菜单」：`id: desk-card`、四项 + 一条分隔、尺寸子菜单 6 档且当前档 `checked: true`、右键坐标 = 光标、⋯ 坐标 = 按钮左下角；
  - 真机（新增 `shot-menu-live.mjs`）：菜单是思源自己的 `.b3-menu`，四行图标 `iconOpen / iconRefresh / iconLayoutGrid / iconTrashcan`、行高 28px、子菜单 6 档且 `2x2` 带勾、两次 Esc 后可见菜单数 0、⋯ 点开后菜单正好弹在按钮中心 `(227,193)`，0 报错。

## v2.11.0 — 日历卡按尺寸分化：1x1 就是「今日」

* **尺寸来自 参考实现 源码，不是自己拍的**：参考实现 右键尺寸菜单是 `["1x1","1x2","2x1","2x2","2x4"]`（`reference/src/bind/d-contextmenu-CbzAeAFB.mjs`），日历默认 `size: "2x2"`（`reference/src/bind/defaultNavConfig-B7uRQ5vb.mjs`），内容组件分 `CalendarDay`（小格今日）与 `Calendar`（月历）。我们取其中能装下内容的四种：**`1x1` / `2x2` / `2x4` / `4x2`**，去掉 1x2 与 2x1。
* **`CalendarCard.vue` 重写为尺寸感知**：
  - `1x1` = 今日卡（对齐 `CalendarDay`）：日号 + 周几 + 农历，无月历、无年份；
  - `2x2` = 只月历：年月头 + 7×6 网格；
  - `2x4` = 竖版两段：月历在上，今日信息在下（日号 / 农历 / 干支·周几 / 周序·日序）；
  - `4x2` = 横版两栏：`row-reverse` 把今日信息放左、月历放右。
* **不为尺寸复制网格**：三种月历尺寸共用同一个 `CalendarMini`；`1x1` 走 `.cal-day*` 分支。
* **一处真 bug**：`.cal-today` 类名在卡片与面板里重名（面板里是「今天」按钮），1x1 卡里因此冒出一个蓝色药丸。卡片侧全部改名为 `.cal-day*` / `.cal-side*`，面板保留 `.cal-today`。
* **排版细节**：日号 `line-height: 1.15` 且三行都 `flex: 0 0 auto`——数字的墨迹框高于行框，行高更紧或允许 flex 收缩都会被判定裁切。
* 校验：`node tools/verify/shot-calendar.mjs light|dark` 循环四种尺寸，实测 **8 张截图（4 尺寸 × 明/暗）全部 `clipped: []`、0 报错**。
* **真机复核**（新增 `tools/verify/shot-calendar-live.mjs`）：真思源里加日历卡，用卡片库尺寸标签逐档切换 ——
  `1x1` 框 88×88、`2x2` 188×188、`2x4` 188×388、`4x2` 388×188，四档 `clipped` 全为空；
  详情打开有 42 个日格 + 「新建日程」；移除后桌面卡片数与加卡前一致（`restored: true`）。
* **顺手压一遍 CSS**：`calendar.css` 540 → 511 行。卡片 mini 网格与详情大网格本来是两份重复声明（7 列 × 6 行、周末红、列表归零），合并成一组 `.cal-mini-week, .cal-grid-week` / `.cal-mini-grid, .cal-grid`；`.cal-day` 与 `.cal-side` 共用「居中竖排 + 三行不许压缩」一组规则。合并后 CSS 41.99 → 41.45 kB，四档截图与量盒数字逐项不变。
* 文档：`DESIGN.md` 新增「日历卡尺寸」章节（四种版式对照表 + 类名不重名规则）；`ARCHITECTURE.md` 验证清单补一条四尺寸不裁切。

### 卡片材质：日历改成 参考实现 的纯白卡（不再半透明）

* **问题**：日历卡是玻璃面（白 76% × 外观不透明度 0.62 ≈ 47%），压在壁纸上发灰——4x2 左栏的大日号、月历的 1px 格线全被壁纸透上来糊掉。
* **参考实现 是怎么做的**（`reference/src/bind/content.mjs`）：`.light{--bg-card:#fff}` / `.dark{--bg-card:#222}`，widget 内容区 `--d-bg-page`（`#f2f2f7` / `#111`）、面板 `--d-bg-panel`（`#ffffff` / `#1c1c1e`）——**卡片面是不透明的白/深灰**，没有 backdrop blur。
* **做法**：`CardDef` 新增 `surface?: "glass" | "solid"`（默认 `glass`），日历标 `solid`；`CardFrame` 按它切 `.frame.is-solid`：
  - 面 = `--desk-surface`（浅 `#fff` / 深 `#222`），`backdrop-filter: none`；
  - 阴影换成 参考实现 的轻投影 `0 1px 3px rgb(0 0 0/8%), 0 4px 16px rgb(0 0 0/4%)`（深色 `40% / 24%`），描边 `--desk-surface-stroke`；
  - 纯色面不吃「玻璃不透明度 / 玻璃模糊」，设置面板文案改成「玻璃不透明度」。
* **顺带修掉白卡上的控件**：悬浮「⋯」原来是 32% 黑玻璃，白底上糊成一片；纯色面改用 `--desk-surface-ctl`（浅色深灰 62% + 6% 黑边、深色白 16% + 白 18% 边）。
* **纯色面上的分隔线**：2x4 的上下分界、4x2 的左右分界从 `--desk-stroke`（8% 黑 ≈ #ebebeb）提到 `--desk-stroke-strong`（16% 黑），白底上才看得见；详情面板里的分隔线保持原样不动。
* 照片卡（一言/英语/诗词）保持玻璃：它们内容本身就是一张照片，玻璃是让照片边缘融进壁纸。时钟也保持玻璃。
* 实测（`shot-calendar.mjs light|dark` 新增 `material` 段）：`solidClass: true`、`background: rgb(255,255,255)` / `rgb(34,34,34)`、`backdrop: none`、`.more` 底色 `rgba(20,22,28,.62)` / `rgba(255,255,255,.16)`、hover 后 `opacity: .92`，四档 `clipped` 仍为 0。真机（`shot-calendar-live.mjs` 新增桌面全景）：日历 `bg rgb(255,255,255) / backdrop none`，旁边诗词卡仍是 `color(srgb 1 1 1 / .47) / blur(24px)`，两者并排不打架。

## v2.10.3 — 组件边界写清楚 + 机器守卫 `check:arch`

* **回答一个架构疑问**：「把三张卡的翻页抽成 `SeriesNav` 是否违背一个组件一个 Vue？」——不违背：`SeriesNav` 是 `ui/primitives/` 里的共享控件（和 `GlassButton` 同层），三张卡的 `*Card.vue` 仍各自拥有内容、排版、`load(offset)` 与背景规则；它只吃一个结构化契约 `{ step(dir) }`，不 import `core/`、不认识 cardId、没有 scoped 样式。
* **顺手修掉一处真的越界**：`photoBg()`（返回 style 对象）原来放在 `core/daily.ts`，而 core 的约定是「与 UI 无关」——移到 `src/ui/style.ts`。
* **把规则变成可执行断言**：新增 `tools/verify/check-arch.mjs`（`pnpm check:arch`），6 条检查：
  1. `core/**` 不得依赖 `ui/` `cards/` `embed/`（唯一豁免 `core/registry.ts`，它是装配点）；
  2. `ui/**` 不得依赖 `cards/`；
  3. `ui/primitives/**` 不得依赖 `core/` `cards/`（基础控件只吃 props）；
  4. `cards/<id>/**` 不得依赖别的卡片目录；
  5. `cards/**` 只允许 `core/` `ui/` 自身；
  6. 每个 `cards/<id>/` 恰有一个 `*Card.vue`。
  实测：42 个文件、5 个卡片目录、**0 违规**。
* 文档新增「二之二、组件边界（什么可以抽成共享组件）」：四问判据 + 三条「不许」+ 现有共享组件清单（`GlassButton` 纯控件 / `SeriesNav` 复合控件 / `Chips` `Segmented` `Slider` `Swatch` `Menu`）。

## v2.10.2 — 提示改用思源的 ariaLabel 机制

* **换成 `ariaLabel`**：所有提示从 `b3-tooltips b3-tooltips__n`（按钮自身的 CSS 伪元素）改成思源的 `ariaLabel` 机制——
  `class="… ariaLabel"` + `data-position="north"` + `data-tooltip-encoding="none"` + `aria-label="…"`，
  由思源在**文档根部**用 `#tooltip`（`position: fixed`）渲染，沿用思源提示样式。
* **好处**：`#tooltip` 浮在根部，**不受滚动面板 / 弹层 / 卡片外框 `overflow` 裁剪**。因此把上一版为溢出开的口子收回去：
  `.desk-sheet` 恢复 `overflow: hidden`、`.desk-sheet-body` 去掉 `border-radius: inherit`、`.frame` 恢复 `overflow: hidden`。
* 覆盖范围不变：GlassButton（详情动作条 / 卡片「更多」/ 时钟全屏）、桌面壳 3 个按钮、弹层关闭键、日历上/下月与农历格、新建日程、滑块、壁纸缩略图、色板。`GlassButton` 的 `tipSide` 参数随之删除（方向统一 `north`）。
* 真机实测（`shot-tooltip.mjs`）：五处 hover 后 `#tooltip` 均 `display: block`、`position: fixed`、文案与 `aria-label` 一致、位于控件上方；插件三个根里 `b3-tooltips` = 0、`title` = 0。

## v2.10.1 — tooltip 方向统一向上

* 所有提示改用 `b3-tooltips__n`（思源把提示顶到控件上方，`bottom: 元素高度 + 4px`），不再「上方控件朝下、下方控件朝上」分叉。
* 为让提示能溢出两个外框都不再裁切：`.desk-sheet` 从 `overflow: hidden` 改成 `visible`，内容由 `.desk-sheet-body` 自己裁（新增 `border-radius: inherit`，四角仍是圆的）；卡片外框 `.frame` 之前已是 `visible`。
* 真机实测（`shot-tooltip.mjs`）：`hero / fab / close / slider / tile` 五处 `content` 有值、`opacity: 1`、`afterBottom` 分别为 32 / 32 / 26 / 28 / 79.875px（都 > 0，即在控件上方），`title` 全为 `null`。

## v2.10.0 — 三张卡背景彻底统一（跟随内容 + 可手动换）

* **来源统一**：三张卡都只用**思源本地题头图** `/appearance/covers/cover_*.webp`。每日英语原来优先用接口给的 `picture`（远端图床），是「三张卡背景不一致」的根因——该字段已从卡片里删除。
* **跟随内容**：背景与内容一一对应（`Map<offset, url>`）。点「上一条 / 下一条」内容换了，背景跟着换；回退到同一条时拿到的是同一张。
* **手动换**：详情动作条最后一个是「换一张背景」，只重掷当前这一条，卡片与详情同步。三张卡都有（英语原来没有；同时删掉了「换一句」——接口按天返回同一句，翻页已由上一句/下一句承担）。
* **翻页组抽成组件**：`ui/primitives/SeriesNav.vue`（‹ › 两个按钮），三张卡的详情共用，标签统一成「上一条 / 下一条」。
* **顺手清理**：`daily.ts` 删掉没人用的 `ready` / `reload`；新增请求序号守卫，快速连点时只认最后一次，避免旧结果覆盖新内容。
* 实测（harness）：三张卡 `sameAsCard=true`、`changedOnNext=true`、`hasShuffle=true`、`changedOnShuffle=true`、`localCover=true`、`cardFollowsDetail=true`；真机同样 `changedOnNext / changedOnShuffle / localCover` 全 true（示例 `cover_009.webp`）。

| 指标 | 之前 | 现在 |
| --- | --- | --- |
| `src/` | 5575 行 / 47 文件 | **5588 行 / 48 文件**（+SeriesNav 14 行） |
| `core/daily.ts` | 71 行（含未用的 ready/reload） | **74 行（背景按条缓存 + 序号守卫）** |
| 三张卡详情 | 各自写 ‹ › | 共用 `SeriesNav` |

## v2.9.1 — 提示统一成思源 tooltip

* **所有提示改用思源的 tooltip**（`.b3-tooltips` + `aria-label`，思源用 `::after { content: attr(aria-label) }` 渲染），不再出现浏览器原生 `title` 小黄框。覆盖范围：
  - `GlassButton`（详情动作条、卡片「更多」、时钟全屏键）：`label` 写进 `aria-label`，新增 `tipSide` 控制方向；
  - 桌面壳右上角 3 个按钮（设置 / 添加卡片 / 品牌标）；
  - 弹层关闭键（普通 + 无缝两种）；
  - 日历：上/下月、月历格里的农历/节气、新建日程；
  - 设置面板：滑块（双击回默认值）、壁纸缩略图、色板。
* 方向按位置选：靠上的控件用 `b3-tooltips__s`（提示在下方），靠下的用 `__n`（提示在上方）。
* `CardFrame` 的 `.frame` 从 `overflow: hidden` 改成 `visible`（内容仍由 `.body` 裁切），否则「更多」的提示会被外框裁掉。
* 真机实测（`shot-tooltip.mjs` 读伪元素）：`hero / fab / slider / tile` 四处 `content` 均为对应文案、hover 后 `opacity: 1`、`background #312f35`、`border-radius 6px`、`font-size 12px`、`z-index 1000000`，且 `title` 全为 `null`（不会出现双重提示）。

## v2.9.0 — 英语/诗词补上「上一条·下一条」+ 继续收敛

**功能**
* **每日英语、每日诗词的详情现在也有「上一条 / 下一条」**（与每日一言同一位置、同一按钮）。
  - 诗词：接口支持 `?date=`，翻页 = 前一天 / 后一天的诗，按日期缓存。
  - 英语：接口只按「今天」返回一句（`?date=` 被忽略），翻页用本地 24 句句库循环；本地句子用系统语音合成朗读（接口有 `tts` 时仍播音频）。
* 翻页行为实测：三张卡 `changedOnNext = true`、`backToFirst = true`（点下一条内容确实变、点上一条能回到原处）。

**继续压（去重）**
* 三张卡的取数/缓存/游标/翻页/背景各写一份 → 统一成 `core/daily.ts` 的 `dailySeries(key, { initial, load(offset) })`：卡片只写 loader，其余全交给它。
* 三份 clipboard + execCommand 兜底（每份 12 行）→ `ui/dom.ts` 的 `copyText()`；`ui/toast.ts` 并入同一个文件。
* 三份背景样式 → `photoBg(cover, picture?)`。
* 四个设置面板各写一份 `.panel` 骨架、两个面板各写一份 `.preview` → `ui.css` 的 `.desk-panel` / `.desk-preview` / `.desk-preview-tag`。
* `CardFrame` 的 `menu?: { expand, refresh, size, remove }` 四开关从来没人传 → 删除，菜单固定四项。

| 指标 | 之前 | 现在 |
| --- | --- | --- |
| `src/` 行数 | 5543 | **5575**（多了英语句库与两个翻页，重复代码净减） |
| 卡片文件 | 一言 137 / 英语 165 / 诗词 206 | **107 / 202 / 213**（一言减 30 行；英语/诗词多出的部分是句库与翻页） |
| `core/daily.ts` | 42 行（共享状态） | **71 行（共享状态 + 序列 + 翻页 + 背景）** |
| 产物 CSS | 41.6 kB | **41.8 kB** |

## v2.8.1 — 4x2 下三张卡正文字号统一

* **问题**：4x2（388×188）时「每日英语 / 每日诗词」的字比「每日一言」小一圈。根因是字号散落在各卡 scoped 里：一言写了 `.is-4x2 .quote { font-size: clamp(16px, 9cqh, 22px) }`，诗词写的是 `clamp(12px, 6cqh, 15px)`，英语直接继承共享的 `8cqh`（≈15px）。
* **修法**：4x2 的正文字号只在 `ui/ui.css` 给一次 —— `.is-4x2 .desk-photo-text { font-size: clamp(16px, 9cqh, 22px) }`；三张卡的 scoped 里只保留行数与次要文字（出处/释义/朝代）字号。
* 连带微调：诗词 4x2 从「5 行 15px」改成「4 行 17px」，标题 15px、朝代·作者 12px；英语释义 12px —— 与一言的出处 12px 对齐。
* 实测（`shot-sizes`）：4x2 三卡正文均为 **16.74px**，次要文字均为 **12px**，无裁切（`over: false`）；2x2 / 2x1 不受影响。

## v2.8.0 — 架构收敛：删重复、删冗余、极限精简

**样式层（最大一块）**
* `tokens.css` + `cards.css` + `index.scss` + `desk.css(1233 行)` → **`styles/index.css`（令牌 + 插件根，180 行）+ `styles/desk.css`（只留桌面壳用到的，180 行）**。desk.css 里 `.desk-widget-* / .desk-recipe-* / .desk-search-* / .desk-nav-*` 等 136 个从「思桌」搬来但从未被引用的类全部删除。
* **Tailwind 整条链删除**：`@tailwind utilities`、`tailwind.config.js`、`postcss.config.js`，以及 `tailwindcss / postcss / autoprefixer / sass / glob / ts-node / @vue/tsconfig` 七个依赖——模板里从来没写过工具类，`d-flex-center / d-icon / f12 / f15` 也无人使用。
* 删掉无人引用的令牌（`--desk-dim / --desk-on-media / --desk-fw-regular / --desk-sp-5 / --desk-sp-6 / --desk-dur-slow`）与 `.desk-glass-strong`。
* 壁纸面板手写的 `.desk-chip` 一套（40 行 CSS）→ 统一用 `Chips` 组件（`catOptions` 计算属性）。

**代码层**
* **卡片配置层整条删除**：`registry.defaultConfig` + `store` 里的 `configs`/`getCardConfig` + `mount` 的 `provide/inject` —— 没有任何一张卡读过它。挂载器现在只传 props，`mountCard(el, cardId, props)` 三行核心逻辑。
* **死代码**：`calendar.ts`（`isGregorianSkippedDate`、`getWeekdayIndex`）、`lunar.ts`（`hasLunarSupport`、`clearLunarCache`、`lunarDayName`、`LUNAR_FIX_RANGES`）、`covers.ts`（`randomCover`、`FALLBACK_COVERS` 别名）全部删除；只在本文件内使用的符号不再 `export`（农历/节气/封面/图片代理/主题共 12 个）。
* **重复常量**：单格 88 / 间距 12 原来在 `layout.ts` 与 `store.ts` 各写一份 → 只在 `layout.ts` 声明（`DEFAULT_CELL` / `DEFAULT_GAP`），`gridStyle` 改成函数，`DeskShell` 不再手工覆盖 `gridTemplateColumns`。
* **重复提示条**：插入文档与新建日程各写一份 toast → `ui/toast.ts` 一处。
* **内嵌卡片 bug**：`el.style.height = el.style.height || size === "1x1" ? "220px" : "320px"` 的运算符优先级写错（`(a || b) ? … : …`），且 `data-size` 没传给卡片；现在按尺寸白名单解析并把 `size` 作为 prop 传入。`insert.ts` 的插入锚点也改成取光标所在块（原来取第一个块）。

**验证脚本**
* 28 个历史快照脚本（`shot-v3` … `shot-v18-detail`、`debug-picsum`、`extract-hig`、`list-cards`、`measure-*` 等）→ **10 个**，一文件一职责；三个真机脚本合并成 `shot-live.mjs`（图标线性 + 卡片↔详情同源 + 诗词标签，跑完复原桌面）。

**量化**

| 指标 | 之前 | 现在 |
| --- | --- | --- |
| `src/` 行数 | 6817 | **5543**（−1274） |
| `styles/` 行数 | 1233 + 167 + 29 + 10 = **1439** | **294** |
| 产物 CSS（dist） | 67.7 kB（gzip 12.0） | **41.6 kB（gzip 7.6）** |
| 产物 JS（dist） | 162.0 kB（gzip 58.4） | **161.0 kB（gzip 58.2）** |
| 依赖（devDependencies） | 24 | **17** |
| 验证脚本 | 28 | **10** |
| 构建产物 | 11 文件、只依赖 siyuan | 不变（`pnpm check:dist` 通过） |

## v2.7.2 — 真机上图标变实心（思源全局 `svg{fill:currentColor}`）

* **根因**：思源自己的全局样式里有 `svg { fill: currentColor }`。lucide 图标靠 `fill: none` + `stroke` 描边，被这条规则一填就变成实心块——所以 **harness（dev-dist）里看着正常，真机里是实心的**：详情动作按钮、设置导航、右键菜单、日历图标全都中招。
* **修法**：`styles/tokens.css` 给插件三个根加兜底 `.desk-root svg, .desk-sheet-mask svg, .desk-embed-card svg { fill: none }`，只影响插件自己的图标，不动思源。品牌标 `<g fill="none">` 不受影响。
* 实测（真机 4 倍截图 + 计算样式）：详情 5 个按钮 `fill: none`、`stroke: rgba(255,255,255,.92)`、`stroke-width: 1.7px`，每个 path/rect/circle 的 fill 也都是 `none`；`docs/screens/docs-v22-fab-icons.png` 里 5 个图标全部是描边。
* 顺带说明：这条规则以后新增任何插件内 `<svg>` 都别依赖默认 fill；需要填色就显式写。

## v2.7.1 — 诗词详情未选中标签看不清

* **根因**：`Chips.vue` 用的是 `.chip` / `.chip.active`，而 `ui.css` 里那三条「照片底 chips」规则写的是 `.desk-chip` / `.desk-chip.is-active` —— 选择器从来没匹配上，于是未选中的「译文 / 注释」用的是主题色 `--desk-text-2`（浅色主题下是深灰），压在照片上几乎看不见。
* **修法**：`Chips` 增加 `tone="plain | on-photo"`。`on-photo` 自带白字 + `rgb(16 18 24 / 52%)` 深色药丸 + 30% 白描边 + 背景模糊，选中反白（白底深字）；高度 22 → `--desk-hit`（28px），顺手补上命中区。诗词详情改用 `tone="on-photo"`；`ui.css` 里那三条无效的死规则删掉。
* 实测：harness 4 倍放大截图 + 真机复核（脚本临时加「每日诗词」→ 截图 → 移除，桌面卡片数 1 → 2 → 1 复原），未选中标签白字清晰、选中态正确互换。

## v2.7.0 — 图标线性化 / 三卡同构 / 卡片与详情同源 / 翻页牌重做

* **图标不再实心**：品牌标（顶栏 / 页签 / 桌面壳右上角）由「四个实心方块」改成线性描边的四个圆角方块（`src/icons.ts`，`<g fill="none" stroke="currentColor">`）；同时修掉 `.desk-hero-leaf svg { fill: currentColor }`——桌面右上角一直发实心就是这个规则把描边填满了。详情动作图标 `stroke-width` 1.8 → 1.7，小尺寸下更清。
* **三张每日卡同构**：新增 `ui/ui.css` 的 `.desk-photo-card / .desk-photo / .desk-photo-body / -title / -meta / -text / -sub`，一言 / 英语 / 诗词全部改成「照片 + 压暗 + 单列垂直居中」，卡片上**不再出现日期行**；英语朗读键改成右下角悬浮 `GlassButton mini`，1x1 / 2x1 空间不够时自动隐藏。
* **卡片与详情同源**：新增 `core/daily.ts`——`dailyState(key)` 共享数据、`loadOnce(key)` 只请求一次、`dailyCover(key)` 只随机一张背景、`refreshCover(key)`「换一张」两处同步。打开详情不再换句、换图；实测 `sameBg = true` 且卡片文字与详情文字一致。
* **翻页牌重做**（`cards/clock/FlipDigit.vue`）：`.inn` 改成高度 200% + `display:grid; place-items:center`，数字永远落在牌的正中（原来用 `line-height: var(--height)`，em 是按 `.inn` 自己的字号解析的，数字被顶偏、在折叠处叠出第二份）；`--radius` 同时作用于上下两半，牌四角都是圆角；中缝改成贴在上半张底边的 1–2px 暗线；`.flip` 加 `overflow:hidden` 裁掉透视溢出；`active.down` 改为显示**新数字**（原来显示旧数字，翻页的下半张一直是错的）。几何实测：上下半各 43px、两半数字层中心与牌中心完全重合。
* 尺寸矩阵重测：`1x1 88×88` / `2x1 188×88` / `4x2 388×188` 文字不再顶出卡片（行数上限统一在 `.desk-photo-text`，各尺寸覆盖 `-webkit-line-clamp`）。
* 新增验证脚本：`shot-consistency.mjs`（卡片 vs 详情同源 + 翻页牌几何/折叠帧）、`shot-flip-frames.mjs`（CDP 暂停动画逐帧）、`shot-icons.mjs`（4 倍放大看图标是否线性）；`dev/main.ts` 注入同一份 symbol，验证页也能看到品牌标。

## v2.6.1 — 尺寸复核 + 圆形控件统一 + 日历详情对齐

* **三张内容卡按 1x1 / 2x1 / 4x2 实测复核**（88 / 188×88 / 388×188）：诗词 1x1 标题收到 11px 排成一行、2x1 改成「左标题 48% ｜ 1px 分隔 ｜ 右诗句」不再被挤成两字一行；一言 2x1 出处改为单行省略（原来在 188px 里被挤成竖排）；英语 2x1 的释义列补上 1px 分隔。
* **圆形按钮统一为 `GlassButton`**：新增 `mini`（28px）变体；每日英语卡片上的「▶」文字键、`CardFrame` 的「⋯」文字键都换成 lucide 图标 + 毛玻璃圆钮，全项目不再有字符画图标。
* **日历详情重做**：面板改为单块玻璃面（只由 `Sheet` 提供材质，`--desk-detail-inset 12` / `--desk-detail-pad 20`）；工具栏翻月改 lucide 图标按钮；「一周开始」用 `Segmented`（两个等价选项）；「今天」常显、已是今天时降为 muted；日号「头像」从纯色蓝块 + 两个白点改成强调色淡染圆角方块；底部「＋ 新建日程」长条改为 `.desk-btn` + `Plus` 图标。
* **手画 SVG / 字符画清零**：桌面壳右上角两个按钮、设置面板四个导航图标、壁纸来源图标、右键菜单图标与勾选箭头、弹层关闭「×」、时钟全屏「⤢/⤡」全部换成 lucide（`Settings` / `Plus` / `Image` / `SlidersHorizontal` / `LayoutGrid` / `Info` / `ArrowRight` / `RefreshCw` / `Scaling` / `Trash2` / `Check` / `ChevronRight` / `X` / `Maximize2` / `Minimize2`）。时钟全屏键同时从 22px 字符块换成 28px `GlassButton mini`，并挪到左上角（原来和卡片右上角的「更多」重叠）。
* **死代码清理**：删除 `ui.css` 里已无引用的 `.desk-frosted` / `.desk-detail-actions(.is-float)` / `.desk-da`；删除 YiyanCard 的翻页热区、`heart-pop` 关键帧与未使用的 `bgIndex/likeCount/likePop`；`calendar.css` 去重合并（577 → 460 行），日历卡片收敛为 4x2 单版式（注册表本来就只给 4x2）。
* **新增验证脚本**：`tools/verify/shot-sizes.mjs`（三卡三尺寸 + 悬浮控件）、`shot-calendar.mjs`（日历卡与详情，支持 light/dark）、`shot-live.mjs`（真实思源 127.0.0.1:6806 实机开页签 + 开详情）。它们都标了「非源码 / 不参与打包」，`pnpm check:dist` 仍自证 dist 只有 11 个文件、入口只 `require("siyuan")`。

## v0.0.1

* [Support optional marketplace images, offline README assets, and stable releases](https://github.com/siyuan-note/siyuan/issues/19056)
* Align the manifest URL with the current repository
