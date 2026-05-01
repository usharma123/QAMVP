#!/usr/bin/env python3
"""Ingest test-doc Word/Markdown into Postgres + pgvector."""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import psycopg
from chunking_docx import parse_docx
from chunking_md import parse_markdown
from common import RawChunk
from embeddings import EMBEDDING_DIM, embed_texts
from entities import extract_entities
from pgvector.psycopg import register_vector
from psycopg.types.json import Json
from test_case_inventory import load_test_case_records, records_to_chunks

DEFAULT_DB = "postgresql://ingestion:ingestion@localhost:5433/ingestion"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def infer_kind(path: str) -> str:
    name = Path(path).name.lower()
    if "brd" in name or "business" in name or name.startswith("01-"):
        return "brd"
    if "frs" in name or "functional" in name or name.startswith("02-"):
        return "frs"
    if "hld" in name or "high-level" in name or "high_level" in name or name.startswith("03-"):
        return "hld"
    if "lld" in name or "low-level" in name or "low_level" in name or name.startswith("04-"):
        return "lld"
    if name.startswith("09-") or name == "testcases.xlsx":
        return "test_case_repository"
    return "other"


def is_source_kind(kind: str) -> bool:
    return kind in {"brd", "frs", "hld", "lld"}


def purge_non_source_documents(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM documents
            WHERE kind IS NULL
               OR kind NOT IN ('brd', 'frs', 'hld', 'lld')
            """
        )


def purge_stale_source_documents(conn: psycopg.Connection, active_paths: set[str]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE source_document_versions
            SET is_active = false,
                updated_at = now(),
                metadata = metadata || '{"inactive_reason":"not_in_active_source_pack"}'::jsonb
            WHERE document_kind IN ('brd', 'frs', 'hld', 'lld')
              AND document_id IN (
                SELECT id
                FROM documents
                WHERE coalesce(metadata->>'original_path', path) <> ALL(%s)
              )
            """,
            (list(active_paths),),
        )


def logical_key_from_path(path: Path) -> str:
    return path.stem


def file_sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def infer_version_label(path: Path, raw_chunks: list[RawChunk], digest: str) -> str:
    text = "\n".join(chunk.content for chunk in raw_chunks[:3])
    for pattern in (
        r"\*\*Version:\*\*\s*([A-Za-z0-9._-]+)",
        r"\bVersion:\s*([A-Za-z0-9._-]+)",
        r"\bVer:\s*([A-Za-z0-9._-]+)",
        r"\bv([0-9]+(?:\.[0-9]+)*)\b",
    ):
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(1).strip()
    stem_match = re.search(r"(?:^|[-_])v([0-9]+(?:[._-][0-9]+)*)(?:[-_]|$)", path.stem, re.I)
    if stem_match:
        return stem_match.group(1).replace("_", ".").replace("-", ".")
    return f"sha-{digest[:12]}"


def insert_document_version(
    cur: psycopg.Cursor,
    document_id: int,
    logical_key: str,
    kind: str,
    version_label: str,
    digest: str,
    source_format: str,
    supersedes_document_id: int | None,
    metadata: dict,
) -> None:
    cur.execute(
        """
        UPDATE source_document_versions
        SET is_active = false,
            updated_at = now()
        WHERE logical_doc_key = %s
          AND document_kind = %s
          AND source_format = %s
        """,
        (logical_key, kind, source_format),
    )
    cur.execute(
        """
        INSERT INTO source_document_versions (
          document_id, logical_doc_key, document_kind, version_label, content_sha256,
          source_format, is_active, supersedes_document_id, metadata, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, true, %s, %s, now())
        ON CONFLICT (logical_doc_key, document_kind, source_format, content_sha256)
        DO UPDATE SET
          document_id = excluded.document_id,
          version_label = excluded.version_label,
          is_active = true,
          supersedes_document_id = excluded.supersedes_document_id,
          metadata = excluded.metadata,
          updated_at = now()
        """,
        (
            document_id,
            logical_key,
            kind,
            version_label,
            digest,
            source_format,
            supersedes_document_id,
            Json(metadata),
        ),
    )


