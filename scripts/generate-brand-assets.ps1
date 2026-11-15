# Generates the dwellr app icons and PNG exports from the house mark.
# Windows PowerShell 5.1+ (.NET System.Drawing). Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-brand-assets.ps1
#
# The mark geometry is read from apps/web/public/brand/dwellr-mark.svg.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$brandDir = Join-Path $root "apps/web/public/brand"
$appDir = Join-Path $root "apps/web/src/app"

foreach ($dir in @($brandDir, $appDir)) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

$ink = [System.Drawing.ColorTranslator]::FromHtml("#222926")
$paper = [System.Drawing.Color]::White

# Read geometry from the canonical SVG so the exported assets cannot drift.
$markSvg = Get-Content (Join-Path $brandDir "dwellr-mark.svg") -Raw
$markMatch = [regex]::Match($markSvg, '<path[^>]*d="([^"]+)"')
$viewBoxMatch = [regex]::Match($markSvg, 'viewBox="([^"]+)"')
if (-not $markMatch.Success -or -not $viewBoxMatch.Success) {
  throw "Could not read the mark path and viewBox from dwellr-mark.svg"
}
$markPath = $markMatch.Groups[1].Value
$viewBox = $viewBoxMatch.Groups[1].Value.Split(" ")
$viewX = [double]$viewBox[0]
$viewY = [double]$viewBox[1]
$viewWidth = [double]$viewBox[2]
$viewHeight = [double]$viewBox[3]

function New-MarkPath {
  param([double]$Scale, [double]$OffsetX, [double]$OffsetY)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.FillMode = [System.Drawing.Drawing2D.FillMode]::Alternate

  $tokens = [regex]::Matches($markPath, "[MCZ]|-?\d+(?:\.\d+)?")
  $index = 0
  $command = $null
  $currentX = 0.0
  $currentY = 0.0

  function Convert-X([double]$value) {
    return [float](($value - $viewX) * $Scale + $OffsetX)
  }
  function Convert-Y([double]$value) {
    return [float](($value - $viewY) * $Scale + $OffsetY)
  }

  while ($index -lt $tokens.Count) {
    $token = $tokens[$index].Value
    if ($token -match "^[MCZ]$") {
      $command = $token
      $index += 1
      if ($command -eq "Z") {
        $path.CloseFigure()
        $command = $null
      }
      continue
    }

    switch ($command) {
      "M" {
        $currentX = [double]$tokens[$index].Value
        $currentY = [double]$tokens[$index + 1].Value
        $path.StartFigure()
        $index += 2
      }
      "C" {
        $x1 = [double]$tokens[$index].Value
        $y1 = [double]$tokens[$index + 1].Value
        $x2 = [double]$tokens[$index + 2].Value
        $y2 = [double]$tokens[$index + 3].Value
        $x3 = [double]$tokens[$index + 4].Value
        $y3 = [double]$tokens[$index + 5].Value
        $path.AddBezier(
          (Convert-X $currentX), (Convert-Y $currentY),
          (Convert-X $x1), (Convert-Y $y1),
          (Convert-X $x2), (Convert-Y $y2),
          (Convert-X $x3), (Convert-Y $y3)
        )
        $currentX = $x3
        $currentY = $y3
        $index += 6
      }
      default {
        throw "Unsupported path command near token $index"
      }
    }
  }

  return $path
}

function New-MarkBitmap {
  param([int]$Size, [bool]$Opaque = $false, [double]$Inset = 0.0)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($(if ($Opaque) { $paper } else { [System.Drawing.Color]::Transparent }))

  $content = $Size * (1.0 - 2 * $Inset)
  $scale = $content / [Math]::Max($viewWidth, $viewHeight)
  $offsetX = ($Size - $viewWidth * $scale) / 2.0
  $offsetY = ($Size - $viewHeight * $scale) / 2.0
  $path = New-MarkPath -Scale $scale -OffsetX $offsetX -OffsetY $offsetY

  $brush = New-Object System.Drawing.SolidBrush($ink)
  $g.FillPath($brush, $path)

  $brush.Dispose()
  $path.Dispose()
  $g.Dispose()

  return $bmp
}

function Save-ResizedPng {
  param([System.Drawing.Bitmap]$Source, [string]$Path, [int]$Size)
  $target = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($target)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.DrawImage($Source, 0, 0, $Size, $Size)
  $g.Dispose()
  $target.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $target.Dispose()
}

$master = New-MarkBitmap -Size 1024

Save-ResizedPng -Source $master -Path (Join-Path $brandDir "dwellr-mark-1024.png") -Size 1024
Save-ResizedPng -Source $master -Path (Join-Path $brandDir "dwellr-mark-512.png") -Size 512
Save-ResizedPng -Source $master -Path (Join-Path $appDir "icon.png") -Size 512

# iOS masks apple-touch-icons and shows transparency as black, so this one is opaque.
$opaqueMaster = New-MarkBitmap -Size 1024 -Opaque $true -Inset 0.14
Save-ResizedPng -Source $opaqueMaster -Path (Join-Path $appDir "apple-icon.png") -Size 180

# favicon.ico: a single 48x48 PNG entry (valid for modern browsers and Windows).
$faviconPng = Join-Path $env:TEMP "dwellr-favicon-48.png"
$small = New-MarkBitmap -Size 256
Save-ResizedPng -Source $small -Path $faviconPng -Size 48

$pngBytes = [System.IO.File]::ReadAllBytes($faviconPng)
$ico = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($ico)
$writer.Write([UInt16]0)            # reserved
$writer.Write([UInt16]1)            # type: icon
$writer.Write([UInt16]1)            # image count
$writer.Write([Byte]48)             # width
$writer.Write([Byte]48)             # height
$writer.Write([Byte]0)              # palette
$writer.Write([Byte]0)              # reserved
$writer.Write([UInt16]1)            # color planes
$writer.Write([UInt16]32)           # bits per pixel
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)           # offset
$writer.Write($pngBytes)
$writer.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $appDir "favicon.ico"), $ico.ToArray())

$writer.Dispose()
$ico.Dispose()
$small.Dispose()
$opaqueMaster.Dispose()
$master.Dispose()
Remove-Item $faviconPng -ErrorAction SilentlyContinue

Write-Host "Brand assets written to apps/web/public/brand and apps/web/src/app"
