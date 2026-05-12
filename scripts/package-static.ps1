$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$zipPath = Join-Path $root "roundtable-braintrust-web.zip"
$launcherRoot = Join-Path $root "launcher"

function Get-AvailableZipPath([string]$preferredPath) {
  if (-not (Test-Path $preferredPath)) {
    return $preferredPath
  }

  try {
    Remove-Item $preferredPath -Force
    return $preferredPath
  } catch {
    $directory = Split-Path -Parent $preferredPath
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($preferredPath)
    $extension = [System.IO.Path]::GetExtension($preferredPath)
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    return Join-Path $directory ("{0}-{1}{2}" -f $baseName, $timestamp, $extension)
  }
}

if (Test-Path $dist) {
  Remove-Item $dist -Recurse -Force
}

$zipPath = Get-AvailableZipPath $zipPath

New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item -Path (Join-Path $root "index.html") -Destination $dist
Copy-Item -Path (Join-Path $root "prototype-ui") -Destination $dist -Recurse
Copy-Item -Path (Join-Path $root "assets") -Destination $dist -Recurse
Copy-Item -Path (Join-Path $launcherRoot "serve-static.ps1") -Destination (Join-Path $dist "serve-static.ps1")
Copy-Item -Path (Join-Path $launcherRoot "Start-Roundtable-Web.bat") -Destination (Join-Path $dist "Start-Roundtable-Web.bat")

Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Packaged static web app to: $dist"
Write-Host "Created zip archive: $zipPath"