# Ingestion: Postgres + pgvector, Word/Markdown RAG corpus

Local **PostgreSQL 16** with **pgvector**, ingestion of `test-doc/*.docx` (default) and optional `*.md`, structured ingestion of `test_data/TestCases.xlsx`, entity/relationship extraction, a **query CLI** for bounded retrieval and test-case inventory answers, and a **Jupyter notebook** for exploratory analysis.

## Prerequisites

- Docker (for Postgres)
- Python 3.11+ recommended

## Quick start

```bash
cd ingestion
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL if needed
```

### 1. Start Postgres

```bash
docker compose up -d
```

Wait until healthy (`docker compose ps`). Default URL:

`postgresql://ingestion:ingestion@localhost:5433/ingestion`

### 2. Apply SQL migrations

From repo root (or `ingestion/` with adjusted paths):

```bash
export PGPASSWORD=ingestion
./ingestion/scripts/apply_migrations.sh
```

Or manually:

```bash
psql -h localhost -p 5433 -U ingestion -d ingestion -f ingestion/sql/001_extensions.sql
psql -h localhost -p 5433 -U ingestion -d ingestion -f ingestion/sql/002_schema.sql
psql -h localhost -p 5433 -U ingestion -d ingestion -f ingestion/sql/003_test_case_inventory.sql
```

### 3. Ingest `test-doc`

Default: **Word only** (stakeholder-aligned exports).

```bash
cd /path/to/QAMVP
export DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion
python ingestion/scripts/ingest.py --format docx
```

The default ingest also loads `test_data/TestCases.xlsx` into:

- `test_cases`: one row per test case.
- `test_case_steps`: one row per executable step.
- `documents/chunks`: one `xlsx` document and one embedded chunk per test case.

Options:

| Flag | Meaning |
|------|---------|
| `--format docx` | `.docx` only (default) |
| `--format md` | Markdown only |
| `--format both` | Both; separate `documents` rows per path + `source_format` (compare in notebook via `logical_doc_key`) |
| `--test-doc PATH` | Override `test-doc` directory |
| `--test-cases PATH` | Override `test_data/TestCases.xlsx` |
| `--skip-test-cases` | Skip structured workbook ingestion |
| `--max-chars`, `--overlap` | Chunk sizing |
| `--skip-embed` | Skip embeddings (schema smoke test; query CLI needs vectors) |

**Embeddings:** first run downloads `sentence-transformers` weights (~90MB) for `all-MiniLM-L6-v2` (**384 dimensions**, matching `vector(384)` in SQL). Override with `ST_MODEL_NAME` only if you change the schema dimension accordingly.

**Regenerating `.docx`:** from `test-doc`, see `scripts/export-docx.sh` / your Pandoc pipeline; ingest expects files under `test-doc/`.

### Repeatable full reseed

For the standard repo layout, run:

```bash
export DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion
./ingestion/scripts/reseed_knowledge_base.sh
```

The wrapper does four things in order:

1. Renders `test_data/TestCases.xlsx` and `test-doc/09-test-case-repository.md` from `test-doc/test-case-repository.json`.
2. Exports Markdown docs to `.docx`.
3. Applies all SQL migrations.
4. Ingests documents and structured test cases, then verifies the test-case count.

For a different docs pack, keep the same JSON contract and override paths:

```bash
TEST_DOC_DIR=/path/to/docs \
TEST_CASE_SPEC=/path/to/docs/test-case-repository.json \
TEST_CASE_XLSX=/path/to/test_data/TestCases.xlsx \
DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion \
  ./ingestion/scripts/reseed_knowledge_base.sh
```

The spec schema is `test-doc/test-case-repository.schema.json`. The core shape is: one `cases[]` entry per test case, each with `test_case_id`, `title`, `objective`, `priority`, `suite`, `tags`, and ordered `steps[]` containing `requirement_id`, `step_number`, `step_description`, `expected_output`, and `test_data`.

### 4. Query CLI (RAG-style context)

```bash
export DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion
python ingestion/scripts/query.py "What are the main functional requirements?" -k 8 --max-chars 24000
python ingestion/scripts/query.py "traceability matrix" --neighbors
python ingestion/scripts/query.py "How many test cases are there?"
python ingestion/scripts/query.py "Show TC-003"
```

For test-case count/list/detail questions, the CLI answers from `test_cases` / `test_case_steps` first. Other questions use cosine distance (`<=>`) on chunk embeddings; `--neighbors` pulls adjacent ordinals in the same document.

### 5. Jupyter: data analysis

Register the venv as a kernel (once), then open the notebook and pick **Python (QAMVP ingestion)** in the kernel picker:

```bash
cd ingestion
.venv/bin/python -m ipykernel install --user --name=qamvp-ingestion --display-name="Python (QAMVP ingestion)"
jupyter notebook notebooks/data_analysis.ipynb
```

The notebook loads `documents`, `chunks`, `entities`, and `relationships`, plots distributions, and includes ad-hoc SQL examples. Optional CSV exports go to `notebooks/output/` (gitignored).

If a setup cell uses `%pip` and you see `zsh: no matches found: psycopg[binary]`, quote the extra: `'psycopg[binary]'`, or rely on `pip install -r requirements.txt` in `.venv` instead.

## Idempotency

Re-running ingest for the same `(path, source_format)` deletes the prior `documents` row (cascades to chunks, entities, relationships) and re-inserts. Test-case workbook ingestion refreshes `test_cases` and `test_case_steps` from `test_data/TestCases.xlsx`.

## When to use `.docx` vs `.md`

- **`.docx`:** primary artifact for stakeholder-aligned text.
- **`.md`:** richer explicit links; use `--format both` once to compare relationship counts vs Word hyperlinks.
- **`TestCases.xlsx`:** primary structured artifact for inventory counts and step-level TC retrieval.

## Troubleshooting

- **Connection refused:** ensure `docker compose up -d` and port **5433**.
- **Notebook: `No module named 'psycopg2'`:** SQLAlchemy treats `postgresql://` as **psycopg2**. This project uses **psycopg3** (`pip install psycopg[binary]`). The notebook rewrites URLs to `postgresql+psycopg://` before `create_engine`; ensure you run the latest setup cell, or set `DATABASE_URL` that way in code.
- **Dimension errors:** DB column is `vector(384)`; use the default MiniLM model or alter the column and index if you switch models.
- **No headings in a `.docx`:** ingest falls back to paragraph-window chunking (see logs).
