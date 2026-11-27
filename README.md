# SiPage

**SiPage** is the page itself: it turns one SiYuan tab into a whole card desk, the way a browser tab holds a page — a wallpaper plus a grid of live cards that open a detail view, go fullscreen, and can be embedded in documents.

*Read whichever page the wind turns to.*

> The package name `siyuan-sipage` matches the repository name, which the bazaar requires. Nothing has ever been published, so the install folder `data/plugins/siyuan-sipage`, the data folder `data/storage/petal/siyuan-sipage` and the favorites folder `data/public/siyuan-sipage` are final from day one — no legacy baggage.

**Changelog (online)**: [CHANGELOG.md](https://github.com/mm-o/siyuan-sipage/blob/main/CHANGELOG.md) — also linked at the top-right of the About page

## Install & enable

1. Download `package.zip` from a release, or run `pnpm build` in the repo and use `dist/`.
2. Unzip / copy it into `<workspace>/data/plugins/siyuan-sipage/` — you should see `plugin.json`, `index.js`, `index.css` inside.
3. Open **SiYuan → Settings → Marketplace → Downloaded**, find "SiPage" and switch it on.
4. Reload the page (or restart SiYuan). A "SiPage" icon appears on the right of the top bar.

To upgrade, replace `index.js` / `index.css` and reload — layout, wallpaper and favorites are kept.

## Open the desk

Three equivalent entries:

- the "SiPage" icon on the right of the top bar;
- the command palette → "Open SiPage";
- bind a hotkey: **Settings → Keymap**, search for "Open SiPage".

The desk has its own clock panel on the left (same grid layer as the tool group), cards fill the rest.

## Working with the desk

### Add cards

1. Click **＋** in the tool group at the top-right (or right-click the desk → Add card).
2. Pick a row in the Card Library; the right column shows a live preview and how many are on the desk.
3. Click **Add to desk**. The same card can be added more than once, with its own size and position.

### Card details and fullscreen

- **Click a card** → detail panel; `Esc` closes it. Cards carry no floating buttons — one click is the only action on the card itself.
- **Right-click a card** → Open / Refresh / Remove (SiYuan’s native menu; sizes are adjusted in arrange mode).
- **Fullscreen** → the expand button at the right of the detail title bar: the card fills the whole screen; the exit button at the bottom-right or `Esc` brings you back.
- **Panels can be dragged, resized and pinned**:
  - drag the title bar to move, double-click it to re-center;
  - drag a corner to resize;
  - click the **pin** in the title bar: the backdrop stops dimming and clicking outside no longer closes it. Several panels can be pinned at once, so you can keep the desk usable beside them.

### Arrange mode and sizes

1. Click the **grid** button in the tool group (or right-click → Arrange desk): a dot grid appears and a floating glass toolbar shows the card count and the tidy action.
2. **Drag the card body** to move it; **drag the dots on the four edges** to resize, one cell per step.
3. Keyboard works too: **arrow keys** move, **Shift + arrow keys** resize.
4. When an edge hits its limit the dot fades, but you can still drag back.
5. **`Esc`** or the check button leaves arrange mode.

### Tidy up

**Tidy up** in the toolbar (or right-click the desk → Tidy up): cards are packed in order using 2D fitting — two empty cells are kept below the clock, one cell between cards, one cell on each side; rows that don't fit stay empty and cards are never stretched. A toast reports how many cards were arranged.

## Cards

| Card | What it does |
| --- | --- |
| Clock | Dot-matrix / flip styles, rotates automatically with size |
| Calendar | Today / month view / lunar terms; the day pane lists that day’s schedule, cells carry schedule dots |
| Weather | Current weather and 7-day forecast; manage places in details |
| Countdown | Anniversaries and target days, grouped by category |
| Writing heatmap | Writing volume by day; a whole year in details |
| Pomodoro | 25 minutes focus + 5 minutes break |
| Daily note | One day’s diary: blocks / words / open tasks and the first lines; edited in place with SiYuan’s own editor in details |
| Quick note | Type one line, press Enter — it is appended to today’s diary (or to any document you pin in details); format can be plain text, a todo or a timestamp |
| Agenda memo | Today / overdue / memo sections, check the dot to finish; a date makes it a schedule, no date keeps it in the inbox |
| Doc stats | Documents / words / created today, grouped by notebook |
| Daily quote | One sentence a day with a wallpaper |
| Daily poem | A classical poem with full text, translation and notes |
| Daily English | One English sentence with Chinese meaning, text-to-speech |
| Quick open | One document per cell, opens in a tab |
| Recent docs | The 1–8 most recently updated documents |
| Shortcuts | Reuses common toolbar actions, one per cell |
| SiYuan block | Renders any SiYuan block as-is (document block / custom block) |

Sizes: 2×2 cells by default. Calendar / weather / daily note can be dragged between 2 and 16 cells, clock between 3 and 16; doc stats moves in steps of 3 (from 3×3); shortcuts move in steps of 2 (from 2×2). The pixel size of one cell comes from **Settings → Cards → Cell size** (24–36px).

## Wallpaper

**Settings → Wallpaper**, nine sources on one screen:

| Source | Where it comes from | Notes |
| --- | --- | --- |
| Follow SiYuan | SiYuan’s own background | No image stored, no blur or mask; follows theme and background switches |
| SiYuan assets | Notebook `assets/` | Served by the kernel, searchable |
| SiYuan covers | 18 built-in categories | All tags listed, local images |
| Bing daily | Official Bing API | Last 8 days |
| CN source | alcy.cc | Direct, works in China, "Shuffle 12" |
| Picsum | picsum.photos | Random, "Shuffle 12", needs a proxy in China |
| Local random | Random cover | A different cover each time |
| Solid | 24-swatch palette | Common colors |
| Image URL | Any URL | Paste an address, press Enter |

SiYuan assets / covers show **3 rows × 4 = 12 per screen**: "Load more" adds a row, "Collapse" returns to one screen. "Shuffle one" on SiYuan assets picks a random image from the current search result.

### Favorite a wallpaper

1. Hover a tile and click **♥** — it lights up immediately, no waiting for the disk.
2. Favoriting writes the **real image bytes** into `<workspace>/data/public/siyuan-sipage/`.
3. You can then open `/public/siyuan-sipage/<file>` in a browser.
4. In the right column, click a thumbnail to apply it, or the **×** to delete it (the file is removed too).
5. Right-click the desk → **Favorite current wallpaper** saves the one in use (solid / follow-theme have no image, so the item is hidden).

### Blur and mask

**Settings → Cards → Wallpaper**: blur 0–24px, mask 0–80%.

## Settings

Applies to the whole desk:

- **Style**: Liquid Glass (default) / SiYuan native / Material 3. Each style only swaps material and control geometry — layout, type scale, spacing and motion stay the same; the native one renders SiYuan’s own `b3-*` components, so hover / focus / disabled follow the theme.
- **Layout**: cell size 24–36px, controls grid density.
- **Motion**: entrance animation switch, duration, per-block stagger, per-character stagger.
- **Cards**: radius, glass blur, glass opacity, shadow, hover lift.
- **Panels**: pane opacity.
- **Wallpaper**: blur, mask.

**Double-click a slider** to restore its default.

## Data & backup

| What | Where |
| --- | --- |
| Plugin | `<workspace>/data/plugins/siyuan-sipage/` |
| Layout / appearance / wallpaper / weather / countdown | `<workspace>/data/storage/petal/siyuan-sipage/` |
| Favorite wallpapers | `<workspace>/data/public/siyuan-sipage/` |

Back up the last two folders and copy them back when moving machines.

## Embedding cards in documents

1. Open a document and place the cursor where the card should go.
2. Command palette → **Insert Card** → pick a card.
3. The card is inserted as an HTML block: editable, undoable, copy-pasteable, and re-mounted after switching documents or reloading.

You can also write the block by hand:

```html
<div data-sipage-card="yiyan" data-size="2x2" style="height:320px"></div>
```

- `data-sipage-card`: card id — `clock`, `calendar`, `weather`, `yiyan`, `shici`, `english`, `countdown`, `heatmap`, `pomodoro`, `memo`, `quicknote`, `daily`, `docstats`, `quickopen`, `recent`, `shortcut`, `block`.
- `data-size`: `1x1`, `1x2`, `2x1`, `2x2`, `2x4`, `4x2`; defaults to `2x2`.

## Troubleshooting

- **Bing / CN source / Picsum stay empty**: these images go through the SiYuan kernel proxy (`/api/network/forwardProxy`); make sure the kernel can reach the internet. Picsum usually needs a proxy in mainland China.
- **Weather unavailable**: foreign places use Open-Meteo, Chinese places use district codes; if locating fails, search and add a city in the weather details.
- **Favoriting does nothing / errors**: make sure `<workspace>/data/public` is writable.
- **Nothing changed after an update**: reload the page; if that is not enough, restart SiYuan.
- **Language**: both the interface and this document follow SiYuan's language (Chinese / English); reload the page after switching. Chinese shows `README.zh-CN.md`, other languages show this file.

## Development

Node.js 20.19+ or 22.12+, pnpm pinned to 10.33.4.

```bash
pnpm install --frozen-lockfile
pnpm build           # dist/ and package.zip
pnpm dev             # watch build into the plugin dir from .env
pnpm dev:reload      # build, copy, then ask SiYuan to reload the UI
pnpm check           # types / unused symbols / layering / breakpoints / i18n keys / dist
pnpm check:browser   # build the harness and run the isolated browser suites
```

Copy `.env.example` to `.env` and set the workspace path (Windows accepts forward slashes, e.g. `E:/sy`). `dev:reload` reads `SIYUAN_URL` / `SIYUAN_TOKEN` or script flags; browser suites use system Edge unless `EDGE_PATH` is set.

Layout: `src/core` (state / images / registry), `src/cards` (16 cards), `src/ui` (desk shell / settings / controls), `src/embed` (document embeds), `src/styles` (the single global stylesheet).

## Releasing and listing in the bazaar

`pnpm release:patch` / `release:minor` / `release:major` / `release:manual` only bump the version in both manifests.

`pnpm release:ship "note"` runs the whole pipeline: `pnpm check` → build → commit → tag → push → create a GitHub Release with `package.zip` attached (needs Git Bash and an authenticated GitHub CLI).

The bazaar requirements and the first-listing steps live in **[docs/RELEASE.md](docs/RELEASE.md)**: public repository, `main` as the default branch, `package.zip` attached to the release, `plugin.json` `name` equal to the repository name, icon 160×160 ≤64KiB, preview 1024×768 ≤512KiB.

What gets built next, and why, is in **[docs/ROADMAP.md](docs/ROADMAP.md)** (a component-by-component comparison with other homepage-style plugins, the principles we accept and reject, and the phased plan with acceptance criteria).

## License

MIT — see [LICENSE](LICENSE); `LICENSE.md` is the same text packed into `package.zip`. Third-party code shipped in the bundle (Vue, Lucide, tyme4ts, SiYuan Petal type declarations) and its licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); both files are packed into `package.zip`.
