# Roundtable Braintrust

**Assemble an AI expert panel to debate any question — with live web evidence.**

> 圆桌智囊团 · 多 AI 角色协同讨论工作台

[![Live Demo](https://img.shields.io/badge/Live%20Demo-roundtable--braintrust.vercel.app-orange?style=flat-square)](https://roundtable-braintrust.vercel.app)
[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![No Build Required](https://img.shields.io/badge/Build-None%20Required-green?style=flat-square)](#quick-start)

Drop in a topic. The AI assembles 4–8 expert personas with opposing stances, searches the web for live evidence, debates in multiple rounds, and delivers a synthesis. You listen, ask follow-ups, and decide.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Auto-assembled Panel** | AI creates 4–8 distinct personas (background, stance, style) from your topic — no manual config |
| **Live Web Evidence** | Each speaker searches DuckDuckGo + Wikipedia before responding and cites sources inline |
| **Private Knowledge Base** | Upload PDF / Word / Markdown / TXT — AI retrieves relevant chunks during the debate |
| **File Description Cards** | One-sentence summary per document guides retrieval, reducing false hits |
| **Evidence Trail** | Every message shows its search queries, retrieved snippets, and source URLs |
| **Any OpenAI-Compatible API** | Works with OpenAI, DeepSeek, Moonshot, Anthropic, local Ollama models — just bring your API key |
| **100% Browser-Based** | No server, no account, no data leaves your device (IndexedDB storage) |
| **CN / EN UI** | Full Chinese and English interface, auto-detects browser language |

---

## 🚀 Try It Now

**[→ Live Demo on Vercel](https://roundtable-braintrust.vercel.app)**  
*(Bring your own API key — enter it in Settings after opening)*

---

## Quick Start (Local)

The local launcher includes a proxy server for web search. Do **not** use a plain static server or evidence search will not work.

```powershell
# Windows — double-click or run:
Start-Dev.bat

# Or manually:
powershell -ExecutionPolicy Bypass -File launcher/serve-static.ps1 -Root . -Port 4174
```

Then open: `http://127.0.0.1:4174/prototype-ui/`

---

## How It Works

```
Your Topic
    │
    ▼
① AI Moderator organizes the question and assigns expert roles
    │
    ▼
② Each expert searches the web + your knowledge base for evidence
    │
    ▼
③ Multi-round structured debate with citations
    │
    ▼
④ Synthesis & conclusion
```

---

## Knowledge Base Tips

1. Open **Knowledge Base** panel → upload documents (PDF / Word / Markdown / TXT)
2. Write a **File Description** for each document (one sentence: what it covers, what questions it answers)
3. Enable the **Knowledge Base** toggle before starting — relevant chunks are auto-injected into each speaker's context

---

## Model Configuration

Open **Settings → Model Profiles** and enter your API Key + Base URL.

Tested providers: `OpenAI` · `Anthropic` · `DeepSeek` · `Moonshot (Kimi)` · `SiliconFlow` · `Ollama (local)`

---

## Tech Stack

| | |
|---|---|
| Architecture | Vanilla JS single-file, zero framework, zero build step |
| Storage | IndexedDB (knowledge base, discussion history, evidence cache) |
| Web Proxy | `api/proxy.js` (Vercel Serverless) / `launcher/serve-static.ps1` (local) |
| Retrieval | Chunked documents + TF-IDF keyword scoring + file description pre-filter |
| Deployment | Static files on Vercel; no backend required |

---

## Project Status

**Early prototype** — core features stable, actively iterating.  
See [产品路线图与发布规划-2026.md](产品路线图与发布规划-2026.md) for the roadmap.

---

## License

[MIT](LICENSE) © 2026 Roundtable Braintrust Contributors
