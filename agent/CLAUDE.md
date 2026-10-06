# Coding Agent Guide

## Prerequisites

Install the CLI (one-time):
```bash
uv tool install google-agents-cli
```

---

## Development Phases

### Phase 1: Understand Requirements
Before writing any code, understand the project's requirements, constraints, and success criteria.

### Phase 2: Build and Implement
Implement agent logic in `quotation_agent/`. Use `agents-cli playground` for interactive testing. Iterate based on user feedback.

### Phase 3: The Evaluation Loop (Main Iteration Phase)
Start with 1-2 eval cases, run `agents-cli eval run`, iterate by making changes and rerunning it until satisfied. Expect 5-10+ iterations. Once you have a baseline, reach for `agents-cli eval compare` (regression diffs), `agents-cli eval analyze` (cluster failure modes), and `agents-cli eval optimize` (auto-tune prompts). See the **Evaluation Guide** for metrics, dataset schema, LLM-as-judge config, and common gotchas.

### Phase 4: Pre-Deployment Tests
Run `uv run pytest tests/unit tests/integration`. Fix issues until all tests pass.

### Phase 5: Deploy to Dev
**Requires explicit human approval.** Run `agents-cli deploy` only after user confirms. See the **Deployment Guide** for details.

### Phase 6: Production Deployment
Ask the user: Option A (simple single-project) or Option B (full CI/CD pipeline with `agents-cli infra cicd`).

## Development Commands

| Command | Purpose |
|---------|---------|
| `agents-cli playground` | Interactive local testing |
| `uv run pytest tests/unit tests/integration` | Run unit and integration tests |
| `agents-cli eval dataset synthesize` | Synthesize multi-turn eval scenarios for your agent |
| `agents-cli eval run` | Run the agent over the eval dataset and grade the traces |
| `agents-cli eval generate` / `agents-cli eval grade` | Decoupled form: produce traces, then grade them |
| `agents-cli eval compare` | Compare two grade-results files (regression check) |
| `agents-cli eval analyze` | Cluster failure modes from grade results |
| `agents-cli eval metric list` | List built-in metrics available in the SDK |
| `agents-cli eval optimize` | Auto-tune agent prompts using eval data |
| `agents-cli lint` | Check code quality |
| `agents-cli infra single-project` | Set up project infrastructure (Terraform) |
| `agents-cli deploy` | Deploy to dev |
| `agents-cli scaffold enhance` | Add deployment target or CI/CD to project |
| `agents-cli scaffold upgrade` | Upgrade project to latest version |

---

## Operational Guidelines for Coding Agents

- **Code preservation**: Only modify code directly targeted by the user's request. Preserve all surrounding code, config values (e.g., `model`), comments, and formatting.
- **NEVER change the model** unless explicitly asked.
- **Model 404 errors**: Fix `GOOGLE_CLOUD_LOCATION` (e.g., `global` instead of `us-east1`), not the model name.
- **ADK tool imports**: Import the tool instance, not the module: `from google.adk.tools.load_web_page import load_web_page`
- **Run Python with `uv`**: `uv run python script.py`. Run `agents-cli install` first.
- **Stop on repeated errors**: If the same error appears 3+ times, fix the root cause instead of retrying.
- **Terraform conflicts** (Error 409): Use `terraform import` instead of retrying creation.

---

## EZStore 專案專屬注意事項

- **Agent 是 Graph Workflow，不是單一 LlmAgent。** `quotation_agent/agent.py` 的 `root_agent` 是 `google.adk.workflow.Workflow`；只有 `classify_intent` 節點呼叫 LLM，其餘節點是純 Python 函式。新增操作時：在 `Intent.action` 加值 → `REQUIRED_FIELDS` 加必填欄位 → 新增 `act_<name>` 節點 → 加進 `ACTION_NODES` 與 `route` 的路由字典 → MCP Server 加對應工具 → `tests/eval/datasets` 加案例。
- **App 名稱必須等於資料夾名 `quotation_agent`**，前端 `APP_NAME` 與 eval 都依賴它。
- **邊的寫法**：ADK 2.x 用 `(a, b, c)` 表示鏈、`(node, {"route": target, DEFAULT_ROUTE: fallback})` 表示條件路由；不支援 `(from, to, "route")` 三元組。
- **不要把 JSON 範例直接寫進 `instruction` 字串**：ADK 會把 `{...}` 當 state 變數注入。`prompts.py` 用 InstructionProvider 函式回傳固定文字來避開。
- **MCP 呼叫**在 `_call_mcp`：`McpToolset.get_tools()` → `McpTool.run_async(args=..., tool_context=ToolContext(invocation_context=ctx.get_invocation_context(), function_call_id=...))`，回傳 dict（`content[].text`、`isError`）。
- **模型**：`AGENT_MODEL` 環境變數（預設 `gemini-3.8-flash`），不要在程式碼寫死其他模型。
- **Cloud Trace**：`fast_api_app.py` 預設 `otel_to_cloud=False`；要送 Cloud Trace 需 `uv add "google-adk[otel-gcp]"` 並設 `OTEL_TO_CLOUD=true`。
- **本機埠**：MCP Server 預設 8000 常與其他本機服務衝突，本機測試用 `MCP_PORT=8010` 並設 `MCP_URL=http://localhost:8010/mcp`。
- **沒有金鑰也能測**：`tests/unit` 完全離線；`tests/integration/test_workflow_offline.py` 用規則式分類器取代 LLM，只需要 MCP Server 與後端。
