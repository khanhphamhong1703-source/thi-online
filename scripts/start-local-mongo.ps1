$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$mongoDir = Join-Path $root '.local\mongodb'
$dataDir = Join-Path $mongoDir 'data'
$logPath = Join-Path $mongoDir 'mongod.log'
$configPath = Join-Path $mongoDir 'mongod.cfg'
$port = if ($env:LOCAL_MONGO_PORT) { [int]$env:LOCAL_MONGO_PORT } else { 27018 }

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
  Write-Host "Cổng $port đã có tiến trình lắng nghe. Bỏ qua khởi động MongoDB."
} else {
  $mongod = Get-ChildItem 'C:\Program Files\MongoDB\Server\*\bin\mongod.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1

  if (-not $mongod) {
    throw 'Không tìm thấy mongod.exe. Hãy cài MongoDB Community Server hoặc dùng Docker Compose.'
  }

  $config = @"
storage:
  dbPath: $($dataDir.Replace('\', '/'))
systemLog:
  destination: file
  logAppend: true
  path: $($logPath.Replace('\', '/'))
net:
  port: $port
  bindIp: 127.0.0.1
replication:
  replSetName: rs0
"@

  Set-Content -Path $configPath -Value $config -Encoding UTF8
  Start-Process -FilePath $mongod.FullName -ArgumentList '--config', $configPath -WindowStyle Hidden
  Start-Sleep -Seconds 4
  Write-Host "Đã khởi động MongoDB tại cổng $port."
}

$env:LOCAL_MONGO_PORT = $port
node (Join-Path $PSScriptRoot 'init-local-mongo.js')
