# 桌面卡片

[English](./README.md)

在思源页签中放置可自由整理的卡片桌面，支持文档内嵌。

## 功能

- 15 种卡片：时钟、日历、每日英语、一言、诗词、天气、倒数日、写作热力图、番茄钟、备忘录、文档统计、快捷打开、最近文档、快捷方式、思源块。
- 独立桌面时间；卡片自由拖拽缩放、一键整理、详情与全屏，同类卡片可添加多张。
- 整理模式使用点阵网格与悬浮玻璃工具栏。方向键移动，Shift + 方向键缩放，Esc 完成。
- 壁纸支持思源主题、资源图片、题头图、必应、国内图源、Picsum、本地随机、纯色与图片链接；收藏保存真实图片到思源 public 目录。
- 使用「插入卡片」命令在文档中放置活卡片。

## 开发与安装

使用 Node.js 20.19+ 或 22.12+，项目固定 pnpm 10.33.4。

```bash
pnpm install --frozen-lockfile
pnpm build
```

将 `dist/` 内文件复制到 `<思源工作空间>/data/plugins/desk-cards/`，在思源已下载插件中启用。

本机开发先复制 `.env.example` 为 `.env`，设置工作空间路径；Windows 路径可用正斜杠，如 `E:/sy`。

```bash
pnpm dev            # 监听构建到配置的思源插件目录
pnpm dev:reload     # 构建、复制并请求思源重载 UI
pnpm check          # 类型/未用符号、分层、断点、构建与产物检查
pnpm check:browser  # 构建独立验证页，执行五组隔离浏览器回归
```

`dev:reload` 使用同一工作空间配置，可通过 `SIYUAN_URL`、`SIYUAN_TOKEN` 或脚本参数设置连接。浏览器验证默认使用系统 Edge，可用 `EDGE_PATH` 覆盖。

## 发版

`pnpm release:patch` / `release:minor` / `release:major` / `release:manual` 只更新两个清单的版本。

显式执行 `pnpm release:ship "说明"` 才会检查、构建、提交、打标签、推送并创建 GitHub Release；需要 Git Bash 和已登录的 GitHub CLI。

架构见 [ARCHITECTURE](./docs/ARCHITECTURE.md)，设计规范见 [DESIGN](./docs/DESIGN.md)，验证说明见 [tools/verify](./tools/verify/README.md)。

MIT
