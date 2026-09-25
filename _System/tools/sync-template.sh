#!/usr/bin/env bash
# Pulls template-owned files (scripts, templates, plugins, snippets) from the template repo into this game vault.
# World content and per-game plugin data are never touched. Nothing is committed: review with `git diff` first.
set -euo pipefail
SRC="${1:-https://github.com/Crits4Kids/obsidian-worldbuilding-template.git}"
BRANCH="${2:-main}"
cd "$(git rev-parse --show-toplevel)"

OWNED=(_System .obsidian/plugins .obsidian/snippets .obsidian/themes CLAUDE.md docs THIRD_PARTY_NOTICES.md)
# Plugin settings that hold per-game data stay as they are.
KEEP=(calendarium charted-roots obsidian-git obsidian-leaflet-plugin obsidian-excalidraw-plugin obsidian-style-settings)

if [ -n "$(git status --porcelain -- "${OWNED[@]}")" ]; then
  echo "Uncommitted changes in template-owned paths. Commit or stash them first:" >&2
  git status --short -- "${OWNED[@]}" >&2
  exit 1
fi

git fetch --quiet "$SRC" "$BRANCH"
EXCLUDES=()
for id in "${KEEP[@]}"; do EXCLUDES+=(":(exclude).obsidian/plugins/$id/data.json"); done
PRESENT=()
for p in "${OWNED[@]}"; do if git cat-file -e "FETCH_HEAD:$p" 2>/dev/null; then PRESENT+=("$p"); fi; done
# Guard: a pathspec made only of excludes would match the whole tree, world content included.
if [ ${#PRESENT[@]} -eq 0 ]; then echo "No template-owned paths in $SRC ($BRANCH); nothing to sync." >&2; exit 1; fi
git checkout FETCH_HEAD -- "${PRESENT[@]}" "${EXCLUDES[@]}"
echo "Template files updated from $SRC ($BRANCH). Review, then commit:"
git status --short -- "${OWNED[@]}"
