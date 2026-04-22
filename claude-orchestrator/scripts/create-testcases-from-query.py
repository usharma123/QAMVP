#!/usr/bin/env python3
"""
Create test_data/TestCases.xlsx from structured query-generated test cases.

Input is JSON on stdin. Accepted shapes:
  {"testCases": [ ... ]}
  {"test_cases": [ ... ]}
  [ ... ]

Each test case may contain:
  testCaseId | id              optional; ignored unless --preserve-ids is used
  requirementId | requirement  optional; defaults to REQ-QUERY
  title                         optional; defaults from first step
  objective                     optional
  priority                      optional; defaults to P1
  suite                         optional; defaults to Query Generated
  tags                          optional string/list
  steps                         required non-empty list

Each step may contain:
  stepNumber | number           optional; generated from row order
  stepDescription | description required
  expectedOutput | expected     optional
  testData | data               optional string or object
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import openpyxl

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUTPUT = REPO_ROOT / "test_data" / "TestCases.xlsx"
DEFAULT_AUDIT_ROOT = REPO_ROOT / "test_data" / "test-results" / "query-runs"
HEADERS = [
    "RequirementID",
    "TestCaseID",
    "StepNumber",
    "StepDescription",
    "ExpectedOutput",
    "TestData",
]


class InputError(ValueError):
    """Raised when the generated test case payload is invalid."""


def _clean_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_tc_id(raw: Any, index: int) -> str:
    value = _clean_str(raw).upper()
    if not value:
        return f"TC-{index:03d}"
    if re.fullmatch(r"TC-\d+", value):
        return f"TC-{int(value.split('-', 1)[1]):03d}"
    if re.fullmatch(r"TC\d+", value):
        return f"TC-{int(value[2:]):03d}"
    return value


def _format_test_data(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        parts: list[str] = []
        for key, item in value.items():
            if item is None:
                continue
            parts.append(f"{key}={item}")
        return ",".join(parts)
    if isinstance(value, list):
        return ",".join(_clean_str(item) for item in value if _clean_str(item))
    return _clean_str(value)


def _format_tags(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [t.strip() for t in value.replace(";", ",").split(",") if t.strip()]
    if isinstance(value, list):
        return [_clean_str(t) for t in value if _clean_str(t)]
    return [_clean_str(value)] if _clean_str(value) else []


def _extract_cases(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        cases = payload.get("testCases", payload.get("test_cases"))
    else:
        cases = payload
    if not isinstance(cases, list) or not cases:
        raise InputError("Input must contain a non-empty testCases array.")
    for i, case in enumerate(cases, start=1):
        if not isinstance(case, dict):
            raise InputError(f"testCases[{i}] must be an object.")
    return cases


def _normalize_cases(payload: Any, preserve_ids: bool = False) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for case_index, case in enumerate(_extract_cases(payload), start=1):
        raw_tc_id = case.get("testCaseId", case.get("id")) if preserve_ids else None
        tc_id = _normalize_tc_id(raw_tc_id, case_index)
        if tc_id in seen_ids:
            raise InputError(f"Duplicate test case ID: {tc_id}")
        seen_ids.add(tc_id)

        requirement_id = _clean_str(
            case.get("requirementId", case.get("requirement"))
        ) or "REQ-QUERY"
        steps = case.get("steps")
        if not isinstance(steps, list) or not steps:
            raise InputError(f"{tc_id} must contain a non-empty steps array.")

        normalized_steps: list[dict[str, Any]] = []
        seen_step_numbers: set[int] = set()
        for step_index, step in enumerate(steps, start=1):
            if not isinstance(step, dict):
                raise InputError(f"{tc_id} steps[{step_index}] must be an object.")
            raw_step_number = step.get("stepNumber", step.get("number", step_index))
            try:
                step_number = int(raw_step_number)
            except (TypeError, ValueError) as exc:
                raise InputError(
                    f"{tc_id} steps[{step_index}] has an invalid step number."
                ) from exc
            if step_number <= 0:
                raise InputError(f"{tc_id} step numbers must be positive integers.")
            if step_number in seen_step_numbers:
                raise InputError(f"{tc_id} has duplicate step number {step_number}.")
            seen_step_numbers.add(step_number)

            description = _clean_str(
                step.get("stepDescription", step.get("description"))
            )
            if not description:
                raise InputError(
                    f"{tc_id} step {step_number} requires stepDescription."
                )

            normalized_steps.append(
                {
                    "stepNumber": step_number,
                    "stepDescription": description,
                    "expectedOutput": _clean_str(
                        step.get("expectedOutput", step.get("expected"))
                    ),
                    "testData": _format_test_data(step.get("testData", step.get("data"))),
                }
            )

        normalized_steps.sort(key=lambda item: item["stepNumber"])
        normalized.append(
            {
                "testCaseId": tc_id,
                "requirementId": requirement_id,
                "title": _clean_str(case.get("title"))
                or normalized_steps[0]["stepDescription"][:90],
                "objective": _clean_str(case.get("objective"))
                or f"Validate query-generated flow for {requirement_id}.",
                "priority": _clean_str(case.get("priority")) or "P1",
                "suite": _clean_str(case.get("suite")) or "Query Generated",
                "tags": _format_tags(case.get("tags")) or ["@query-generated"],
                "steps": normalized_steps,
            }
        )

    return normalized


def _write_workbook(cases: list[dict[str, Any]], path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "TestCases"
    ws.append(HEADERS)

    row_count = 0
    for case in cases:
        for step in case["steps"]:
            ws.append(
                [
                    case["requirementId"],
                    case["testCaseId"],
                    step["stepNumber"],
                    step["stepDescription"],
                    step["expectedOutput"] or None,
                    step["testData"] or None,
                ]
            )
            row_count += 1

    for col, width in {
        "A": 18,
        "B": 14,
        "C": 12,
        "D": 56,
        "E": 36,
        "F": 44,
    }.items():
        ws.column_dimensions[col].width = width
    ws.freeze_panes = "A2"

    wb.save(path)
    return row_count


def _write_repository_spec(cases: list[dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    spec_cases: list[dict[str, Any]] = []
    for case in cases:
        spec_cases.append(
            {
                "test_case_id": case["testCaseId"],
                "title": case["title"],
                "objective": case["objective"],
                "priority": case["priority"],
                "suite": case["suite"],
                "tags": case["tags"],
                "steps": [
                    {
                        "requirement_id": case["requirementId"],
                        "step_number": step["stepNumber"],
                        "step_description": step["stepDescription"],
                        "expected_output": step["expectedOutput"],
                        "test_data": step["testData"],
                    }
                    for step in case["steps"]
                ],
            }
        )

    payload = {
        "document_id": "QUERY-TC-REPO-001",
        "version": datetime.now().strftime("%Y.%m.%d.%H%M%S"),
        "status": "Generated from natural-language query output.",
        "title": "Query Generated Test Case Repository",
        "source_workbook": "test_data/TestCases.xlsx",
        "cases": spec_cases,
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _load_payload() -> Any:
    raw = sys.stdin.read()
    if not raw.strip():
        raise InputError("No JSON was provided on stdin.")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InputError(f"Invalid JSON: {exc}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create TestCases.xlsx from query-generated test case JSON."
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Workbook path to create. Defaults to test_data/TestCases.xlsx.",
    )
    parser.add_argument(
        "--audit-root",
        default=str(DEFAULT_AUDIT_ROOT),
        help="Directory where a timestamped audit copy is saved.",
    )
    parser.add_argument(
        "--timestamp",
        default=datetime.now().strftime("%Y%m%d_%H%M%S"),
        help="Timestamp used for the audit run directory.",
    )
    parser.add_argument(
        "--preserve-ids",
        action="store_true",
        help="Preserve provided testCaseId values instead of renumbering from TC-001.",
    )
    parser.add_argument(
        "--repository-spec-out",
        default="",
        help="Optional path to write test-case-repository.json for repeatable rendering/reseed.",
    )
    args = parser.parse_args()

    try:
        cases = _normalize_cases(_load_payload(), preserve_ids=args.preserve_ids)
    except InputError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    output_path = Path(args.output).expanduser().resolve()
    audit_dir = Path(args.audit_root).expanduser().resolve() / args.timestamp
    audit_path = audit_dir / "TestCases.xlsx"

    row_count = _write_workbook(cases, output_path)
    if audit_path != output_path:
        _write_workbook(cases, audit_path)

    repository_spec_path = None
    if args.repository_spec_out:
        repository_spec_path = Path(args.repository_spec_out).expanduser().resolve()
        _write_repository_spec(cases, repository_spec_path)

    tc_ids = [case["testCaseId"] for case in cases]
    print(f"Created: {output_path}")
    print(f"Audit copy: {audit_path}")
    print(f"Test cases: {', '.join(tc_ids)}")
    print(f"Rows: {row_count}")
    if repository_spec_path:
        print(f"Repository spec: {repository_spec_path}")
    print("TC_IDS=" + ",".join(tc_ids))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
