#!/usr/bin/env bash
# 发版：类型/分层/断点 → build → 产物检查 → commit → tag → push → Release
set -euo pipefail
MSG="${1:-}"
VER=$(node -p "require('./package.json').version")
[ -z "$MSG" ] && MSG="v$VER"
pnpm check:types
pnpm check:arch
pnpm check:bp
pnpm build
pnpm check:dist
git add -A
if git diff --cached --quiet; then
  echo "（无改动，沿用当前提交）"
else
  git commit -m "chore(release): v$VER — $MSG"
fi
git tag -a "v$VER" -m "v$VER — $MSG"
git push origin master --follow-tags
gh release create "v$VER" --title "v$VER" --notes "$MSG"
echo "已发版：https://github.com/mm-o/desk-cards/releases/tag/v$VER"
