"""不需要 Gemini API key 的整合測試：用規則式分類器取代 LLM 節點，驗證圖的其餘部分。

驗證項目：
- 路由：完整意圖 → 對應 MCP 工具節點 → respond；缺欄位 → clarify；離題 → off_topic
- MCP 工具真的被呼叫（需要 MCP Server 與後端在本機執行，否則整個模組 skip）
- 跨回合 state：第一回合缺編號被追問，第二回合只回編號就能完成查詢
- 事件 author 為 Workflow 名稱 quotation_agent，且 node_info.path 以 /respond@N 結尾（前端據此過濾）

執行方式：
    docker compose up -d db backend && 灌 seed
    cd mcp_server && BACKEND_URL=http://localhost:8080 uv run python server.py
    cd agent && MCP_URL=http://localhost:8000/mcp uv run pytest tests/integration -q
"""

from __future__ import annotations

import json
import os
import re

import httpx
import pytest
from google.adk.apps import App
from google.adk.runners import InMemoryRunner
from google.adk.workflow import DEFAULT_ROUTE, START, Workflow
from google.genai import types

from quotation_agent import agent as qa
from quotation_agent.prompts import OFF_TOPIC_REPLY

MCP_URL = os.environ.get("MCP_URL", "http://localhost:8000/mcp")


def _mcp_reachable() -> bool:
    try:
        r = httpx.post(
            MCP_URL,
            json={"jsonrpc": "2.0", "id": 1, "method": "ping"},
            headers={"Accept": "application/json, text/event-stream", "Content-Type": "application/json"},
            timeout=3,
        )
        return r.status_code < 500
    except httpx.HTTPError:
        return False


pytestmark = pytest.mark.skipif(not _mcp_reachable(), reason=f"MCP Server 未在 {MCP_URL} 執行")


_QT = re.compile(r"QT-\d{8}-\d{3}")


def fake_classify(node_input: str) -> dict:
    """規則式分類器，模仿 classify_intent 的輸出格式（Intent dict）。"""
    payload = json.loads(node_input)
    msg: str = payload["message"]
    m = _QT.search(msg)
    number = m.group(0) if m else None
    if "天氣" in msg or "新增" in msg:
        return {"action": "off_topic"}
    if "清單" in msg or "客戶" in msg:
        name = msg.split("客戶名稱：")[-1].strip() if "客戶名稱：" in msg else None
        return {"action": "list_customer_quotations", "customer_name": name}
    if "報價因子" in msg:
        f = re.search(r"改為\s*([\d.]+)", msg)
        return {
            "action": "update_pricing_factor",
            "quotation_number": number,
            "pricing_factor": float(f.group(1)) if f else None,
        }
    if "轉訂單" in msg:
        return {"action": "convert_to_order", "quotation_number": number}
    if "查詢" in msg:
        return {"action": "get_quotation", "quotation_number": number}
    if number:
        # 只回編號：模擬 LLM 依 history 推斷上一輪的操作
        last_user = next((h["text"] for h in reversed(payload["history"]) if h["role"] == "user"), "")
        if "查詢" in last_user:
            return {"action": "get_quotation", "quotation_number": number}
        return {"action": "clarify", "quotation_number": number}
    return {"action": "clarify"}


def build_offline_workflow() -> Workflow:
    return Workflow(
        name="quotation_agent",
        edges=[
            (START, qa.load_context, fake_classify, qa.route),
            (
                qa.route,
                {
                    "get_quotation": qa.act_get_quotation,
                    "list_customer_quotations": qa.act_list_customer_quotations,
                    "duplicate_quotation": qa.act_duplicate_quotation,
                    "update_pricing_factor": qa.act_update_pricing_factor,
                    "adjust_total_price": qa.act_adjust_total_price,
                    "convert_to_order": qa.act_convert_to_order,
                    "clarify": qa.clarify,
                    DEFAULT_ROUTE: qa.off_topic,
                },
            ),
            *[(n, qa.respond) for n in [*qa.ACTION_NODES, qa.clarify, qa.off_topic]],
        ],
    )


async def _run_turn(runner: InMemoryRunner, session_id: str, text: str) -> list:
    events = []
    async for ev in runner.run_async(
        user_id="u",
        session_id=session_id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=text)]),
    ):
        events.append(ev)
    return events


def _final_text(events: list) -> tuple[str, str | None]:
    """回傳 (最後一則有文字的事件內容, 其 author)，並確認它來自 respond 節點。"""
    for ev in reversed(events):
        if ev.content and ev.content.parts:
            text = "".join(p.text or "" for p in ev.content.parts)
            if text:
                path = getattr(getattr(ev, "node_info", None), "path", "") or ""
                assert re.search(r"/respond@\d+$", path), f"文字事件不是來自 respond 節點：{path}"
                return text, ev.author
    return "", None


@pytest.fixture
def runner() -> InMemoryRunner:
    app = App(name="quotation_agent", root_agent=build_offline_workflow())
    return InMemoryRunner(app=app)


@pytest.mark.asyncio
async def test_get_quotation_calls_mcp_and_replies_with_link(runner: InMemoryRunner) -> None:
    session = await runner.session_service.create_session(app_name="quotation_agent", user_id="u")
    events = await _run_turn(runner, session.id, "我要查詢報價單，報價單編號：QT-20260330-001")
    text, author = _final_text(events)
    assert author == "quotation_agent"
    assert "QT-20260330-001" in text
    assert re.search(r"http://\S+/quotations/\d+", text)
    assert "[" not in text or "](" not in text  # 沒有 Markdown 連結


@pytest.mark.asyncio
async def test_off_topic_is_refused_without_tools(runner: InMemoryRunner) -> None:
    session = await runner.session_service.create_session(app_name="quotation_agent", user_id="u")
    events = await _run_turn(runner, session.id, "今天台北天氣如何？")
    text, author = _final_text(events)
    assert author == "quotation_agent"
    assert text == OFF_TOPIC_REPLY


@pytest.mark.asyncio
async def test_clarify_then_complete_across_turns(runner: InMemoryRunner) -> None:
    session = await runner.session_service.create_session(app_name="quotation_agent", user_id="u")

    events = await _run_turn(runner, session.id, "我要查詢報價單")
    text, _ = _final_text(events)
    assert text.startswith("請提供：")

    session = await runner.session_service.get_session(
        app_name="quotation_agent", user_id="u", session_id=session.id
    )
    assert session.state.get("pending_intent", {}).get("action") == "get_quotation"

    events = await _run_turn(runner, session.id, "QT-20260330-001")
    text, author = _final_text(events)
    assert author == "quotation_agent"
    assert "報價單編號: QT-20260330-001" in text

    session = await runner.session_service.get_session(
        app_name="quotation_agent", user_id="u", session_id=session.id
    )
    assert session.state.get("pending_intent") is None


@pytest.mark.asyncio
async def test_update_pricing_factor_keeps_original(runner: InMemoryRunner) -> None:
    session = await runner.session_service.create_session(app_name="quotation_agent", user_id="u")
    events = await _run_turn(
        runner, session.id, "我要修改報價單報價因子，報價單編號：QT-20260330-001，報價因子改為 1.5"
    )
    text, author = _final_text(events)
    assert author == "quotation_agent"
    assert "未修改" in text
    assert "1.5" in text
    assert len(re.findall(r"http://\S+/quotations/\d+", text)) >= 2
