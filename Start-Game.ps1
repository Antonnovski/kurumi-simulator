param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$stateDir = Join-Path $gameRoot '.local'
$stateFile = Join-Path $stateDir 'server.json'
$gameServer = Join-Path $gameRoot 'server.js'
$nodePath = Join-Path $gameRoot 'runtime/node.exe'
if (!(Test-Path -LiteralPath $nodePath)) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (!$nodeCommand) { throw '请使用含 runtime 的便携包，或安装 Node.js 22 及以上版本。' }
    $nodePath = $nodeCommand.Source
}
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
for ($gamePort = 4173; $gamePort -le 4193; $gamePort++) {
    $gameUrl = "http://127.0.0.1:$gamePort"
    try {
        $health = Invoke-RestMethod "$gameUrl/_local/health" -TimeoutSec 1
        if ($health.app -eq 'yen-fx-lab' -and [IO.Path]::GetFullPath($health.root) -eq (Join-Path $gameRoot 'dist')) {
            @{pid=$health.pid;port=$gamePort;server=$gameServer} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
            if (!$NoBrowser) { Start-Process $gameUrl }
            Write-Output "游戏已运行：$gameUrl"
            exit 0
        }
        continue
    } catch { }
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$gamePort)
    try { $listener.Start(); $listener.Stop() } catch { $listener.Stop(); continue }
    $gameProcess = Start-Process -FilePath $nodePath -ArgumentList @('"'+$gameServer+'"','--port',"$gamePort") -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $stateDir 'server.log') -RedirectStandardError (Join-Path $stateDir 'server-error.log')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-RestMethod "$gameUrl/_local/health" -TimeoutSec 1
            if ($health.app -eq 'yen-fx-lab' -and $health.pid -eq $gameProcess.Id) {
                @{pid=$gameProcess.Id;port=$gamePort;server=$gameServer} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
                if (!$NoBrowser) { Start-Process $gameUrl }
                Write-Output "游戏已启动：$gameUrl"
                exit 0
            }
        } catch { }
        if ($gameProcess.HasExited) { break }
        Start-Sleep -Milliseconds 100
    }
    if (!$gameProcess.HasExited) { Stop-Process -Id $gameProcess.Id }
    throw '本地服务启动失败，请查看 .local/server-error.log。'
}
throw '4173–4193端口均被占用，请关闭其他本地游戏服务后重试。'
