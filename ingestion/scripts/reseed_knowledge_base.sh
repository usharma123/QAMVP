#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

PYTHON_BIN="${PYTHON_BIN:-$ROOT/ingestion/.venv/bin/python}"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="${PYTHON_BIN_FALLBACK:-python3}"
fi

TEST_DOC_DIR="${TEST_DOC_DIR:-$ROOT/test-doc}"
TEST_DATA_DIR="${TEST_DATA_DIR:-$ROOT/test_data}"
TEST_CASE_SPEC="${TEST_CASE_SPEC:-$TEST_DOC_DIR/test-case-repository.json}"
TEST_CASE_XLSX="${TEST_CASE_XLSX:-$TEST_DATA_DIR/TestCases.xlsx}"
TEST_CASE_MD="${TEST_CASE_MD:-$TEST_DOC_DIR/09-test-case-repository.md}"
INGEST_FORMAT="${INGEST_FORMAT:-both}"
EXPORT_DOCX="${EXPORT_DOCX:-1}"
BUILD_TEST_CASES="${BUILD_TEST_CASES:-1}"
DATABASE_URL="${DATABASE_URL:-postgresql://ingestion:ingestion@localhost:5433/ingestion}"

if [[ "$BUILD_TEST_CASES" == "1" ]]; then
  "$PYTHON_BIN" "$ROOT/test-doc/scripts/build_test_case_repository.py" \
    --spec "$TEST_CASE_SPEC" \
    --workbook-out "$TEST_CASE_XLSX" \
    --markdown-out "$TEST_CASE_MD"
fi

if [[ "$EXPORT_DOCX" == "1" ]]; then
  TEST_DOC_DIR="$TEST_DOC_DIR" "$ROOT/test-doc/scripts/export-docx.sh"
fi

"$ROOT/ingestion/scripts/apply_migrations.sh"

DATABASE_URL="$DATABASE_URL" "$PYTHON_BIN" "$ROOT/ingestion/scripts/ingest.py" \
  --format "$INGEST_FORMAT" \
  --test-doc "$TEST_DOC_DIR" \
  --test-cases "$TEST_CASE_XLSX"

DATABASE_URL="$DATABASE_URL" "$PYTHON_BIN" "$ROOT/ingestion/scripts/query.py" \
  "How many test cases are there?"
