# 架构

原则：保留清楚的职责边界；共享真实重复的行为，不为行数把不同功能强行合并。

## 目录与职责

```text
src/index.ts             插件注册：存储、页签、顶栏、命令
src/core/
  util.ts                共用底座：post()/sql() 内核出口与 pad()，几行的通用件不单独成文件
  registry.ts            15 种卡片、组件、材质、尺寸约束的唯一装配点
  store.ts               桌面/壁纸/外观状态、思源存储、缓存、网格排版
  image.ts               图片清单、跨域代理、壁纸样式、图片收藏文件
  daily.ts               每日内容的共享序列、背景与翻页
  quickdocs.ts           文档索引与打开行为
src/ui/
  DeskShell.vue          画布、面板组装、整理入口、每卡一个详情弹窗与全屏宿主
  DeskClock.vue          桌面大时间：分钟刷新、日期、样式、生命周期
  arrange.ts             指针/键盘移动缩放、fitDims 唯一尺寸约束
  CardFrame.vue          卡片材质、形状类、原生菜单、详情/全屏事件
  Sheet.vue              统一标题栏、弹层、钉住、顶栏拖动/四角缩放与 FLIP
  SettingsSheet.vue      壁纸/组件设置/卡片库/关于，统一预览与重置
  WallpaperPanel.vue     壁纸来源选择
  CardsPanel.vue         外观参数
  LibraryPanel.vue       卡片选择
  controls.ts            基础控件、显示工具与 iconDeskCards 图形注册定义
  Slider.vue             原生滑轨封装
src/cards/<id>/          每卡一个 *Card.vue，详情/算法/专属样式留在本目录
src/embed/cards.ts       文档占位挂载、DOM 观察、插入卡片命令与卸载
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

## 尺寸与排版

桌面实例的 `x/y/w/h` 是唯一几何状态，单位为格。`computeGrid()` 仅依据可用宽度与 `appearance.cell` 计算列数与单格像素，手动移动不会触发避让重排。

- 单格目标范围来自 `CELL_MIN/CELL_MAX`，默认 27px。
- `registry.constrain` 定义 `step/min/max`；`arrange.fitDims()` 处理吸附与边界。
- 快捷方式以 2 格、文档统计以 3 格为步长；日历、天气自由缩放。
- 容器断点只使用 120/200/260/460/720px，`pnpm check:bp` 校验。
- 一键整理大卡先放、小卡补缝；时钟下空 2 格，卡片间及左右各留 1 格。
- 内嵌保留 `data-size` 标识，并解析为 `w/h` 传给组件。

## 状态与资源

`store.ts` 的 reactive 是状态来源；思源插件存储通过 `loadData/saveData` 读取与防抖写入。先完成启动读取，再允许写盘。桌面、壁纸、外观、天气地点与倒数日状态保存到思源插件存储；部分卡片偏好通过 `persisted()` 保存到本地存储，派生缓存使用 `desk-cache:` 前缀。

外观参数通过一处监听同步为 CSS 变量，卡片、预览与 Teleport 弹层使用同一配置。壁纸身份与运行时图片只通过 `setWallpaper()` 一起替换，避免切换来源后残留旧 `resolved`；`resolved` 不落盘。快速连续选择只接受最后一次异步结果。

图片收藏的真实文件位于思源 `data/public/siyuan-desk-cards`，内存列表是磁盘镜像；删除成功后再更新列表。本地图片直接读取，外部数据经 `forwardProxy()` 获取。

状态复用 `globalThis` 避免重复 bundle 的多份默认状态。修改兼容或持久化逻辑时，要额外验证思源整页重载与已有数据恢复。

## 生命周期

- 桌面时间只在整分钟唤醒，卸载清理定时器。
- 图谱事件通过 `AbortController` 一次释放；异步查询返回后先检查是否已卸载。
- 内嵌实例集中登记；移除占位或外层容器时完整卸载，DOM 搬移保持实例，插件退出释放全部实例。
- 新增监听、定时器、观察器都必须有对应的释放路径。

## 构建与验证

```bash
pnpm check          # 类型/未用符号、分层、断点、构建、产物完整性
pnpm check:browser  # 独立验证页与 5 组浏览器回归
```

`pnpm dev` 监听输出到 `.env` 指定工作空间的插件目录；未配置时输出 `dev-dist-plugin/`，避免覆盖验证页源码。`pnpm build` 固定输出 `dist/` 和 `package.zip`；验证页输出 `dev-dist/`，不会混入插件。

产物守卫要求入口、样式、清单非空，版本与源码一致；入口唯一宿主依赖为 `siyuan`。浏览器回归使用隔离数据与 API 替身；真实天气、Protyle、自定义块、原生菜单和持久化需在思源内复核，详见 `tools/verify/README.md`。

`release.js` 只更新版本；显式运行 `release:ship` 才进入检查、提交、标签、推送与 GitHub Release 管线。
