#!/bin/sh
# Build the release zip: the game at the root (as in earlier releases), the relay in server/,
# plus the phone test guide and start scripts from tools/release/.
# Usage: tools/release/package.sh <release-name> <output-dir>
# The commit is appended to the name, so two builds can never share one file name, and
# 版本信息.txt at the package root says which build a folder came from.
set -eu
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
COMMIT="$(git -C "$REPO" rev-parse --short HEAD)"
if [ -n "$(git -C "$REPO" status --porcelain -- src server tools/release)" ]; then COMMIT="$COMMIT-dirty"; fi
NAME="$1_$COMMIT"; OUT="$2"
STAGE="$(mktemp -d)/$NAME"
mkdir -p "$STAGE"
(cd "$REPO/src" && tar cf - --exclude=node_modules --exclude=test-results --exclude=playwright-report --exclude=./CLAUDE.md .) | (cd "$STAGE" && tar xf -)
mkdir -p "$STAGE/server"
(cd "$REPO/server" && tar cf - --exclude=data --exclude=.cert .) | (cd "$STAGE/server" && tar xf -)
cp "$REPO/tools/release/手机测试说明.md" "$REPO/tools/release/启动联机服务.bat" "$REPO/tools/release/启动联机服务.command" \
   "$REPO/tools/release/一键准备并启动.bat" "$REPO/tools/release/一键准备并启动.ps1" "$STAGE/"
printf '发布包：%s\r\n提交：%s\r\n打包时间：%s\r\n' "$NAME" "$COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STAGE/版本信息.txt"
mkdir -p "$OUT"
# Python's zipfile marks non-ASCII names as UTF-8, so Windows Explorer shows the Chinese file names.
rm -f "$OUT/$NAME.zip"
python3 - "$(dirname "$STAGE")" "$NAME" "$OUT/$NAME.zip" <<'PY'
import os, sys, zipfile
base, name, out = sys.argv[1:4]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(os.path.join(base, name)):
        dirs.sort()
        for f in sorted(files):
            full = os.path.join(root, f)
            info = zipfile.ZipInfo.from_file(full, os.path.relpath(full, base))
            info.compress_type = zipfile.ZIP_DEFLATED
            if os.access(full, os.X_OK): info.external_attr = (0o755 << 16)
            with open(full, 'rb') as fh: z.writestr(info, fh.read())
PY
(cd "$OUT" && sha256sum "$NAME.zip" > "$NAME.zip.sha256")
rm -rf "$(dirname "$STAGE")"
echo "$OUT/$NAME.zip"
