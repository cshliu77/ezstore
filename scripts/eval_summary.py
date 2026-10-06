"""把 agents-cli eval 的結果檔印成「案例 × 指標」表格，給兩個檔案時並列比較。

用法：
    python3 ../scripts/eval_summary.py artifacts/grade_results/guardrails/results_A.json   # 在 agent/ 目錄下
    python3 ../scripts/eval_summary.py results_A.json results_B.json      # 並列兩次結果，差異標 *
    python3 ../scripts/eval_summary.py results_A.json --explain           # 連評審理由一起印

不需要任何 GCP 或 API key，也不需要 uv 環境，純 Python 標準庫讀 JSON。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def load(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def case_ids(result: dict) -> list[str]:
    """結果檔的 evaluation_dataset 是一個 list，裡面（通常只有一個）dataset 帶 eval_cases。"""
    ds = result.get("evaluation_dataset") or []
    if isinstance(ds, dict):
        ds = [ds]
    cases: list[dict] = []
    for d in ds:
        cases.extend(d.get("eval_cases", []) if isinstance(d, dict) else [])
    labels = []
    for i, c in enumerate(cases):
        label = c.get("eval_case_id")
        if not label:
            parts = (c.get("prompt") or {}).get("parts") or []
            label = "".join(p.get("text", "") for p in parts)[:24] or f"case_{i}"
        labels.append(label)
    return labels


def metric_order(result: dict, found: set[str]) -> list[str]:
    ordered = [s["metric_name"] for s in result.get("summary_metrics", []) if s.get("metric_name") in found]
    return ordered + sorted(found - set(ordered))


def scores(result: dict) -> dict[int, dict[str, dict]]:
    """{case_index: {metric_name: metric_result}}"""
    out: dict[int, dict[str, dict]] = {}
    for r in result.get("eval_case_results", []):
        idx = r.get("eval_case_index", len(out))
        cands = r.get("response_candidate_results") or [{}]
        out[idx] = cands[0].get("metric_results") or {}
    return out


def fmt(v) -> str:
    if v is None:
        return "ERR"
    return f"{v:g}" if isinstance(v, (int, float)) else str(v)


def main(argv: list[str]) -> int:
    explain = "--explain" in argv
    files = [a for a in argv if not a.startswith("--")]
    if any(not f.endswith(".json") for f in files):
        print("請給 results_*.json 檔（不是 .html）")
        return 1
    if not files or len(files) > 2:
        print(__doc__)
        return 1

    base = load(files[0])
    ids = case_ids(base)
    base_scores = scores(base)
    metrics = metric_order(base, {m for ms in base_scores.values() for m in ms})
    cand_scores = scores(load(files[1])) if len(files) == 2 else None

    name_w = max([len(i) for i in ids] + [8]) + 2
    col_w = max([len(m) for m in metrics] + [12]) + 2
    header = "案例".ljust(name_w) + "".join(m.ljust(col_w) for m in metrics)
    print(f"檔案 A: {Path(files[0]).name}")
    if cand_scores is not None:
        print(f"檔案 B: {Path(files[1]).name}   （欄位格式：A → B，有差異時標 *）")
    print(header)
    print("-" * len(header))

    for idx, cid in enumerate(ids):
        row = cid.ljust(name_w)
        for m in metrics:
            a = (base_scores.get(idx, {}).get(m) or {}).get("score")
            if cand_scores is None:
                cell = fmt(a)
            else:
                b = (cand_scores.get(idx, {}).get(m) or {}).get("score")
                mark = " *" if a != b else ""
                cell = f"{fmt(a)} → {fmt(b)}{mark}"
            row += cell.ljust(col_w)
        print(row)
        if explain:
            for m in metrics:
                mr = base_scores.get(idx, {}).get(m) or {}
                why = mr.get("explanation") or mr.get("error_message") or ""
                if why:
                    print(f"    {m}: {str(why)[:200]}")

    print()
    print("平均：")
    for s in base.get("summary_metrics", []):
        line = f"  {s['metric_name']}: {fmt(s.get('mean_score'))}"
        if s.get("num_cases_error"):
            line += f"   （{s['num_cases_error']} 題沒評到）"
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
