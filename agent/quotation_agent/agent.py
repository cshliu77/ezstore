"""EZStore 報價單管理 Agent — Google ADK 2.x Graph Workflow。

圖的結構（每一則使用者訊息都從 START 重新跑一次，跨回合記憶放在 session state）：

    START → load_context → classify_intent (LLM) → route
              ├─ get_quotation / list_customer_quotations / duplicate_quotation
              ├─ update_pricing_factor / adjust_total_price / convert_to_order   ← 各呼叫一個 MCP 工具
              ├─ clarify   （缺欄位時追問，並把意圖暫存到 state.pending_intent）
              └─ off_topic （固定拒答；由程式決定，不靠 prompt）
            全部 → respond （顯示回覆、更新 chat_history）

只有 classify_intent 會呼叫 LLM；工具的選擇與參數完全由程式決定，確保行為可預期。
"""

from __future__ import annotations

import functools
import json
import os
import uuid
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.agents.context import Context
from google.adk.apps import App
from google.adk.events.event import Event
from google.adk.models import Gemini
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import (
    StreamableHTTPConnectionParams,
)
from google.adk.tools.tool_context import ToolContext
from google.adk.workflow import DEFAULT_ROUTE, START, Workflow, node
from google.genai import types
from pydantic import BaseModel, Field

from quotation_agent.prompts import (
    CLARIFY_GENERIC_REPLY,
    FIELD_LABELS,
    OFF_TOPIC_REPLY,
    classify_instruction,
)

# ---------------------------------------------------------------------------
# 設定
# ---------------------------------------------------------------------------

# 先載入專案根目錄的 .env（容器內已有的環境變數優先，不覆寫）。
# agents-cli / adk 可能在載入 .env 之前就匯入這個模組，所以不能只靠 fast_api_app.py 的 load_dotenv。
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

MODEL = os.environ.get("AGENT_MODEL", "gemini-3.8-flash")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
HISTORY_LIMIT = 10


def mcp_url() -> str:
    return os.environ.get("MCP_URL", "http://mcp-server:8000/mcp")


@functools.cache
def get_toolset() -> McpToolset:
    """延遲建立 MCP toolset，讓 MCP_URL 在第一次呼叫工具時才決定。"""
    return McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url=mcp_url(),
            timeout=10,
            sse_read_timeout=180,
        ),
    )

# ---------------------------------------------------------------------------
# 意圖模型
# ---------------------------------------------------------------------------

Action = Literal[
    "get_quotation",
    "list_customer_quotations",
    "duplicate_quotation",
    "update_pricing_factor",
    "adjust_total_price",
    "convert_to_order",
    "clarify",
    "off_topic",
]

TOOL_ACTIONS: tuple[str, ...] = (
    "get_quotation",
    "list_customer_quotations",
    "duplicate_quotation",
    "update_pricing_factor",
    "adjust_total_price",
    "convert_to_order",
)

REQUIRED_FIELDS: dict[str, list[str]] = {
    "get_quotation": ["quotation_number"],
    "list_customer_quotations": ["customer_name"],
    "duplicate_quotation": ["quotation_number"],
    "update_pricing_factor": ["quotation_number", "pricing_factor"],
    "adjust_total_price": ["quotation_number", "target_total_price"],
    "convert_to_order": ["quotation_number"],
}

INTENT_FIELDS = ("quotation_number", "customer_name", "pricing_factor", "target_total_price")


class Intent(BaseModel):
    """classify_intent 的結構化輸出。"""

    action: Action = Field(description="使用者想做的操作")
    quotation_number: str | None = Field(None, description="報價單編號，例如 QT-20260330-001")
    customer_name: str | None = Field(None, description="客戶名稱")
    pricing_factor: float | None = Field(None, description="新的報價因子")
    target_total_price: float | None = Field(None, description="目標總價")
    reason: str = Field("", description="一句話說明判斷依據")


# ---------------------------------------------------------------------------
# 節點：前處理 / 分類 / 路由
# ---------------------------------------------------------------------------


def _content_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        content = types.Content.model_validate(content)
    return "".join(p.text or "" for p in (content.parts or []))


WORKFLOW_NAME = "quotation_agent"


