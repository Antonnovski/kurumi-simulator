param([Parameter(Mandatory=$true)][string]$NodePath,[Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$outputRoot = [IO.Path]::GetFullPath($Destination)
$packageRoot = Join-Path $outputRoot '久留美模拟器'
if (Test-Path -LiteralPath $packageRoot) { throw '目标包目录已存在，请使用一个新的输出目录。' }
New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
Get-ChildItem -LiteralPath $projectRoot -Force | Where-Object { $_.Name -notin @('.git','.openai','.local','node_modules','runtime') } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse
}
$runtime = Join-Path $packageRoot 'runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
Copy-Item -LiteralPath $NodePath -Destination (Join-Path $runtime 'node.exe')
$nodeVersion = (& $NodePath --version).Trim()
Invoke-WebRequest "https://raw.githubusercontent.com/nodejs/node/$nodeVersion/LICENSE" -UseBasicParsing -OutFile (Join-Path $runtime 'LICENSE.node')
$archive = Join-Path $outputRoot '久留美模拟器-v0.14.0-Windows-x64.zip'
Compress-Archive -LiteralPath $packageRoot -DestinationPath $archive -CompressionLevel Optimal
Write-Output $archive
