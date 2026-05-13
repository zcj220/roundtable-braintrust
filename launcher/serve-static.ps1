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

$proxyUserAgent = "RoundtableBraintrust/1.0"

function Write-TextResponse($context, [int]$statusCode, [string]$text, [string]$contentType = "text/plain; charset=utf-8") {
  $buffer = [System.Text.Encoding]::UTF8.GetBytes([string]$text)
  $context.Response.StatusCode = $statusCode
  $context.Response.ContentType = $contentType
  $context.Response.ContentLength64 = $buffer.LongLength
  $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
  $context.Response.Close()
}

function Get-ProxyTargetUri($request) {
  $kind = [string]$request.QueryString["kind"]
  switch ($kind) {
    "duck" {
      $query = [string]$request.QueryString["q"]
      if ([string]::IsNullOrWhiteSpace($query)) {
        return $null
      }
      return "https://api.duckduckgo.com/?q=$([System.Uri]::EscapeDataString($query))&format=json&no_redirect=1&no_html=1&skip_disambig=1"
    }
    "wiki" {
      $query = [string]$request.QueryString["q"]
      if ([string]::IsNullOrWhiteSpace($query)) {
        return $null
      }
      return "https://zh.wikipedia.org/w/api.php?action=opensearch&search=$([System.Uri]::EscapeDataString($query))&limit=3&namespace=0&format=json&origin=*"
    }
    "url" {
      $targetUrl = [string]$request.QueryString["url"]
      if ([string]::IsNullOrWhiteSpace($targetUrl)) {
        return $null
      }
      if ($targetUrl -notmatch '^https?://') {
        return $null
      }
      $normalized = $targetUrl -replace '^https?://', ''
      return "https://r.jina.ai/http/$normalized"
    }
    default {
      return $null
    }
  }
}

function Invoke-ProxyRequest([string]$targetUri) {
  $request = [System.Net.HttpWebRequest]::Create($targetUri)
  $request.Method = "GET"
  $request.Timeout = 25000
  $request.ReadWriteTimeout = 25000
  $request.UserAgent = $proxyUserAgent
  $request.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
  try {
    $response = [System.Net.HttpWebResponse]$request.GetResponse()
    try {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      try {
        return [pscustomobject]@{
          StatusCode = [int]$response.StatusCode
          ContentType = if ([string]::IsNullOrWhiteSpace($response.ContentType)) { "text/plain; charset=utf-8" } else { $response.ContentType }
          Body = $reader.ReadToEnd()
        }
      } finally {
        $reader.Dispose()
      }
    } finally {
      $response.Close()
    }
  } catch [System.Net.WebException] {
    $webException = $_.Exception
    $errorResponse = $webException.Response
    if ($errorResponse) {
      $httpResponse = [System.Net.HttpWebResponse]$errorResponse
      try {
        $reader = New-Object System.IO.StreamReader($httpResponse.GetResponseStream())
        try {
          return [pscustomobject]@{
            StatusCode = [int]$httpResponse.StatusCode
            ContentType = if ([string]::IsNullOrWhiteSpace($httpResponse.ContentType)) { "text/plain; charset=utf-8" } else { $httpResponse.ContentType }
            Body = $reader.ReadToEnd()
          }
        } finally {
          $reader.Dispose()
        }
      } finally {
        $httpResponse.Close()
      }
    }
    throw
  }
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

    if ($requestPath -eq "/__roundtable_proxy") {
      $targetUri = Get-ProxyTargetUri $context.Request
      if (-not $targetUri) {
        Write-TextResponse $context 400 "Bad Request"
        continue
      }

      try {
        $proxyResult = Invoke-ProxyRequest $targetUri
        Write-TextResponse $context $proxyResult.StatusCode $proxyResult.Body $proxyResult.ContentType
      } catch {
        Write-TextResponse $context 502 $_.Exception.Message
      }
      continue
    }

    $target = Resolve-RequestPath $requestPath

    if (-not $target) {
      Write-TextResponse $context 404 "Not Found"
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