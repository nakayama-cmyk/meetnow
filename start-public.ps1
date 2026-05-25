$env:PATH = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:PATH"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# GitHub PAT を .gh-token ファイルから読み込む（セキュリティのためgitignore対象）
$tokenFile = "$root\.gh-token"
if (Test-Path $tokenFile) {
  $GH_TOKEN = (Get-Content $tokenFile -Raw).Trim()
} elseif ($env:GH_TOKEN) {
  $GH_TOKEN = $env:GH_TOKEN
} else {
  Write-Host "警告: .gh-token ファイルが見つかりません。config.json の更新をスキップします。" -ForegroundColor Yellow
  $GH_TOKEN = $null
}
$env:GH_TOKEN = $GH_TOKEN

Write-Host "=== MeetNow 公開サーバー起動 ===" -ForegroundColor Cyan

# 1. LiveKit サーバー起動
$lkExe = "$root\livekit-bin\livekit-server.exe"
if (Test-Path $lkExe) {
  $existing = Get-Process livekit-server -ErrorAction SilentlyContinue
  if (-not $existing) {
    Start-Process $lkExe --dev -WindowStyle Minimized
    Write-Host "[1/5] LiveKit サーバー起動中..." -ForegroundColor Green
    Start-Sleep -Seconds 3
  } else {
    Write-Host "[1/5] LiveKit サーバーはすでに起動中" -ForegroundColor Yellow
  }
} else {
  Write-Host "[1/5] LiveKit が見つかりません: $lkExe" -ForegroundColor Red
}

# 2. ローカル API サーバー起動
$serverPath = "$root\server"
$nodeProc = Get-Process node -ErrorAction SilentlyContinue
if (-not $nodeProc) {
  Start-Process -FilePath "node" -ArgumentList "$serverPath\index.js" `
    -WorkingDirectory $serverPath -WindowStyle Minimized
  Write-Host "[2/5] APIサーバー起動中 (port 3001)..." -ForegroundColor Green
  Start-Sleep -Seconds 2
} else {
  Write-Host "[2/5] APIサーバーはすでに起動中" -ForegroundColor Yellow
}

# 3. localhost.run トンネル起動 (LiveKit port 7880)
Write-Host "[3/5] localhost.run トンネル接続中..." -ForegroundColor Green
$sshOut = "$env:TEMP\lhr_tunnel.txt"
if (Test-Path $sshOut) { Remove-Item $sshOut -Force }

# 既存のSSHトンネルを終了
Get-Process ssh -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Start-Process -FilePath "powershell.exe" -WindowStyle Minimized `
  -ArgumentList "-NoProfile -Command `"ssh -o StrictHostKeyChecking=no -R 80:localhost:7880 nokey@localhost.run 2>&1 | Tee-Object -FilePath '$sshOut'; while(`$true){Start-Sleep 60}`""

# URLが出るまで最大40秒待つ
$lhrHttpUrl = $null
Write-Host "    URLを取得中..." -NoNewline -ForegroundColor Gray
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 1
  Write-Host "." -NoNewline -ForegroundColor Gray
  if (Test-Path $sshOut) {
    $line = Get-Content $sshOut -ErrorAction SilentlyContinue | Select-String "lhr.life" | Select-Object -Last 1
    if ($line) {
      $match = [regex]::Match($line.ToString(), 'https://[^\s]+lhr\.life')
      if ($match.Success) {
        $lhrHttpUrl = $match.Value
        break
      }
    }
  }
}
Write-Host ""

if (-not $lhrHttpUrl) {
  Write-Host "    [エラー] トンネルURLの取得に失敗しました。" -ForegroundColor Red
  pause
  exit 1
}

$lhrWssUrl = $lhrHttpUrl -replace "^https://", "wss://"
Write-Host "    トンネルURL: $lhrWssUrl" -ForegroundColor Cyan

# 4. GitHub の config.json を更新（ビルド不要・即時反映）
Write-Host "[4/5] サーバーURLを config.json に保存中..." -ForegroundColor Green

# 現在の SHA を取得
$headers = @{
  "Authorization" = "token $GH_TOKEN"
  "Accept" = "application/vnd.github+json"
  "Content-Type" = "application/json"
}
try {
  $current = Invoke-RestMethod `
    -Uri "https://api.github.com/repos/nakayama-cmyk/meetnow/contents/config.json" `
    -Headers $headers
  $sha = $current.sha
} catch { $sha = $null }

$jsonContent = "{`"wsUrl`":`"$lhrWssUrl`"}"
$contentB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($jsonContent))

$putBody = @{ message = "update server URL to $lhrWssUrl"; content = $contentB64 }
if ($sha) { $putBody.sha = $sha }

try {
  Invoke-RestMethod `
    -Uri "https://api.github.com/repos/nakayama-cmyk/meetnow/contents/config.json" `
    -Method PUT -Headers $headers -Body ($putBody | ConvertTo-Json) | Out-Null
  Write-Host "    config.json 更新完了 → $lhrWssUrl" -ForegroundColor Green
} catch {
  Write-Host "    config.json 更新失敗: $_" -ForegroundColor Red
}

# 5. 完了（ビルド不要）
Write-Host "[5/5] 準備完了！" -ForegroundColor Green

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  起動完了！" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  公開URL:" -ForegroundColor White
Write-Host "  https://nakayama-cmyk.github.io/meetnow/" -ForegroundColor Green
Write-Host ""
Write-Host "  このURLを参加者に共有してください。" -ForegroundColor White
Write-Host "  このウィンドウを閉じると接続が切れます。" -ForegroundColor Gray
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
pause
