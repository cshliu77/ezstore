"""Deterministic metric：回覆是否含純文字系統連結（且沒有 Markdown 連結語法）。

- 報價單操作案例：必須包含 http(s)://.../quotations/<id> 或 /orders/<id>。
- 拒答案例（eval_case_id 以 off_topic 開頭）：不需要連結，直接給滿分。
- 任何案例：出現 Markdown 連結 [文字](網址) 一律 0 分（spec 1.8 要求純文字連結）。
"""

import re

_LINK = re.compile(r"https?://\S+/(quotations|orders)/\d+")
_MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(https?://[^)]+\)")


def _response_text(instance) -> str:
    response = instance.get("response") or {}
    if isinstance(response, str):
        return response
    parts = response.get("parts") or []
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict))


def evaluate(instance):
    text = _response_text(instance)
    case_id = str(instance.get("eval_case_id", ""))

    if _MARKDOWN_LINK.search(text):
        return {"score": 0, "explanation": "回覆使用了 Markdown 連結語法，spec 要求純文字連結"}
    if case_id.startswith("off_topic"):
        return {"score": 1, "explanation": "拒答案例不需要連結"}
    if _LINK.search(text):
        return {"score": 1, "explanation": "回覆包含純文字系統連結"}
    return {"score": 0, "explanation": "回覆缺少 /quotations/<id> 或 /orders/<id> 的純文字連結"}
