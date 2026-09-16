param([string]$Source = 'work/map-source/blue-marble.jpg', [int]$MaxLevel = 6)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$targetRoot = Join-Path $PSScriptRoot '../static/earth'
[IO.Directory]::CreateDirectory($targetRoot) | Out-Null
# Level 6 (32768 x 16384) exceeds the 21600 x 10800 source's native pixels, so it is rendered in
# horizontal bands rather than one full-level canvas: a single 32768x16384 32bpp bitmap (~2.1 GB)
# risks the CLR's default 2 GB single-object limit. Banding renders the identical scale operation
# windowed into smaller buffers, so output is pixel-for-pixel the same as a one-shot resize.
$maxBandPixels = 200MB / 4
try {
  if ($sourceImage.Width -lt 16384 -or $sourceImage.Height -lt 8192) { throw 'Use the full 21600 x 10800 NASA source.' }
  for ($level = 0; $level -le $MaxLevel; $level++) {
    $rows = [int][Math]::Pow(2, $level)
    $cols = 2 * $rows
    $levelWidth = $cols * 256
    $levelHeight = $rows * 256
    $bandTileRows = [Math]::Max(1, [Math]::Min($rows, [int]($maxBandPixels / $levelWidth / 256)))
    for ($bandStart = 0; $bandStart -lt $rows; $bandStart += $bandTileRows) {
      $bandRows = [Math]::Min($bandTileRows, $rows - $bandStart)
      $bandImage = New-Object System.Drawing.Bitmap $levelWidth, ($bandRows * 256)
      $graphics = [System.Drawing.Graphics]::FromImage($bandImage)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      # Draw the whole source at full level scale, offset so only this band lands on the (smaller) canvas.
      $graphics.DrawImage($sourceImage, 0, -($bandStart * 256), $levelWidth, $levelHeight)
      $graphics.Dispose()
      for ($x = 0; $x -lt $cols; $x++) {
        $folder = Join-Path $targetRoot "$level/$x"
        [IO.Directory]::CreateDirectory($folder) | Out-Null
        for ($yInBand = 0; $yInBand -lt $bandRows; $yInBand++) {
          $rect = New-Object System.Drawing.Rectangle ($x * 256), ($yInBand * 256), 256, 256
          $tile = $bandImage.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
          # Geographic XYZ: north-origin row numbers.
          $tile.Save((Join-Path $folder "$($bandStart + $yInBand).jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
          $tile.Dispose()
        }
      }
      $bandImage.Dispose()
    }
    Write-Output "Level $level prepared ($cols x $rows tiles)."
  }
} finally { $sourceImage.Dispose() }
