// Vercel Serverless Function — 转发网页搜索请求，绕过浏览器跨域限制
// 对应本地 launcher/serve-static.ps1 的 /__roundtable_proxy 逻辑

module.exports = async function handler(req, res) {
  // 只允许 GET
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { kind, q, url } = req.query;

  let targetUrl;
  if (kind === "duck" && q) {
    // DuckDuckGo HTML 搜索，使用英文结果避免 GBK 乱码
    targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=us-en`;
  } else if (kind === "wiki" && q) {
    // Wikipedia 搜索 API
    targetUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json&origin=*`;
  } else if (kind === "url" && url) {
    // 通过 Jina Reader 提取网页正文
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: "Invalid url parameter" });
      return;
    }
    const normalized = url.replace(/^https?:\/\//i, "");
    targetUrl = `https://r.jina.ai/http/${normalized}`;
  } else {
    res.status(400).json({ error: "Invalid proxy request. Required: kind=(duck|wiki|url) with q or url param." });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(22000),
    });

    const contentType = upstream.headers.get("Content-Type") || "text/plain; charset=utf-8";
    const bodyBuffer = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.status(upstream.status).send(Buffer.from(bodyBuffer));
  } catch (error) {
    console.error("[proxy] upstream fetch failed:", error?.message || error);
    res.status(502).json({ error: "Proxy upstream failed", message: error?.message || "unknown error" });
  }
};
