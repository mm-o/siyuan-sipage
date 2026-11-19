# 架构（v2.8 · 收敛版）

> 原则：**简洁高效、易于维护**。三层职责不变，新增能力必须归位到已有层，不新开层。

## 一、三层 + 两个延伸

```
index.ts                 入口（只做注册：页签 / 顶栏 / 命令 / 内嵌启动）
icons.ts                 品牌标（线性四个圆角方块，顶栏/页签/桌面壳共用）

├─ core/                 与 UI 无关的骨架（5 个文件，只放「多卡共用」的东西）
│  ├─ registry.ts        卡片注册表 —— 唯一扩展点
│  ├─ store.ts           状态唯一真源：壁纸 / 桌面卡片 / 外观 / 天气地点 / 倒数日 + 存储读写 + 网格排版（layoutDesk）
│  ├─ image.ts           图片与跨域请求唯一入口：题头图清单 + 壁纸来源 + 内核代理（forwardProxy，天气也用）
│  ├─ daily.ts           每日内容序列（三张照片卡共用）
│  └─ dates.ts           日期换算（日期键 / 天数差 / 公历·农历的「下一次」）——倒数日与它的默认节日共用
│                        （黄历不在这里：农历/节气/干支/月相/宜忌都由卡片直接问 tyme4ts）
│
├─ ui/                   设计系统
│  ├─ DeskShell.vue      桌面壳（壁纸 + 时钟 + 网格 + 弹层）
│  ├─ SettingsSheet.vue  设置外壳（导航 + 面板切换）
│  ├─ CardFrame.vue      卡片外框（材质 / hover / 更多菜单 / 打开）
│  ├─ Sheet.vue          统一弹层（一套结构 + 从 origin FLIP）
│  ├─ style.ts           photoBg + useTheme（纯样式映射 / 纯 DOM 探测）
│  ├─ dom.ts             toast + copyText（两个纯 DOM 小工具）
│  ├─ ui.css             共享样式（面板骨架 / 预览条 / 按钮 / 瓦片 / 照片卡 / 详情结构）
│  ├─ motion.css         动效（只有弹层淡入淡出，令牌在 styles/index.css）
│  ├─ settings/          壁纸 | 组件设置 | 卡片库 | 关于（每个面板一个文件）
│  └─ primitives/        GlassButton（28）| Chips | Segmented | Slider | Swatch | SeriesNav
│
├─ cards/                每张卡片 = 一个自包含目录（卡片专属的算法也留在这里）
│  ├─ clock/             ClockCard.vue + FlipDigit.vue
│  ├─ calendar/          CalendarCard.vue + CalendarMini.vue + CalendarPanel.vue + calendar.css（月视图/节日直接调库，无中间层）
│  ├─ weather/           WeatherCard.vue + WeatherPanel.vue + weather.ts（接口/天气码表/10 分钟缓存/useWeather）
│  ├─ countdown/         CountdownCard.vue + CountdownPanel.vue + countdown.ts（分类/单位换算/排序/封面）
│  ├─ heatmap/           HeatmapCard.vue + HeatmapPanel.vue + heatmap.ts + heatmap.css（内核 SQL / 分档 / 统计）
│  ├─ yiyan/ english/ shici/
│
├─ embed/
│  ├─ cards.ts           文档内嵌（data-desk-card + MutationObserver）
│  ├─ mount.ts           统一挂载器（挂载 / 错误捕获 / destroy）
│  └─ insert.ts          插入命令（选卡 → 写入 htmlblock）
│
└─ styles/               index.css（令牌 + 插件根）/ desk.css（桌面壳）
```

## 二、六条硬规则

1. **卡片目录不得 import 另一张卡片**
   `core/` 只放**多张卡共用**的骨架：日期工具、农历、图片、每日内容序列、状态、注册表。
   只有一张卡用的算法（月视图 / 节气 / 节日 / 星座 / 月相 / 干支日）放它自己的目录
   （`cards/calendar/calendar-data.ts`）。`cards/` 只依赖 `core/` 和 `ui/`。

2. **详情只有一种表达**
   `registry.detail?` 指定专用面板；没写则框架用同一组件并注入 `mode="detail"`。
   卡片内不要再出现 `detail?: boolean` 这类自定义开关。

3. **视觉只改两处**
   - 全局材质/圆角/字号/动效 → `styles/index.css`
   - 面板内的按钮/行/输入/瓦片 → `ui/ui.css`
   卡片自己的排版写在自己的 `<style scoped>`，但字号层级用 `clamp(...cqh)` 跟随尺寸。
   卡片**面**（玻璃还是纯色）不归卡片管：写在 `registry` 的 `surface?: "glass" | "solid"` 上，由 `CardFrame` 统一切类（见 `DESIGN.md`「卡片材质」）。

