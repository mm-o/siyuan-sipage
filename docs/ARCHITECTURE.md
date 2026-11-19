# 架构（v2.8 · 收敛版）

> 原则：**简洁高效、易于维护**。三层职责不变，新增能力必须归位到已有层，不新开层。

## 一、三层 + 两个延伸

```
index.ts                 入口（页签 / 顶栏 / 命令 / 内嵌启动 / 品牌标）
icons.ts（无）           品牌标已并入 index.ts

├─ core/                 与 UI 无关的骨架（5 个文件）
│  ├─ registry.ts        CardDef + CardSize + 15 张卡的注册（唯一扩展点）
│  ├─ store.ts           状态 + 存储 + 缓存 + 排版：
│  │                     用户状态 → 思源 petal；派生缓存 → localStorage(desk-cache:)；
│  │                     旧键迁移、flowDesk / alignPanels 也在这里
│  ├─ image.ts           图片与跨域请求唯一入口（forwardProxy）
│  ├─ daily.ts           每日内容序列（三张照片卡共用）
│  └─ quickdocs.ts       快速打开用的文档索引
│
├─ ui/                   设计系统（9 个文件）
│  ├─ DeskShell.vue      桌面壳（壁纸 + 时钟 + 画布 + 整理模式 + 弹层）
│  ├─ SettingsSheet.vue  设置外壳（左导航 + 三页：壁纸 / 组件设置 / 关于）
│  ├─ CardFrame.vue      卡片外框（材质 / hover / 菜单 / 形状档类 is-<tier>）
│  ├─ Sheet.vue          统一弹层（一套结构 + 从 origin FLIP）
│  ├─ ui.css             共享样式（面板骨架 / 按钮 / 控件外观全在这里）
│  ├─ controls.ts        基础控件 GlassButton·SeriesNav·Segmented·Chips + 纯 DOM 工具 toast/copyText/docColor/docRows
│  ├─ sizes.ts           尺寸语义层：sizeTier(w,h) → mini|wide|tall|square
│  ├─ arrange.ts         拖拽 / 缩放状态机（useDeskGrid）
│  ├─ primitives/Slider.vue   唯一还需要组件文件的控件（拖拽态 + v-model）
│  └─ settings/          WallpaperPanel | CardsPanel（含卡片库）
│
├─ cards/                每张卡片 = 一个自包含目录
│  ├─ calendar/          CalendarCard.vue + CalendarPanel.vue + styles.css
│  ├─ weather/           WeatherCard / WeatherPanel +
│  │                      types.ts(形状) codes.ts(码表/渐变) net.ts(缓存+两后端)
│  │                      locate.ts(区县定位+索引) hooks.ts(useWeather) weather.ts(汇总出口)
│  ├─ clock/ countdown/ heatmap/ docstats/ memo/ pomodoro/ quickpick/ recent/
│  ├─ block/ shortcut/ yiyan/ english/ shici/
│
├─ embed/
│  └─ cards.ts           文档内嵌（data-desk-card + MutationObserver）+ 插入卡片命令
│
└─ styles/               index.css（令牌 + 断点刻度 + 插件根）
```

## 二、六条硬规则

1. **卡片目录不得 import 另一张卡片**
   `core/` 只放**多张卡共用**的骨架：状态与存储、图片出口、每日内容序列、文档索引、注册表。
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
   | 网格排版 | `core/store.ts` 的 `flowDesk()` | 什么都不做 |
   | 图标居中 | `styles/index.css` 的 `button > svg { display: block }` + `line-height: 0` | 什么都不做 |

## 二之二、组件边界（什么可以抽成共享组件）

「一个卡片一个 Vue」指的是**卡片主组件**：每张卡在 `cards/<id>/` 里有且只有一个 `*Card.vue`，
它的子组件（`FlipDigit` / `CalendarPanel`）和 `styles.css` 留在同一个目录里。
**共享组件不是把三张卡合成一个**，而是把「长相与行为完全相同的一小块控件」抽出去。

判断能不能抽成共享控件（放进 `ui/controls.ts`），过这四问：

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

对应的三条「不许」：不许把整张卡的模板搬进 controls；不许 controls import `core/`；
不许在 controls 里写某张卡的文案分支（需要不同文案时，说明它不该共用）。

这条规则由 `pnpm check:arch` 机器校验（见第五节），不靠自觉。

## 二之三、尺寸模型（v0.5 起）

卡片**没有尺寸档位表**，桌面按格数自由缩放；版式只认「形状」不认精确格数：

| 概念 | 实现 |
| --- | --- |
| 实际尺寸 | `CardInstance` 的 `w/h`（格数），桌面壳按视口算出单格像素 |
| 形状档 | `ui/sizes.ts` 的 `sizeTier(w,h)` → `mini / wide / tall / square`，CardFrame 输出 `is-<tier>` |
| 大卡 | `isBig()`：面积 ≥ 8 格，用来放大字号、增加行数 |
| 锁定比例 | `registry.constrain.ratios`（日历/天气锁 2:1，8×4 / 10×5 / 12×6 等比放大不变形） |
| 容器断点 | 只用五个刻度：120 / 200 / 260 / 460 / 720（`pnpm check:bp` 守卫） |

