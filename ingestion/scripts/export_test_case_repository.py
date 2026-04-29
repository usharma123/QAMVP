#!/usr/bin/env python3
"""Export structured DB test cases to the repeatable repository JSON spec."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

import psycopg

DEFAULT_DB = "postgresql://ingestion:ingestion@localhost:5433/ingestion"


def export_repository(database_url: str, output: Path) -> tuple[int, int]:
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT test_case_id, title, objective, priority, suite, tags
                FROM test_cases
                ORDER BY test_case_id
                """
            )
            case_rows = cur.fetchall()
            if not case_rows:
                raise RuntimeError("No rows found in test_cases.")

            cases = []
            step_count = 0
            for test_case_id, title, objective, priority, suite, tags in case_rows:
                cur.execute(
                    """
                    SELECT requirement_id, step_number, step_description, expected_output, test_data
                    FROM test_case_steps
                    WHERE test_case_id = %s
                    ORDER BY step_number
                    """,
                    (test_case_id,),
                )
                steps = [
                    {
                        "requirement_id": requirement_id,
                        "step_number": step_number,
                        "step_description": step_description,
                        "expected_output": expected_output or "",
                        "test_data": test_data or "",
                    }
                    for requirement_id, step_number, step_description, expected_output, test_data in cur.fetchall()
                ]
                if not steps:
                    raise RuntimeError(f"{test_case_id} has no steps in test_case_steps.")
                step_count += len(steps)
                requirement_ids = sorted({step["requirement_id"] for step in steps})
                cases.append(
                    {
                        "test_case_id": test_case_id,
                        "requirement_ids": requirement_ids,
                        "title": title or test_case_id,
                        "objective": objective or f"Validate {test_case_id}.",
                        "priority": priority or "P1",
                        "suite": suite or "Regression",
                        "tags": list(tags or []),
                        "steps": steps,
                    }
                )

    payload = {
        "document_id": "KB-TC-REPO-001",
        "version": datetime.now().strftime("%Y.%m.%d.%H%M%S"),
        "status": "Exported from ingestion DB structured test-case inventory.",
        "title": "Knowledge Base Test Case Repository",
        "source_workbook": "test_data/TestCases.xlsx",
        "cases": cases,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return len(cases), step_count


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export test_cases/test_case_steps to test-case-repository.json."
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", DEFAULT_DB),
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Path to write repository JSON spec.",
    )
    args = parser.parse_args()

    try:
        case_count, step_count = export_repository(args.database_url, args.output)
    except Exception as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"Exported {case_count} test cases, {step_count} steps to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
