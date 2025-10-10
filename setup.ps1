<#
.SYNOPSIS
  yt-buzz-ext（Chrome 拡張）のセットアップ支援スクリプト（Windows/PowerShell）。

.DESCRIPTION
  - 依存なし（Chrome拡張は通常ビルド不要）
  - オプションでアイコン生成（ImageMagick or Inkscape 必要）
  - manifest.json の oauth2.client_id を設定
  - マニフェスト/ファイル構成の軽い検証
  - オプションで zip パッケージを作成

.PARAMETER GenerateIcons
  assets/logo.svg から public/icons/icon{16,32,48,128}.png を生成します。

.PARAMETER ClientId
  manifest.json の oauth2.client_id を上書き設定します（バックアップ: manifest.json.bak）。

.PARAMETER Zip
  拡張ファイルを dist/yt-buzz-ext.zip に固めます。

.PARAMETER Output
  Zip 出力パスを指定します（デフォルト: dist/yt-buzz-ext.zip）。

.EXAMPLE
  pwsh -ExecutionPolicy Bypass -File .\setup.ps1 -GenerateIcons -ClientId "xxxx.apps.googleusercontent.com" -Zip
#>

[CmdletBinding()] param(
  [switch]$GenerateIcons,
  [string]$ClientId,
  [switch]$Zip,
  [string]$Output = "dist/yt-buzz-ext.zip"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]   $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err($m){ Write-Host "[ERR]  $m" -ForegroundColor Red }

try {
  $Root = $PSScriptRoot
  Set-Location $Root
  Info "Repo: $Root"

  if ($GenerateIcons) {
    $svg = Join-Path $Root 'assets/logo.svg'
    if (-not (Test-Path $svg)) { throw "assets/logo.svg が見つかりません。" }
    $gen = Join-Path $Root 'scripts/generate-icons.ps1'
    if (-not (Test-Path $gen)) { throw "scripts/generate-icons.ps1 が見つかりません。" }
    Info "アイコン生成を実行します…"
    pwsh -NoProfile -ExecutionPolicy Bypass -File $gen -SourceSvg $svg
    if ($LASTEXITCODE -ne 0) { Warn "アイコン生成に失敗しました。ImageMagick または Inkscape をインストールしてください。" }
  }

  $manifestPath = Join-Path $Root 'manifest.json'
  if (-not (Test-Path $manifestPath)) { throw "manifest.json が見つかりません。" }

  $backupMade = $false
  if ($ClientId) {
    Info "manifest.json の oauth2.client_id を更新します…"
    Copy-Item $manifestPath "$manifestPath.bak" -Force
    $backupMade = $true
    $json = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if (-not $json.oauth2) { $json | Add-Member -NotePropertyName oauth2 -NotePropertyValue (@{}) }
    $json.oauth2.client_id = $ClientId
    ($json | ConvertTo-Json -Depth 16) | Out-File -Encoding UTF8 -FilePath $manifestPath
    Ok "client_id を設定しました。"
  }

  # 軽い検証
  Info "manifest.json を検証します…"
  $m = Get-Content $manifestPath -Raw | ConvertFrom-Json
  if ($m.manifest_version -ne 3) { throw "manifest_version は 3 である必要があります。" }
  if (-not $m.background.service_worker) { throw "background.service_worker が未設定です。" }
  if (-not ($m.permissions -contains 'identity')) { Warn "permissions に identity がありません。" }
  if (-not ($m.permissions -contains 'storage')) { Warn "permissions に storage がありません。" }
  if (-not ($m.permissions -contains 'alarms')) { Warn "permissions に alarms がありません。" }
  if (-not $m.oauth2.client_id) { Warn "oauth2.client_id が未設定です。拡張の OAuth が失敗します。" }
  Ok "manifest.json の基本チェック OK"

  # アイコン存在チェック
  $iconsDir = Join-Path $Root 'public/icons'
  $missing = @()
  foreach ($s in @(16,32,48,128)) {
    if (-not (Test-Path (Join-Path $iconsDir "icon$s.png"))) { $missing += $s }
  }
  if ($missing.Count -gt 0) {
    Warn ("アイコンが不足しています: " + ($missing -join ', ') + "（-GenerateIcons の利用を検討してください）")
  } else {
    Ok "アイコンファイル確認 OK"
  }

  # 必須フォルダ存在
  foreach ($p in @('src','public','_locales')) { if (-not (Test-Path (Join-Path $Root $p))) { throw "$p フォルダが見つかりません。" } }
  Ok "フォルダ構成 OK"

  # Zip
  if ($Zip) {
    $distDir = Split-Path -Parent $Output
    if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Force -Path $distDir | Out-Null }
    $temp = Join-Path $Root ".ext-pack-tmp"
    if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
    New-Item -ItemType Directory -Force -Path $temp | Out-Null
    Copy-Item $manifestPath $temp
    Copy-Item (Join-Path $Root 'src') $temp -Recurse
    Copy-Item (Join-Path $Root 'public') $temp -Recurse
    Copy-Item (Join-Path $Root '_locales') $temp -Recurse
    if (Test-Path (Join-Path $Root 'LICENSE')) { Copy-Item (Join-Path $Root 'LICENSE') $temp }
    if (Test-Path $Output) { Remove-Item $Output -Force }
    Compress-Archive -Path (Join-Path $temp '*') -DestinationPath $Output -Force
    Remove-Item -Recurse -Force $temp
    Ok "Zip 作成: $Output"
  }

  Write-Host
  Ok "セットアップ処理が完了しました。"
  Write-Host "Chrome への読み込み: chrome://extensions → デベロッパーモード → パッケージ化されていない拡張機能を読み込む → このフォルダ" -ForegroundColor Cyan
  if ($backupMade) { Write-Host "manifest.json のバックアップ: manifest.json.bak" -ForegroundColor DarkGray }

  exit 0
}
catch {
  Err $_
  exit 1
}
