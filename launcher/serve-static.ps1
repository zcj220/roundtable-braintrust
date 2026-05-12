param(
  [string]$Root = (Split-Path -Parent $PSCommandPath),
  [int]$Port = 4175
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Root)) {
  throw "Static root not found: $Root"
}

$resolvedRoot = (Resolve-Path $Root).Path
$prefix = "http://127.0.0.1:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

$mimeTypes = @{
  ".css" = "text/css; charset=utf-8"
  ".gif" = "image/gif"
  ".html" = "text/html; charset=utf-8"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".mp3" = "audio/mpeg"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
  ".txt" = "text/plain; charset=utf-8"
  ".webp" = "image/webp"
}

function Get-ContentType([string]$path) {
  $extension = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($mimeTypes.ContainsKey($extension)) {
    return $mimeTypes[$extension]
  }
  return "application/octet-stream"
}

function Resolve-RequestPath([string]$relativePath) {
  $trimmed = ($relativePath -replace "^/+", "")
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    $trimmed = "index.html"
  }

  $candidate = Join-Path $resolvedRoot ($trimmed -replace "/", [System.IO.Path]::DirectorySeparatorChar)
  if ((Test-Path $candidate) -and (Get-Item $candidate).PSIsContainer) {
    $candidate = Join-Path $candidate "index.html"
  }

  try {
    $resolved = [System.IO.Path]::GetFullPath($candidate)
  } catch {
    return $null
  }

  if (-not $resolved.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if (-not (Test-Path $resolved) -or (Get-Item $resolved).PSIsContainer) {
    return $null
  }

  return $resolved
}

Write-Host "Roundtable Braintrust static server running at $prefix"
Write-Host "Serving files from $resolvedRoot"
Write-Host "Press Ctrl+C to stop this window."

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    $target = Resolve-RequestPath $requestPath

    if (-not $target) {
      $context.Response.StatusCode = 404
      $buffer = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
      $context.Response.ContentType = "text/plain; charset=utf-8"
      $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
      $context.Response.Close()
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($target)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = Get-ContentType $target
    $context.Response.ContentLength64 = $bytes.LongLength
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}