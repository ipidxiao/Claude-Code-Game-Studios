#!/bin/sh
# Build the release zip: the game at the root (as in earlier releases), the relay in server/,
# plus the phone test guide and start scripts from tools/release/.
# Usage: tools/release/package.sh <release-name> <output-dir>
set -eu
NAME="$1"; OUT="$2"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="$(mktemp -d)/$NAME"
mkdir -p "$STAGE"
(cd "$REPO/src" && tar cf - --exclude=node_modules --exclude=test-results --exclude=playwright-report --exclude=./CLAUDE.md .) | (cd "$STAGE" && tar xf -)
mkdir -p "$STAGE/server"
(cd "$REPO/server" && tar cf - --exclude=data --exclude=.cert .) | (cd "$STAGE/server" && tar xf -)
cp "$REPO/tools/release/手机测试说明.md" "$REPO/tools/release/启动联机服务.bat" "$REPO/tools/release/启动联机服务.command" "$STAGE/"
mkdir -p "$OUT"
(cd "$(dirname "$STAGE")" && rm -f "$OUT/$NAME.zip" && zip -qr -X "$OUT/$NAME.zip" "$NAME")
(cd "$OUT" && sha256sum "$NAME.zip" > "$NAME.zip.sha256")
rm -rf "$(dirname "$STAGE")"
echo "$OUT/$NAME.zip"
