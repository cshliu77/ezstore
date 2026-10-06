# ezstore-agent

EZStore 報價單管理 Agent。以 `agents-cli scaffold create` 產生骨架（google-agents-cli 1.7），Agent 本體是 Google ADK 2.x 的 **Graph Workflow**，透過 MCP Server（Streamable HTTP）操作 EZStore 後端。

## 專案結構

```
agent/
├── quotation_agent/
│   ├── agent.py            # Workflow 圖：load_context → classify_intent(LLM) → route → 工具節點 → respond
│   ├── prompts.py          # 意圖分類指令（InstructionProvider）、固定回覆文字
│   ├── fast_api_app.py     # FastAPI 服務：ADK /run_sse、sessions、A2A
│   └── app_utils/          # session/artifact 服務、A2A 路由（骨架產生）
├── tests/
│   ├── unit/               # 純函式節點測試（route / clarify / off_topic）
│   ├── integration/
│   │   ├── test_workflow_offline.py   # 規則式分類器取代 LLM，驗證路由、MCP 呼叫、跨回合 state（需 MCP Server）
│   │   └── test_agent.py              # 真的呼叫 Gemini（需 GEMINI_API_KEY + MCP Server）
│   └── eval/               # agents-cli eval：datasets/*.json、eval_config.yaml、自訂指標
├── .env.example            # 複製為 .env
├── Dockerfile              # python:3.12-slim + uv sync --frozen
├── agents-cli-manifest.yaml
└── pyproject.toml          # google-adk[mcp,a2a]>=2.10
```

## 圖的設計

```
START → load_context → classify_intent → route
          ├─ get_quotation / list_customer_quotations / duplicate_quotation
          ├─ update_pricing_factor / adjust_total_price / convert_to_order   ← 各呼叫一個 MCP 工具
          ├─ clarify     缺欄位 → 追問，state.pending_intent 保留意圖
          └─ off_topic   固定拒答（程式決定）
        全部 → respond   顯示文字、更新 state.chat_history
```

- **只有 `classify_intent` 呼叫 LLM**，輸出 Pydantic `Intent`（action + 欄位）。工具與參數由 `route` 與各 `act_*` 節點決定，行為可預期、可單元測試。
- **每則訊息都從 START 重跑**；跨回合記憶放在 session state。`load_context` 把 `chat_history`、`pending_intent` 和本輪訊息包成 JSON 給分類器，所以使用者只回一個報價單編號也能接續上一輪的操作。
- **MCP 工具呼叫**：函式節點用 `McpToolset.get_tools()` 取得 `McpTool`，以 `run_async(args, tool_context)` 直接呼叫，不再經過第二次 LLM。
- **事件過濾**：所有函式節點的事件 `author` 都是 Workflow 名稱 `quotation_agent`，只有 `respond` 節點會輸出文字，事件的 `nodeInfo.path` 以 `/respond@N` 結尾。前端 `agentApi.ts` 據此只顯示最終回覆。

## 環境變數

| 變數 | 說明 | 預設 |
|------|------|------|
| `GEMINI_API_KEY` | Google AI Studio API key（與 Vertex AI 二選一） | — |
| `GOOGLE_GENAI_USE_VERTEXAI` / `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION` | 改走 Vertex AI（需 ADC：`gcloud auth application-default login`） | FALSE / — / global |
| `OTEL_TO_CLOUD` | 送 OpenTelemetry 到 Cloud Trace（需 `google-adk[otel-gcp]`） | 未開 |
| `AGENT_MODEL` | Gemini 模型 | `gemini-3.8-flash` |
| `MCP_URL` | MCP Server 的 Streamable HTTP 端點 | `http://mcp-server:8000/mcp` |
| `FRONTEND_URL` | 回覆中系統連結的前綴 | `http://localhost:3000` |
| `ALLOW_ORIGINS` | CORS 允許來源（逗號分隔） | 無 |

## 本機開發

```bash
uv tool install google-agents-cli        # 一次即可
cp .env.example .env                      # 填 GEMINI_API_KEY；本機把 MCP_URL 改成 http://localhost:8010/mcp
uv sync --group dev

# 先啟動後端與 MCP Server（見專案根目錄 README）
agents-cli playground                     # 網頁介面
agents-cli run "我要查詢報價單，報價單編號：QT-20260330-001"
```

## 測試與評估

```bash
uv run pytest tests/unit -q                                           # 不需 LLM、不需 MCP
MCP_URL=http://localhost:8010/mcp uv run pytest tests/integration -q  # 離線圖測試；有金鑰時一併跑 LLM 測試
agents-cli eval run --dataset tests/eval/datasets/quotation-guardrails.json --config tests/eval/eval_config.yaml
agents-cli eval run --dataset tests/eval/datasets/quotation-actions.json --config tests/eval/eval_config.yaml   # 會新增資料，重跑前重灌 seed
```

eval 案例（`tests/eval/datasets/`）：六個操作各一、兩個離題拒答、一個「追問後補資料」的多輪案例。指標：`custom_response_quality`（LLM 評分 1–5）、`link_present`（純文字連結，deterministic）、`refusal_or_action`（拒答／完成操作的規則判定）、`agent_turn_count`。

變更類案例（複製／修改／轉訂單）每跑一次都會新增資料，重跑前建議重新灌 seed。
