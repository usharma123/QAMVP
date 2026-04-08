#!/usr/bin/env python3
"""
Deterministic script validator — wraps tools/script_validator.py for CLI use.

Exits 0 if script is clean, 1 if errors found.
Claude calls this BEFORE saving a generated script to get a hard pass/fail gate.

Usage:
    python claude-orchestrator/scripts/validate-script.py <script.json>
    python claude-orchestrator/scripts/validate-script.py --stdin
"""
import sys
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "python-orchestrator"))

from tools.script_validator import validate  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python claude-orchestrator/scripts/validate-script.py <script.json>")
        print("       python claude-orchestrator/scripts/validate-script.py --stdin")
        sys.exit(2)

    if sys.argv[1] == "--stdin":
        try:
            script_data = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"INVALID JSON: {e}")
            sys.exit(1)
    else:
        script_path = Path(sys.argv[1])
        if not script_path.exists():
            print(f"File not found: {script_path}")
            sys.exit(2)
        try:
            with open(script_path, encoding="utf-8") as f:
                script_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"INVALID JSON in {script_path.name}: {e}")
            sys.exit(1)

    result = validate(script_data)

    if result.is_clean:
        steps = script_data.get("steps", [])
        print(f"VALID — {len(steps)} steps, no errors")
        sys.exit(0)
    else:
        print(f"ERRORS ({len(result.errors)}):\n")
        for e in result.errors:
            print(f"  Step {e.step_index}: [{e.error_type}] {e.action} on {e.locator}")
            print(f"    {e.message}\n")
        print("Fix the errors above and re-validate.")
        sys.exit(1)


if __name__ == "__main__":
    main()
