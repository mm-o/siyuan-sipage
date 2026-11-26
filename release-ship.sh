#!/usr/bin/env bash
# 发版：完整检查（pnpm check 已含类型/分层/断点/词条/产物+集市规范）→ build → commit → tag → push → Release（附 package.zip）
# REF docs/RELEASE.md
set -euo pipefail
MSG="${1:-}"
VER=$(node -p "require('./package.json').version")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ -z "$MSG" ] && MSG="v$VER"

if git rev-parse -q --verify "refs/tags/v$VER" >/dev/null; then
  echo "标签 v$VER 已存在：先 bump 版本号（pnpm release:patch）再发版" >&2
  exit 1
fi

pnpm check

git add -A
if git diff --cached --quiet; then
  echo "（无改动，沿用当前提交）"
else
  git commit -m "chore(release): v$VER — $MSG"
fi
git tag -a "v$VER" -m "v$VER — $MSG"
git push origin "$BRANCH" --follow-tags
# 集市只认 Release 里的 package.zip，漏传等于没发版
gh release create "v$VER" package.zip --title "v$VER" --notes "$MSG"
echo "已发版：https://github.com/mm-o/siyuan-sipage/releases/tag/v$VER"
