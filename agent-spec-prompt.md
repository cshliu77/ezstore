請使用 Git 開一個分支叫做 feature/ezstore-agent-develop，在本專案開發「報價單管理 Agent」。開發過程請優先使用 Context7 MCP 確認各套件的最新用法，並檢查有哪些 skills 與 MCP tools 可以協助（例如 google-agents-cli 系列 skills、Playwright-MCP、chrome-devtools-mcp）。

## 0. 已經提供、不需要你開發的部分

這個專案已經包含下列元件，請直接使用，不要重寫：

- **後端 REST API**（`backend/`，Go）：報價單、訂單、客戶、產品的 CRUD。`GET /api/v1/quotations?quotation_number=QT-20260330-001` 可精確查詢報價單。
- **MCP Server**（`mcp_server/`，Python，mcp SDK 2.x，Streamable HTTP）：在 Docker Compose 裡的位址是 `http://mcp-server:8000/mcp`。它提供 6 個工具，全部透過後端 API 操作資料，並在回傳文字裡附上系統連結：
  - `get_quotation(quotation_number)`：查詢報價單詳細資訊與品項
  - `list_customer_quotations(customer_name)`：查詢某客戶的報價單清單
  - `duplicate_quotation(quotation_number)`：複製報價單
  - `update_pricing_factor(quotation_number, new_pricing_factor)`：先複製再修改報價因子
  - `adjust_total_price(quotation_number, target_total_price)`：先複製再用二分法調整報價因子逼近目標總價（最多 20 次）
  - `convert_to_order(quotation_number)`：依報價單建立訂單並關聯原單
- **前端 Chat UI**（`frontend/src/pages/AgentChatPage.tsx`、`frontend/src/api/agentApi.ts`）：已經寫好，會呼叫 `/agent-api/apps/quotation_agent/users/{user}/sessions` 建立 session，再對 `/agent-api/run_sse` 送訊息。nginx 已把 `/agent-api/` 轉到 `http://agent:8080/`。前端只會顯示 Workflow 中 `respond` 節點輸出的文字（依事件的 `nodeInfo.path` 判斷），所以你的 Agent 要有一個叫 `respond` 的節點負責最終回覆，而且 ADK 的 app 名稱必須是 `quotation_agent`。
- **資料庫與測試資料**：`scripts/seed-test-data.sql`。報價單 `QT-20260330-001`、客戶「史塔克工業」「魔女宅急便」都在裡面。

你要做的只有一件事：建立 `agent/` 資料夾裡的 ADK Agent，把它接上 MCP Server 與 Chat UI，並加進 Docker Compose。

## 1. Agent 功能與情境需求

使用者可以透過 Chat UI 用自然語言完成以下操作（都對應到 MCP Server 的一個工具）：

1.1. 查詢報價單：「我要查詢報價單，報價單編號：QT-20260330-001」→ 回覆報價單詳細資訊，包含品項清單。
1.2. 查詢客戶的報價單清單：「我要查詢客戶的報價單清單，客戶名稱：史塔克工業」→ 回覆該客戶的所有報價單。
1.3. 修改報價單報價因子：「我要修改報價單報價因子，報價單編號：QT-20260330-001，報價因子改為 1.5」。
1.4. 修改報價單總價：「我要修改報價單總價，報價單編號：QT-20260330-001，總價改為 8000」。（MCP 工具會用二分法調整報價因子；這是刻意設計的練習，讓你觀察 Agent 透過工具反覆呼叫 API 的流程。）
1.5. 報價單轉訂單：「我要將報價單轉訂單，報價單編號：QT-20260330-001」。
1.6. 複製報價單：「我要複製報價單，報價單編號：QT-20260330-001」→ 回覆新產生的報價單編號。
1.7. 所有修改行為（1.3、1.4）MCP 工具都會先複製再改副本，原始報價單不會被更動。Agent 的回覆要明確告知使用者這一點（工具回傳的文字已包含，請原樣呈現）。
1.8. 所有回覆都要附上報價單或訂單的系統連結，使用純文字連結（例如 http://localhost:3000/quotations/12），不要用 Markdown 的 [文字](連結) 格式。
1.9. 若使用者缺少必要資料（例如沒給報價單編號），Agent 要追問缺少的欄位；使用者下一句補上資料後，Agent 要能接續完成原本的操作。
1.10. 禁止回應非報價單管理相關的需求（天氣、閒聊、客戶或產品的新增修改等），一律禮貌拒絕並說明只能處理報價單相關操作。拒答要由程式邏輯決定，不能只靠提示詞。

## 2. 技術需求