def normalize_href(href: str, test_doc_dir: Path) -> tuple[str | None, str | None, str]:
    href = href.strip()
    anchor = None
    if "#" in href:
        href, frag = href.split("#", 1)
        anchor = frag or None
    if href.startswith(("http://", "https://", "mailto:")):
        return None, anchor, "external_link"
    if not href:
        return None, anchor, "markdown_link"
    base = test_doc_dir.resolve()
    candidate = (base / href).resolve()
    try:
        rel = candidate.relative_to(base)
        return f"{test_doc_dir.name}/{rel.as_posix()}", anchor, "internal_link"
    except ValueError:
        pass
    try:
        rel = candidate.relative_to(repo_root().resolve())
        return rel.as_posix(), anchor, "internal_link"
    except ValueError:
        return href, anchor, "markdown_link"


def parse_file(
    path: Path, source_format: str, max_chars: int, overlap: int
) -> list[RawChunk]:
    if source_format == "docx":
        return parse_docx(str(path), max_chars, overlap)
    return parse_markdown(str(path), max_chars, overlap)


def ingest_test_case_workbook(
    conn: psycopg.Connection,
    path: Path,
    root: Path,
    skip_embed: bool,
) -> None:
    if not path.exists():
        print(f"  skip missing test-case workbook: {path}")
        return

    try:
        rel_path = path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        rel_path = path.name

    records = load_test_case_records(path)
    raw_chunks = records_to_chunks(records)
    digest = file_sha256(path)

    if skip_embed:
        embeddings: list[list[float] | None] = [None] * len(raw_chunks)
    else:
        embeddings = embed_texts([c.content for c in raw_chunks])
        if len(embeddings) != len(raw_chunks):
            raise RuntimeError("embedding count mismatch")

    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM documents WHERE path = %s AND source_format = 'xlsx'",
            (rel_path,),
        )
        cur.execute("DELETE FROM test_case_steps")
        cur.execute("DELETE FROM test_cases")

        cur.execute(
            """
            INSERT INTO documents (path, source_format, title, kind, logical_doc_key, content_sha256, metadata)
            VALUES (%s, 'xlsx', %s, 'test_case_repository', %s, %s, %s)
            RETURNING id
            """,
            (
                rel_path,
                path.stem,
                path.stem,
                digest,
                Json({"test_case_count": len(records), "step_count": sum(len(r.steps) for r in records)}),
            ),
        )
        doc_id = cur.fetchone()[0]

        chunk_ids: dict[str, int] = {}
        chunk_content_by_case: dict[str, str] = {}
        for ord_, rc in enumerate(raw_chunks):
            cur.execute(
                """
                INSERT INTO chunks (document_id, ordinal, heading_path, content, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    doc_id,
                    ord_,
                    rc.heading_path,
                    rc.content,
                    embeddings[ord_],
                    Json({**rc.metadata, "source_format": "xlsx"}),
                ),
            )
            test_case_id = rc.metadata["test_case_id"]
            chunk_ids[test_case_id] = cur.fetchone()[0]
            chunk_content_by_case[test_case_id] = rc.content

        for record in records:
            cur.execute(
                """
                INSERT INTO test_cases
                    (test_case_id, requirement_ids, title, objective, priority, suite, tags, source_document_id, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    record.test_case_id,
                    record.requirement_ids,
                    record.title,
                    record.objective,
                    record.priority,
                    record.suite,
                    record.tags,
                    doc_id,
                    Json({"step_count": len(record.steps)}),
                ),
            )
            for step in record.steps:
                cur.execute(
                    """
                    INSERT INTO test_case_steps
                        (test_case_id, requirement_id, step_number, step_description, expected_output, test_data, source_row)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        step.test_case_id,
                        step.requirement_id,
                        step.step_number,
                        step.step_description,
                        step.expected_output,
                        step.test_data,
                        step.source_row,
                    ),
                )

            cid = chunk_ids[record.test_case_id]
            for hit in extract_entities(chunk_content_by_case[record.test_case_id], include_test_cases=True):
                cur.execute(
                    """
                    INSERT INTO entities (entity_type, canonical_id, document_id, chunk_id, first_seen)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        hit.entity_type,
                        hit.canonical_id,
                        doc_id,
                        cid,
                        hit.canonical_id[:64],
                    ),
                )

    print(
        f"  ingested {rel_path} (xlsx): {len(records)} test cases, "
        f"{sum(len(r.steps) for r in records)} steps"
    )


