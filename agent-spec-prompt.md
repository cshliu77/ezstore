請使用 Git 開一個分支叫做 feature/ezstore-agent-develop，進行下列「報價單管理 Agent」與「MCP Server」的開發。開發過程請優先使用 Context7 MCP 確認各套件的最新用法，並檢查有哪些 skills 與 MCP tools 可以協助（例如 google-agents-cli 系列 skills、Playwright-MCP、chrome-devtools-mcp）。

## 1. Agent 功能與情境需求

使用者可以透過自然語言指令完成以下操作：

1.1. 查詢報價單：使用者說「我要查詢報價單，報價單編號：QT-20260330-001」，Agent 依報價單編號查詢並回覆該報價單的詳細資訊，包含報價品項清單。
1.2. 查詢客戶的報價單清單：使用者說「我要查詢客戶的報價單清單，客戶名稱：史塔克工業」，Agent 依客戶名稱查詢並回覆該客戶的所有報價單清單。
1.3. 修改報價單報價因子：使用者說「我要修改報價單報價因子，報價單編號：QT-20260330-001，報價因子改為 1.5」，Agent 依報價單編號與新的報價因子更新設定。
1.4. 修改報價單總價：使用者說「我要修改報價單總價，報價單編號：QT-20260330-001，總價改為 100000」，Agent 透過二分法搜尋調整報價因子，使總價逼近使用者要求的數值，最多迭代 20 次。（說明：總價與報價因子是線性關係，其實一次除法就能算出因子；這裡刻意要求用二分法，是為了練習「Agent 透過工具反覆呼叫 API 並依結果調整」的迭代流程。）
1.5. 報價單轉訂單：使用者說「我要將報價單轉訂單，報價單編號：QT-20260330-001」，Agent 依該報價單的客戶與品項建立一筆新訂單，並以 quotation_id 關聯原報價單。不要發佈或修改原始報價單。
1.6. 複製報價單：使用者說「我要複製報價單，報價單編號：QT-20260330-001」，Agent 透過 MCP Server 的複製工具建立一筆新的報價單，新編號由系統自動產生並回覆給使用者。
1.7. 所有修改行為（1.3、1.4）都要先複製報價單，在複製出來的報價單上修改，確保原始報價單不會被直接更動。回覆中要明確告知使用者原始報價單未修改。
1.8. 所有回覆都要附上報價單或訂單的系統連結，使用純文字連結（例如 http://localhost:3000/quotations/12），不要用 Markdown 的 [文字](連結) 格式，讓使用者可以直接點擊進入系統查看。
1.9. 若使用者缺少必要資料（例如沒給報價單編號），Agent 要追問缺少的欄位；使用者在下一句補上資料後，Agent 要能接續完成原本的操作。
1.10. 禁止 Agent 回應非報價單管理相關的需求（天氣、閒聊、客戶或產品的新增修改等），一律禮貌拒絕並說明只能處理報價單相關操作。拒答要由程式邏輯決定，不能只靠提示詞。

## 2. 技術需求

2.1. 使用 Python 3.12 與 Google Agent Development Kit (ADK) 2.10 以上開發。Agent 流程要用 ADK 的 Graph Workflow API（`google.adk.workflow.Workflow`）建成明確的圖：意圖分類節點（LLM）→ 路由節點 → 各操作節點（呼叫 MCP 工具）→ 回覆節點；追問與拒答也要是圖上的節點。只有意圖分類節點呼叫 LLM，工具的選擇與參數由程式決定。
2.2. 使用 google-agents-cli（`uv tool install google-agents-cli`）建立 Agent 專案骨架：`agents-cli scaffold create <name> --agent adk --deployment-target none --prototype --agent-directory quotation_agent --root-agent-name quotation_agent --agent-guidance-filename CLAUDE.md`，產生的專案放在本專案的 `agent/` 資料夾。骨架產生後，把 pyproject 的 google-adk 依賴改為 `google-adk[mcp,a2a]>=2.10,<3`，移除只有 GCP 部署才需要的套件。
2.3. 使用 uv 管理虛擬環境與依賴（`uv sync`），並提交 `uv.lock`。
2.4. Agent 以 Container 部署到本機 Docker 環境，更新既有的 docker-compose.yml 與 docker-compose.build.yml。
2.5. 使用 Python 開發 MCP Server（mcp Python SDK 2.x，`from mcp.server import MCPServer`），把報價單工具註冊到 MCP Server，讓 Agent 透過這些工具完成操作。MCP Server 只透過 EZStore 後端的 REST API 存取資料。
2.6. 前端繼續用 ReactJS 開發一個與 Agent 對話的 UI 元件，讓使用者用自然語言操作報價單。前端透過 nginx 反向代理 `/agent-api/` 連到 Agent 服務。
2.7. 使用 Playwright 搭配 Playwright-MCP 進行前端 E2E 測試與測試腳本開發。
2.8. 本專案會有下列子資料夾：
  2.8.1. `agent/`：Agent 程式碼與設定（由 agents-cli 產生）。
  2.8.2. `mcp_server/`：MCP Server 程式碼與設定。
