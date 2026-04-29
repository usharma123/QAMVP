# Query Playwright Test Case

Execute structured KB test cases with the deterministic Playwright black-box runner, then run the independent corporate audit.

## Input

$ARGUMENTS

Supported input:
- `all` — default; run every TC from the KB with bounded Playwright parallelism.
- A TC-ID such as `TC-001` — run only that KB test case after syncing artifacts.

## Rules

- Use absolute paths for all commands.
- Repo root is `/Users/utsavsharma/Documents/GitHub/QAMVP`.
- The ingestion DB structured tables are the source of truth: `test_cases` and `test_case_steps`.
- Do not inspect, read, search, summarize, or rely on webapp source code when constructing, validating, executing, or auditing test cases.
- Forbidden source-code evidence includes files under `/Users/utsavsharma/Documents/GitHub/QAMVP/mock-trading-app/src`, Angular component/service files, route definitions, templates, styles, compiled bundles, source maps, and implementation code used to infer expected behavior.
- The allowed oracle is: source documents, ingestion KB/DB, exported repository artifacts, `test_data/TestCases.xlsx`, observable browser behavior, screenshots, logs, traces, and saved run artifacts.
- Before browser execution, materialize KB test cases into:
  - `test-doc/test-case-repository.json`
  - `test_data/TestCases.xlsx`
  - `test-doc/09-test-case-repository.md`
- Reseed or ingest only when the DB is missing or has zero structured test cases.
- Run Playwright with bounded parallelism. Default to `PLAYWRIGHT_WORKERS=2`; use `PLAYWRIGHT_WORKERS=1` when debugging.
- After Playwright execution, run `/audit-test-run` against the generated result artifacts.

## 0. Preflight

Ensure ingestion dependencies exist:

```bash
/bin/test -d /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv || /usr/bin/python3 -m venv /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/pip install -r /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/requirements.txt -q
```

Ensure Playwright runner dependencies exist:

```bash
/usr/local/bin/npm install --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner
/usr/local/bin/npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner playwright install chromium
```

## 1. Ensure DB Is Ready

Use this default database URL unless the user provides another:

```bash
export DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion
```

Check connectivity:

```bash
/opt/homebrew/bin/pg_isready -h localhost -p 5433 -U ingestion -d ingestion
```

If unavailable, start the local ingestion database:

```bash
/opt/homebrew/bin/docker compose -f /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/docker-compose.yml up -d
```

Apply migrations:

```bash
PGPASSWORD=ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/apply_migrations.sh
```

Check structured inventory count:

```bash
PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select count(*) from test_cases;"
PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select count(*) from test_case_steps;"
```

If `test_cases` is `0`, run the repeatable reseed:

```bash
DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/reseed_knowledge_base.sh
```

If the count is still `0`, stop and report that the KB has no structured test cases.

## 2. Export KB Test Cases To Artifacts

Export all DB test cases into the repeatable repository spec:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/export_test_case_repository.py --output /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json
```

Render workbook and Markdown from that spec:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/scripts/build_test_case_repository.py --spec /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json --workbook-out /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/TestCases.xlsx --markdown-out /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/09-test-case-repository.md
```

Confirm repository spec and workbook are readable:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/python -c "
import json
from pathlib import Path
from openpyxl import load_workbook
spec = json.loads(Path('/Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json').read_text())
wb = load_workbook('/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/TestCases.xlsx', data_only=True)
print('spec_cases=', len(spec['cases']))
print('workbook_rows=', wb['TestCases'].max_row - 1)
"
```

If artifact export or loader verification fails, fix that first and do not execute Playwright tests.

## 3. Run Playwright Execution

For a specific TC-ID:

```bash
TC_ID=TC-XXX PLAYWRIGHT_WORKERS=1 /usr/local/bin/npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner playwright test --config /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner/playwright.config.ts --workers=1 --grep "TC-XXX"
```

For all KB test cases:

```bash
TC_ID=all PLAYWRIGHT_WORKERS=2 /usr/local/bin/npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner playwright test --config /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner/playwright.config.ts --workers=2
```

Playwright artifacts are saved under:

```text
test_data/test-results/<TC-ID>/playwright_<YYYYMMDD_HHMMSS>/
```

Each TC artifact folder must contain:
- `manifest.json`
- `result.json`
- `step-log.md`
- `final-page-text.txt`
- `trace.zip`
- per-step screenshots

If a step cannot be mapped deterministically, the runner must mark it `BLOCKED_UNMAPPED_STEP` and still write artifacts.

## 4. Run Independent Corporate Audit

After Playwright execution, run:

```text
/audit-test-run test_data/test-results
```

For a specific TC-ID, run:

```text
/audit-test-run <TC-ID>
```

The audit must confirm:
- Test cases were sourced from hard docs and ingestion DB structured records.
- DB, JSON, Markdown, workbook, and Playwright-executed steps align.
- Playwright execution did not depend on webapp source-code inspection.
- Each run produced durable evidence.
- The final verdict is supported by independent artifacts.

If the audit is `Not Approved` or `Inconclusive`, report that result even if Playwright execution showed `PASS`.

## 5. Final Summary

Print:

```text
=== QUERY PLAYWRIGHT TEST RESULT ===
Source: ingestion DB structured test_cases/test_case_steps
Source-code independence: webapp source not inspected or used as oracle
Repository spec: test-doc/test-case-repository.json
Repository markdown: test-doc/09-test-case-repository.md
Generated workbook: test_data/TestCases.xlsx
Executed: all / <TC-ID>
Workers: <N>
Playwright results:
  TC-001: PASS / FAIL / BLOCKED_UNMAPPED_STEP
Artifacts:
  test_data/test-results/<TC-ID>/playwright_<timestamp>/
Audit:
  Approved / Approved with Conditions / Not Approved / Inconclusive
```