4. **单选控件按数量选**
   ≤4 项且等宽 → `Segmented`；多项可换行 → `Chips`。

5. **菜单一律用思源的**
   右键菜单、更多菜单、插入卡片菜单全部 `new Menu(id)` + `addItem/addSeparator` + `open({x,y})`
   （`siyuan` 包，已经是唯一外部依赖）。不自绘菜单：自绘就得 `Teleport` 到 body，
   一出去就落到思源全局 `svg { fill: currentColor }` 的射程里，线性图标会被填成实心块。

6. **框架能力下沉，卡片只画内容**
   全屏、材质、右键菜单、弹层、网格排版、图标居中，全部由 `CardFrame` / `DeskShell` / `Sheet` 提供：

   | 能力 | 谁给 | 卡片要做什么 |
   | --- | --- | --- |
   | 全屏 | `CardFrame` 左上角按钮 + `DeskShell` 的 `.desk-full` 层 | 什么都不做（内容靠容器查询自动放大） |
   | 材质（玻璃/纯色） | `registry.surface` → `CardFrame.is-solid` | 什么都不做 |
   | 菜单 | `siyuan` 的 `Menu` | 什么都不做 |
   | 弹层 / 展开 | `Sheet` + `origin` FLIP | 提供详情组件或 `mode="detail"` |
   | 网格排版 | `core/store.ts` 的 `layoutDesk()` | 什么都不做 |
   | 图标居中 | `styles/index.css` 的 `button > svg { display: block }` + `line-height: 0` | 什么都不做 |

## 二之二、组件边界（什么可以抽成共享组件）

「一个卡片一个 Vue」指的是**卡片主组件**：每张卡在 `cards/<id>/` 里有且只有一个 `*Card.vue`，
它的子组件（`FlipDigit` / `CalendarMini` / `CalendarPanel`）和 `calendar.css` 留在同一个目录里。
**共享组件不是把三张卡合成一个**，而是把「长相与行为完全相同的一小块控件」抽出去。

判断能不能抽成 `ui/primitives/`，过这四问：

| 问题 | 可以抽 | 不能抽 |
| --- | --- | --- |
| 是否与某张卡的数据/文案绑定？ | 只吃 props，或只吃一个**结构化契约**（如 `{ step(dir) }`） | 需要知道 cardId、要发请求、要读 registry |
| 是否有自己的样式特例？ | 无 scoped 样式，外观来自 `ui.css` + 令牌 | 为某张卡写特例选择器 |
| 抽出去之后卡片还剩什么？ | 卡片仍拥有自己的内容、排版、取数（`load(offset)`） | 卡片只剩一行 `<SharedCard />` |
| 会不会反向依赖？ | 只依赖 vue / lucide / 同级控件 / 样式 | import `core/` 或 `cards/` |

按这四问，现在的共享组件是合规的：

| 组件 | 类型 | 卡片还剩什么 |
| --- | --- | --- |
| `GlassButton` | 纯控件（icon + label） | 全部内容 |
| `SeriesNav` | 复合控件（‹ › + `step(dir)` 契约） | 内容、排版、`load(offset)`、背景规则 |
| `Chips` / `Segmented` / `Slider` / `Swatch` | 纯控件 | 全部内容 |

对应的三条「不许」：不许把整张卡的模板搬进 primitives；不许 primitives import `core/`；
不许在 primitives 里写某张卡的文案分支（需要不同文案时，说明它不该共用）。

这条规则由 `pnpm check:arch` 机器校验（见第五节），不靠自觉。

## 三、扩展成本

| 需求 | 改动 | 文件数 |
| --- | --- | --- |
| 加一张卡片 | `cards/<id>/XCard.vue` + `registry.ts` 一行 | **2** |
| 加一个设置分区 | `ui/settings/XPanel.vue` + `SECTIONS` 一行 | **2** |
| 加一种壁纸来源 | `core/image.ts` 一个函数 + `WallpaperPanel` 一项 | **2** |
| 换主题色/圆角/间距 | `styles/index.css` | **1** |
| 调整卡片材质 | `CardFrame.vue` + `ui.css` | **2** |

## 四、v2.8 的收敛（本轮瘦身）

