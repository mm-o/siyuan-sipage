# 路线图：向 Homepage 学什么，SiPage 怎么长

> 这份文档是 **决策底稿**：先把参照对象拆开、把我们自己的家底盘清，再给出分阶段的改造计划。
> 每阶段都带验收标准，做完一段就在下面打勾，避免"改着改着忘了当初为什么改"。
>
> 分析对象：[`Glaube-TY/siyuan-homepage`](https://github.com/Glaube-TY/siyuan-homepage) v5.1.24（minApp 3.8.6），抓取日期 2026-11-27。
> 我方基线：`siyuan-sipage` v1.0.3（集市区已上架，索引版本 1.0.2 → 1.0.3 随下一次 Stage 重建生效）。

---

## 1. 现状快照

| 项 | 数值 | 备注 |
| --- | --- | --- |
| 卡片数 | 17 | 见下表（含阶段 1 新增的「快速记录」） |
| `src/cards/**` 代码量 | 约 8 100 行（.vue） | 含模板、脚本、样式 |
| 其中样式行数 | 约 4 100 行 | 独立 `styles.css` 3 个（calendar / heatmap / quicknote） |
| 单文件入口 | 615.1 KB（gzip 203.4 KB） | 无分包 |
| 词条 | 621 条 × 2 语言 | `common.*` / `card.*` / `ui.*` / `core.*` / `embed.*` |
| 工程护栏 | 类型 / 分层 / 断点 / 词条 / **全局样式命名** / 产物 / 集市规范 | `pnpm check` 一条命令全跑 |
| 浏览器回归 | 12 个 `tools/verify/shot-*.mjs` | 含 `shot-quicknote.mjs`、`shot-settings-layout.mjs`，`pnpm check:browser` 串跑 |

现有 17 张卡：`clock` 时钟、`calendar` 日历、`weather` 天气、`daily` 日记、`quicknote` 快速记录、
`memo` 日程备忘、`countdown` 倒数日、`heatmap` 写作热力图、`pomodoro` 番茄钟、`docstats` 文档统计、
`yiyan` 每日一言、`english` 每日英语、`shici` 每日诗词、`recent` 最近文档、
`quickopen` 快捷打开、`shortcut` 快捷方式、`block` 思源块。

一句话定位：**把思源的一个页签变成一屏卡片桌面**（阅读 + 轻操作 + 可内嵌）。

---

## 2. 参照对象：它有什么

### 2.1 体量与商业模式

- 组件数 **37 个**，官方宣传语是「30+ 组件」；另有 AI 知识库、机器人助手（微信 / QQ / 飞书）、通知中心三块**非卡片**能力。
- 是**会员制**：源码里有 `src/features/entitlement`，AI 与机器人挂在付费能力后面。
- 依赖很重：Svelte + ECharts + Howler + music-metadata + Quill + Sortable + Swiper + AJV/Zod + CryptoJS + OAuth SDK …（见其 README 致谢清单）。
- 启示：**它走的不是轻量路线**。我们不该在"组件数量"上跟它对拼，而该在"我们的形态能做什么它做不到的事"上对拼。

### 2.2 37 个组件全表

| 分组 | 组件（type — 名称） |
| --- | --- |
| 笔记类（7） | `latest-docs` 最近文档 · `recent-journals` 最近日记 · `favorites` 收藏文档 · `childDocs` 子文档 · `conditionDocs` 条件文档 · `custom-protyle` 文档编辑器 · `reviewDocs` 复习文档 |
| 任务与效率（6） | `TaskMan` 任务管理 · `TaskManPlus` 任务管理 Plus · `quick-notes` 快速笔记 · `stikynot` 便签 · `focus` 专注计时 · `countdownTimer` 倒计时 |
| 数据与统计（6） | `statisticalCard` 统计卡片 · `visualChart` 可视化图表 · `sql` SQL 查询 · `heatmap` 热力图 · `accounting` 记账 · `fixedAssets` 固定资产 |
| 时间与环境（6） | `timedate` 时间日期 · `globalCalendar` 全局日历 · `countdown` 纪念日 · `weather` 今日天气 · `almanac` 黄历 · `historyDays` 历史上的今天 |
| 内容与装饰（9） | `dailyQuote` 每日一句 · `custom-text` 文字内容 · `PicCaro` 图片轮播 · `News` 新闻资讯 · `HOT` 热搜 · `custom-web` 网页浏览器 · `musicPlayer` 音乐播放器 · `constellation` 星座运势 · `CYBMOK` 赛博木鱼 |
| 实验 / 其他（3） | `notebrain` AI 知识库 · `enhancedDiary` 增强日记 · `habitTracker` 习惯打卡 |

（合计 37；「分组」是我按用途归档，不是它的原始分类。）

---

## 3. 它的架构：定义驱动的组件

它把"一张卡"写成一份**定义**（`src/components/utils/widgetBlock/widgetDefinitionRegistry.ts` 的 `defineWidget`）：

| 字段 | 含义 | 我们有吗 |
| --- | --- | --- |
| `type` / `kind` | 组件 id 与种类 | 部分（`id`） |
| `category` | 展示分类（主题侧用于分区） | **没有** |
| `label` / `icon` | 语义名与图标 | 有（`name` / `icon`） |
| `placements` | 可放的位置：`homepage` / `sidebar` / `mobile` / `mobile-runtime` / `preview` / `dock` | **没有**（只能放桌面） |
| `scope` | 主题接管程度：`full` / `chrome` / `native` | **没有**（我们只有全局三套材质） |
| `frame` | 标题区 `optional/none`、内容区 `scrollable/contained` | 部分（`Sheet` 统一处理） |
| `capabilities` | `cssTokens` / `semanticParts` / `themeIcon` / `stateful` | **没有** |
| `presentationVariants` | 同一内容的多种呈现 | **没有** |
| `contextMenuActions` | 右键菜单项 | 部分（统一右键：打开/刷新/移除） |

第二层是**外观与内容分离**：主题目录下各自有 `theme/builtins/{card,hand-drawn,paper,technology}/widgets/manifest.ts`，
同一份内容在不同主题下换皮。我们的对照是：

- `src/cards/**` 里 53% 是样式，直接焊在卡片里；
- 三套材质（液态玻璃 / 思源原生 / MD3）靠 `body[data-desk-style]` + CSS 变量覆盖，**能换皮但不能换结构**。

**结论**：它的"组件多"是结果，"定义驱动 + 外观分离"才是原因。我们要抄的是后者，
否则卡片增长会立刻变成线性重复劳动。

---

## 4. 差集：我们缺什么、要不要补

现有 16 张里，与它重叠的有 11 个（最近文档、热力图、纪念日、天气、每日一句、时间日期、
全局日历、文档编辑器≈思源块、统计≈文档统计、专注≈番茄钟、任务≈日程备忘）。
以下是它独有、而我们没有的部分，按「该不该做」分三档。

### A. 值得抄（只用思源 API，且能形成差异化）

| 组件 | 为什么值得 | 成本 |
| --- | --- | --- |
| **条件文档** `conditionDocs` | 本质是「保存一条 SQL 视图」：7 天未更新 / 无标签 / 今天新建 / 某笔记本未整理。天然适配我们的「每卡一份状态」，且首页类插件普遍只做固定列表，没人做「可保存的视图」 | S |
| **快速笔记** `quick-notes` | 输入即 append 到指定文档，把「打开日记 → 滚到底 → 写」压成一步 | S |
| **收藏文档** `favorites` | 思源自带文档收藏，我们只有「最近」，没有「我挑的」 | S |
| **子文档** `childDocs` | 当前/指定文档的子文档列表，和文档树互补，一格装得下 | S |
| **便签** `stikynot` | 桌面上一张可拖动的贴纸；我们已有自由拖拽 + 每卡状态，边际成本极低 | S |
| **SQL 查询卡** `sql` | 给进阶用户自建视图，一张卡顶掉一堆定制需求 | L（要 SQL 编辑器 + 只读白名单） |
| **习惯打卡** `habitTracker` | 复用热力图的日粒度写盘模型，加连续天数与目标 | M |

> 另外补两张不在它清单里、但我们更需要、成本同样低的：**快速搜索卡**（输入即搜，回车在当前页签打开）、
> **反链动态卡**（最近 7 天新增的反链 / 未读引用）。它们才是"少跳一次"的硬需求。

### B. 重，先不做

音乐播放器（要 Howler + music-metadata + 本地/NAS 扫描）、记账与固定资产（要账本模型 + 报表）、
复习文档（要 SRS 调度与复习队列）、新闻资讯与热搜（联网 + 版权/审核风险）、
黄历 / 星座运势 / 历史上的今天（内容源要长期养，且对这些内容我们没有判断力）。

### C. 明确不做

- **AI 知识库 / 机器人助手 / 通知中心**：另一个产品级的工程量；AI 侧还会和思源自带 AI 打架；对方本身是会员能力。
- **网页浏览器**：iframe 的安全与 XSS 面，且与思源自带 webview 重复。
- **赛博木鱼 / 图片轮播**：纯装饰。我们的定位是"效率桌面"，装饰组件只会稀释它。

---

## 5. 取舍原则（后续都按这三条判）

1. **只吃思源 API**：不引外部内容源（新闻、热搜、星座、黄历），不做需要长期维护的数据管道。
2. **卡片必须"能动手"**：读 + 写（在卡片里就能改数据），不能只是展示——展示类别人已经做满了。
3. **不重复、不装饰**：与既有 16 张重叠一分都不做；纯装饰不做。

---

## 6. 改造计划

每阶段独立可发布；每阶段结束都必须 `pnpm check` 全绿 + 真机点一遍。

### 阶段 1 — 快速记录卡（含 `CardDef` 最小扩展）✅ 已完成

**目标**：在桌面上就能往"今天的日记 / 指定文档"追加一行，不再打开文档找位置。

动作：

- [x] `CardDef` 增加两个字段：`category`（`note` / `task` / `time` / `data` / `life` / `system`）、`writable?: boolean`
- [x] `LibraryPanel`（卡片库）按 `category` 分组显示（分组顺序固定在 `CARD_CATEGORIES`，空组不显示），「可写」标记来自 `writable`
- [x] 新卡 `src/cards/quicknote/`：`QuickNoteCard.vue`（一行输入 + 三个写入动作 + 文档本体预览）、`QuickNotePanel.vue`（左目标 / 右可直接编辑的文档本体）、`quicknote.ts`（模型）、`styles.css`（样式外置）
- [x] 写入走 `/api/block/appendBlock`（`dataType: markdown`），目标默认「今天的日记」，可在详情里改成任意文档
- [x] 写法做成输入框下面的三个按钮：点哪个就用哪种写法**直接写入**，回车沿用上一次（省掉"先选模式再提交"两步）
- [x] 卡片下半部分直接挂**目标文档本体**（`ProtyleView` 只读，写完自动滚到底）；详情右栏是**可直接编辑**的文档本体，不再自造历史列表
- [x] 只读解析用 `peekDaily()`：渲染阶段只"查"今天的日记，不创建文档
- [x] 词条：卡片名 / 说明 / 占位 / 三种写法 / 提示（中英）
- [x] README 卡片表 + 内嵌 id 列表（`quicknote`）
- [x] 浏览器回归 `tools/verify/shot-quicknote.mjs`（已进 `check:browser`）

验收记录（2026-11-27，headless Edge）：

- 渲染卡片时 `createDailyNote` 调用 **0** 次（已有日记就直接渲染，没有就提示"写下第一条会自动创建"）
- 回车 → 纯文本（首次）；点「待办」→ `- [ ] …`；再回车 → 沿用待办；点「时间」→ `- HH:MM …`
- 空输入时三个动作按钮全部禁用
- 写完卡片内 `/qn-view` 重新挂载并滚到底；详情右栏 `.qnp-doc-body` 是文档本体
- `pnpm check` 全绿；`shot-quicknote.mjs` 全过、无浏览器报错

待人工验证：真机上往今天的日记写一行（当天文档末尾应出现），再在详情里钉一篇别的文档写第二行。

工作量：S–M（1 张卡 + 一次 `CardDef` 扩展）。

### 阶段 2 — 快速搜索卡

**目标**：卡片里直接搜全文，回车在当前页签打开文档。

- [ ] 新卡 `src/cards/quicksearch/`：输入框 + 结果列表（标题 + 命中片段 + 所在笔记本）
- [ ] 搜索走 `/api/search/fullTextSearchBlock`（或 `/api/query/sql` 兜底），结果按相关度排序
- [ ] 键盘：↑/↓ 选择、回车打开、`Esc` 清空；`点击结果` 走 `openTab`
- [ ] 词条 + README

验收：输入 2 个字能出结果；回车在页签里打开正确文档；空输入时显示"最近打开"。工作量：M。

### 阶段 3 — 条件文档卡（保存的 SQL 视图）

**目标**：把"7 天未更新 / 无标签 / 今天新建"这类查询固化成一张卡，可改名、可改条件、可多张。

- [ ] 新卡 `src/cards/condition/`：卡片显示前 N 条（默认 5），详情里显示全部并可增删条件
- [ ] 条件模型：`{ name, stmt, limit, order }`，内置 3 个模板（未更新 / 无标签 / 今天新建）
- [ ] SQL 只读校验：仅允许 `select`，禁止 `insert/update/delete/drop` 等关键字（前端白名单 + 参数化不拼接）
- [ ] 结果为空时的空态；查询失败时的错误条（不吞异常）
- [ ] 词条 + README

验收：三套内置模板都能出结果；自定义条件能保存并在重启后仍在；非法语句被拦住。工作量：M。

### 阶段 4 — 样式与内容分离

**目标**：把 4 140 行样式从卡片 `.vue` 里搬出去，让"换皮"不再依赖改卡片。

- [ ] 每张卡的 `<style scoped>` 迁到 `src/cards/<id>/styles.css`（现只有 2 张这样做）
- [ ] 卡片里只允许出现结构类名（`desk-*` 保持），颜色/圆角/阴影一律走令牌
- [ ] 三套材质只在 `styles/index.css` 覆盖令牌，不写卡片选择器
- [ ] 验收指标：`src/cards/**/*.vue` 的样式行数从 4 140 降到 **< 500**

验收：`pnpm check` 全绿 + 三种材质下每张卡外观与改造前一致（用截图对比）。工作量：M–L。

### 阶段 5 — 可选扩展 + 工程护栏

- [ ] 收藏文档卡、子文档卡、便签卡、习惯打卡卡（按 A 档清单，逐张独立发布）
- [ ] 把截图回归纳入护栏：装 chromium（`pnpm exec playwright install chromium`），
      `pnpm check:browser` 跑中英 × 亮暗共 4 套截图，产物入 `docs/screens/`（已 gitignore）
- [ ] 新卡 checklist 写进 `docs/ARCHITECTURE.md`，与分层守卫一起生效

验收：截图基线可复现；新加一张卡只需按 checklist 走一遍，不再需要临时决策。工作量：M。

---

## 7. 新卡 checklist（模板，阶段 1 起强制）

```text
src/cards/<id>/<Name>Card.vue     卡片（只负责内容渲染）
src/cards/<id>/<Name>Panel.vue    详情（可选；没有则用 Card 放大）
src/cards/<id>/<id>.ts            模型与状态：persisted() 或 stateOf(uid, defaults)
src/cards/<id>/styles.css         样式（阶段 4 起强制独立）
registry.ts                       一条定义：id / category / name / desc / component / detail / icon / constrain
src/i18n/{zh_CN,en_US}.json       卡片名 + 说明 + 全部文案（check:i18n 会拦未迁中文）
README.md / README.zh-CN.md       卡片表 + 内嵌 id 列表
pnpm check                        类型 / 分层 / 断点 / 词条 / 全局样式命名 / 构建 / 集市规范
真机                              桌面 + 详情 + 内嵌三种位置各看一眼
```

---

## 8. 待定问题（需要拍板）

1. **要不要做"可保存视图"之外的 SQL 编辑器**？（阶段 3 只做条件与只读校验，不做完整编辑器）
2. **移动端**：`placements` 字段先只登记 `desk` / `embed`，要不要预留 `sidebar`（侧栏面板）？
3. **模型**：是否继续坚持"无后端、纯思源 API"；这决定了 B 档那些组件永不进入路线图。
4. **卡片上限**：卡片库超过 20 张后是否需要搜索框 / 分组折叠（阶段 1 的分组是第一步）。
5. **`desk-*` 内部命名**：是否在阶段 4 一起改成 `sp-*`（纯机械但改漏不报错，需截图回归兜底）。

---

## 附录 A：Homepage 关键文件（复核用）

| 用途 | 路径 |
| --- | --- |
| 组件定义注册表 | `src/components/utils/widgetBlock/widgetDefinitionRegistry.ts` |
| 组件实现目录 | `src/components/utils/widgetBlock/widget/<type>/` |
| 外观与内容分离 | `src/homepage/theme/builtins/<theme>/widgets/manifest.ts` |
| 会员/权限 | `src/features/entitlement/` |
| 通知与提醒 | `src/features/*-notify/`、`src/features/notification-center/` |
| 机器人 | `src/features/robot-assistant/` |

## 附录 B：复现本次分析

```bash
# 1. 拿组件定义注册表，抽出 type 与 label
curl -sL https://raw.githubusercontent.com/Glaube-TY/siyuan-homepage/main/src/components/utils/widgetBlock/widgetDefinitionRegistry.ts -o /tmp/wdreg.ts
node -e "const t=require('fs').readFileSync('/tmp/wdreg.ts','utf8');for(const m of t.matchAll(/type:\s*[\"']([\w-]+)[\"'][\s\S]{0,500}?label:\s*[\"']([^\"']+)[\"']/g))console.log(m[1],m[2])"

# 2. 看组件目录清单
gh api 'repos/Glaube-TY/siyuan-homepage/git/trees/main?recursive=1' | jq -r '.tree[].path' | grep 'widgetBlock/widget/' | cut -d/ -f6 | sort -u

# 3. 量我们自己的样式占比
node -e "…（见第 1 节表格；口径：src/cards/**/*.vue 的 <style> 块 + 独立 css 文件）"
```

---

## 附录 C：事故复盘（2026-11-27 首次真机启用）

第一次在真实工作区启用时报了两个现象：**界面错乱**，刷新后页签**不可用**。两个独立原因，都不是渲染细节，而是「边界」没守住。

### C1 「刷新不可用」= 启动链路被一个 404 打断

```text
/api/file/readDir  →  data/public/siyuan-sipage 不存在  →  Code 404
      ↓
listFavs() 抛错  →  bootStore() reject  →  Plugin.onload() reject
      ↓
addTab() 没执行  →  页签类型没注册
      ↓
刷新后思源恢复上次的页签 → 找不到类型 → 标注「不可用」
```

全新工作区里 `data/public/siyuan-sipage` 一定不存在（收藏目录是第一次收藏时才建的），所以这是**每个新用户都会踩**的问题，只是首次启用时表现为"半加载"，刷新才彻底暴露。

修复（两条都要有）：

1. `bootStore()` 里收藏读取单点容错：拿不到就当空列表，不让整条启动链断。
2. `onload()` 兜底：`bootStore()` 仍然失败时打日志继续，页签、顶栏、命令照常注册。

### C2 「界面错乱」= 全局样式表没有命名空间

`src/styles/index.css` 是全局表，当时里面有 `.set-*`、`.slot`、`.slot-ic`、`.doc-row`、`.doc-title` 这类通用类名。
实测安装的 iTab modules / itab-embed / 思桌 三个插件的产物里各能搜到 18 处同名选择器 —— 谁后加载谁赢，于是**启用思页就把别的插件界面重绘了**。

修复：

1. 这些类统一加 `desk-` 前缀（模板与样式同步改），并清掉 `ShortcutCard` 里已失效的 scoped 样式块。
2. 新增 `pnpm check:css`：全局表的首层类名必须 `desk-` 开头，历史裸类名进 `LEGACY` 白名单且**只能减不能增**。

### C3 与 Homepage 架构的对照

这起事故正好验证了第 3 节的判断：Homepage 把「内容」与「外观」分开（`scope` + 主题 `widgets/manifest.ts`），本质就是**给样式划作用域**；我们目前的 `CardDef` 只有 `surface` 一个材质开关，样式仍压在卡片与全局表里，才会一启用就污染别人。

所以：

- 短期已做：命名收敛 + 守卫（本次）。
- 中期（阶段 4）：卡片样式全部外置，全局表只留令牌与外壳；`CardDef` 再补 `placement` / `scope`，让同一份内容能进侧栏/移动端而不带一整套全局样式。

### C4 教训（已写进新卡 checklist）

- 任何 `await` 在 `onload` 里的调用，都要能失败而**不影响注册**：页签、顶栏、命令这类"门面"必须无条件注册。
- 插件是**寄居**在思源里的：全局 CSS / 全局变量 / 全局事件都要带命名空间，不能假设"这个页面只有我"。
- 真机验证必须在**空工作区**跑一遍（新建 workspace），打磨过的旧工作区会掩盖这类首装问题。
