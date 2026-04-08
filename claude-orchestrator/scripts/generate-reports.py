#!/usr/bin/env python3
"""
Generate two Excel reports from a test run result.

Usage:
    python claude-orchestrator/scripts/generate-reports.py <result.json>
    python claude-orchestrator/scripts/generate-reports.py <script.json>   # finds sibling .result.json
    python claude-orchestrator/scripts/generate-reports.py TC-001           # finds latest result for TC

Options:
    --script <path>    Source script JSON (default: sibling of result file)
    --out-dir <path>   Output directory (default: test_data/test-results/<TC-ID>/)

Outputs:
    <TC-ID>_detail_<timestamp>.xlsx   — full sub-step trace
    <TC-ID>_summary_<timestamp>.xlsx  — TC step summary (mirrors TestCases.xlsx)
"""
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "python-orchestrator"))

from tools.tc_loader import load_test_case
from tools.report_writer import write_both_reports


def _resolve_result_path(arg: str) -> Path:
    """Resolve argument string to an existing .result.json path."""
    p = Path(arg)

    # Explicit .result.json path
    if p.suffix == ".json" and p.stem.endswith(".result"):
        if p.exists():
            return p.resolve()
        raise FileNotFoundError(f"Result file not found: {p}")

    # Plain .json script — look for sibling .result.json
    if p.suffix == ".json" and p.exists():
        result = p.with_name(p.stem + ".result.json")
        if result.exists():
            return result.resolve()
        raise FileNotFoundError(f"No sibling result file found for: {p}")

    # TC-ID — find the latest matching result in generated_scripts/
    scripts_dir = REPO_ROOT / "test_data" / "generated_scripts"
    raw = arg.strip().upper()
    if not raw.startswith("TC-"):
        import re
        m = re.match(r"TC(\d+)", raw)
        raw = f"TC-{int(m.group(1)):03d}" if m else raw
    matches = sorted(
        scripts_dir.glob(f"script_{raw}_*.result.json"),
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    if matches:
        return matches[0].resolve()

    raise FileNotFoundError(f"No result file found for: {arg!r}")


def _resolve_script_path(result_path: Path, explicit: str | None) -> Path | None:
    if explicit:
        p = Path(explicit)
        return p.resolve() if p.exists() else None
    # Strip ".result" from stem: "script_TC-001_20260401.result" -> "script_TC-001_20260401"
    stem = result_path.stem  # e.g. "script_TC-001_20260401_095614.result"
    if stem.endswith(".result"):
        script_name = stem[: -len(".result")] + ".json"
    else:
        script_name = stem + ".json"
    candidate = result_path.parent / script_name
    return candidate.resolve() if candidate.exists() else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Excel reports from a test result.")
    parser.add_argument("result", help="Path to .result.json, .json script, or TC-ID")
    parser.add_argument("--script", help="Path to source script .json (optional)")
    parser.add_argument("--out-dir", help="Output directory")
    args = parser.parse_args()

    try:
        result_path = _resolve_result_path(args.result)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    result = json.loads(result_path.read_text(encoding="utf-8"))

    script_path = _resolve_script_path(result_path, args.script)
    script = json.loads(script_path.read_text(encoding="utf-8")) if script_path else None

    # TC ID: prefer result.json (set by run-test.py), fall back to script JSON
    tc_id = result.get("testCaseId", "") or (script or {}).get("testCaseId", "")
    if not result.get("testCaseId") and tc_id:
        result["testCaseId"]    = tc_id
        result["requirementId"] = result.get("requirementId", "") or (script or {}).get("requirementId", "")
    test_case = load_test_case(tc_id) if tc_id else None

    if args.out_dir:
        out_dir = Path(args.out_dir)
    else:
        out_dir = REPO_ROOT / "test_data" / "test-results" / (tc_id or "unknown")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    detail_path, summary_path = write_both_reports(result, test_case, script, out_dir, ts)

    print(f"Detail report  : {detail_path}")
    print(f"Summary report : {summary_path}")


if __name__ == "__main__":
    main()
