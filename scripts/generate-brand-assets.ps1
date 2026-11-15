# Generates the dwellr app icons and PNG exports from the house mark.
# Windows PowerShell 5.1+ (.NET System.Drawing). Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-brand-assets.ps1
#
# The mark geometry below is the house portion of
# apps/web/public/brand/dwellr-mark.svg and must stay in sync with it.

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

# House path from the supplied lockup, cropped to the mark viewBox.
$markPath = "M430.18 398C430.35 399.03 430.52 400.06 430.69 401.08C430.7 428.73 430.7 456.39 430.71 484.04C430.55 485.36 430.39 486.68 430.24 488C428.4 492.95 426.76 497.62 422.38 500.92C415.04 506.45 392.97 506.19 384.14 504.5C388.41 497.11 390.99 490.42 392.22 481.86C392.38 480.57 392.54 479.29 392.7 478C392.89 475.67 393.09 473.33 393.29 471C393.45 469.33 393.61 467.67 393.76 466C393.76 457 393.76 448 393.75 439C393.6 438.01 393.44 437.03 393.29 436.04C391.65 418.33 381.05 412.88 367.93 403.54C362.12 399.4 356.52 394.9 350.53 391C344.06 386.78 337.73 380.86 329.5 381.21C322.36 381.51 315.79 386.82 309.96 390.47C299.33 397.12 288.77 403.94 278.2 410.71C273.36 413.82 267.47 416.72 263.81 421.29C257.8 428.78 259.13 438.51 259.1 447.5C259.06 459.5 259.09 471.5 259.13 483.5C259.15 490.45 259.7 497.63 258.72 504.5C249.71 506.02 230.01 506.42 223.58 498.89C217.57 491.84 219.71 480.04 219.75 471.5C219.83 454.17 219.81 436.83 219.75 419.5C219.71 411.06 218.22 400.72 221.21 392.69C224.11 384.89 230.24 380.82 236.61 376.07C245.59 369.37 254.68 362.83 263.81 356.33C276.05 347.63 288 338.4 300.4 329.91C307.03 325.38 313.15 319.75 321.5 319.03C334.26 317.94 343.34 326.57 353.08 333.44C368.32 344.19 383.42 355.09 398.58 365.95C407.81 372.57 420.51 379.01 426.59 388.9C428.34 391.74 428.98 394.93 430.18 398ZM318 418.82C319.33 418.8 320.67 418.77 322 418.75C331.7 422.01 350.56 433.11 355.02 442.53C358.19 449.24 357.1 457.29 357.1 464.5C357.09 477.68 358.18 491.41 356.78 504.5C342.85 504.5 328.91 504.5 314.98 504.5C314.21 496.91 314.71 489.14 314.7 481.5C314.67 467.83 314.63 454.17 314.68 440.5C314.7 434.06 312.39 423.16 318 418.82Z"
$viewX = 214.0
$viewY = 312.0
$viewWidth = 224.0
$viewHeight = 202.0

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
