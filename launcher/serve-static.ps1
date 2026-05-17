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
  if ($context.Request.HttpMethod -ne "HEAD") {
    $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
  }
  $context.Response.Close()
}

function Write-BytesResponse($context, [int]$statusCode, [byte[]]$bytes, [string]$contentType = "application/octet-stream") {
  $context.Response.StatusCode = $statusCode
  $context.Response.ContentType = $contentType
  $context.Response.ContentLength64 = $bytes.LongLength
  if ($context.Request.HttpMethod -ne "HEAD") {
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  }
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
      # 使用英文结果页（kl=us-en），避免中文GBK摘要乱码
      return "https://html.duckduckgo.com/html/?q=$([System.Uri]::EscapeDataString($query))&kl=us-en"
    }
    "wiki" {
      $query = [string]$request.QueryString["q"]
      if ([string]::IsNullOrWhiteSpace($query)) {
        return $null
      }
      return "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=$([System.Uri]::EscapeDataString($query))&srlimit=3&format=json&origin=*"
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
  # 使用真实浏览器 UA，避免被 DuckDuckGo 拦截
  $request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  $request.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
  
  $readBytes = {
    param($webResp)
    $stream = $webResp.GetResponseStream()
    try {
      $mem = New-Object System.IO.MemoryStream
      $stream.CopyTo($mem)
      return $mem.ToArray()
    } finally { $stream.Dispose() }
  }

  try {
    $response = [System.Net.HttpWebResponse]$request.GetResponse()
    try {
      return [pscustomobject]@{
        StatusCode  = [int]$response.StatusCode
        ContentType = if ([string]::IsNullOrWhiteSpace($response.ContentType)) { "application/octet-stream" } else { $response.ContentType }
        Bytes       = & $readBytes $response
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
        return [pscustomobject]@{
          StatusCode  = [int]$httpResponse.StatusCode
          ContentType = if ([string]::IsNullOrWhiteSpace($httpResponse.ContentType)) { "application/octet-stream" } else { $httpResponse.ContentType }
          Bytes       = & $readBytes $httpResponse
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
        # 直接透传原始字节，不做任何字符编码转换
        Write-BytesResponse $context $proxyResult.StatusCode $proxyResult.Bytes $proxyResult.ContentType
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
    Write-BytesResponse $context 200 $bytes (Get-ContentType $target)
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}