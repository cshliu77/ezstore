import json
import os

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("ezstore-quotation", host="0.0.0.0", port=8000)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8080")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
API_BASE = f"{BACKEND_URL}/api/v1"


def _quotation_link(quotation_id: int) -> str:
    return f"{FRONTEND_URL}/quotations/{quotation_id}"


def _order_link(order_id: int) -> str:
    return f"{FRONTEND_URL}/orders/{order_id}"


def _format_quotation(q: dict) -> str:
    items_text = ""
    if q.get("items"):
        lines = []
        for i, item in enumerate(q["items"], 1):
            lines.append(
                f"  {i}. {item['product_name']} — "
                f"單價: {item['unit_price']}, 數量: {item['quantity']}, "
                f"小計: {item['subtotal']}"
            )
        items_text = "\n" + "\n".join(lines)

    customer_name = ""
    if q.get("customer"):
        customer_name = q["customer"].get("name", "")

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


async def _find_quotation_by_number(client: httpx.AsyncClient, quotation_number: str) -> dict | None:
    """Search for a quotation by its number across paginated results."""
    page = 1
    while True:
        resp = await client.get(
            f"{API_BASE}/quotations",
            params={"page": page, "page_size": 100},
        )
        resp.raise_for_status()
        data = resp.json()
        quotations = data.get("data", [])
        if not quotations:
            break
        for q in quotations:
            if q["quotation_number"] == quotation_number:
                return q
        total = data.get("total", 0)
        if page * 100 >= total:
            break
        page += 1
    return None


async def _find_customer_by_name(client: httpx.AsyncClient, customer_name: str) -> dict | None:
    """Search for a customer by name."""
    resp = await client.get(
        f"{API_BASE}/customers",
        params={"search": customer_name, "page_size": 100},
    )
    resp.raise_for_status()
    data = resp.json()
    customers = data.get("data", [])
    if customers:
        return customers[0]
    return None


@mcp.tool()
async def get_quotation(quotation_number: str) -> str:
    """根據報價單編號查詢報價單詳細資訊，包含所有品項。

    Args:
        quotation_number: 報價單編號，例如 QT-20260330-001
    """
    async with httpx.AsyncClient(timeout=30) as client:
        q = await _find_quotation_by_number(client, quotation_number)
        if not q:
            return f"找不到報價單編號 {quotation_number}"

        resp = await client.get(f"{API_BASE}/quotations/{q['id']}")
        resp.raise_for_status()
        detail = resp.json()
        return _format_quotation(detail)


@mcp.tool()
async def list_customer_quotations(customer_name: str) -> str:
    """根據客戶名稱查詢該客戶的所有報價單清單。

    Args:
        customer_name: 客戶名稱，例如「史塔克工業」
    """
    async with httpx.AsyncClient(timeout=30) as client:
        customer = await _find_customer_by_name(client, customer_name)
        if not customer:
            return f"找不到客戶名稱包含「{customer_name}」的客戶"

        resp = await client.get(
            f"{API_BASE}/quotations",
            params={"customer_id": customer["id"], "page_size": 100},
        )
        resp.raise_for_status()
        data = resp.json()
        quotations = data.get("data", [])

        if not quotations:
            return f"客戶「{customer['name']}」目前沒有任何報價單"

        lines = [f"客戶「{customer['name']}」的報價單清單（共 {len(quotations)} 筆）："]
        for q in quotations:
            lines.append(_format_quotation_summary(q))
        return "\n".join(lines)


