#!/bin/sh
cd "$(dirname "$0")/server" || exit 1
if ! command -v node >/dev/null 2>&1; then echo "未找到 Node.js：请先安装 https://nodejs.org （LTS 版）"; read -r _; exit 1; fi
node relay.mjs
