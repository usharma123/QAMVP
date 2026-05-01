#!/usr/bin/env python3
"""Audit DB/KB test cases against hard source documents before execution."""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg

DEFAULT_DB = "postgresql://ingestion:ingestion@localhost:5433/ingestion"
REQ_RE = re.compile(r"\bREQ-(?:FR|NFR|SEC)-\d{3}\b")
TC_RE = re.compile(r"^TC-[A-Za-z0-9-]+$")


@dataclass(frozen=True)
class Finding:
    severity: str
    category: str
    subject: str
    evidence: str
    remediation: str


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def collect_hard_doc_requirements(test_doc_dir: Path) -> dict[str, list[dict[str, Any]]]:
    requirements: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for path in sorted(test_doc_dir.glob("*.md")):
        if path.name.startswith("09-"):
            continue
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        for line_no, line in enumerate(lines, start=1):
            for req_id in REQ_RE.findall(line):
                requirements[req_id].append(
                    {
                        "path": rel(path),
                        "line": line_no,
                        "snippet": line.strip()[:220],
                    }
                )
    return dict(requirements)


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(repo_root().resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def fetch_db_inventory(database_url: str) -> dict[str, Any]:
    with psycopg.connect(database_url, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT test_case_id, requirement_ids, title, objective, priority, suite, tags, source_document_id
                FROM test_cases
                ORDER BY test_case_id
                """
            )
            cases = [
                {
                    "test_case_id": row[0],
                    "requirement_ids": list(row[1] or []),
                    "title": row[2] or "",
                    "objective": row[3] or "",
                    "priority": row[4] or "",
                    "suite": row[5] or "",
                    "tags": list(row[6] or []),
                    "source_document_id": row[7],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT test_case_id, requirement_id, step_number, step_description,
                       coalesce(expected_output, ''), coalesce(test_data, ''), source_row
                FROM test_case_steps
                ORDER BY test_case_id, step_number
                """
            )
            steps = [
                {
                    "test_case_id": row[0],
                    "requirement_id": row[1],
                    "step_number": int(row[2]),
                    "step_description": row[3] or "",
                    "expected_output": row[4] or "",
                    "test_data": row[5] or "",
                    "source_row": row[6],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT c.metadata->>'test_case_id' AS test_case_id, count(*)::int
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE d.kind = 'test_case_repository'
                  AND c.metadata ? 'test_case_id'
                GROUP BY c.metadata->>'test_case_id'
                """
            )
            chunk_counts = {row[0]: int(row[1]) for row in cur.fetchall()}

            cur.execute(
                """
                SELECT path, source_format, kind, content_sha256
                FROM documents
                WHERE kind IN ('brd', 'frs', 'tds', 'rtm', 'strategy', 'plan', 'test_data', 'governance', 'test_case_repository')
                ORDER BY path, source_format
                """
            )
            documents = [
                {
                    "path": row[0],
                    "source_format": row[1],
                    "kind": row[2],
                    "content_sha256": row[3],
                }
                for row in cur.fetchall()
            ]

    return {
        "cases": cases,
        "steps": steps,
        "chunk_counts": chunk_counts,
        "documents": documents,
    }


def audit(inventory: dict[str, Any], hard_reqs: dict[str, list[dict[str, Any]]]) -> tuple[list[Finding], dict[str, Any]]:
    findings: list[Finding] = []
    cases = inventory["cases"]
    steps = inventory["steps"]
    chunk_counts = inventory["chunk_counts"]

    if not cases:
        findings.append(
            Finding(
                "critical",
                "DB Inventory",
                "test_cases",
                "No structured test cases found in DB.",
                "Run ingestion/reseed and ensure TestCases.xlsx was loaded.",
            )
        )
    if not steps:
        findings.append(
            Finding(
                "critical",
                "DB Inventory",
                "test_case_steps",
                "No structured test case steps found in DB.",
                "Run ingestion/reseed and ensure TestCases.xlsx contains TestCases rows.",
            )
        )

    cases_by_id = {case["test_case_id"]: case for case in cases}
    steps_by_case: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for step in steps:
        steps_by_case[step["test_case_id"]].append(step)

    for case in cases:
        tc_id = case["test_case_id"]
        if not TC_RE.match(tc_id):
            findings.append(
                Finding("high", "DB Integrity", tc_id, f"Invalid TestCaseID format: {tc_id}", "Use TC-* identifiers.")
            )
        if not case["title"].strip():
            findings.append(Finding("medium", "DB Integrity", tc_id, "Missing title.", "Populate title in Catalog/source spec."))
        if not case["objective"].strip():
            findings.append(
                Finding("medium", "DB Integrity", tc_id, "Missing objective.", "Populate objective in Catalog/source spec.")
            )
        if chunk_counts.get(tc_id, 0) < 1:
            findings.append(
                Finding(
                    "high",
                    "KB Integrity",
                    tc_id,
                    "No test-case repository chunk exists for this TC in KB chunks.",
                    "Re-run ingestion so each structured TC is represented in the KB.",
                )
            )

        case_steps = steps_by_case.get(tc_id, [])
        if not case_steps:
            findings.append(
                Finding("critical", "DB Integrity", tc_id, "Test case has no steps.", "Fix ingestion/source workbook.")
            )
            continue

        actual_numbers = [step["step_number"] for step in case_steps]
        expected_numbers = list(range(1, len(case_steps) + 1))
        if actual_numbers != expected_numbers:
            findings.append(
                Finding(
                    "high",
                    "DB Integrity",
                    tc_id,
                    f"Step numbers are not contiguous from 1: {actual_numbers}",
                    "Normalize step numbers before execution.",
                )
            )

        step_reqs = sorted({step["requirement_id"] for step in case_steps if step["requirement_id"]})
        case_reqs = sorted(case["requirement_ids"])
        if step_reqs != case_reqs:
            findings.append(
                Finding(
                    "high",
                    "DB Integrity",
                    tc_id,
                    f"test_cases.requirement_ids {case_reqs} does not match step requirements {step_reqs}.",
                    "Rebuild structured inventory from source test-case repository.",
                )
            )

    for step in steps:
        tc_id = step["test_case_id"]
        subject = f"{tc_id} step {step['step_number']}"
        if tc_id not in cases_by_id:
            findings.append(
                Finding(
                    "critical",
                    "DB Integrity",
                    subject,
                    "Step references a missing test_cases row.",
                    "Fix referential integrity and re-run migrations/ingestion.",
                )
            )
        if not step["requirement_id"]:
            findings.append(
                Finding("high", "Traceability", subject, "Missing requirement_id.", "Every executable step must cite REQ-*.")
            )
        elif step["requirement_id"] not in hard_reqs:
            findings.append(
                Finding(
                    "high",
                    "Hard Doc Alignment",
                    subject,
                    f"Requirement {step['requirement_id']} was not found in hard Markdown docs.",
                    "Fix the test-case repository or add the missing approved requirement to hard docs.",
                )
            )
        if not step["step_description"].strip():
            findings.append(
                Finding("high", "DB Integrity", subject, "Missing step description.", "Populate executable step text.")
            )
        if not step["expected_output"].strip():
            findings.append(
                Finding(
                    "medium",
                    "Test Quality",
                    subject,
                    "Missing expected output.",
                    "Add an observable expected result or document why the step is setup-only.",
                )
            )

    doc_paths = {doc["path"] for doc in inventory["documents"]}
    for expected_doc in [
        "test-doc/01-business-requirements-document.md",
        "test-doc/02-functional-requirements-specification.md",
        "test-doc/03-test-design-specification.md",
        "test-doc/06-requirements-traceability-matrix.md",
    ]:
        if expected_doc not in doc_paths:
            findings.append(
                Finding(
                    "medium",
                    "KB Integrity",
                    expected_doc,
                    "Hard doc is not present in the ingestion DB documents table.",
                    "Re-run document ingestion before executing tests.",
                )
            )

    covered_reqs = {step["requirement_id"] for step in steps if step["requirement_id"]}
    frs_reqs = {req for req in hard_reqs if req.startswith(("REQ-FR-", "REQ-SEC-", "REQ-NFR-"))}
    uncovered = sorted(frs_reqs - covered_reqs)
    summary = {
        "case_count": len(cases),
        "step_count": len(steps),
        "hard_doc_requirement_count": len(frs_reqs),
        "covered_requirement_count": len(covered_reqs & frs_reqs),
        "uncovered_requirements": uncovered,
        "finding_counts": count_by_severity(findings),
    }
    return findings, summary


def count_by_severity(findings: list[Finding]) -> dict[str, int]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for finding in findings:
        counts[finding.severity] = counts.get(finding.severity, 0) + 1
    return counts


def write_report(report_path: Path, findings: list[Finding], summary: dict[str, Any], hard_reqs: dict[str, Any]) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# DB/KB Test Case Ingestion Audit",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## Summary",
        "",
        f"- Test cases: {summary['case_count']}",
        f"- Test steps: {summary['step_count']}",
        f"- Hard-doc requirements found: {summary['hard_doc_requirement_count']}",
        f"- Covered hard-doc requirements: {summary['covered_requirement_count']}",
        f"- Findings: {summary['finding_counts']}",
        "",
        "## Findings",
        "",
        "| Severity | Category | Subject | Evidence | Remediation |",
        "|---|---|---|---|---|",
    ]
    if findings:
        for finding in findings:
            lines.append(
                "| "
                + " | ".join(
                    [
                        finding.severity,
                        md(finding.category),
                        md(finding.subject),
                        md(finding.evidence),
                        md(finding.remediation),
                    ]
                )
                + " |"
            )
    else:
        lines.append("| none | none | none | No blocking findings. | none |")

    if summary["uncovered_requirements"]:
        lines.extend(["", "## Non-Blocking Coverage Gaps", ""])
        for req_id in summary["uncovered_requirements"]:
            refs = hard_reqs.get(req_id, [])
            source = refs[0] if refs else {}
            lines.append(f"- `{req_id}` is present in hard docs but has no structured DB test step. {source.get('path', '')}:{source.get('line', '')}")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def md(value: str) -> str:
    return str(value).replace("|", "\\|").replace("\n", "<br>")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit structured DB/KB test cases against hard source documents.")
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL", DEFAULT_DB))
    parser.add_argument("--test-doc-dir", type=Path, default=repo_root() / "test-doc")
    parser.add_argument("--report", type=Path, default=None)
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--fail-on-medium", action="store_true")
    args = parser.parse_args()

    hard_reqs = collect_hard_doc_requirements(args.test_doc_dir)
    inventory = fetch_db_inventory(args.database_url)
    findings, summary = audit(inventory, hard_reqs)

    if args.report:
        write_report(args.report, findings, summary, hard_reqs)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(
                {
                    "summary": summary,
                    "findings": [asdict(finding) for finding in findings],
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    print(json.dumps(summary, indent=2))
    blocking = {"critical", "high"} | ({"medium"} if args.fail_on_medium else set())
    return 1 if any(f.severity in blocking for f in findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