def ingest_one(
    conn: psycopg.Connection,
    path: Path,
    source_format: str,
    test_doc_dir: Path,
    max_chars: int,
    overlap: int,
    skip_embed: bool,
) -> None:
    rel_path = f"{test_doc_dir.name}/{path.name}"
    logical_key = logical_key_from_path(path)
    kind = infer_kind(rel_path)
    if not is_source_kind(kind):
        print(f"  skip non-source document for first-phase ingestion: {rel_path} ({kind})")
        return
    digest = file_sha256(path)
    storage_path = f"{rel_path}@{digest[:12]}"
    raw_chunks = parse_file(path, source_format, max_chars, overlap)
    if not raw_chunks:
        print(f"  skip empty: {rel_path}")
        return
    version_label = infer_version_label(path, raw_chunks, digest)

    if skip_embed:
        embeddings: list[list[float] | None] = [None] * len(raw_chunks)
    else:
        embeddings = embed_texts([c.content for c in raw_chunks])
        if len(embeddings) != len(raw_chunks):
            raise RuntimeError("embedding count mismatch")
        for e in embeddings:
            if e is not None and len(e) != EMBEDDING_DIM:
                raise RuntimeError(f"bad dim {len(e)} expected {EMBEDDING_DIM}")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT document_id
            FROM source_document_versions
            WHERE logical_doc_key = %s
              AND document_kind = %s
              AND source_format = %s
              AND is_active = true
              AND content_sha256 <> %s
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (logical_key, kind, source_format, digest),
        )
        row = cur.fetchone()
        supersedes_document_id = row[0] if row else None
        cur.execute(
            """
            SELECT document_id
            FROM source_document_versions
            WHERE logical_doc_key = %s
              AND document_kind = %s
              AND source_format = %s
              AND content_sha256 = %s
            """,
            (logical_key, kind, source_format, digest),
        )
        row = cur.fetchone()
        if row:
            cur.execute("DELETE FROM documents WHERE id = %s", (row[0],))
        else:
            cur.execute(
                """
                DELETE FROM documents
                WHERE (path = %s OR path = %s)
                  AND source_format = %s
                  AND content_sha256 = %s
                  AND id NOT IN (SELECT document_id FROM source_document_versions)
                """,
                (storage_path, rel_path, source_format, digest),
            )
        cur.execute(
            """
            INSERT INTO documents (path, source_format, title, kind, logical_doc_key, content_sha256, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                storage_path,
                source_format,
                path.stem,
                kind,
                logical_key,
                digest,
                Json({
                    "chunk_count": len(raw_chunks),
                    "original_path": rel_path,
                    "storage_path": storage_path,
                    "document_version": version_label,
                    "is_active_version": True,
                    "version_method": "explicit_metadata_or_content_hash",
                }),
            ),
        )
        doc_id = cur.fetchone()[0]
        insert_document_version(
            cur,
            doc_id,
            logical_key,
            kind,
            version_label,
            digest,
            source_format,
            supersedes_document_id,
            {
                "path": rel_path,
                "storage_path": storage_path,
                "chunk_count": len(raw_chunks),
                "is_active_version": True,
                "version_method": "explicit_metadata_or_content_hash",
            },
        )

        chunk_ids: list = []
        for ord_, rc in enumerate(raw_chunks):
            meta = {
                **rc.metadata,
                "source_format": source_format,
                "urls": rc.urls,
            }
            emb = embeddings[ord_]
            cur.execute(
                """
                INSERT INTO chunks (document_id, ordinal, heading_path, content, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    doc_id,
                    ord_,
                    rc.heading_path,
                    rc.content,
                    emb,
                    Json(meta),
                ),
            )
            chunk_ids.append(cur.fetchone()[0])

        for ord_, rc in enumerate(raw_chunks):
            cid = chunk_ids[ord_]
            for hit in extract_entities(rc.content, include_test_cases=False):
                cur.execute(
                    """
                    INSERT INTO entities (entity_type, canonical_id, document_id, chunk_id, first_seen)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        hit.entity_type,
                        hit.canonical_id,
                        doc_id,
                        cid,
                        hit.canonical_id[:64],
                    ),
                )

        for ord_, rc in enumerate(raw_chunks):
            cid = chunk_ids[ord_]
            for url in rc.urls:
                tpath, tanchor, rclass = normalize_href(url, test_doc_dir)
                if source_format == "docx" and rclass == "internal_link":
                    rtype = "docx_hyperlink"
                elif source_format == "docx" and rclass == "external_link":
                    rtype = "external_link"
                else:
                    rtype = "markdown_link" if rclass != "external_link" else "external_link"
                cur.execute(
                    """
                    INSERT INTO relationships (source_chunk_id, source_document_id, target_path, target_anchor, rel_type, evidence)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (cid, doc_id, tpath, tanchor, rtype, url[:500]),
                )

    print(f"  ingested {rel_path} ({source_format}): {len(raw_chunks)} chunks")


