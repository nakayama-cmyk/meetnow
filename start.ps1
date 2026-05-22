# MeetNow 起動スクリプト
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$root = $PSScriptRoot

Write-Host "=== MeetNow 起動 ===" -ForegroundColor Cyan

# 1. LiveKit サーバー
Write-Host "[1/3] LiveKit サーバーを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'LiveKit サーバー起動中...' -ForegroundColor Cyan; & '$root\livekit-bin\livekit-server.exe' --config '$root\livekit.yaml'; Read-Host" -WindowStyle Normal

Start-Sleep 2

# 2. バックエンド
Write-Host "[2/3] バックエンドサーバーを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Write-Host 'バックエンド起動中...' -ForegroundColor Cyan; cd '$root\server'; node index.js" -WindowStyle Normal

Start-Sleep 2

# 3. フロントエンド
Write-Host "[3/3] フロントエンドを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Write-Host 'フロントエンド起動中...' -ForegroundColor Cyan; cd '$root\client'; npm run dev" -WindowStyle Normal

Start-Sleep 4

Write-Host ""
Write-Host "=== 起動完了 ===" -ForegroundColor Green
Write-Host "ブラウザで開く: http://localhost:5173" -ForegroundColor White
Start-Process "http://localhost:5173"
