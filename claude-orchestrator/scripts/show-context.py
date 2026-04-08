#!/usr/bin/env python3
"""
Dump current locators, advanced actions, and/or test cases as readable text.
Claude uses this to get up-to-date context before generating test scripts.

Usage:
    python claude-orchestrator/scripts/show-context.py              # all context
    python claude-orchestrator/scripts/show-context.py --locators   # locators only
    python claude-orchestrator/scripts/show-context.py --actions    # advanced actions only
    python claude-orchestrator/scripts/show-context.py --tcs        # test cases only
    python claude-orchestrator/scripts/show-context.py --defaults   # test data defaults
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "python-orchestrator"))


def show_locators() -> None:
    from tools.context_loader import load_locators_table
    print("=== LOCATOR TABLE ===")
    print(load_locators_table())


def show_actions() -> None:
    from tools.context_loader import load_advanced_actions_summary
    print("=== ADVANCED ACTIONS ===")
    print(load_advanced_actions_summary())


def show_tcs() -> None:
    from tools.tc_loader import list_test_cases
    print("=== TEST CASES ===")
    try:
        tcs = list_test_cases()
        if not tcs:
            print("(no test cases found in TestCases.xlsx)")
            return
        for tc in tcs:
            print(f"\n--- {tc['testCaseId']} ({tc.get('requirementId','')}) ---")
            for step in tc.get("steps", []):
                print(f"  {step.get('stepNumber','?')}. {step.get('stepDescription','')}")
                if step.get("testData"):
                    print(f"     TestData: {step['testData']}")
                if step.get("expectedOutput"):
                    print(f"     Expected: {step['expectedOutput']}")
    except FileNotFoundError as e:
        print(f"Error: {e}")


def show_defaults() -> None:
    from tools.context_loader import load_test_data_defaults
    print("=== TEST DATA DEFAULTS ===")
    try:
        print(load_test_data_defaults())
    except Exception as e:
        print(f"(could not load defaults: {e})")


def main() -> None:
    args = set(sys.argv[1:])
    show_all = not args or args == {"--all"}

    if show_all or "--locators" in args:
        show_locators()
        print()

    if show_all or "--actions" in args:
        show_actions()
        print()

    if show_all or "--tcs" in args:
        show_tcs()
        print()

    if show_all or "--defaults" in args:
        show_defaults()
        print()


if __name__ == "__main__":
    main()