def _history_from_session(ctx: Context, current_message: str) -> list[dict[str, str]]:
    """從 session 事件重建最近的對話（使用者訊息與助手最終回覆）。

    以 session 事件為準而不是自己維護的 state，這樣即使 session 是外部塞進來的
    （例如 eval 的多輪案例、或 state 遺失），分類器仍看得到前幾輪脈絡。
    """
    session = getattr(ctx, "session", None)
    events = getattr(session, "events", None) or []
    history: list[dict[str, str]] = []
    for ev in events:
        content = getattr(ev, "content", None)
        if not (content and content.parts):
            continue
        text = "".join(p.text or "" for p in content.parts).strip()
        if not text:
            continue
        if ev.author == "user":
            history.append({"role": "user", "text": text[:300]})
        elif ev.author == WORKFLOW_NAME:
            history.append({"role": "agent", "text": text[:300]})
    # Runner 會先把這一輪的使用者訊息寫進 session，避免重複出現在 history 裡
    if history and history[-1]["role"] == "user" and history[-1]["text"] == current_message[:300]:
        history.pop()
    return history[-HISTORY_LIMIT:]


def load_context(ctx: Context, node_input: Any) -> str:
    """把 START 的 Content 轉成 classifier 需要的 JSON 字串（附最近對話與待補意圖）。"""
    message = _content_text(node_input).strip()
    history = _history_from_session(ctx, message)
    if not history:
        history = list(ctx.state.get("chat_history", []))[-HISTORY_LIMIT:]
    payload = {
        "history": history,
        "pending_intent": ctx.state.get("pending_intent"),
        "message": message,
    }
    return json.dumps(payload, ensure_ascii=False)


classify_intent = LlmAgent(
    name="classify_intent",
    description="把使用者訊息分類成報價單操作意圖",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=classify_instruction,
    output_schema=Intent,
    output_key="intent",
    generate_content_config=types.GenerateContentConfig(temperature=0),
)


def _merge_pending(intent: Intent, pending: dict | None) -> Intent:
    """使用者只補充資料時，沿用上一輪等待中的意圖並合併欄位。"""
    if not pending:
        return intent
    try:
        prev = Intent.model_validate(pending)
    except Exception:  # noqa: BLE001 — state 內容不可信，壞掉就忽略
        return intent
    if prev.action not in TOOL_ACTIONS:
        return intent
    if intent.action in ("clarify", prev.action):
        intent.action = prev.action
        for field in INTENT_FIELDS:
            if getattr(intent, field) is None:
                setattr(intent, field, getattr(prev, field))
    return intent


def route(ctx: Context, node_input: Any):
    """驗證必填欄位並決定走哪一條邊。輸出 {"intent": ..., "missing": [...]}。"""
    intent = node_input if isinstance(node_input, Intent) else Intent.model_validate(node_input)
    intent = _merge_pending(intent, ctx.state.get("pending_intent"))

    missing = [f for f in REQUIRED_FIELDS.get(intent.action, []) if getattr(intent, f) is None]
    if intent.action == "off_topic":
        target = "off_topic"
    elif intent.action == "clarify" or missing:
        target = "clarify"
    else:
        target = intent.action

    return Event(output={"intent": intent.model_dump(), "missing": missing}, route=target)


# ---------------------------------------------------------------------------
# 節點：MCP 工具呼叫
# ---------------------------------------------------------------------------


async def _call_mcp(ctx: Context, tool_name: str, args: dict[str, Any]) -> str:
    tools = {t.name: t for t in await get_toolset().get_tools()}
    tool = tools.get(tool_name)
    if tool is None:
        return f"操作失敗：MCP Server 沒有提供 {tool_name} 工具（目前有：{', '.join(sorted(tools))}）"

    tool_context = ToolContext(
        invocation_context=ctx.get_invocation_context(),
        function_call_id=str(uuid.uuid4()),
    )
    try:
        result = await tool.run_async(args=args, tool_context=tool_context)
    except Exception as e:  # noqa: BLE001 — 任何連線/協定錯誤都轉成可讀訊息
        return f"操作失敗：無法呼叫 MCP 工具 {tool_name}（{e}）"

    if isinstance(result, str):
        return result
    if not isinstance(result, dict):
        return str(result)

    text = "\n".join(
        c.get("text", "")
        for c in result.get("content", [])
        if isinstance(c, dict) and c.get("type") == "text"
    ).strip()
    if result.get("isError"):
        return f"操作失敗：{text or result}"
    return text or json.dumps(result, ensure_ascii=False)


def _intent_of(node_input: dict) -> dict:
    return node_input["intent"]


@node(name="get_quotation")
async def act_get_quotation(ctx: Context, node_input: dict) -> str:
    i = _intent_of(node_input)
    return await _call_mcp(ctx, "get_quotation", {"quotation_number": i["quotation_number"]})