| 项 | 之前 | 现在 |
| --- | --- | --- |
| 样式文件 | `tokens.css` + `cards.css` + `index.scss` + `desk.css`(1233 行) | **`styles/index.css`（令牌 + 插件根）+ `desk.css`（只留桌面壳用到的）** |
| Tailwind | `@tailwind utilities` + tailwind/postcss/autoprefixer 三个依赖 | **整条链删除**（模板里从来没写过工具类） |
| 卡片配置层 | `registry.defaultConfig` + `store` 里的 configs + `mount` 注入 `provide/inject` | **删除**：没有一张卡读过它，挂载器只传 props |
| 死代码 | 农历/节气/日历/封面里 12 个未使用的导出、`randomCover`、`clearLunarCache` 等 | **全部删除**；仅内部使用的符号不再 `export` |
| 重复常量 | 单格 88 / 间距 12 在 `layout.ts` 与 `store.ts` 各写一份 | **只在 `layout.ts` 声明**，store 引用 |
| 重复组件 | 壁纸面板手写 `.desk-chip`，与 `Chips` 组件两套 | **统一走 `Chips`**，删掉 40 行 CSS |
| 提示条 | 插入文档、新建日程各写一份 toast | **`ui/toast.ts` 一处** |
| 验证脚本 | 28 个（v3…v18 的历史快照脚本） | **10 个**，一文件一职责 |

量化：`src/` 从 **6817 行 → 5575 行**；产物 CSS 从 **67.7 kB → 41.6 kB**（gzip 12.0 → 7.6 kB），JS 基本不变（162 → 161 kB）。

## 四之二、v2.9 的收敛（继续压）

| 项 | 之前 | 现在 |
| --- | --- | --- |
| 三张卡的取数/翻页/背景 | 每张卡各写一份 cache + cursor + step + 背景随机（一言 20 行、英语/诗词没有翻页） | **`core/daily.ts` 的 `dailySeries()` 一处**：三张卡只提供 `load(offset)`，翻页/缓存/共享状态/背景全由它管 |
| 复制到剪贴板 | 三张卡各写一份 clipboard + execCommand 兜底（每份 ~12 行） | **`ui/dom.ts` 的 `copyText()`** |
| 提示条 | `ui/toast.ts` 单独一个文件 | 与 `copyText` 合并成 **`ui/dom.ts`**（两个纯 DOM 工具） |
| 背景样式 | 三张卡各写 `url(cover \|\| 兜底)` | **`photoBg(cover, picture?)`** 一处 |
| 设置面板骨架 | 四个面板各写 `.panel { flex column; gap }` | **`ui.css` 的 `.desk-panel`** |
| 预览条 | 壁纸 / 组件设置各写一份 `.preview`（132px + 描边 + 圆角） | **`.desk-preview` + `.desk-preview-tag`** |
| 卡片菜单开关 | `CardFrame` 的 `menu?: { expand, refresh, size, remove }` 四开关（无人传） | **删除**，菜单固定四项 |

功能增量：每日英语 / 每日诗词的详情现在也有「上一条 / 下一条」（英语用本地 24 句句库循环，诗词按 `?date=` 走前一天/后一天）。

## 五、数据保存（`core/persist.ts`）

状态存**思源的插件存储**，不存 localStorage：

| | 走哪儿 | 说明 |
| --- | --- | --- |
| 读 | `plugin.loadData(key)` | `bootStore()` 里 await 一次，**直接赋给 reactive**，不存副本 |
| 写 | `plugin.saveData(key, value)` | 状态一变就写（滑轨这类高频变化合并 100ms，只合并请求、不缓存数据） |
| 落地 | `<工作空间>/data/storage/petal/desk-cards/{desk,wallpaper,appearance}` | 重启、换设备同步都在；键名会变成文件名，不能带冒号 |

**没有缓存层、没有队列、没有 flush**：内存里的 reactive 就是唯一真源，读一次写到底，不存在「缓存和磁盘谁对」的同步问题。

三条必须记住的坑：

1. **思源会把插件 bundle 载入多次**（同一文档实测 20 次 `onload`）。所以 `core/store.ts` 的状态与监听器挂在 `globalThis` 上做单例（`__deskDesk` / `__deskWallpaper` / `__deskAppearance` / `__deskWatching` / `__deskBooted`）——否则 20 份副本各拿自己的默认值写盘，用户加的卡片会被覆盖回种子。
2. **装载之前不许写**：`bootStore()` 读完才把 `ready` 置真，否则每个副本启动时都会把默认值写回去。
3. **兼容旧数据**：新存储没有该键时回退读旧 localStorage 键（`desk-cards:*`），老用户的数据一次性迁过来。

