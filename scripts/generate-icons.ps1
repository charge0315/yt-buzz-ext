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
  Write-Host "Neither ImageMagick nor Inkscape is available. Generating designed PNGs via System.Drawing..." -ForegroundColor Yellow
  Add-Type -AssemblyName System.Drawing

  foreach ($s in $Sizes) {
    $out = Join-Path $OutDir "icon$s.png"
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList $s, $s, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gfx.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))

    # Colors
    $folder = [System.Drawing.Color]::FromArgb(255, 248, 187, 208)   # #F8BBD0
    $folderEdge = [System.Drawing.Color]::FromArgb(255, 244, 143, 177) # #F48FB1
    $ytRed = [System.Drawing.Color]::FromArgb(255, 255, 0, 0)
    $white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    $shadow = [System.Drawing.Color]::FromArgb(40, 0, 0, 0)

    # Metrics
    $m = [math]::Round($s * 0.12)
    $tabH = [math]::Round($s * 0.14)
    $tabW = [math]::Round($s * 0.38)

    # Folder body rect
    $bodyX = $m
    $bodyY = $m + $tabH
    $bodyW = $s - 2*$m
    $bodyH = $s - $m - $bodyY

    # Shadow (simple)
    $shadowBrush = New-Object System.Drawing.SolidBrush $shadow
    $gfx.FillRectangle($shadowBrush, $bodyX+1, $bodyY+2, $bodyW, $bodyH)
    $shadowBrush.Dispose()

    # Folder tab
    $folderBrush = New-Object System.Drawing.SolidBrush $folder
    $folderPen = New-Object System.Drawing.Pen -ArgumentList $folderEdge, ([math]::Max(1, $s*0.02))
    $gfx.FillRectangle($folderBrush, $m, $m, $tabW, $tabH)
    $gfx.DrawRectangle($folderPen, $m, $m, $tabW, $tabH)

    # Folder body
    $gfx.FillRectangle($folderBrush, $bodyX, $bodyY, $bodyW, $bodyH)
    $gfx.DrawRectangle($folderPen, $bodyX, $bodyY, $bodyW, $bodyH)

    # Video inside (card)
    $vidW = [math]::Round($bodyW * 0.55)
    $vidH = [math]::Round($bodyH * 0.38)
    $vidX = $bodyX + [math]::Round($bodyW * 0.08)
    $vidY = $bodyY + [math]::Round($bodyH * 0.18)
    $vidBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 255, 255, 255))
    $vidPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(200, 200, 200)), ([math]::Max(1, $s*0.015))
    $gfx.FillRectangle($vidBrush, $vidX, $vidY, $vidW, $vidH)
    $gfx.DrawRectangle($vidPen, $vidX, $vidY, $vidW, $vidH)

    # Foreground YouTube play badge (rectangle)
    $playW = [math]::Round($s * 0.50)
    $playH = [math]::Round($s * 0.36)
    $playX = $bodyX + $bodyW - $playW - [math]::Round($s*0.06)
    $playY = $bodyY + $bodyH - $playH - [math]::Round($s*0.06)
    $playBrush = New-Object System.Drawing.SolidBrush $ytRed
    $playPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(220, 180, 0, 0)), ([math]::Max(1, $s*0.02))
    # play badge shadow
    $playShadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40,0,0,0))
    $gfx.FillRectangle($playShadowBrush, $playX+1, $playY+2, $playW, $playH)
    $playShadowBrush.Dispose()
    $gfx.FillRectangle($playBrush, $playX, $playY, $playW, $playH)
    $gfx.DrawRectangle($playPen, $playX, $playY, $playW, $playH)

    # white play triangle
    $triCX = $playX + [double]$playW/2.0
    $triCY = $playY + [double]$playH/2.0
    $triW = [math]::Round($playW * 0.36)
    $triH = [math]::Round($playH * 0.4)
    $p1 = New-Object System.Drawing.PointF ($triCX - $triW*0.3), ($triCY - $triH/2.0)
    $p2 = New-Object System.Drawing.PointF ($triCX - $triW*0.3), ($triCY + $triH/2.0)
    $p3 = New-Object System.Drawing.PointF ($triCX + $triW*0.7), $triCY
    $pts = @($p1,$p2,$p3)
    $whiteBrush = New-Object System.Drawing.SolidBrush $white
    $gfx.FillPolygon($whiteBrush, $pts)

    # Save & dispose
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $whiteBrush.Dispose(); $playPen.Dispose(); $playBrush.Dispose()
    $vidPen.Dispose(); $vidBrush.Dispose(); $folderPen.Dispose(); $folderBrush.Dispose()
    $gfx.Dispose(); $bmp.Dispose()
    Write-Host "Generated designed icon: $out"
  }
}
