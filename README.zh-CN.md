# 桌面卡片

[English](./README.md)

把一屏卡片放进思源的一个页签：日历、时钟、每日一言、诗词、每日英语，底下压一张壁纸。

## 能做什么

- **桌面**：一个页签里是壁纸 + 卡片网格；卡片可加、可删、可换尺寸（右键菜单或「卡片库」）。
- **尺寸**：卡片自由拖拽缩放（日历/天气按 2:1 锁定比例，8×4 / 10×5 / 12×6 等比放大不变形）；网格按页签宽度均分填满，左右留白一致。
- **整理**：一键整理按 iTab 的 findFitPosition 2D 扫描补位——小卡自动填缝、时钟下方空两格起排、卡片间留一格。
- **详情与全屏**：点卡片在弹层里看详情；任何卡片都能全屏（无外框，卡片本身铺满整屏）。
- **日历**：月视图、农历、节气、生肖、星座、月相、建除/星宿/纳音、当日宜忌。
- **壁纸**：思源头图（按分类）、必应每日、Picsum、纯色 / 图片链接。
- **文档内嵌**：用「插入卡片」命令把活卡片插进文档。

## 安装

把构建出来的 `dist/` 目录复制到 `<工作空间>/data/plugins/desk-cards/`，然后在 思源 → 设置 → 集市 → 已下载 里启用「桌面卡片」。

## 开发

```bash
pnpm install
pnpm dev:card   # 构建验证页（dev-dist）
pnpm build      # 构建插件（dist）
pnpm check:dist # 守卫：产物只依赖 `siyuan`
pnpm check:arch # 守卫：分层（core / ui / cards）
pnpm release:ship "本次改动"  # 发版：build → commit → tag → push → GitHub Release
```

分层规则见 `docs/ARCHITECTURE.md`，设计语言见 `docs/DESIGN.md`。

## 许可

MIT
