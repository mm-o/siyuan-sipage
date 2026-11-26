# 发版与集市提交

参照官方规范：[plugin-sample](https://github.com/siyuan-note/plugin-sample)（插件规范）与
[bazaar](https://github.com/siyuan-note/bazaar)（集市收录流程）。这里只写本项目「必须照做」的部分，
`pnpm check:dist` 已经把其中可自动化的条目变成断言。

## 一、元信息（plugin.json）

| 字段 | 本项目取值 | 规范要点 |
| --- | --- | --- |
| `name` | `siyuan-sipage` | **必须等于 GitHub 仓库名**，小写字母 / 数字 / 连字符；同时决定安装目录 `data/plugins/<name>`、数据目录 `data/storage/petal/<name>`、收藏目录 `data/public/<name>` |
| `author` | `mm-o` | 作者名 |
| `url` | `https://github.com/mm-o/siyuan-sipage` | 包仓库地址 |
| `version` | `1.0.1` | semver；与 `package.json` 一致（`check:dist` 校验） |
| `minAppVersion` | `2.10.14` | 支持的最低思源版本；上调时写进 CHANGELOG |
| `displayName` | `SiPage` / `思页` | `default` 必须是英文；其余键用 BCP 47（`en`、`zh-CN`）。显示名可以随便改，不影响安装位置 |
| `description` | 同左 | 集市列表里的一句话；`default` 英文 |
| `readme` | `README.md` / `README.zh-CN.md` | 集市详情页正文；相对图片需打进 `package.zip` |
| `icon` | `icon.png` 160×160，12KB | PNG/JPEG/WebP/AVIF，≤64KiB，推荐 160×160 |
| `preview` | `preview.webp` 1024×768，43KB | 同上，≤512KiB，推荐 1024×768；不支持 SVG |
| `backends` / `frontends` | `all` / `all` | 环境白名单 |
| `disabledInPublish` | `true` | 发布服务里不加载（本插件是"页面型"，发布页不需要它） |
| `keywords` | 中英混排 | 补充集市搜索词（`name` / `author` / `displayName` / `description` 之外） |

## 二、产物（package.zip）

`pnpm build` 产出 `dist/` 并打成 `package.zip`，必须包含：

```text
plugin.json
index.js            # 单文件入口，唯一外部依赖 siyuan
index.css
README.md
README.zh-CN.md
LICENSE.md
THIRD-PARTY-NOTICES.md
icon.png
preview.webp
i18n/zh_CN.json     # 命令的 langKey 由思源从这里读
i18n/en_US.json
```

另外三条硬约束（`check:dist` 会拦）：

1. 入口只允许 `require("siyuan")`，**不允许相对 `require`**（思源加载器只解析 `siyuan`，分包产物必定崩）；
2. 包内不允许出现源码 / 测试脚本的扩展名，也不允许 Windows 保留名、首尾空格的路径；
3. 版本号在 `plugin.json`、`package.json`、`dist/plugin.json` 三处必须一致。

## 三、发版流程

```bash
pnpm release:patch      # 或 minor / major / manual：只改两个清单的版本号
pnpm check              # 类型 / 分层 / 断点 / 中英词条 / 构建 / 产物 + 集市规范
pnpm release:ship "一句话说明"   # 检查 → 构建 → 提交 → 打标签 → 推送 → 建 Release（附 package.zip）
```

`release:ship` 通过 GitHub CLI 创建 Release 时**必须把 `package.zip` 作为附件上传**——集市只认 Release 里的
`package.zip`，缺了它会一直处于「检查失败」。标签名必须等于 `version`。

## 四、首次收录进集市（一次性）

1. 仓库必须是**公开**的（集市的检查工作流要读你的 Release）。
2. fork [siyuan-note/bazaar](https://github.com/siyuan-note/bazaar)，在 `plugins.txt` 里加一行
   `mm-o/siyuan-sipage`（一行一个，无逗号、无空行），向 `main` 提 PR，正文按仓库模板填写。
3. PR Check 会自动校验：仓库名 = `name`、Latest Release 带 `package.zip`、清单字段齐全、图片规格、
   包内路径规范。失败就按它的评论改，不要重开 PR。
4. 合并后集市索引几分钟内更新；之后**更新不用再提 PR**——只要 bump `version` 并发布带 `package.zip` 的
   Release，集市会自动拉取（1–3 小时一轮）。

## 五、仓库侧设置（已完成）

这三条只能在 GitHub 上改，已于 1.0.1 定版时全部完成：

| 项 | 结果 |
| --- | --- |
| 仓库名 | `mm-o/siyuan-sipage`（与 `plugin.json` 的 `name` 一致） |
| 可见性 | public（集市检查工作流因此能读到 Release） |
| 默认分支 | `main`（本地分支同时改名，`origin/main` 已在跟踪） |

`release-ship.sh` 推的是**当前分支**，改名后照常可用。
