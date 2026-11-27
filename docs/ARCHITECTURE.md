# 架构

原则：保留清楚的职责边界；共享真实重复的行为，不为行数把不同功能强行合并。

> 卡片要往哪里长、新卡按什么清单落地，见 **[ROADMAP.md](ROADMAP.md)**（含与其他主页类插件的逐组件对照与分阶段验收标准）。

## 目录与职责

```text
src/index.ts             插件注册：存储、页签、顶栏、命令
src/core/
  util.ts                共用底座：post()/sql() 内核出口、pad() 与正文块类型 BODY_TYPES
  i18n.ts                语言与词条出口：t() 是唯一的文案入口，语言在启动时定一次
  registry.ts            16 种卡片、组件、材质、尺寸约束的唯一装配点
  store.ts               状态与存储的唯一入口：桌面/壁纸/外观/领域数据/各卡状态、petal 读写、派生缓存、网格排版
  image.ts               图片清单、跨域代理、壁纸样式、图片收藏文件
  daily.ts               每日内容的共享序列、背景与翻页
  agenda.ts              日程与备忘共用的模型、分组、按日索引、日程点与写日记出口
  dailyNote.ts           日记：按 custom-dailynote 找文档、统计、待办与正文前几行
  quickdocs.ts           文档索引与打开行为
src/ui/
  DeskShell.vue          画布、面板组装、整理入口、每卡一个详情弹窗与全屏宿主
  DeskClock.vue          桌面大时间：分钟刷新、日期、样式、生命周期
  arrange.ts             指针/键盘移动缩放、fitDims 唯一尺寸约束
  CardFrame.vue          卡片材质、形状类、原生菜单、详情/全屏事件
  Sheet.vue              统一标题栏、弹层、钉住、顶栏拖动/四角缩放与 FLIP
  MiniCalendar.vue       可复用月格：月份切换 / 周首 / 今天 / 日程点，尺寸全用 em
  protyle.ts             Protyle 挂载：只读与就地编辑（含提示菜单出弹层）
  SettingsSheet.vue      壁纸/组件设置/卡片库/关于，统一预览与重置
  WallpaperPanel.vue     壁纸来源选择
  CardsPanel.vue         外观参数
  LibraryPanel.vue       卡片选择
  controls.ts            基础控件、显示工具与 iconSiPage 图形注册定义
  Slider.vue             原生滑轨封装
src/cards/<id>/          每卡一个 *Card.vue，详情/算法/专属样式留在本目录
src/embed/cards.ts       文档占位挂载、DOM 观察、插入卡片命令与卸载
src/i18n/                zh_CN.json / en_US.json：词条本体（同一份文件也给思源当命令 langKey）
src/styles/index.css     设计令牌、共享控件、设置骨架、整理模式与插件根样式
```

## 依赖边界

- `core` 不依赖 `ui/cards/embed`；`registry.ts` 是装配点，允许引用卡片组件。
- 内核接口只从 `core/util` 走：`post()` 统一 POST/JSON/`code` 校验，`sql()` 是它的 SQL 特化；图片走 `post`，multipart 上传走 `image.ts` 内部唯一的 `putFile`。
- `ui` 不直接依赖 `cards`；通过注册表取得组件。
- 不同卡片目录互不导入。某张卡专用算法留在自身目录。
- 基础控件只接受 props 和事件，不读取业务状态、不依赖注册表。
- 详情通过 `registry.detail` 提供；省略时复用主组件并传 `mode="detail"`。
- 卡片只提供内容；外框、菜单、弹层和全屏由框架管理。

`pnpm check:arch` 校验上述模块边界；`pnpm check:types` 同时禁止无用导入、局部变量与参数。

## 样式命名（全局样式表）

`src/styles/index.css` 是**全局**样式表（卡片内的 `<style scoped>` 与 `styles.css` 才有作用域），所以它里面的类名会作用于整个思源页面和所有插件。

- 首层类名一律 `desk-` 开头；卡片自己的类以卡片前缀开头（`qn-` / `cal-` / `wx-` …），并且在全局表里一律写成 `.<前缀>…` 的下级选择器。
- 状态类用 `.is-*`，但必须挂在 `desk-` 元素之下（`.desk-slot.is-active`），不允许裸 `.is-active` 单独出现。
- `pnpm check:css` 校验：新出现的首层类名必须 `desk-` 开头；历史遗留的裸类名记在 `tools/verify/check-css.mjs` 的 `LEGACY` 白名单里，**只能减不能增**。
- 思源自有的类（`body--dark` / `.dark` / `.layout-tab-container` / `.protyle-*`）只作为**祖先条件**使用，不要去修改它们的样式。

> 事故背景：2026-11-27 首次真机启用时「界面错乱」，就是因为全局表里有 `.set-*` / `.slot` / `.doc-row` 这类通用类名，和 iTab modules、思桌等插件的同名类互相覆盖。见 `ROADMAP.md` 的「附录 C 事故复盘」。

## 语言与文案

界面文案只有一个出口：`core/i18n` 的 `t(key, vars?)`，词条本体在 `src/i18n/zh_CN.json` 与 `en_US.json`（同一份文件也被思源读取，用于命令的 `langKey`）。

- 语言在启动时定一次（思源切语言会整页重载），所以 `t()` 是纯函数，模板、`const` 数组、`script setup` 里都可以直接调。
- 键名 = 出处 + 用途：`common.*` 跨处复用、`card.<id>.*` 卡片、`ui.<area>.*` 外壳与设置、`core.*` 领域词、`embed.*` 内嵌。注册表里的卡片名与说明走 `cardName()` / `cardDesc()`。
- 变量用 `{name}` 占位：`t("ui.desk.cardCount", { n: 12 })`。英文不必逐字对应，但**占位符必须一致**。
- 数据源带来的文本（tyme4ts 的农历 / 节气 / 宜忌、思源返回的地名与错误、诗词原文）不进词条；确实要保留中文的行尾写 `// i18n-keep`。
- `pnpm check:i18n` 断言中英键集合一致、源码用到的字面量键都存在，并列出还没迁走的界面中文；加 `--strict` 时提示项升级为失败。