@node(name="list_customer_quotations")
async def act_list_customer_quotations(ctx: Context, node_input: dict) -> str:
    i = _intent_of(node_input)
    return await _call_mcp(ctx, "list_customer_quotations", {"customer_name": i["customer_name"]})


@node(name="duplicate_quotation")
async def act_duplicate_quotation(ctx: Context, node_input: dict) -> str:
    i = _intent_of(node_input)
    return await _call_mcp(ctx, "duplicate_quotation", {"quotation_number": i["quotation_number"]})


@node(name="update_pricing_factor")
async def act_update_pricing_factor(ctx: Context, node_input: dict) -> str:
    i = _intent_of(node_input)
    return await _call_mcp(
        ctx,
        "update_pricing_factor",
        {"quotation_number": i["quotation_number"], "new_pricing_factor": i["pricing_factor"]},
    )


@node(name="adjust_total_price")
async def act_adjust_total_price(ctx: Context, node_input: dict) -> str:
    i = _intent_of(node_input)
    return await _call_mcp(
        ctx,
        "adjust_total_price",
        {"quotation_number": i["quotation_number"], "target_total_price": i["target_total_price"]},
    )


@node(name="convert_to_order")
async def act_convert_to_order(ctx: Context, node_input: dict) -> str:
    i = _intent_of(node_input)
    return await _call_mcp(ctx, "convert_to_order", {"quotation_number": i["quotation_number"]})


# ---------------------------------------------------------------------------
# 節點：追問 / 拒答 / 回覆
# ---------------------------------------------------------------------------


def clarify(node_input: dict):
    intent = node_input["intent"]
    missing = node_input.get("missing", [])
    if intent.get("action") in TOOL_ACTIONS and missing:
        text = "請提供：" + "、".join(FIELD_LABELS.get(m, m) for m in missing)
        return Event(
            output={"text": text, "keep_pending": True},
            state={"pending_intent": intent},
        )
    return Event(output={"text": CLARIFY_GENERIC_REPLY, "keep_pending": False})


def off_topic(node_input: dict) -> str:
    return OFF_TOPIC_REPLY


def _user_text(ctx: Context) -> str:
    try:
        return _content_text(ctx.get_invocation_context().user_content).strip()
    except Exception:  # noqa: BLE001
        return ""


def respond(ctx: Context, node_input: Any):
    """把最終文字顯示給使用者，並更新 session state 的對話紀錄。"""
    keep_pending = False
    if isinstance(node_input, dict):
        text = str(node_input.get("text", ""))
        keep_pending = bool(node_input.get("keep_pending"))
    else:
        text = str(node_input)

    if "http" not in text and not keep_pending and text != OFF_TOPIC_REPLY:
        text = f"{text}\n系統連結: {FRONTEND_URL}/quotations"

    history = list(ctx.state.get("chat_history", []))
    history.append({"role": "user", "text": _user_text(ctx)})
    history.append({"role": "agent", "text": text[:500]})
    state_delta: dict[str, Any] = {"chat_history": history[-HISTORY_LIMIT:]}
    if not keep_pending:
        state_delta["pending_intent"] = None

    yield Event(message=text)
    yield Event(output=text, state=state_delta)


# ---------------------------------------------------------------------------
# 圖
# ---------------------------------------------------------------------------

ACTION_NODES = [
    act_get_quotation,
    act_list_customer_quotations,
    act_duplicate_quotation,
    act_update_pricing_factor,
    act_adjust_total_price,
    act_convert_to_order,
]

root_agent = Workflow(
    name=WORKFLOW_NAME,
    description="EZStore 報價單管理助手：查詢、複製、修改報價因子／總價、報價單轉訂單",
    edges=[
        # 主幹：START → 前處理 → LLM 意圖分類 → 路由
        (START, load_context, classify_intent, route),
        # 條件路由：route 節點回傳的 route 值決定走哪一個節點
        (
            route,
            {
                "get_quotation": act_get_quotation,
                "list_customer_quotations": act_list_customer_quotations,
                "duplicate_quotation": act_duplicate_quotation,
                "update_pricing_factor": act_update_pricing_factor,
                "adjust_total_price": act_adjust_total_price,
                "convert_to_order": act_convert_to_order,
                "clarify": clarify,
                DEFAULT_ROUTE: off_topic,
            },
        ),
        # 所有分支都匯入 respond
        *[(n, respond) for n in [*ACTION_NODES, clarify, off_topic]],
    ],
)

app = App(
    # 必須與套件資料夾名一致（quotation_agent），前端與 eval 都以此作為 app_name。
    root_agent=root_agent,
    name="quotation_agent",
)
