#!/usr/bin/env bash
set -euo pipefail
SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/sync-template.sh"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
git -c init.defaultBranch=main init -q "$T/tpl"; cd "$T/tpl"
mkdir -p _System .obsidian/plugins/quickadd .obsidian/plugins/calendarium World/People
echo v1 > _System/lib.js; echo '{"q":1}' > .obsidian/plugins/quickadd/data.json; echo '{"cal":"tpl"}' > .obsidian/plugins/calendarium/data.json
echo tpl-world > World/People/X.md; echo rules1 > CLAUDE.md
git add -A && git -c user.email=t@t -c user.name=t commit -qm init
git clone -q "$T/tpl" "$T/game"; cd "$T/game"
echo '{"cal":"mine"}' > .obsidian/plugins/calendarium/data.json; echo my-world > World/People/X.md
git -c user.email=t@t -c user.name=t commit -qam "game edits"
cd "$T/tpl"; echo v2 > _System/lib.js; echo '{"q":2}' > .obsidian/plugins/quickadd/data.json; echo '{"cal":"tpl2"}' > .obsidian/plugins/calendarium/data.json; echo rules2 > CLAUDE.md
git -c user.email=t@t -c user.name=t commit -qam v2
cd "$T/game"
"$SCRIPT" "$T/tpl" main >/dev/null
[ "$(cat _System/lib.js)" = v2 ] || { echo "FAIL lib not updated"; exit 1; }
[ "$(cat CLAUDE.md)" = rules2 ] || { echo "FAIL CLAUDE.md not updated"; exit 1; }
grep -q '"q":2' .obsidian/plugins/quickadd/data.json || { echo "FAIL quickadd settings not updated"; exit 1; }
grep -q mine .obsidian/plugins/calendarium/data.json || { echo "FAIL calendarium data overwritten"; exit 1; }
[ "$(cat World/People/X.md)" = my-world ] || { echo "FAIL world content touched"; exit 1; }
git -c user.email=t@t -c user.name=t commit -qam sync
echo dirty >> _System/lib.js
if "$SCRIPT" "$T/tpl" main >/dev/null 2>&1; then echo "FAIL should refuse dirty tree"; exit 1; fi
echo PASS
