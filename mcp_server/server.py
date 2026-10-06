"""EZStore 報價單管理 MCP Server（mcp Python SDK 2.x，Streamable HTTP）。

提供 6 個工具給 ADK Agent 呼叫，全部透過 EZStore 後端 REST API 操作資料：
  get_quotation / list_customer_quotations / duplicate_quotation /
  update_pricing_factor / adjust_total_price / convert_to_order

設計原則：
- 所有修改行為（改報價因子、改總價）都先複製報價單，再修改副本，原始報價單不動。
- 每則回覆都附上純文字系統連結，讓使用者可直接點擊查看。
- 後端錯誤一律轉成中文 ToolError，不把 traceback 丟給 Agent。
"""

import os

import httpx
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8080")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.environ.get("MCP_PORT", "8000"))
API_BASE = f"{BACKEND_URL}/api/v1"

# 二分法搜尋設定
BISECT_MAX_ITERATIONS = 20
BISECT_LOW, BISECT_HIGH = 0.01, 5.0
BISECT_TOLERANCE = 0.01

mcp = MCPServer("ezstore-quotation")

_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)
_client = httpx.AsyncClient(base_url=API_BASE, timeout=_TIMEOUT)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


async def _request(method: str, path: str, *, timeout: httpx.Timeout | None = None, **kwargs) -> dict:
    try:
        resp = await _client.request(method, path, timeout=timeout or _TIMEOUT, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        detail = e.response.text[:200]
        if status == 404:
            raise ToolError("找不到資料") from e
        raise ToolError(f"後端回應 {status}：{detail}") from e
    except httpx.TimeoutException as e:
        raise ToolError("後端服務逾時，請稍後再試") from e
    except httpx.TransportError as e:
        raise ToolError(f"無法連線後端服務：{e}") from e


async def _get(path: str, **params) -> dict:
    return await _request("GET", path, params=params)


async def _post(path: str, json: dict | None = None) -> dict:
    return await _request("POST", path, json=json)


async def _put(path: str, json: dict, *, timeout: httpx.Timeout | None = None) -> dict:
    return await _request("PUT", path, json=json, timeout=timeout)


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _quotation_link(quotation_id: int) -> str:
    return f"{FRONTEND_URL}/quotations/{quotation_id}"


def _order_link(order_id: int) -> str:
    return f"{FRONTEND_URL}/orders/{order_id}"


def _format_quotation(q: dict) -> str:
    items_text = ""
    if q.get("items"):
        lines = [
            f"  {i}. {item['product_name']} — "
            f"單價: {item['unit_price']}, 數量: {item['quantity']}, 小計: {item['subtotal']}"
            for i, item in enumerate(q["items"], 1)
        ]
        items_text = "\n" + "\n".join(lines)

    customer_name = (q.get("customer") or {}).get("name", "")

    return (
        f"報價單編號: {q['quotation_number']}\n"
        f"客戶: {customer_name}\n"
        f"客戶等級: {q['customer_level']}\n"
        f"報價因子: {q['pricing_factor']}\n"
        f"總價: {q['total_price']}\n"
        f"利潤: {q['profit_amount']} (利潤率: {q['profit_rate']})\n"
        f"狀態: {q['status']}\n"
        f"備註: {q.get('notes', '')}\n"
        f"品項:{items_text}\n"
        f"系統連結: {_quotation_link(q['id'])}"
    )


def _format_quotation_summary(q: dict) -> str:
    return (
        f"- {q['quotation_number']} | 總價: {q['total_price']} | "
        f"狀態: {q['status']} | 連結: {_quotation_link(q['id'])}"
    )


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------


async def _find_quotation_by_number(quotation_number: str) -> dict | None:
    """依報價單編號查詢。

    優先使用後端的 ``?quotation_number=`` 精確查詢；若後端是舊版（不支援該參數、
    回傳的第一筆編號不符），則退回逐頁掃描以維持相容。
    """
    data = await _get("/quotations", quotation_number=quotation_number, page_size=1)
    first = (data.get("data") or [None])[0]
    if first and first["quotation_number"] == quotation_number:
        return first

    page = 1
    while True:
        data = await _get("/quotations", page=page, page_size=100)
        quotations = data.get("data", [])
        if not quotations:
            return None
        for q in quotations:
            if q["quotation_number"] == quotation_number:
                return q
        if page * 100 >= data.get("total", 0):
            return None
        page += 1


async def _find_customer_by_name(customer_name: str) -> dict | None:
    """依客戶名稱查詢（後端為 ILIKE 模糊搜尋）。完全相符者優先，否則取第一筆。"""
    data = await _get("/customers", search=customer_name, page_size=100)
    customers = data.get("data", [])
    if not customers:
        return None
    for c in customers:
        if c.get("name") == customer_name:
            return c
    return customers[0]


async def _require_quotation(quotation_number: str) -> dict:
    q = await _find_quotation_by_number(quotation_number)
    if not q:
        raise ToolError(f"找不到報價單編號 {quotation_number}")
    return q


def _items_input(q: dict) -> list[dict]:
    return [
        {"product_id": item["product_id"], "quantity": item["quantity"]}
        for item in q.get("items", [])
    ]


async def _duplicate(q: dict) -> dict:
    return await _post(f"/quotations/{q['id']}/duplicate")


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_quotation(quotation_number: str) -> str:
    """根據報價單編號查詢報價單詳細資訊，包含所有品項。

    Args:
        quotation_number: 報價單編號，例如 QT-20260330-001
    """
    q = await _require_quotation(quotation_number)
    detail = await _get(f"/quotations/{q['id']}")
    return _format_quotation(detail)


@mcp.tool()
async def list_customer_quotations(customer_name: str) -> str:
    """根據客戶名稱查詢該客戶的所有報價單清單。

    Args:
        customer_name: 客戶名稱，例如「史塔克工業」
    """
    customer = await _find_customer_by_name(customer_name)
    if not customer:
        raise ToolError(f"找不到客戶名稱包含「{customer_name}」的客戶")

    data = await _get("/quotations", customer_id=customer["id"], page_size=100)
    quotations = data.get("data", [])
    if not quotations:
        return f"客戶「{customer['name']}」目前沒有任何報價單"

    lines = [f"客戶「{customer['name']}」的報價單清單（共 {len(quotations)} 筆）："]
    lines.extend(_format_quotation_summary(q) for q in quotations)
    return "\n".join(lines)


@mcp.tool()
async def duplicate_quotation(quotation_number: str) -> str:
    """複製一份報價單，建立新的草稿報價單。原始報價單不會被修改。

    Args:
        quotation_number: 要複製的報價單編號，例如 QT-20260330-001
    """
    q = await _require_quotation(quotation_number)
    new_q = await _duplicate(q)
    return (
        f"已成功複製報價單。\n"
        f"原始報價單: {quotation_number} — {_quotation_link(q['id'])}\n"
        f"新報價單: {new_q['quotation_number']} — {_quotation_link(new_q['id'])}"
    )


@mcp.tool()
async def update_pricing_factor(quotation_number: str, new_pricing_factor: float) -> str:
    """修改報價單的報價因子。會先自動複製一份新的報價單，然後在複製的版本上修改，確保原始報價單不被更動。

    Args:
        quotation_number: 要修改的報價單編號，例如 QT-20260330-001
        new_pricing_factor: 新的報價因子數值，例如 0.85
    """
    if new_pricing_factor <= 0:
        raise ToolError("報價因子必須大於 0")

    q = await _require_quotation(quotation_number)
    new_q = await _duplicate(q)

    updated = await _put(
        f"/quotations/{new_q['id']}",
        {
            "customer_id": new_q["customer_id"],
            "pricing_factor": new_pricing_factor,
            "notes": new_q.get("notes", ""),
            "items": _items_input(new_q),
        },
    )
    return (
        f"已成功修改報價因子。\n"
        f"原始報價單: {quotation_number}（未修改） — {_quotation_link(q['id'])}\n"
        f"新報價單: {updated['quotation_number']}\n"
        f"報價因子: {q['pricing_factor']} → {updated['pricing_factor']}\n"
        f"總價: {q['total_price']} → {updated['total_price']}\n"
        f"系統連結: {_quotation_link(updated['id'])}"
    )


@mcp.tool()
async def adjust_total_price(quotation_number: str, target_total_price: float) -> str:
    """修改報價單總價。會先自動複製一份新的報價單，然後透過二分法搜尋調整報價因子，使總價逼近目標值。最多迭代 20 次。

    Args:
        quotation_number: 要修改的報價單編號，例如 QT-20260330-001
        target_total_price: 目標總價數值，例如 100000
    """
    if target_total_price <= 0:
        raise ToolError("目標總價必須大於 0")

    q = await _require_quotation(quotation_number)
    new_q = await _duplicate(q)
    items = _items_input(new_q)
    bisect_timeout = httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0)

    lo, hi = BISECT_LOW, BISECT_HIGH
    best_q = new_q
    iterations = 0
    for iterations in range(1, BISECT_MAX_ITERATIONS + 1):
        mid = (lo + hi) / 2.0
        best_q = await _put(
            f"/quotations/{new_q['id']}",
            {
                "customer_id": new_q["customer_id"],
                "pricing_factor": round(mid, 4),
                "notes": new_q.get("notes", ""),
                "items": items,
            },
            timeout=bisect_timeout,
        )
        current_total = float(best_q["total_price"])
        if abs(current_total - target_total_price) < BISECT_TOLERANCE:
            break
        if current_total < target_total_price:
            lo = mid
        else:
            hi = mid

    actual_total = float(best_q["total_price"])
    note = ""
    if abs(actual_total - target_total_price) >= BISECT_TOLERANCE:
        note = (
            f"\n注意: 已達最大迭代次數，實際總價與目標仍有差距（報價因子搜尋範圍 "
            f"{BISECT_LOW}–{BISECT_HIGH}）。"
        )

    return (
        f"已透過二分法調整報價因子使總價逼近目標值（迭代 {iterations} 次）。\n"
        f"原始報價單: {quotation_number}（未修改） — {_quotation_link(q['id'])}\n"
        f"新報價單: {best_q['quotation_number']}\n"
        f"報價因子: {best_q['pricing_factor']}\n"
        f"目標總價: {target_total_price}\n"
        f"實際總價: {best_q['total_price']}{note}\n"
        f"系統連結: {_quotation_link(best_q['id'])}"
    )


@mcp.tool()
async def convert_to_order(quotation_number: str) -> str:
    """將報價單轉換為訂單：依報價單的客戶與品項建立一筆新訂單並關聯該報價單。原始報價單不會被修改。

    Args:
        quotation_number: 要轉換的報價單編號，例如 QT-20260330-001
    """
    q = await _require_quotation(quotation_number)
    detail = await _get(f"/quotations/{q['id']}")

    order = await _post(
        "/orders",
        {
            "customer_id": detail["customer_id"],
            "quotation_id": detail["id"],
            "notes": f"從報價單 {quotation_number} 轉換",
            "items": [
                {
                    "product_id": item["product_id"],
                    "unit_price": float(item["unit_price"]),
                    "quantity": item["quantity"],
                }
                for item in detail.get("items", [])
            ],
        },
    )
    return (
        f"已成功將報價單轉換為訂單。\n"
        f"報價單: {quotation_number}（未修改） — {_quotation_link(detail['id'])}\n"
        f"訂單編號: {order['order_number']}\n"
        f"訂單總價: {order['total_price']}\n"
        f"訂單連結: {_order_link(order['id'])}"
    )


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host=MCP_HOST,
        port=MCP_PORT,
        streamable_http_path="/mcp",
    )
