# tools/verify —— 开发期验证脚本（不参与打包）

这些 `.mjs` **不是插件代码**，也不在 `dist/` 里。它们是我用来「看到结果」的自动化脚本：
起一个本地静态服务器加载 `dev-dist`（验证页），用 Playwright 打开、点击、量尺寸、截图。

## 脚本清单（一文件一职责）

| 脚本 | 作用 |
| --- | --- |
| `check-dist.mjs` | 产物守卫：dist 只允许白名单扩展名、入口只 `require("siyuan")` |
| `check-arch.mjs` | 分层守卫：core/ui/cards 依赖方向、primitives 只吃 props、每张卡一个 `*Card.vue`（`pnpm check:arch`） |
| `shot-sizes.mjs` | 三张内容卡在 1x1 / 2x1 / 4x2 的版式、留白、是否被裁 + 悬浮控件 |
| `shot-consistency.mjs` | 卡片 ↔ 详情同源（sameBg / sameText）+ 翻页牌几何与折叠帧 |
| `shot-calendar.mjs` | 日历卡四种尺寸（1x1 / 2x2 / 2x4 / 4x2）+ 日历详情（`light` / `dark` 两个外观） |
| `shot-calendar-live.mjs` | 真机：加日历卡 → 用卡片库尺寸标签切四种尺寸逐档截图量盒 → 开详情 → 移除并核对卡片数复原 |
| `shot-settings.mjs` | 设置面板四个分区 + 导航/内容盒子 + 从按钮 FLIP 的关键帧 |
| `shot-settings-live.mjs` | 真机：设置与卡片详情是同一套弹层（无标题栏 / 悬浮关闭 / inset 12 / 栏内 20）+ FLIP |
| `shot-persist-live.mjs` | 真机：加卡并改尺寸 → 读 petal 文件 → 整页重载仍在 → 移除复原 |
| `shot-layout.mjs` | 网格铺满（左右留白 0）+ 图标居中（svg 中心 vs 按钮中心）+ 通用全屏 |
| `shot-layout-live.mjs` | 真机版式：列宽/左右留白、图标中心差、全屏进出 |
| `shot-chrome.mjs` | 卡片悬浮按钮、右键菜单（断言交给思源 `Menu` 的条目/图标/坐标）、弹层关闭按钮 |
| `shot-icons.mjs` | 4 倍放大看图标是否线性（`fill: none`） |
| `shot-chips.mjs` | 诗词详情标签（未选中态对比度、选中态互换） |
| `shot-flip-frames.mjs` | 翻页数字的折叠过程（CDP 暂停动画逐帧） |
| `shot-live.mjs` | 真机（真实思源）：顶栏图标线性、卡片↔详情同源、诗词标签与翻页；加卡片→截图→移除，跑完复原 |
| `shot-tooltip.mjs` | 真机：所有提示是否走思源 tooltip（读 `::after` 的 content / opacity，确认没有原生 title） |
| `shot-menu-live.mjs` | 真机：右键菜单是思源 `.b3-menu`、图标线性、尺寸子菜单带勾、Esc 能关、「⋯」贴着按钮弹 |

## 运行前提

1. 先构建验证页：`pnpm dev:card`（输出到 `dev-dist`，`root: dev/`）
2. 思源在 `127.0.0.1:6806` 运行（脚本会把 `/appearance/covers/**` 代理到真实思源）
3. Edge 在默认路径（脚本用 `playwright-core` 直接驱动系统 Edge，无需下载浏览器）
4. 截图输出到项目根目录的 `docs-*.png`

## 与插件构建的关系

```
pnpm dev:card   → dev-dist/      验证页（这里的脚本读它）
pnpm build      → dist/          插件产物（只有 index.js / index.css / plugin.json / icon 等）
```

`dist/` 里**没有任何 .mjs**，验证脚本不会被发布（`pnpm check:dist` 可复现这个结论）。
