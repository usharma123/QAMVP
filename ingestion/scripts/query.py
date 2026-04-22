#!/usr/bin/env python3
"""Semantic search over ingested chunks (bounded output for RAG / Claude Code)."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import psycopg
from embeddings import embed_query
from pgvector.psycopg import register_vector

DEFAULT_DB = "postgresql://ingestion:ingestion@localhost:5433/ingestion"

TC_ID_RE = re.compile(r"\bTC-\d{3}\b", re.I)
SEARCH_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "case",
    "cases",
    "for",
    "how",
    "is",
    "list",
    "many",
    "me",
    "of",
    "show",
    "test",
    "tests",
    "the",
    "there",
    "validates",
    "validate",
    "what",
    "which",
}


def structured_test_case_answer(conn: psycopg.Connection, query_text: str) -> str | None:
    """Answer inventory questions from structured tables before vector search."""
    q = query_text.lower()
    mentions_test_cases = "test case" in q or "test cases" in q or TC_ID_RE.search(query_text)
    if not mentions_test_cases:
        return None

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT to_regclass('public.test_cases') IS NOT NULL,
                   to_regclass('public.test_case_steps') IS NOT NULL
            """
        )
        has_cases, has_steps = cur.fetchone()
        if not has_cases or not has_steps:
            return None

        tc_match = TC_ID_RE.search(query_text)
        if tc_match:
            tc_id = tc_match.group(0).upper()
            cur.execute(
                """
                SELECT tc.test_case_id, tc.title, tc.objective, tc.requirement_ids,
                       tc.priority, tc.suite, tc.tags,
                       s.step_number, s.requirement_id, s.step_description,
                       s.expected_output, s.test_data
                FROM test_cases tc
                JOIN test_case_steps s ON s.test_case_id = tc.test_case_id
                WHERE tc.test_case_id = %s
                ORDER BY s.step_number
                """,
                (tc_id,),
            )
            rows = cur.fetchall()
            if not rows:
                return f"No structured test case found for {tc_id}."
            first = rows[0]
            lines = [
                f"Structured test case: {first[0]}",
                f"Title: {first[1]}",
                f"Objective: {first[2]}",
                f"Requirements: {', '.join(first[3])}",
                f"Priority: {first[4]}",
                f"Suite: {first[5]}",
                f"Tags: {', '.join(first[6])}",
                "",
                "| Step | RequirementID | StepDescription | ExpectedOutput | TestData |",
                "|------|---------------|-----------------|----------------|----------|",
            ]
            for row in rows:
                lines.append(
                    f"| {row[7]} | {row[8]} | {_md_cell(row[9])} | "
                    f"{_md_cell(row[10])} | {_md_cell(row[11])} |"
                )
            return "\n".join(lines)

        wants_count = bool(
            re.search(r"\b(how many|count|number of)\b", q)
            or re.search(r"\btotal\s+(test\s+)?cases?\b", q)
        )
        wants_list = any(term in q for term in ("list", "show", "what are", "which"))
        search_tokens = [
            t
            for t in re.findall(r"[a-z0-9-]+", q)
            if len(t) > 2 and t not in SEARCH_STOPWORDS and not t.startswith("tc-")
        ]
        if search_tokens and not wants_count:
            cur.execute(
                """
                SELECT tc.test_case_id, tc.title, tc.requirement_ids, tc.priority, tc.suite,
                       coalesce(tc.objective, '') || ' ' || coalesce(string_agg(s.step_description || ' ' || coalesce(s.expected_output, '') || ' ' || coalesce(s.test_data, ''), ' '), '') AS searchable
                FROM test_cases tc
                LEFT JOIN test_case_steps s ON s.test_case_id = tc.test_case_id
                GROUP BY tc.test_case_id, tc.title, tc.requirement_ids, tc.priority, tc.suite, tc.objective
                ORDER BY tc.test_case_id
                """
            )
            scored = []
            for tc_id, title, reqs, priority, suite, searchable in cur.fetchall():
                haystack = " ".join([tc_id, title or "", " ".join(reqs), searchable or ""]).lower()
                score = sum(1 for token in search_tokens if token in haystack)
                if score:
                    scored.append((score, tc_id, title, reqs, priority, suite))
            if scored:
                scored.sort(key=lambda r: (-r[0], r[1]))
                lines = [
                    f"Structured test-case matches for: {', '.join(search_tokens)}",
                    "",
                    "| TestCaseID | Title | Requirements | Priority | Suite |",
                    "|------------|-------|--------------|----------|-------|",
                ]
                for _score, tc_id, title, reqs, priority, suite in scored[: min(10, len(scored))]:
                    lines.append(
                        f"| {tc_id} | {_md_cell(title)} | {', '.join(reqs)} | {priority} | {suite} |"
                    )
                return "\n".join(lines)

        if wants_count or wants_list:
            cur.execute("SELECT count(*) FROM test_cases")
            case_count = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM test_case_steps")
            step_count = cur.fetchone()[0]
            cur.execute(
                """
                SELECT test_case_id, title, requirement_ids, priority, suite
                FROM test_cases
                ORDER BY test_case_id
                """
            )
            rows = cur.fetchall()
            lines = [
                f"Structured test-case inventory: {case_count} test cases, {step_count} steps.",
            ]
            if wants_list or case_count <= 20:
                lines.extend(["", "| TestCaseID | Title | Requirements | Priority | Suite |", "|------------|-------|--------------|----------|-------|"])
                for tc_id, title, reqs, priority, suite in rows:
                    lines.append(
                        f"| {tc_id} | {_md_cell(title)} | {', '.join(reqs)} | {priority} | {suite} |"
                    )
            return "\n".join(lines)
    return None


