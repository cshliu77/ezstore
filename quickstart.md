# Quick Start Guide

> EZStore - B2B Quotation & Order Management System（AI Agent 開發工作坊）

---

## 1. 課前準備（請在上課前完成）

### 1.1 必要工具

| 工具 | 用途 | 下載 |
|------|------|------|
| Docker Desktop | 一鍵啟動整套系統（資料庫、後端、前端、Agent、MCP Server） | https://www.docker.com/products/docker-desktop/ |
| uv | Python 套件與虛擬環境管理，也用來安裝 agents-cli | https://docs.astral.sh/uv/getting-started/installation/ |
| google-agents-cli | Google 官方 Agent 開發 CLI（scaffold、playground、eval） | 安裝 uv 後執行 `uv tool install google-agents-cli` |
| AI coding 工具 | Claude Code、Gemini CLI、Antigravity、Cursor 等擇一 | 依各工具官網 |
| Google AI Studio API key | Agent 使用的 Gemini 模型（免費方案即可） | https://aistudio.google.com/apikey |

> 只需要「執行」系統的話，有 Docker 就夠了。Go、Bun、Node.js 只有在要修改後端或前端原始碼、或在本機跑 E2E 時才需要。

### 1.2 選用工具（本機開發／測試）

| 工具 | 用途 | 下載 |
|------|------|------|
| Node.js + Bun | 前端本機開發與 Playwright E2E | https://nodejs.org/ 、 https://bun.com/ |
| Go | 後端本機開發 | https://go.dev/dl/ |
| Playwright | 本機跑 E2E 測試 | https://playwright.dev/docs/intro |

### 1.3 驗證安裝

```bash
docker --version && docker compose version
uv --version
agents-cli --version
```

---

## 2. 取得專案

### Step 0: Fork the repository

到 GitHub fork 本專案：https://github.com/cshliu77/ezstore（保持勾選「Copy the main branch only」）

### Step 1: Clone your forked repository

```bash
git clone https://github.com/<your-github-username>/ezstore.git
cd ezstore
```

### Step 2: 設定 API key

```bash
cp .env.example .env
```

用編輯器打開 `.env`，把 `GEMINI_API_KEY=` 後面填入你的 Google AI Studio API key。`.env` 不會被提交到 Git。

> 已有 GCP 專案的人也可以改走 Vertex AI：執行 `gcloud auth application-default login`，在 `.env` 改設 `GOOGLE_GENAI_USE_VERTEXAI=true` 與 `GOOGLE_CLOUD_PROJECT`。課堂上建議用 AI Studio key，不需要 GCP 帳單。

---

## 3. 啟動系統

### Step 3: 用預建映像啟動（最快）

```bash
docker compose up -d
```

### Step 4: 用本機原始碼建置啟動（修改程式後使用）

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

### Step 5: 灌入測試資料

```bash
docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql
```

### Step 6: 確認服務

| 服務 | 網址 |
|------|------|
| 前端 | http://localhost:3000 |
| AI 智能助理（Chat UI） | http://localhost:3000/agent |
| 後端 API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger/index.html |
| Health Check | http://localhost:8080/health |

到 http://localhost:3000/agent 輸入「我要查詢報價單，報價單編號：QT-20260330-001」，應該看到報價單內容與一個可以點的連結。

---

## 4. 設定 AI coding 工具的 MCP（開始開發前）

把 spec 餵給 AI coding 工具之前，先設定好下列 MCP／skills，AI 才能查到最新文件並自動操作瀏覽器：

| 工具 | 用途 | 設定說明 |
|------|------|----------|
| google-agents-cli skills | ADK 開發流程、scaffold、eval、deploy 的官方 skills | `uvx google-agents-cli setup` |
| ADK Docs MCP Server | ADK 官方文件 | https://google.github.io/adk-docs/tutorials/coding-with-ai/#adk-docs-mcp-server |
| Context7 MCP | 各套件最新文件 | https://context7.com/docs/resources/all-clients |
| Playwright-MCP | 讓 AI 操作瀏覽器做 E2E | https://github.com/microsoft/playwright-mcp?tab=readme-ov-file#getting-started |
| chrome-devtools-mcp（選用） | 讓 AI 看 Console／Network | https://github.com/ChromeDevTools/chrome-devtools-mcp?tab=readme-ov-file#getting-started |

---

## 5. 開發與驗證

### Step 7: 把需求提示詞交給 AI coding 工具

`agent-spec-prompt.md` 就是要餵給 AI 的完整需求。它會分六個階段實作，每個階段停下來請你驗收。

### Step 8: 測試

```bash
# 前端 E2E（本機）
cd frontend && bun install && bun run e2e

# 前端 E2E（容器）
docker compose run --rm e2e

# Agent 單元測試與離線整合測試（不需 API key；整合測試需要 MCP Server 在本機執行）
cd agent && uv sync --group dev && uv run pytest tests/unit tests/integration -q

# Agent 評估（需要 API key、後端與 MCP Server 都在執行）
cd agent && agents-cli eval run
```

### Step 9: Agent 可信賴度評鑑 LAB

Agent 做完之後，用 `agents-cli eval` 評鑑它。有兩個版本：

| 版本 | 檔案 | 時間 | 內容 |
|---|---|---|---|
| 課堂版 | [eval-lab-quick.md](eval-lab-quick.md) | 25 分鐘 | 跑一組考題、讀逐題理由、加一題發現評分規則的盲點、破壞測試 |
| 完整版（回家做） | [eval-lab.md](eval-lab.md) | 60–90 分鐘 | 修評分規則、跑會改資料的操作類考題、穩定性比對、自己寫多輪案例、寫一頁可信賴度報告 |

**前置條件**

- Step 7 的 Agent 已完成，`docker compose ps` 看到 db、backend、mcp-server、agent、frontend 都在跑，測試資料已灌入（Step 5）。
- `agent/.env` 已設定憑證（AI Studio 的 `GEMINI_API_KEY`，或 Vertex AI 的 `GOOGLE_GENAI_USE_VERTEXAI=true` + `GOOGLE_CLOUD_PROJECT`），且 `MCP_URL=http://localhost:8010/mcp`。
- 在 `agent/` 目錄執行過 `uv sync --group dev --extra eval`。

**費用**：課堂版呼叫 Gemini 約 15 次，完整版約 40 到 60 次，AI Studio 免費方案都足夠。
