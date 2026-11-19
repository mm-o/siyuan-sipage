# Desk Cards

[简体中文](./README.zh-CN.md)

Widget cards for SiYuan: put a desktop of cards in a tab — calendar, clock, daily quote, poem, English sentence, plus a photo wallpaper behind them.

## What it does

- **Cards on a desk**: one tab shows a grid of cards over your wallpaper. Add / remove / resize from the card's context menu or the card library.
- **Sizes**: `1x1` / `2x1` / `2x2` / `2x4` / `4x2`; the grid fills the tab width and keeps the gutters even.
- **Details**: click a card to open it in a sheet; every card can also go full screen (no frame, the card itself fills the screen).
- **Calendar**: month grid, lunar date, solar terms, zodiac, constellation, moon phase, duty/star/mansion, and the day's "suitable / avoid" lists.
- **Wallpaper**: SiYuan covers (grouped), Bing daily, Picsum, or a plain colour / image URL.
- **Embed**: insert a live card into a document with the `插入卡片` command.

## Install

Copy the built `dist/` folder into `<workspace>/data/plugins/desk-cards/`, then enable **Desk Cards** in SiYuan → Settings → Marketplace → Downloaded.

## Develop

```bash
pnpm install
pnpm dev:card   # build the harness page (dev-dist)
pnpm build      # build the plugin (dist)
pnpm check:dist # guard: dist only depends on `siyuan`
pnpm check:arch # guard: layering (core / ui / cards)
```

See `docs/ARCHITECTURE.md` for the layering rules and `docs/DESIGN.md` for the design language.

## License

MIT
