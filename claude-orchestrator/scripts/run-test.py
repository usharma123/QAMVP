#!/usr/bin/env python3
"""
Execute a JSON test script via the Java Selenium engine and save full results.

Usage:
    python claude-orchestrator/scripts/run-test.py <script.json> [results_dir]

Outputs:
    <script>.result.json — full execution trace (readable by Claude)
    Prints summary + per-step results to stdout
"""
import re
import sys
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "python-orchestrator"))

from tools.java_runner import run_json  # noqa: E402

_ASSERT_ACTIONS = {"ASSERT_TEXT", "ASSERT_CONTAINS", "ASSERT_VARIABLE", "ASSERT_VISIBLE"}


def _print_assertion_detail(action: str, status: str, detail: str) -> None:
    """Print expected/actual lines beneath a failing assertion step."""
    if status != "FAIL" or not detail:
        return
    action_upper = action.upper()
    if action_upper == "ASSERT_VISIBLE":
        print("           Expected : visible")
        print("           Actual   : not visible")
        return
    m_actual   = re.search(r"got ['\"](.+?)['\"]", detail)
    m_expected = re.search(r"[Ee]xpected (?:text |to contain )?['\"](.+?)['\"]", detail)
    actual   = m_actual.group(1)   if m_actual   else detail[:80]
    expected = m_expected.group(1) if m_expected else "?"
    print(f"           Expected : {expected!r}")
    print(f"           Actual   : {actual!r}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python claude-orchestrator/scripts/run-test.py <script.json> [results_dir]")
        sys.exit(1)

    script_path = Path(sys.argv[1]).resolve()
    results_dir = sys.argv[2] if len(sys.argv) > 2 else None

    if not script_path.exists():
        print(f"Error: script not found: {script_path}")
        sys.exit(1)

    print(f"Running: {script_path.name}")
    result = run_json(str(script_path), results_dir=results_dir)

    # Inject TC metadata from the script so result.json is self-contained
    try:
        script_data = json.loads(script_path.read_text(encoding="utf-8"))
        result["testCaseId"]    = script_data.get("testCaseId", "")
        result["requirementId"] = script_data.get("requirementId", "")
    except Exception:
        pass

    out_path = script_path.with_suffix(".result.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"\n--- Result ---")
    print(f"Summary : {result['summary']}")
    print(f"Success : {result['success']}")
    print(f"Saved   : {out_path}")

    trace = result.get("execution_trace", [])
    if trace:
        print("\n--- Step Results ---")
        for sr in trace:
            action = sr.get("action", "?")
            status = sr.get("status", "?")
            marker = "PASS" if status == "PASS" else ("SKIP" if status == "SKIPPED" else "FAIL")
            parent = sr.get("parentAction", "")
            sub    = sr.get("subStepLabel", "")
            prefix = f"[{parent} {sub}] " if parent and sub else (f"[{parent}] " if parent else "")
            print(f"  Step {sr.get('step', '?'):>2}: [{marker}] {prefix}{action}")
            if action.upper() in _ASSERT_ACTIONS:
                _print_assertion_detail(action, status, sr.get("detail", ""))

    healing = result.get("help_exchanges", [])
    if healing:
        print(f"\n--- Self-Healing Events: {len(healing) // 2} ---")
        for i in range(0, len(healing), 2):
            req = healing[i] if i < len(healing) else {}
            sol = healing[i + 1] if i + 1 < len(healing) else {}
            print(f"  Request: step {req.get('step', '?')} — {req.get('error', '')[:80]}")
            print(f"  Solution: {sol.get('action', '?')}")

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