2.9. Agent 服務與 MCP Server 服務各自使用一個 Container 部署。
2.10. ADK 的 LLM 使用 Gemini 3.8 Flash（`gemini-3.8-flash`，Google AI Studio 免費方案可用），透過 AI Studio 的 API key 整合。模型名稱以環境變數 `AGENT_MODEL` 注入，方便切換。
  2.10.1. API key 由使用者設定在 `.env` 檔案（變數名 `GEMINI_API_KEY`），Docker Compose 透過環境變數傳給 Agent Container。你要提供 `.env.example` 引導使用者填入。
  2.10.2. 確保 API key 安全：不可寫在程式碼或提交到 Git，只能透過環境變數使用。
  2.10.3. 沒有設定 API key 時，`docker compose up` 仍要能把整套系統啟動起來，只有 Agent 對話會失敗並回傳清楚的錯誤訊息。
2.11. MCP Server 提供 Streamable HTTP 的 API 讓 Agent 呼叫。切記不要使用 SSE（Server-Sent Events）傳輸方式實作 MCP Server，SSE 傳輸已被 MCP 標記為 deprecated。
2.12. 可以修改 Go 後端，但只限新增查詢參數或端點（例如讓 `GET /api/v1/quotations` 支援 `?quotation_number=` 精確查詢），不可改變既有 API 的行為。
2.13. 用 agents-cli 的 eval 機制（`agents-cli eval run`）建立評估案例與指標，檔名與指標名稱請完全依照下列規定（後續的評鑑 LAB `eval-lab.md` 會用到）：
  - `agent/tests/eval/datasets/quotation-actions.json`：6 個操作各一個案例，`eval_case_id` 用工具名（`get_quotation`、`list_customer_quotations`、`duplicate_quotation`、`update_pricing_factor`、`adjust_total_price`、`convert_to_order`）。
  - `agent/tests/eval/datasets/quotation-guardrails.json`：`off_topic_weather`、`off_topic_customer_crud` 兩個離題拒答案例，以及 `clarify_then_complete` 一個「先追問再補報價單編號」的多輪案例（用 `agent_data.turns` 寫前一輪）。
  - `agent/tests/eval/eval_config.yaml` 的 `metrics_to_run` 固定為四個：`custom_response_quality`（LLM 評審，1–5 分）、`link_present`（程式判定，純文字 `/quotations/<id>` 或 `/orders/<id>` 連結，Markdown 連結給 0）、`refusal_or_action`（LLM 評審，離題必須拒答且不呼叫工具；報價單操作必須完成且不可用 Markdown 連結；缺資料追問也算符合）、`agent_turn_count`（回合數）。

## 3. 文件需求

3.1. 更新 README.md 與 README.zh-TW.md，加入 Agent 與 MCP Server 的說明，包含功能、架構（含 Workflow 圖）、技術選型、部署方式、測試與評估方式。

## 4. 實作順序與驗收方式

請依下列順序實作，每個階段完成後停下來讓我驗證，驗證通過再進行下一階段。驗收時請告訴我「要做什麼、應該看到什麼」，不要只貼指令。

4.1. MCP Server：先完成，可獨立驗證。驗收方式：MCP Server 啟動後，你用 curl 或 Python 呼叫 `get_quotation`，把回傳的文字貼給我看，內容要包含報價單 QT-20260330-001 的品項與系統連結。
4.2. Agent：連接 MCP Server，用 `agents-cli playground` 或 `adk web` 本機測試。驗收方式：我會在畫面輸入第 1 節的六句指令、一句離題的話、以及先漏掉報價單編號再補上的兩句，你先告訴我每一句應該看到什麼。
4.3. Chat UI：React 頁面與 nginx 反向代理。驗收方式：我在瀏覽器 http://localhost:3000/agent 輸入同樣的指令，回覆裡的連結要能點開對應的報價單或訂單頁。
4.4. Docker：更新 compose 檔案，`docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build` 一次啟動全部服務。驗收方式：`docker compose ps` 每個服務都是 running 或 healthy。
4.5. E2E 測試與 eval：`bun run e2e` 與 `agents-cli eval run` 都要能執行，把結果表貼給我。
4.6. CI 與 README：最後更新。
