@echo off
chcp 65001 >nul
cd /d "%~dp0server"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js：请先安装 https://nodejs.org （LTS 版），再双击本文件。
  pause
  exit /b 1
)
node relay.mjs
pause
