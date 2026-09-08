param([string]$Source = 'work/map-source/blue-marble.jpg')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$targetRoot = Join-Path $PSScriptRoot '../static/earth'
[IO.Directory]::CreateDirectory($targetRoot) | Out-Null
try {
  if ($sourceImage.Width -lt 16384 -or $sourceImage.Height -lt 8192) { throw 'Use the full 21600 x 10800 NASA source.' }
  for ($level = 0; $level -le 5; $level++) {
    $rows = [int][Math]::Pow(2, $level)
    $cols = 2 * $rows
    $levelImage = New-Object System.Drawing.Bitmap ($cols * 256), ($rows * 256)
    $graphics = [System.Drawing.Graphics]::FromImage($levelImage)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($sourceImage, 0, 0, $levelImage.Width, $levelImage.Height)
    $graphics.Dispose()
    for ($x = 0; $x -lt $cols; $x++) {
      $folder = Join-Path $targetRoot "$level/$x"
      [IO.Directory]::CreateDirectory($folder) | Out-Null
      for ($y = 0; $y -lt $rows; $y++) {
        $rect = New-Object System.Drawing.Rectangle ($x * 256), ($y * 256), 256, 256
        $tile = $levelImage.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        # Geographic XYZ: north-origin row numbers.
        $tile.Save((Join-Path $folder "$y.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $tile.Dispose()
      }
    }
    $levelImage.Dispose()
    Write-Output "Level $level prepared ($cols x $rows tiles)."
  }
} finally { $sourceImage.Dispose() }
