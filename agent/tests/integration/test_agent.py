"""需要模型憑證的端對端整合測試（沒有憑證或 MCP Server 時自動 skip）。

執行前置（二選一）：
    export GEMINI_API_KEY=...            # Google AI Studio
    # 或 Vertex AI：GOOGLE_GENAI_USE_VERTEXAI=true GOOGLE_CLOUD_PROJECT=<id> + gcloud auth application-default login
    docker compose up -d db backend && 灌 seed
    cd mcp_server && MCP_PORT=8010 BACKEND_URL=http://localhost:8080 uv run python server.py
    cd agent && MCP_URL=http://localhost:8010/mcp uv run pytest tests/integration/test_agent.py -q
"""

from __future__ import annotations

import os
import re

import httpx
import pytest
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import InMemoryRunner
from google.genai import types

from quotation_agent.agent import app as adk_app

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


def _has_model_credentials() -> bool:
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return True
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in ("true", "1")
    return use_vertex and bool(os.getenv("GOOGLE_CLOUD_PROJECT"))


pytestmark = [
    pytest.mark.skipif(
        not _has_model_credentials(),
        reason="需要 GEMINI_API_KEY，或 GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT（ADC）",
    ),
    pytest.mark.skipif(not _mcp_reachable(), reason=f"MCP Server 未在 {MCP_URL} 執行"),
]


async def _final_text(runner: InMemoryRunner, session_id: str, text: str) -> str:
    final = ""
    async for ev in runner.run_async(
        user_id="test_user",
        session_id=session_id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=text)]),
        run_config=RunConfig(streaming_mode=StreamingMode.SSE),
    ):
        if ev.partial or not (ev.content and ev.content.parts):
            continue
        t = "".join(p.text or "" for p in ev.content.parts)
        if t:
            final = t
    return final


@pytest.mark.asyncio
async def test_get_quotation_end_to_end() -> None:
    runner = InMemoryRunner(app=adk_app)
    session = await runner.session_service.create_session(
        app_name=adk_app.name, user_id="test_user"
    )
    text = await _final_text(runner, session.id, "我要查詢報價單，報價單編號：QT-20260330-001")
    assert "QT-20260330-001" in text
    assert re.search(r"https?://\S+/quotations/\d+", text), text


@pytest.mark.asyncio
async def test_off_topic_is_refused() -> None:
    runner = InMemoryRunner(app=adk_app)
    session = await runner.session_service.create_session(
        app_name=adk_app.name, user_id="test_user"
    )
    text = await _final_text(runner, session.id, "今天台北天氣如何？")
    assert "報價單" in text
    assert "天氣" not in text.replace("報價單", "") or "只能" in text
