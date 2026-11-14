# Generates the dwellr app icons and PNG exports from the house mark.
# Windows PowerShell 5.1+ (.NET System.Drawing). Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-brand-assets.ps1
#
# The mark geometry here must stay in sync with apps/web/public/brand/dwellr-mark.svg.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$brandDir = Join-Path $root "apps/web/public/brand"
$appDir = Join-Path $root "apps/web/src/app"

foreach ($dir in @($brandDir, $appDir)) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

$ink = [System.Drawing.ColorTranslator]::FromHtml("#1F2422")
$paper = [System.Drawing.Color]::White

function New-MarkBitmap {
  param([int]$Size, [bool]$Opaque = $false, [double]$Inset = 0.0)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($(if ($Opaque) { $paper } else { [System.Drawing.Color]::Transparent }))

  # House geometry from the SVG (96x96 viewBox) scaled to this bitmap.
  $scale = ($Size * (1.0 - 2 * $Inset)) / 96.0
  $offset = $Size * $Inset

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.FillMode = [System.Drawing.Drawing2D.FillMode]::Alternate

  $house = @(
    (New-Object System.Drawing.PointF((48 * $scale + $offset), (2 * $scale + $offset))),
    (New-Object System.Drawing.PointF((94 * $scale + $offset), (40 * $scale + $offset))),
    (New-Object System.Drawing.PointF((94 * $scale + $offset), (94 * $scale + $offset))),
    (New-Object System.Drawing.PointF((2 * $scale + $offset), (94 * $scale + $offset))),
    (New-Object System.Drawing.PointF((2 * $scale + $offset), (40 * $scale + $offset)))
  )
  $path.AddPolygon($house)

  # Doorway cut-out: rectangle with a semicircular top.
  $door = New-Object System.Drawing.Drawing2D.GraphicsPath
  $door.FillMode = [System.Drawing.Drawing2D.FillMode]::Winding
  $door.AddLine(
    (36 * $scale + $offset), (94 * $scale + $offset),
    (36 * $scale + $offset), (66 * $scale + $offset)
  )
  $door.AddArc(
    (36 * $scale + $offset), (54 * $scale + $offset),
    (24 * $scale), (24 * $scale), 180, 180
  )
  $door.AddLine(
    (60 * $scale + $offset), (66 * $scale + $offset),
    (60 * $scale + $offset), (94 * $scale + $offset)
  )
  $door.CloseFigure()
  $path.AddPath($door, $false)

  $brush = New-Object System.Drawing.SolidBrush($ink)
  $g.FillPath($brush, $path)

  $brush.Dispose()
  $door.Dispose()
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