验证：`node tools/verify/shot-persist-live.mjs`（加卡 → 读 petal 文件 → 整页重载 → 复原）。

## 六、验证清单（每次改完手动过一遍）

```bash
pnpm dev:card                         # 验证页构建（dev-dist）
node tools/verify/shot-sizes.mjs       # 三张内容卡 1x1 / 2x1 / 4x2 版式 + 悬浮控件
node tools/verify/shot-consistency.mjs # 卡片 vs 详情同源（sameBg / sameText）+ 翻页牌几何
node tools/verify/shot-icons.mjs       # 4 倍放大看图标是否线性（fill:none）
node tools/verify/shot-chips.mjs       # 诗词详情标签（未选中态对比度）
node tools/verify/shot-calendar.mjs light|dark   # 日历卡四种尺寸（1x1/2x2/2x4/4x2）+ 日历详情
node tools/verify/shot-calendar-live.mjs         # 真机：加日历 → 四种尺寸逐档截图 → 开详情 → 移除复原
node tools/verify/shot-settings.mjs    # 设置四分区（统一弹层 + 从按钮 FLIP）
node tools/verify/shot-settings-live.mjs  # 真机：设置与详情同一套弹层结构 + FLIP 关键帧
node tools/verify/shot-persist-live.mjs   # 真机：加卡 → petal 文件 → 整页重载 → 复原
node tools/verify/shot-layout.mjs         # 网格填满（左右留白 0）+ 图标居中 + 通用全屏
node tools/verify/shot-weather.mjs        # 天气卡五尺寸不溢出 + 详情两段宽度 + 地点搜索/切换
node tools/verify/shot-countdown.mjs      # 倒数日五尺寸 + 三栏详情（200/自适应/300）+ 新建/筛选/单位/置顶/删除
node tools/verify/shot-heatmap.mjs        # 写作热力图五尺寸 + 两栏详情（一年 53 周）+ hover 读数 + 失败态
node tools/verify/shot-layout-live.mjs    # 真机版式：左右留白 / 图标中心差 / 全屏进出
node tools/verify/shot-chrome.mjs      # 悬浮按钮 / 右键菜单（交给思源的条目）/ 弹层关闭
node tools/verify/shot-menu-live.mjs   # 真机：右键菜单是思源 .b3-menu、图标线性、子菜单带勾
node tools/verify/shot-flip-frames.mjs # 翻页牌折叠过程
node tools/verify/shot-live.mjs        # 真机：图标线性 + 卡片↔详情同源 + 诗词标签
node tools/verify/shot-tooltip.mjs     # 真机：提示走思源 ariaLabel（#tooltip）
pnpm check:dist                        # 发布前：产物只允许 siyuan 一个外部依赖
pnpm check:arch                        # 分层守卫：core/ui/cards 依赖方向 + 每卡一个 Card.vue
```

- [ ] 三张内容卡在 1x1 / 2x1 / 4x2 下文字不被裁、垂直居中、卡片上没有日期
- [ ] 打开详情不换句不换图（`sameBg = true`，文字一致）
- [ ] 卡片点开走 detail / mode，操作按钮只在详情出现
- [ ] 详情间距只来自 `--desk-detail-inset/pad/gap`（12 / 20 / 12）
- [ ] 日历卡四种尺寸都不裁切：1x1 今日 / 2x2 月历 / 2x4 竖版 / 4x2 横版（`shot-calendar` 的 `clipped` 为空）
- [ ] 日历详情单块玻璃面，左右两栏 1px 分隔，底部「新建日程」
- [ ] 所有圆形按钮 = `GlassButton`（28 一档），图标全部来自 lucide，`fill: none`
- [ ] 翻页牌四角圆角、上下两半各 50%、数字层中心与牌中心重合
- [ ] 时钟 6 张翻页牌 + 全屏可进出
- [ ] 设置：单条滚动条、底部「恢复默认」统一
- [ ] 设置与详情是同一个 `Sheet`：无标题栏、悬浮关闭键、inset 12 / 栏内 20，且从触发元素 FLIP 展开
- [ ] 重启（整页重载）后卡片与尺寸都在；`localStorage` 里没有插件键；petal 目录里有 `desk` / `wallpaper` / `appearance`
- [ ] 跨卡片 import 数为 0（`pnpm check:arch` 自证）
- [ ] 每张卡恰有一个 `*Card.vue`；共享控件只在 `ui/primitives/` 且不 import `core/`
