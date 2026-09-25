#!/usr/bin/env bash
# Downloads the latest release of every plugin/theme in plugins.txt into .obsidian/.
# Never touches data.json (plugin settings). Run from anywhere; commit the result.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LIST="$ROOT/_System/tools/plugins.txt"

fetch() { # url dest required(1|0)
  if curl -fsSL "$1" -o "$2.tmp" 2>/dev/null; then mv "$2.tmp" "$2"
  else rm -f "$2.tmp"; [ "$3" = 1 ] && { echo "FAILED: $1" >&2; return 1; }; fi
  return 0
}

grep -v '^\s*#' "$LIST" | grep -v '^\s*$' | while read -r a b c; do
  if [ "$a" = "theme" ]; then
    dest="$ROOT/.obsidian/themes/$b"; mkdir -p "$dest"
    base="https://github.com/$c/releases/latest/download"
    fetch "$base/manifest.json" "$dest/manifest.json" 1
    fetch "$base/theme.css" "$dest/theme.css" 1
    echo "theme  $b  $(grep -o '"version": *"[^"]*"' "$dest/manifest.json")"
  else
    dest="$ROOT/.obsidian/plugins/$a"; mkdir -p "$dest"
    base="https://github.com/$b/releases/latest/download"
    fetch "$base/main.js" "$dest/main.js" 1
    fetch "$base/manifest.json" "$dest/manifest.json" 1
    fetch "$base/styles.css" "$dest/styles.css" 0
    echo "plugin $a  $(grep -o '"version": *"[^"]*"' "$dest/manifest.json")"
  fi
done
