$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
$exeDist = Join-Path $root 'desktop-exe'
$pyiDist = Join-Path $root 'build\pyinstaller-dist'
$workPath = Join-Path $root 'build\pyinstaller-work'
$specPath = Join-Path $root 'build\pyinstaller-spec'
$source = Join-Path $root 'launcher\desktop_launcher.py'
$distIndex = Join-Path $root 'dist\prototype-ui\index.html'

if (-not (Test-Path $distIndex)) {
  throw 'Missing dist\prototype-ui\index.html. Run scripts\package-static.ps1 first.'
}

foreach ($path in @($exeDist, $pyiDist, $workPath, $specPath)) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
  }
}

New-Item -ItemType Directory -Path $exeDist | Out-Null
New-Item -ItemType Directory -Path $pyiDist | Out-Null
New-Item -ItemType Directory -Path $workPath | Out-Null
New-Item -ItemType Directory -Path $specPath | Out-Null

$addData = (Join-Path $root 'dist') + ';dist'

& $python -m PyInstaller --noconfirm --clean --onefile --windowed --name RoundtableBraintrust --distpath $pyiDist --workpath $workPath --specpath $specPath --add-data $addData $source

$outputExe = Join-Path $pyiDist 'RoundtableBraintrust.exe'
$finalExe = Join-Path $exeDist 'RoundtableBraintrust.exe'
Copy-Item -Path $outputExe -Destination $finalExe

Write-Host 'Created desktop exe:'
Write-Host $finalExe