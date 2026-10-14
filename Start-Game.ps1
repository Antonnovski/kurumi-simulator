param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$stateDir = Join-Path $gameRoot '.local'
$stateFile = Join-Path $stateDir 'server.json'
$gameServer = Join-Path $gameRoot 'server.js'

function Write-Status([string]$Message) {
    Write-Host $Message
    Add-Content -LiteralPath (Join-Path $stateDir 'startup.log') -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+' '+$Message) -Encoding UTF8
}
function Open-GameWindow([string]$GameUrl) {
    Write-Status ('游戏地址：'+$GameUrl)
    Set-Content -LiteralPath (Join-Path $stateDir 'game.url') -Value ("[InternetShortcut]`r`nURL=$GameUrl") -Encoding ASCII
    if ($NoBrowser) { return }
    foreach ($exe in @('msedge.exe','chrome.exe')) {
        foreach ($registryRoot in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths','HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths')) {
            $entry = Get-ItemProperty -LiteralPath (Join-Path $registryRoot $exe) -ErrorAction SilentlyContinue
            if (!$entry) { continue }
            $browserPath = $entry.'(default)'
            if (!$browserPath -or !(Test-Path -LiteralPath $browserPath)) { continue }
            try {
                Write-Status ('正在打开独立游戏窗口（'+$exe+'）……')
                Start-Process -FilePath $browserPath -ArgumentList @("--app=$GameUrl",'--new-window') | Out-Null
                return
            } catch { Write-Status ('此浏览器启动失败：'+$_.Exception.Message) }
        }
    }
    try { Start-Process -FilePath $GameUrl; Write-Status '已交给默认浏览器；若没有出现窗口，请复制上面的游戏地址到浏览器。' }
    catch { Write-Status '浏览器未能自动打开。本地服务已启动，请手动打开上面的游戏地址。' }
}

try {
    if (!(Test-Path -LiteralPath $gameServer) -or !(Test-Path -LiteralPath (Join-Path $gameRoot 'dist/index.html'))) {
        throw '文件不完整。请先解压整个便携包，再运行解压目录中的Start-Game.cmd。'
    }
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    Write-Status 'YEN FX LAB：正在启动，请稍候……'
    $nodePath = Join-Path $gameRoot 'runtime/node.exe'
    if (!(Test-Path -LiteralPath $nodePath)) {
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if (!$nodeCommand) { throw '未找到运行环境。请使用完整便携包，或安装Node.js 22及以上版本。' }
        $nodePath = $nodeCommand.Source
    }
    for ($gamePort = 4173; $gamePort -le 4193; $gamePort++) {
        $gameUrl = "http://127.0.0.1:$gamePort"
        $health = $null
        try { $health = Invoke-RestMethod "$gameUrl/_local/health" -TimeoutSec 1 } catch { }
        if ($health) {
            if ($health.app -eq 'yen-fx-lab' -and [IO.Path]::GetFullPath($health.root) -eq (Join-Path $gameRoot 'dist')) {
                @{pid=$health.pid;port=$gamePort;server=$gameServer} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
                Write-Status '本目录游戏服务已运行，正在重新打开窗口。'
                Open-GameWindow $gameUrl
                exit 0
            }
            continue
        }
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$gamePort)
        try { $listener.Start(); $listener.Stop() } catch { $listener.Stop(); continue }
        Write-Status ('启动本地服务，端口 '+$gamePort+'……')
        $arguments = '"'+$gameServer+'" --port '+$gamePort
        $gameProcess = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $stateDir 'server.log') -RedirectStandardError (Join-Path $stateDir 'server-error.log')
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            $health = $null
            try { $health = Invoke-RestMethod "$gameUrl/_local/health" -TimeoutSec 1 } catch { }
            if ($health -and $health.app -eq 'yen-fx-lab' -and $health.pid -eq $gameProcess.Id) {
                @{pid=$gameProcess.Id;port=$gamePort;server=$gameServer} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
                Write-Status '本地服务启动成功。'
                Open-GameWindow $gameUrl
                exit 0
            }
            if ($gameProcess.HasExited) { break }
            Start-Sleep -Milliseconds 100
        }
        if (!$gameProcess.HasExited) { Stop-Process -Id $gameProcess.Id }
        throw '本地服务启动失败，请查看.local/server-error.log。'
    }
    throw '4173–4193端口均被占用，请关闭其他本地游戏服务后重试。'
} catch {
    Write-Host ('启动失败：'+$_.Exception.Message) -ForegroundColor Red
    if (Test-Path -LiteralPath $stateDir) { Add-Content -LiteralPath (Join-Path $stateDir 'startup.log') -Value $_.Exception.Message -Encoding UTF8 }
    exit 1
}
