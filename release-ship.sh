#!/usr/bin/env bash
# 发版：pnpm release:ship "说明"   → 类型/产物/分层三道门禁 → build → commit → tag → push → Release
set -euo pipefail
MSG="${1:-}"
VER=$(node -p "require('./package.json').version")
[ -z "$MSG" ] && MSG="v$VER"
pnpm check:types
pnpm check:dist
pnpm check:arch
pnpm check:bp
pnpm build
git add -A
git commit -m "chore(release): v$VER — $MSG" || echo "（无改动）"
git tag -a "v$VER" -m "v$VER — $MSG" || true
git push origin master --follow-tags
gh release create "v$VER" --title "v$VER" --notes "$MSG" || true
echo "已发版：https://github.com/mm-o/desk-cards/releases/tag/v$VER"