2.1. 使用 Python 3.12 與 Google Agent Development Kit (ADK) 2.10 以上。Agent 流程要用 ADK 的 Graph Workflow API（`google.adk.workflow.Workflow`）建成明確的圖：意圖分類節點（LLM，輸出 Pydantic 結構）→ 路由節點 → 各操作節點（各呼叫一個 MCP 工具）→ `respond` 回覆節點；追問與拒答也要是圖上的節點。只有意圖分類節點呼叫 LLM，工具的選擇與參數由程式決定。
2.2. 使用 google-agents-cli（`uv tool install google-agents-cli`）建立專案骨架：`agents-cli scaffold create ezstore-agent --agent adk --deployment-target none --prototype --agent-directory quotation_agent --root-agent-name quotation_agent --agent-guidance-filename CLAUDE.md`，產生後搬到本專案的 `agent/`。把 pyproject 的 google-adk 依賴改為 `google-adk[mcp,a2a]>=2.10,<3`，移除只有 GCP 部署才需要的套件。ADK 的 `App(name=...)` 必須是 `quotation_agent`。
2.3. 使用 uv 管理虛擬環境與依賴（`uv sync`），並提交 `uv.lock`。
2.4. Agent 透過 ADK 的 `McpToolset` + `StreamableHTTPConnectionParams` 連接 MCP Server，位址由環境變數 `MCP_URL` 提供（Compose 內為 `http://mcp-server:8000/mcp`，本機開發可用 `http://localhost:8010/mcp`）。
2.5. Agent 以 Container 部署：在 `docker-compose.yml` 新增 `agent` 服務（port 8080 只在內部網路，`depends_on: mcp-server`），在 `docker-compose.build.yml` 新增 `build: ./agent`，並讓 `frontend` 服務 `depends_on` 加上 `agent`。
2.6. LLM 使用 Gemini 3.8 Flash（`gemini-3.8-flash`），模型名稱以環境變數 `AGENT_MODEL` 注入。憑證二選一：
  2.6.1. Google AI Studio API key：環境變數 `GEMINI_API_KEY`，由使用者放在專案根目錄的 `.env`（已有 `.env.example`），Compose 傳給 Agent 容器。不可寫在程式碼或提交到 Git。
  2.6.2. Vertex AI：`GOOGLE_GENAI_USE_VERTEXAI=true`、`GOOGLE_CLOUD_PROJECT`、`GOOGLE_CLOUD_LOCATION=global`，本機以 `gcloud auth application-default login` 取得憑證。
  2.6.3. 沒有設定憑證時，`docker compose up` 仍要能把整套系統啟動，只有對話會失敗並回傳清楚的錯誤訊息。
2.7. 用 agents-cli 的 eval 機制（`agents-cli eval run`）建立至少 8 個評估案例：6 個操作各一個、1 個離題拒答、1 個「追問後補資料」的多輪案例。至少要有一個不靠 LLM 的 deterministic 指標檢查回覆含純文字連結。
2.8. 在 `.github/workflows/ci.yml` 的建置矩陣加入 `agent` 元件。
2.9. 不要修改 `mcp_server/`、`frontend/`、`backend/` 的程式碼。若你認為一定要改，先停下來說明原因並徵求同意。

## 3. 文件需求

3.1. 更新 README.md 與 README.zh-TW.md 的 AI Agent 章節：Workflow 圖、環境變數、本機開發與測試方式。
3.2. 在 `agent/README.md` 說明圖的設計與如何新增一個操作。

## 4. 實作順序與驗收方式

請依下列順序實作，每個階段完成後停下來讓我驗證，驗證通過再進行下一階段。驗收時請告訴我「要做什麼、應該看到什麼」，不要只貼指令。

4.1. 熟悉 MCP Server：先把 db、backend、mcp-server 用 Docker Compose 跑起來並灌入測試資料，然後用 MCP client 或 curl 呼叫 `get_quotation`。驗收方式：把回傳的文字貼給我看，內容要有 QT-20260330-001 的品項與系統連結。
4.2. Agent 本機測試：scaffold、寫好 Workflow、接上 MCP Server，用 `agents-cli playground` 測試。驗收方式：我會輸入第 1 節的六句指令、一句離題的話、以及先漏掉報價單編號再補上的兩句，你先告訴我每一句應該看到什麼。
4.3. Docker 與 Chat UI：加進 Compose，`docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build` 一次啟動全部服務。驗收方式：`docker compose ps` 每個服務都是 running 或 healthy；我在瀏覽器 http://localhost:3000/agent 輸入同樣的指令，回覆裡的連結要能點開對應的報價單或訂單頁。
4.4. Eval：`agents-cli eval run` 要能執行，把結果表貼給我。
4.5. CI 與 README：最後更新。