```ts
// 卡片里的写法
const tier = sizeTier(props.w ?? 4, props.h ?? 2)   // 版式分支
// 样式里只用语义类
.is-wide .quote { -webkit-line-clamp: 2 }
.is-big .desk-photo-text { font-size: var(--desk-fs-card-text-wide) }
```

**不要**再按精确格数写选择器（`.is-4x2` 这类）：卡片一旦被拖成 8×4 就永不命中，
这正是 v0.5 之前「拖大之后样式没跟上」的根因。

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
| 提示条 | 插入文档、新建日程各写一份 toast | **`ui/view.ts` 的 `toast()` 一处** |
| 验证脚本 | 28 个（v3…v18 的历史快照脚本） | **10 个**，一文件一职责 |

量化：`src/` 从 **6817 行 → 5575 行**；产物 CSS 从 **67.7 kB → 41.6 kB**（gzip 12.0 → 7.6 kB），JS 基本不变（162 → 161 kB）。

## 四之二、v2.9 的收敛（继续压）

| 项 | 之前 | 现在 |
| --- | --- | --- |
| 三张卡的取数/翻页/背景 | 每张卡各写一份 cache + cursor + step + 背景随机（一言 20 行、英语/诗词没有翻页） | **`core/daily.ts` 的 `dailySeries()` 一处**：三张卡只提供 `load(offset)`，翻页/缓存/共享状态/背景全由它管 |
| 复制到剪贴板 | 三张卡各写一份 clipboard + execCommand 兜底（每份 ~12 行） | **`ui/view.ts` 的 `copyText()`** |
| 提示条 | 早期曾单独一个文件 | 已与 `copyText` 合并进 **`ui/view.ts`**（两个纯 DOM 工具） |
| 背景样式 | 三张卡各写 `url(cover \|\| 兜底)` | **`photoBg(cover, picture?)`** 一处 |
| 设置面板骨架 | 四个面板各写 `.panel { flex column; gap }` | **`ui.css` 的 `.desk-panel`** |
| 预览条 | 壁纸 / 组件设置各写一份 `.preview`（132px + 描边 + 圆角） | **`.desk-preview` + `.desk-preview-tag`** |
| 卡片菜单开关 | `CardFrame` 的 `menu?: { expand, refresh, size, remove }` 四开关（无人传） | **删除**，菜单固定四项 |

功能增量：每日英语 / 每日诗词的详情现在也有「上一条 / 下一条」（英语用本地 24 句句库循环，诗词按 `?date=` 走前一天/后一天）。

## 五、存储层（`core/store.ts`）

状态存**思源的插件存储**，不存 localStorage：

| | 走哪儿 | 说明 |
| --- | --- | --- |
| 读 | `plugin.loadData(key)` | `bootStore()` 里 await 一次，**直接赋给 reactive**，不存副本 |
| 缓存 | `cacheGet/cacheSet`（本文件内） | 只有派生数据（天气、区县索引）落 localStorage，命名空间 `desk-cache:`，读失败当没有 |
| 写 | `plugin.saveData(key, value)` | 状态一变就写（滑轨这类高频变化合并 100ms，只合并请求、不缓存数据） |
| 落地 | `<工作空间>/data/storage/petal/desk-cards/{desk,wallpaper,appearance}` | 重启、换设备同步都在；键名会变成文件名，不能带冒号 |

**没有缓存层、没有队列、没有 flush**：内存里的 reactive 就是唯一真源，读一次写到底，不存在「缓存和磁盘谁对」的同步问题。

三条必须记住的坑：

1. **思源会把插件 bundle 载入多次**（同一文档实测 20 次 `onload`）。所以 `core/store.ts` 的状态与监听器挂在 `globalThis` 上做单例（`__deskDesk` / `__deskWallpaper` / `__deskAppearance` / `__deskWatching` / `__deskBooted`）——否则 20 份副本各拿自己的默认值写盘，用户加的卡片会被覆盖回种子。
2. **装载之前不许写**：`bootStore()` 读完才把 `ready` 置真，否则每个副本启动时都会把默认值写回去。
3. **兼容旧数据**：新存储没有该键时回退读旧 localStorage 键（`desk-cards:*`），老用户的数据一次性迁过来。

验证：`node tools/verify/shot-persist-live.mjs`（加卡 → 读 petal 文件 → 整页重载 → 复原）。

## 六、验证清单

```bash
pnpm check:types     # tsc：类型契约（CardSize、props 形状）
pnpm check:dist      # 产物只允许依赖 siyuan
pnpm check:arch      # 分层：core→ui→cards，每卡一个 Card.vue，跨卡依赖为 0
pnpm check:bp        # 断点只用 120/200/260/460/720
pnpm build           # 构建插件
pnpm release:ship "说明"   # 四道门禁 → 构建 → 提交 → tag → push → Release
```

人工过一遍：

- [ ] 卡片拖到任意尺寸：版式跟随形状档变化，文字不裁、不折行错位
- [ ] 日历 / 天气拖大后保持 2:1，等比放大不变形
- [ ] 整理模式：壁纸压暗、圆角格网、时钟下方空两格、卡片间 1 格、向右下可继续滚动
- [ ] 天气详情：区县定位准确、逐时 24h、7 日、左右两栏同底
- [ ] 重启（整页重载）后卡片与尺寸都在；petal 有 desk/wallpaper/appearance；localStorage 只有 `desk-cache:` 前缀
- [ ] 跨卡片 import 为 0（`pnpm check:arch` 自证）