@mcp.tool()
async def duplicate_quotation(quotation_number: str) -> str:
    """複製一份報價單，建立新的草稿報價單。原始報價單不會被修改。

    Args:
        quotation_number: 要複製的報價單編號，例如 QT-20260330-001
    """
    async with httpx.AsyncClient(timeout=30) as client:
        q = await _find_quotation_by_number(client, quotation_number)
        if not q:
            return f"找不到報價單編號 {quotation_number}"

        resp = await client.post(f"{API_BASE}/quotations/{q['id']}/duplicate")
        resp.raise_for_status()
        new_q = resp.json()

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
    async with httpx.AsyncClient(timeout=30) as client:
        q = await _find_quotation_by_number(client, quotation_number)
        if not q:
            return f"找不到報價單編號 {quotation_number}"

        # Step 1: Duplicate
        dup_resp = await client.post(f"{API_BASE}/quotations/{q['id']}/duplicate")
        dup_resp.raise_for_status()
        new_q = dup_resp.json()

        # Step 2: Update pricing factor on the new quotation
        update_body = {
            "customer_id": new_q["customer_id"],
            "pricing_factor": new_pricing_factor,
            "notes": new_q.get("notes", ""),
            "items": [
                {"product_id": item["product_id"], "quantity": item["quantity"]}
                for item in new_q.get("items", [])
            ],
        }
        update_resp = await client.put(
            f"{API_BASE}/quotations/{new_q['id']}",
            json=update_body,
        )
        update_resp.raise_for_status()
        updated = update_resp.json()

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
    async with httpx.AsyncClient(timeout=60) as client:
        q = await _find_quotation_by_number(client, quotation_number)
        if not q:
            return f"找不到報價單編號 {quotation_number}"

        # Step 1: Duplicate
        dup_resp = await client.post(f"{API_BASE}/quotations/{q['id']}/duplicate")
        dup_resp.raise_for_status()
        new_q = dup_resp.json()

        items_input = [
            {"product_id": item["product_id"], "quantity": item["quantity"]}
            for item in new_q.get("items", [])
        ]

        # Step 2: Binary search for pricing factor
        lo, hi = 0.01, 5.0
        best_q = new_q
        target = target_total_price

        for iteration in range(20):
            mid = (lo + hi) / 2.0

            update_body = {
                "customer_id": new_q["customer_id"],
                "pricing_factor": round(mid, 4),
                "notes": new_q.get("notes", ""),
                "items": items_input,
            }
            update_resp = await client.put(
                f"{API_BASE}/quotations/{new_q['id']}",
                json=update_body,
            )
            update_resp.raise_for_status()
            best_q = update_resp.json()

            current_total = float(best_q["total_price"])

            if abs(current_total - target) < 0.01:
                break

            if current_total < target:
                lo = mid
            else:
                hi = mid

        return (
            f"已透過二分法調整報價因子使總價逼近目標值。\n"
            f"原始報價單: {quotation_number}（未修改） — {_quotation_link(q['id'])}\n"
            f"新報價單: {best_q['quotation_number']}\n"
            f"報價因子: {best_q['pricing_factor']}\n"
            f"目標總價: {target_total_price}\n"
            f"實際總價: {best_q['total_price']}\n"
            f"系統連結: {_quotation_link(best_q['id'])}"
        )


@mcp.tool()
async def convert_to_order(quotation_number: str) -> str:
    """將報價單轉換為訂單。如果報價單為草稿狀態，會先發佈再轉換。

    Args:
        quotation_number: 要轉換的報價單編號，例如 QT-20260330-001
    """
    async with httpx.AsyncClient(timeout=30) as client:
        q = await _find_quotation_by_number(client, quotation_number)
        if not q:
            return f"找不到報價單編號 {quotation_number}"

        # Get full detail
        detail_resp = await client.get(f"{API_BASE}/quotations/{q['id']}")
        detail_resp.raise_for_status()
        detail = detail_resp.json()

        # Publish if draft
        if detail["status"] == "draft":
            pub_resp = await client.post(f"{API_BASE}/quotations/{q['id']}/publish")
            pub_resp.raise_for_status()

        # Create order from quotation items
        order_items = [
            {
                "product_id": item["product_id"],
                "unit_price": float(item["unit_price"]),
                "quantity": item["quantity"],
            }
            for item in detail.get("items", [])
        ]

        order_body = {
            "customer_id": detail["customer_id"],
            "quotation_id": detail["id"],
            "notes": f"從報價單 {quotation_number} 轉換",
            "items": order_items,
        }

        order_resp = await client.post(f"{API_BASE}/orders", json=order_body)
        order_resp.raise_for_status()
        order = order_resp.json()

        return (
            f"已成功將報價單轉換為訂單。\n"
            f"報價單: {quotation_number} — {_quotation_link(detail['id'])}\n"
            f"訂單編號: {order['order_number']}\n"
            f"訂單總價: {order['total_price']}\n"
            f"訂單連結: {_order_link(order['id'])}"
        )


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
