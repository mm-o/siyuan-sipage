# 开发期验证

验证脚本不参与插件打包。浏览器测试只加载本项目 `dev-dist`，API、图片和外网内容全部使用固定 mock；不连接真实思源，也不写用户工作空间。

| 脚本 | 覆盖范围 |
| --- | --- |
| `check-arch.mjs` | 分层依赖、跨卡引用、每卡一个主组件 |
| `check-breakpoints.mjs` | 容器断点限定为 120 / 200 / 260 / 460 / 720 |
| `check-i18n.mjs` | 中英词条键集合一致、`t()` 用到的键都存在，并列出还没迁走的界面中文（`--strict` 升级为失败） |
| `check-dist.mjs` | 发布目录文件白名单、唯一外部依赖 `siyuan`、三处版本一致，以及集市规范（`name` = 仓库名、元信息 `default` 字段、icon/preview 尺寸与体积、README/i18n/许可文件齐全） |
| `browser.mjs` | 七个浏览器脚本共用的静态服务器、Edge、网络隔离和报告输出，不单独运行 |
| `shot-arrange.mjs` | 拖动吸附、四边缩放、上限回缩、键盘、一键整理、完成、390px 工具栏、对比度与减少透明度/动效 |
| `shot-deskclock.mjs` | 整分钟刷新、跨日日期、时间属性、Vue 卸载时清理定时器 |
| `shot-glass.mjs` | 公共按钮的浅深色切换、照片环境、滤镜单例、文字/图标/主要/危险状态、倒数日原生提交、键盘焦点与材质降级 |
| `shot-surfaces.mjs` | 弹层与内内容面的日夜材质、开关的指针/空格与 aria 状态、滑轨键盘/填充/双击复位、字段的输入同步与下拉数字模型、弹窗顶栏拖动与四角缩放 |
| `shot-controls.mjs` | 快捷方式图标保持描边、弹层无描边、下拉自绘玻璃箭头、卡片库已添加徽章与增删状态 |
| `shot-shortcut.mjs` | 快捷方式面板：分类图标描边、同一动作可重复添加与计数徽章、右栏按次移除 |
| `shot-ui.mjs` | 四个设置分区、16 张卡片预览及材质切换、添加/移除、外观变量、方/宽/高卡片渲染、详情/全屏/菜单点击边界、嵌套文档卡片卸载 |

```powershell
pnpm check:types
pnpm check:arch
pnpm check:bp
pnpm check:i18n
pnpm dev:card
node tools/verify/shot-arrange.mjs
node tools/verify/shot-deskclock.mjs
node tools/verify/shot-ui.mjs
node tools/verify/shot-glass.mjs
node tools/verify/shot-surfaces.mjs
node tools/verify/shot-controls.mjs
node tools/verify/shot-shortcut.mjs
pnpm build
pnpm check:dist
```

要求 Windows 已安装 Edge；可用 `EDGE_PATH` 指定浏览器可执行文件。使用 `playwright-core`，无需下载浏览器。截图与 JSON 报告统一输出到 `docs/screens/`（已忽略）。测试按当前 `w/h/x/y` 网格模型构造数据；旧的固定 `size`、`.desk-hero-*` 与 `.grid` 测试已移除。

## 思源内人工集成检查

隔离验证页使用 `siyuan` 替身，因此以下行为在真实思源中检查：

1. 重载插件后打开桌面，确认顶栏/页签图标与主题一致；右键菜单和 tooltip 来自思源，未被卡片裁切。
2. 添加、移动、缩放卡片后整页重载，确认位置、尺寸和外观保持；使用临时桌面数据检查，结束后恢复。
3. 依次切换壁纸来源，收藏、使用、删除图片并重载，核对桌面与收藏文件一致；检查离线与服务错误提示。
4. 检查国内/国际天气、区县搜索、诗词翻页、英语朗读、复制与文档打开等真实接口功能。
5. 在临时文档插入卡片，验证切换文档、撤销、移除与插件卸载后实例释放；思源块用真实 Protyle 渲染。
6. 浅色/深色、宽窄页签下检查文字裁切；逐卡检查详情、全屏、翻页时钟与减少动效表现。

浏览器脚本验证渲染与交互契约，不把 mock 结果当作外部服务、持久化或 Protyle 集成结论。
