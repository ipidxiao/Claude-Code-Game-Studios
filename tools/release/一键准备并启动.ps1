# CoC Engine 手机测试：一键准备并启动（Windows）
# 做的事：检查 / 安装 Node.js → 结束占用 8080/8081/8443 的旧 python / node 窗口 →
# 放行防火墙 8081、8443 端口 → 启动联机服务程序 → 打开连接自检页。
$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    # 防火墙规则与安装 Node.js 需要管理员权限：以管理员身份重新运行本脚本。
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}
$root = Split-Path -Parent $PSCommandPath
function Pause-Exit($code) { Read-Host '按回车键关闭'; exit $code }

Write-Host '1/5 检查 Node.js（需要 20 或更高版本）'
$ok = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $v = (& node -v).Trim().TrimStart('v')
    $ok = ([version]$v -ge [version]'20.0.0')
    Write-Host "    已安装 Node.js $v"
}
if (-not $ok) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host '    正在用 winget 安装 Node.js LTS（需要联网，约 1–3 分钟）…'
        winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
        $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host '    没能自动安装 Node.js：请在打开的网页下载 LTS 版安装，装完再双击本脚本。' -ForegroundColor Yellow
        Start-Process 'https://nodejs.org'
        Pause-Exit 1
    }
}

Write-Host '2/5 检查端口 8080 / 8081 / 8443'
foreach ($port in 8080, 8081, 8443) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if (-not $proc) { continue }
        if ($proc.ProcessName -match '^(python|pythonw|py|node)$') {
            Write-Host "    结束占用端口 $port 的 $($proc.ProcessName)（PID $($proc.Id)，多半是以前的 python -m http.server 或旧的服务程序）"
            Stop-Process -Id $proc.Id -Force
        } else {
            Write-Host "    端口 $port 被 $($proc.ProcessName)（PID $($proc.Id)）占用，不是本游戏的程序，没有动它。请先关掉它再运行本脚本。" -ForegroundColor Yellow
            Pause-Exit 1
        }
    }
}

Write-Host '3/5 放行防火墙（玩家用的 8081、8443 端口；专用与公用网络）'
Remove-NetFirewallRule -DisplayName 'CoC Engine relay' -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'CoC Engine relay' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081, 8443 -Profile Private, Public | Out-Null
Write-Host '    已添加规则 "CoC Engine relay"（测完可在"高级安全 Windows Defender 防火墙"里删除）'

Write-Host '4/5 检查 https 档所需的 openssl'
$ssl = (Get-Command openssl -ErrorAction SilentlyContinue) -or (Test-Path 'C:\Program Files\Git\usr\bin\openssl.exe') -or (Test-Path 'C:\Program Files (x86)\Git\usr\bin\openssl.exe')
if ($ssl) { Write-Host '    找到 openssl：会开启 https（B 档）' } else { Write-Host '    没有 openssl：只开 http 档（C 档），测试照样能做。想测 https 档就装 Git for Windows。' -ForegroundColor Yellow }

Write-Host '5/5 启动服务程序并打开连接自检页'
Start-Process cmd -ArgumentList '/k', "chcp 65001 >nul & cd /d `"$root\server`" & node relay.mjs" -WorkingDirectory "$root\server"
Start-Sleep -Seconds 3
Start-Process 'http://localhost:8080/__relay/selftest'
Write-Host ''
Write-Host '准备完成：在打开的网页里点"开房间"，把手机链接发到手机上（见《手机测试说明.md》第三步起）。' -ForegroundColor Green
Write-Host '服务程序在另一个黑色窗口里运行，测试期间不要关它。'
Pause-Exit 0
