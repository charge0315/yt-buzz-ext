param(
  [string]$SourceSvg = "logo.svg"
)

# Requires: PowerShell 7+, ImageMagick (magick) or Inkscape
# Usage:
#   pwsh -File scripts/generate-icons.ps1 -SourceSvg assets/logo.svg

$ErrorActionPreference = 'Stop'

function Find-Tool {
  param([string]$name)
  $p = Get-Command $name -ErrorAction SilentlyContinue
  if ($p) { return $p.Path }
  return $null
}

$magick = Find-Tool 'magick'
$inkscape = Find-Tool 'inkscape'

$OutDir = [System.IO.Path]::Combine($PSScriptRoot, '..', 'public', 'icons')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Sizes = @(16,32,48,128)

if (-not (Test-Path $SourceSvg)) {
  Write-Host "Source SVG not found: $SourceSvg" -ForegroundColor Red
  exit 1
}

# 優先: ImageMagick / Inkscape。どちらも無ければ PowerShell でプレースホルダーを生成。
if ($magick -or $inkscape) {
  foreach ($s in $Sizes) {
    $out = Join-Path $OutDir "icon$s.png"
    if ($magick) {
      & $magick convert -background none $SourceSvg -resize ${s}x${s} $out
    } else {
      & $inkscape $SourceSvg --export-type=png --export-filename=$out -w $s -h $s
    }
    Write-Host "Generated: $out"
  }
} else {
  Write-Host "Neither ImageMagick nor Inkscape is available. Generating placeholder PNGs via System.Drawing..." -ForegroundColor Yellow
  Add-Type -AssemblyName System.Drawing
  foreach ($s in $Sizes) {
    $out = Join-Path $OutDir "icon$s.png"
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    # 背景色（Material ピンク系）
    $gfx.Clear([System.Drawing.Color]::FromArgb(255, 233, 30, 99))
    # 単純な余白付き枠線
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,255,255,255)), ([math]::Max(1, [math]::Round($s*0.08)))
    $margin = [math]::Round($s*0.08)
    $gfx.DrawRectangle($pen, $margin, $margin, $s - 2*$margin, $s - 2*$margin)
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $gfx.Dispose(); $pen.Dispose(); $bmp.Dispose()
    Write-Host "Generated placeholder: $out"
  }
}