def _md_cell(value: object) -> str:
    return "" if value is None else str(value).replace("|", "\\|").replace("\n", " ")


def main() -> None:
    ap = argparse.ArgumentParser(description="Query ingested chunks by similarity")
    ap.add_argument("query_text", help="Natural language query")
    ap.add_argument("-k", type=int, default=8, help="Top-k chunks")
    ap.add_argument(
        "--max-chars",
        type=int,
        default=24_000,
        help="Stop after this many characters of context",
    )
    ap.add_argument(
        "--neighbors",
        action="store_true",
        help="Include previous/next chunk from same document for each hit",
    )
    ap.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", DEFAULT_DB),
    )
    args = ap.parse_args()

    with psycopg.connect(args.database_url) as conn:
        register_vector(conn)
        structured = structured_test_case_answer(conn, args.query_text)
        if structured:
            print(structured)
            return

        qvec = embed_query(args.query_text)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.document_id, c.ordinal, c.heading_path, c.content, d.path, d.source_format,
                       c.embedding <=> %s::vector AS dist
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.embedding IS NOT NULL
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s
                """,
                (qvec, qvec, args.k),
            )
            rows = cur.fetchall()
            all_rows: list = list(rows)
            if args.neighbors and rows:
                seen = {r[0] for r in rows}
                for r in rows:
                    _cid, doc_id, ordinal, *_rest = r
                    for nid_ord in (ordinal - 1, ordinal + 1):
                        if nid_ord < 0:
                            continue
                        cur.execute(
                            """
                            SELECT c.id, c.document_id, c.ordinal, c.heading_path, c.content, d.path, d.source_format,
                                   NULL::float AS dist
                            FROM chunks c
                            JOIN documents d ON d.id = c.document_id
                            WHERE c.document_id = %s AND c.ordinal = %s
                            """,
                            (doc_id, nid_ord),
                        )
                        n = cur.fetchone()
                        if n and n[0] not in seen:
                            seen.add(n[0])
                            all_rows.append(n)

    parts: list[str] = []
    used = 0
    for row in all_rows:
        cid, doc_id, ordinal, heading, content, path, fmt, dist = row
        sim = f"{1.0 - float(dist):.4f}" if dist is not None else "n/a"
        block = (
            f"### {path} ({fmt}) ord={ordinal}\n"
            f"**{heading}**  · similarity≈{sim}\n\n{content}\n"
        )
        if used + len(block) > args.max_chars:
            parts.append(
                f"\n_[Truncated at --max-chars={args.max_chars}; omitting further chunks]_\n"
            )
            break
        parts.append(block)
        used += len(block)

    print("\n---\n".join(parts))


if __name__ == "__main__":
    main()
