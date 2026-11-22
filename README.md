# Desk Cards

[简体中文](./README.zh-CN.md)

A customizable card desktop for SiYuan, with live cards embedded in documents.

## Features

- 15 cards: clock, calendar, English, quotes, poems, weather, countdown, writing heatmap, pomodoro, memo, document statistics, quick open, recent documents, shortcuts, and SiYuan blocks.
- Independent desktop clock, free drag/resize, automatic arrangement, detail sheets and fullscreen. Multiple instances of each card are supported.
- Arrangement mode uses a dot grid and floating glass toolbar. Arrow keys move; Shift + arrows resize; Esc finishes.
- Theme backgrounds, SiYuan assets/covers, Bing, domestic images, Picsum, local random images, solid colors and image URLs. Favorites store actual images in SiYuan's public directory.
- The insert-card command adds live document cards.

## Development

Use Node.js 20.19+ or 22.12+ and the pinned pnpm 10.33.4.

```bash
pnpm install --frozen-lockfile
pnpm build
```

Copy the contents of `dist/` into `<SiYuan workspace>/data/plugins/desk-cards/`, then enable the plugin.

Copy `.env.example` to `.env` and set your SiYuan workspace path for development.

```bash
pnpm dev            # watch-build into the configured workspace's plugin directory
pnpm dev:reload     # build, deploy and request a SiYuan UI reload
pnpm check          # types/unused code, architecture, breakpoints, build and artifacts
pnpm check:browser  # independent preview and five isolated browser regressions
```

Reload accepts `SIYUAN_URL` and `SIYUAN_TOKEN`, or command-line options. Browser verification uses system Edge by default; set `EDGE_PATH` for another executable.

## Releases

The `release:patch`, `release:minor`, `release:major` and `release:manual` commands update manifest versions only. Explicitly running `pnpm release:ship "description"` checks, builds, commits, tags, pushes and creates a GitHub Release. Git Bash and an authenticated GitHub CLI are required.

See [architecture](./docs/ARCHITECTURE.md), [design](./docs/DESIGN.md), and [verification](./tools/verify/README.md).

MIT
