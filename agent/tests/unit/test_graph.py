"""純函式節點的單元測試（不需要 LLM、不需要 MCP Server）。"""

from __future__ import annotations

from types import SimpleNamespace

from google.adk.workflow import Workflow

from quotation_agent import agent
from quotation_agent.agent import Intent, clarify, load_context, off_topic, route
from quotation_agent.prompts import CLARIFY_GENERIC_REPLY, OFF_TOPIC_REPLY


def _ctx(state: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(state=state or {})


def test_root_agent_is_workflow_named_after_package() -> None:
    assert isinstance(agent.root_agent, Workflow)
    assert agent.root_agent.name == "quotation_agent"
    assert agent.app.name == "quotation_agent"


def test_load_context_wraps_message_with_history_and_pending() -> None:
    content = {"role": "user", "parts": [{"text": "我要查詢報價單"}]}
    state = {"chat_history": [{"role": "agent", "text": "hi"}], "pending_intent": None}
    out = load_context(_ctx(state), content)
    assert '"message": "我要查詢報價單"' in out
    assert '"history": [{"role": "agent", "text": "hi"}]' in out


def test_route_to_tool_when_fields_complete() -> None:
    ev = route(_ctx(), {"action": "get_quotation", "quotation_number": "QT-20260330-001"})
    assert ev.actions.route == "get_quotation"
    assert ev.output["missing"] == []


def test_route_to_clarify_when_required_field_missing() -> None:
    ev = route(_ctx(), {"action": "update_pricing_factor", "quotation_number": "QT-1"})
    assert ev.actions.route == "clarify"
    assert ev.output["missing"] == ["pricing_factor"]


def test_route_merges_pending_intent_on_follow_up() -> None:
    pending = Intent(action="get_quotation").model_dump()
    ev = route(
        _ctx({"pending_intent": pending}),
        {"action": "clarify", "quotation_number": "QT-20260330-001"},
    )
    assert ev.actions.route == "get_quotation"
    assert ev.output["intent"]["quotation_number"] == "QT-20260330-001"


def test_route_off_topic_uses_default_route() -> None:
    ev = route(_ctx(), {"action": "off_topic"})
    assert ev.actions.route == "off_topic"


def test_clarify_lists_missing_fields_and_keeps_pending() -> None:
    ev = clarify({"intent": {"action": "get_quotation"}, "missing": ["quotation_number"]})
    assert ev.output["text"].startswith("請提供：")
    assert ev.output["keep_pending"] is True
    assert ev.actions.state_delta["pending_intent"]["action"] == "get_quotation"


def test_clarify_generic_when_action_unknown() -> None:
    ev = clarify({"intent": {"action": "clarify"}, "missing": []})
    assert ev.output["text"] == CLARIFY_GENERIC_REPLY
    assert ev.output["keep_pending"] is False


def test_off_topic_reply_is_fixed_text() -> None:
    assert off_topic({}) == OFF_TOPIC_REPLY