def main() -> None:
    ap = argparse.ArgumentParser(description="Ingest test-doc into pgvector DB")
    ap.add_argument(
        "--format",
        choices=("docx", "md", "both"),
        default="docx",
        help="Source file type (default: docx)",
    )
    ap.add_argument(
        "--test-doc",
        type=Path,
        default=None,
        help="Path to test-doc directory (default: <repo>/test-doc)",
    )
    ap.add_argument(
        "--test-cases",
        type=Path,
        default=None,
        help="Path to TestCases.xlsx (default: <repo>/test_data/TestCases.xlsx)",
    )
    ap.add_argument(
        "--skip-test-cases",
        action="store_true",
        help="Skip structured TestCases.xlsx ingestion",
    )
    ap.add_argument("--max-chars", type=int, default=3200)
    ap.add_argument("--overlap", type=int, default=200)
    ap.add_argument(
        "--skip-embed",
        action="store_true",
        help="Store chunks without vectors (for schema smoke tests)",
    )
    ap.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", DEFAULT_DB),
    )
    args = ap.parse_args()

    root = repo_root()
    test_doc_dir = args.test_doc or (root / "test-doc")
    test_cases_path = args.test_cases or (root / "test_data" / "TestCases.xlsx")
    if not test_doc_dir.is_dir():
        print(f"Missing test-doc dir: {test_doc_dir}", file=sys.stderr)
        sys.exit(1)

    jobs: list[tuple[Path, str]] = []
    if args.format in ("docx", "both"):
        for p in sorted(test_doc_dir.glob("*.docx")):
            jobs.append((p, "docx"))
    if args.format in ("md", "both"):
        for p in sorted(test_doc_dir.glob("*.md")):
            jobs.append((p, "md"))

    if not jobs:
        print("No files matched.", file=sys.stderr)
        sys.exit(1)

    with psycopg.connect(args.database_url) as conn:
        register_vector(conn)
        if args.skip_test_cases:
            purge_non_source_documents(conn)
            active_paths = {f"{test_doc_dir.name}/{path.name}" for path, _fmt in jobs if is_source_kind(infer_kind(f"{test_doc_dir.name}/{path.name}"))}
            purge_stale_source_documents(conn, active_paths)
        for path, fmt in jobs:
            ingest_one(
                conn,
                path,
                fmt,
                test_doc_dir,
                args.max_chars,
                args.overlap,
                args.skip_embed,
            )
        if not args.skip_test_cases:
            ingest_test_case_workbook(conn, test_cases_path, root, args.skip_embed)
        conn.commit()
    print("Done.")


if __name__ == "__main__":
    main()