## 尺寸与排版

桌面实例的 `x/y/w/h` 是唯一几何状态，单位为格。`computeGrid()` 仅依据可用宽度与 `appearance.cell` 计算列数与单格像素，手动移动不会触发避让重排。

- 单格目标范围来自 `CELL_MIN/CELL_MAX`，默认 27px。
- `registry.constrain` 定义 `step/min/max`；`arrange.fitDims()` 处理吸附与边界。
- 快捷方式以 2 格、文档统计以 3 格为步长；日历、天气自由缩放。
- 容器断点只使用 120/200/260/460/720px，`pnpm check:bp` 校验。
- 一键整理大卡先放、小卡补缝：先把待排卡片全部抬到 `(-1,-1)` 再逐个落位（否则旧坐标会参与碰撞、把后面的卡挤下一行）；时钟下留 1 格，卡片四周各留 1 格。
- 内嵌保留 `data-size` 标识，并解析为 `w/h` 传给组件。

## 状态与资源

`store.ts` 的 reactive 是状态来源；思源插件存储通过 `loadData/saveData` 读取与防抖写入。先完成启动读取，再允许写盘。桌面、壁纸、外观、天气地点与倒数日状态保存到思源插件存储；部分卡片偏好通过 `persisted()` 保存到本地存储，派生缓存使用 `siyuan-sipage-cache:` 前缀。

外观参数通过一处监听同步为 CSS 变量，卡片、预览与 Teleport 弹层使用同一配置。壁纸身份与运行时图片只通过 `setWallpaper()` 一起替换，避免切换来源后残留旧 `resolved`；`resolved` 不落盘。快速连续选择只接受最后一次异步结果。

图片收藏的真实文件位于思源 `data/public/siyuan-sipage`，内存列表是磁盘镜像；删除成功后再更新列表。本地图片直接读取，外部数据经 `forwardProxy()` 获取。

状态复用 `globalThis` 避免重复 bundle 的多份默认状态。修改兼容或持久化逻辑时，要额外验证思源整页重载与已有数据恢复。

日程与备忘共用 `core/agenda.ts` 的一份状态：卡片、详情、日历只读模型与派生分组，写操作也只有一个入口。写日记只是可选出口（默认关），失败不影响本地条目。

同一张卡可以放多张，**配置与视图状态按实例 uid 存**（`store.ts` 的 `cardStates` + `stateOf(uid, defaults)`）：桌面上的卡片、详情弹窗、文档内嵌三处拿同一个 uid 取同一份；卡片从桌面移除时连带清掉。领域数据（日程、倒数日、天气地点、收藏）仍是全库一份，跨卡共享。

## 生命周期

- 桌面时间只在整分钟唤醒，卸载清理定时器。
- 图谱事件通过 `AbortController` 一次释放；异步查询返回后先检查是否已卸载。
- 内嵌实例集中登记；移除占位或外层容器时完整卸载，DOM 搬移保持实例，插件退出释放全部实例。
- 新增监听、定时器、观察器都必须有对应的释放路径。

## 命名与许可

- **显示名**：`思页 / SiPage`。顶栏、页签、命令都取 `ui.app.title`，集市元信息取 `plugin.json` 的 `displayName`。
- **包名**：`siyuan-sipage`，与仓库同名（集市硬性要求）。它同时决定安装目录 `data/plugins/siyuan-sipage`、数据目录 `data/storage/petal/siyuan-sipage`、收藏目录 `data/public/siyuan-sipage`。插件从未发布过任何版本，所以不存在旧目录、旧键、旧格式——**没有任何迁移代码**，读到的永远是自己写的最新格式。
- **存储只有两条路**：用户状态与卡片状态走思源 `loadData/saveData`（`store.ts` 的 `read/save` + `persisted()`，key 即 petal 文件名，不能带冒号）；只有可丢可重建的派生缓存落 `localStorage` 的 `siyuan-sipage-cache:` 命名空间。
- **许可**：本项目 MIT（`LICENSE.md`）；`index.js` 里打进了 Vue / Lucide / tyme4ts，署名与许可条文写在 `THIRD-PARTY-NOTICES.md`，两份文件都随 `package.zip` 发布。
- 发版与集市提交的硬性要求见 `docs/RELEASE.md`，其中可自动化的部分由 `pnpm check:dist` 断言。

## 构建与验证

```bash
pnpm check          # 类型/未用符号、分层、断点、i18n 键、构建、产物完整性
pnpm check:browser  # 独立验证页与 6 组浏览器回归
```

`pnpm dev` 监听输出到 `.env` 指定工作空间的插件目录；未配置时输出 `dev-dist-plugin/`，避免覆盖验证页源码。`pnpm build` 固定输出 `dist/` 和 `package.zip`；验证页输出 `dev-dist/`，不会混入插件。

产物守卫要求入口、样式、清单非空，版本与源码一致；入口唯一宿主依赖为 `siyuan`。浏览器回归使用隔离数据与 API 替身；真实天气、Protyle、自定义块、原生菜单和持久化需在思源内复核，详见 `tools/verify/README.md`。

`release.js` 只更新版本；显式运行 `release:ship` 才进入检查、提交、标签、推送与 GitHub Release 管线。
