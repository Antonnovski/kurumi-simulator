$ErrorActionPreference = 'Stop'
$stateFile = Join-Path $PSScriptRoot '.local/server.json'
if (!(Test-Path -LiteralPath $stateFile)) { Write-Output '没有本地游戏服务记录。'; exit 0 }
$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$serverPath = Join-Path $PSScriptRoot 'server.js'
if ($state.server -ne $serverPath) { throw '服务记录不属于此程序目录，已停止操作。' }
$gameProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($state.pid)" -ErrorAction SilentlyContinue
if ($gameProcess -and $gameProcess.Name -eq 'node.exe' -and $gameProcess.CommandLine.Contains($serverPath)) {
    Stop-Process -Id $state.pid
    Write-Output '本地游戏服务已关闭，浏览器存档保留。'
} else { Write-Output '原本地服务已退出。' }
Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
