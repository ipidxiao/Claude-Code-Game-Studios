# CoC Engine 手机测试：一键准备并启动（Windows）
# 做的事：检查 / 安装 Node.js → 结束占用 8080/8081/8443 的旧 python / node 窗口 →
# 放行防火墙 8081、8443 端口 → 检查 / 安装 OpenSSL（https 档）→ 检查 Tailscale（可选，不安装）→
# 启动联机服务程序 → 打开连接自检页。
$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    # 防火墙规则与安装 Node.js 需要管理员权限：以管理员身份重新运行本脚本。
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}
$root = Split-Path -Parent $PSCommandPath
function Pause-Exit($code) { Read-Host '按回车键关闭'; exit $code }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
# Native-command output, stderr dropped; never throws (Windows PowerShell turns stderr into an error under 'Stop').
function Run-Quiet($exe, [string[]]$argv) {
    try { $ErrorActionPreference = 'Continue'; (& $exe @argv 2>$null) } catch { $null }
}
function Winget-Install($id, $what) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { return $false }
    Write-Host "    正在用 winget 安装 $what（需要联网）…"
    Run-Quiet 'winget' @('install', '--id', $id, '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements') | Out-Host
    Refresh-Path
    return $true
}

Write-Host '1/6 检查 Node.js（需要 20 或更高版本）'
$ok = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $v = (& node -v).Trim().TrimStart('v')
    $ok = ([version]$v -ge [version]'20.0.0')
    Write-Host "    已安装 Node.js $v"
}
if (-not $ok) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Winget-Install 'OpenJS.NodeJS.LTS' 'Node.js LTS（约 1–3 分钟）' | Out-Null
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host '    没能自动安装 Node.js：请在打开的网页下载 LTS 版安装，装完再双击本脚本。' -ForegroundColor Yellow
        Start-Process 'https://nodejs.org'
        Pause-Exit 1
    }
}

Write-Host '2/6 检查端口 8080 / 8081 / 8443'
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

Write-Host '3/6 放行防火墙（玩家用的 8081、8443 端口；所有网络类型，含 Tailscale 与公司域网络）'
Remove-NetFirewallRule -DisplayName 'CoC Engine relay' -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'CoC Engine relay' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081, 8443 -Profile Any | Out-Null
Write-Host '    已添加规则 "CoC Engine relay"（测完可在"高级安全 Windows Defender 防火墙"里删除）'
foreach ($p in Get-NetConnectionProfile -ErrorAction SilentlyContinue) { Write-Host "    网络 $($p.InterfaceAlias)：$($p.NetworkCategory)" }

Write-Host '4/6 检查 https 档所需的 OpenSSL'
# Same places the relay looks (server/lib/certs.mjs OPENSSL_CANDIDATES).
$sslPaths = 'C:\Program Files\OpenSSL-Win64\bin\openssl.exe', 'C:\Program Files\OpenSSL\bin\openssl.exe',
    'C:\Program Files\Git\usr\bin\openssl.exe', 'C:\Program Files (x86)\Git\usr\bin\openssl.exe'
function Has-OpenSSL { (Get-Command openssl -ErrorAction SilentlyContinue) -or ($sslPaths | Where-Object { Test-Path $_ }) }
if (-not (Has-OpenSSL)) { Winget-Install 'ShiningLight.OpenSSL.Light' 'OpenSSL' | Out-Null }
if (Has-OpenSSL) { Write-Host '    找到 OpenSSL：会开启 https（B 档，端口 8443）' }
else { Write-Host '    没能安装 OpenSSL：只开 http 档（C 档），测试照样能做。' -ForegroundColor Yellow }

Write-Host '5/6 检查 Tailscale（可选，不自动安装）'
$tsExe = 'C:\Program Files\Tailscale\tailscale.exe'
if (Test-Path $tsExe) {
    $tsIp = (Run-Quiet $tsExe @('ip', '-4') | Select-Object -First 1)
    if ($tsIp) { Write-Host "    Tailscale 已登录，本机地址 $tsIp（自检页会列出 Tailscale 链接）" } else { Write-Host '    Tailscale 已安装但未登录：只用局域网即可。' }
} else { Write-Host '    未安装 Tailscale：只用局域网（同一 Wi-Fi / 热点）即可。' }

Write-Host '6/6 启动服务程序并打开连接自检页'
Start-Process cmd -ArgumentList '/k', "chcp 65001 >nul & cd /d `"$root\server`" & node relay.mjs" -WorkingDirectory "$root\server"
Start-Sleep -Seconds 3
Start-Process 'http://localhost:8080/__relay/selftest'
Write-Host ''
Write-Host '准备完成：在打开的网页里点"开房间"，把手机链接发到手机上（见《手机测试说明.md》第三步起）。' -ForegroundColor Green
Write-Host '服务程序在另一个黑色窗口里运行，测试期间不要关它。'
Pause-Exit 0
