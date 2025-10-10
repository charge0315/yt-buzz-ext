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

$OutDir = Join-Path $PSScriptRoot '..' 'public' 'icons'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Sizes = @(16,32,48,128)

if (-not (Test-Path $SourceSvg)) {
  Write-Host "Source SVG not found: $SourceSvg" -ForegroundColor Red
  exit 1
}

foreach ($s in $Sizes) {
  $out = Join-Path $OutDir "icon$s.png"
  if ($magick) {
    & $magick convert -background none $SourceSvg -resize ${s}x${s} $out
  } elseif ($inkscape) {
    & $inkscape $SourceSvg --export-type=png --export-filename=$out -w $s -h $s
  } else {
    Write-Host "Neither ImageMagick nor Inkscape is available. Please install one of them." -ForegroundColor Yellow
    exit 2
  }
  Write-Host "Generated: $out"
}
