# Query Browse Test Case

Execute all structured test cases currently present in the ingestion knowledge base.

## Input

$ARGUMENTS

No input is required. Ignore natural-language query generation for this command.

Supported optional input:

- `all` — default; run every TC from the KB.
- A TC-ID such as `TC-004` — run only that KB test case after syncing artifacts.

## Rules

- Before running any command step, create a visible checklist titled `Query Browse Checklist`.
- The checklist must include every numbered section in this command plus the source-chain guard.
- Update the checklist as work progresses: mark one item `in_progress`, mark completed items immediately, and leave blocked items explicit with the blocking reason.
- Do not wait until the final response to show checklist status.
- Use absolute paths for all commands.
- Repo root is `/Users/utsavsharma/Documents/GitHub/QAMVP`.
- The ingestion DB structured tables are the source of truth: `test_cases` and `test_case_steps`.
- Run independently of the mock webapp implementation. Do not inspect, read, search, summarize, or rely on webapp source code when constructing, validating, or executing test cases.
- Forbidden source-code evidence includes files under `/Users/utsavsharma/Documents/GitHub/QAMVP/mock-trading-app/src`, Angular component/service files, route definitions, templates, styles, compiled bundles, source maps, and any implementation code used to infer expected behavior.
- The allowed test oracle is: source documents, ingestion KB/DB, exported repository artifacts, `test_data/TestCases.xlsx`, observable browser behavior, screenshots, logs, and saved run artifacts.
- Do not synthesize new test cases from a user query in this command.
- Before browser execution, materialize KB test cases into:
  - `test-doc/test-case-repository.json`
  - `test_data/TestCases.xlsx`
  - `test-doc/09-test-case-repository.md`
- Reseed or ingest only when the DB is missing or has zero structured test cases.
- After materializing artifacts, run via `/browse-test-case all` unless a specific TC-ID was provided.
- After browser execution, run `/audit-test-run` against the executed TC-ID, run folder, or latest browser report.
- Before browser execution, prove DB, JSON, Markdown, and workbook step rows are aligned. If they drift, stop and fix the source chain first.

## Command Checklist

Create and maintain this checklist before executing:

```text
Query Browse Checklist
- [ ] Preflight dependencies
- [ ] Ensure DB is ready
- [ ] Export KB test cases to JSON, Markdown, and workbook
- [ ] Verify query, loader, and DB → JSON → Markdown → workbook alignment
- [ ] Run browser execution
- [ ] Run independent corporate audit
- [ ] Print final summary
```

## 0. Preflight

Ensure ingestion dependencies exist:

```bash
/bin/test -d /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv || /usr/bin/python3 -m venv /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/pip install -r /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/requirements.txt -q
```

Ensure browser/orchestrator dependencies exist for `/browse-test-case`:

```bash
/bin/test -d /Users/utsavsharma/Documents/GitHub/QAMVP/.venv || /usr/bin/python3 -m venv /Users/utsavsharma/Documents/GitHub/QAMVP/.venv
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/pip install -r /Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator/requirements.txt -q
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
```

If the count is `0`, run the repeatable reseed:

```bash
DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/reseed_knowledge_base.sh
```

If the count is still `0`, stop and report that the KB has no structured test cases.

## 2. Export KB Test Cases To Artifacts

The export path must be source-document and KB/DB driven. Do not use webapp source code to create, alter, enrich, or validate the test cases.

Export all DB test cases into the repeatable repository spec:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/export_test_case_repository.py --output /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json
```

Render workbook and Markdown from that spec:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/scripts/build_test_case_repository.py --spec /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json --workbook-out /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/TestCases.xlsx --markdown-out /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/09-test-case-repository.md
```

Export docs to Word and reseed chunks without rebuilding from the JSON again:

```bash
TEST_DOC_DIR=/Users/utsavsharma/Documents/GitHub/QAMVP/test-doc /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/scripts/export-docx.sh
DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion BUILD_TEST_CASES=0 /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/reseed_knowledge_base.sh
```

Verify the KB count and detail endpoint:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/query.py "How many test cases are there?"
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/query.py "Show TC-001"
```

Confirm the local test-case loader can read the rendered workbook:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/python -c "
import sys
sys.path.insert(0, '/Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator')
from tools.tc_loader import list_test_cases, load_test_case
tcs = list_test_cases()
print(tcs)
for tc in tcs:
    loaded = load_test_case(tc['testCaseId'])
    print(tc['testCaseId'], len(loaded['steps']) if loaded else 'NOT FOUND')
"
```

If artifact export, reseed, query verification, or loader verification fails, fix that first and do not execute browser tests.

Confirm DB, JSON, Markdown, and workbook carry the same step inventory:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python - <<'PY'
import json, os, re
from pathlib import Path
from openpyxl import load_workbook
import psycopg

root = Path('/Users/utsavsharma/Documents/GitHub/QAMVP')
spec = json.loads((root / 'test-doc/test-case-repository.json').read_text())
json_rows = {
    (c['test_case_id'], int(s['step_number'])): (s['requirement_id'], s['step_description'], s.get('expected_output') or '', s.get('test_data') or '')
    for c in spec['cases'] for s in c['steps']
}
wb = load_workbook(root / 'test_data/TestCases.xlsx', data_only=True)
ws = wb['TestCases']
headers = [c.value for c in ws[1]]
idx = {h: i for i, h in enumerate(headers)}
xlsx_rows = {
    (r[idx['TestCaseID']], int(r[idx['StepNumber']])): (r[idx['RequirementID']], r[idx['StepDescription']] or '', r[idx['ExpectedOutput']] or '', r[idx['TestData']] or '')
    for r in ws.iter_rows(min_row=2, values_only=True) if any(r)
}
md = (root / 'test-doc/09-test-case-repository.md').read_text()
md_rows = {}
current_tc = None
def split_md_row(line):
    cells, buf, escaped = [], [], False
    for ch in line.strip()[1:-1]:
        if escaped:
            buf.append(ch)
            escaped = False
        elif ch == '\\':
            escaped = True
        elif ch == '|':
            cells.append(''.join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    cells.append(''.join(buf).strip())
    return cells
for line in md.splitlines():
    m = re.match(r'^## (TC-\d+) - ', line)
    if m:
        current_tc = m.group(1)
        continue
    if current_tc and line.startswith('| ') and re.match(r'^\| \d+ \| REQ-', line):
        parts = split_md_row(line)
        md_rows[(current_tc, int(parts[0]))] = tuple(parts[1:5])
with psycopg.connect(os.environ['DATABASE_URL'], connect_timeout=3) as conn, conn.cursor() as cur:
    cur.execute('select test_case_id, step_number, requirement_id, step_description, coalesce(expected_output, \'\'), coalesce(test_data, \'\') from test_case_steps order by test_case_id, step_number')
    db_rows = {(tc, int(step)): (req, desc, exp, data) for tc, step, req, desc, exp, data in cur.fetchall()}
if db_rows != json_rows or json_rows != xlsx_rows or json_rows != md_rows:
    print('DB/JSON/Markdown/workbook drift detected')
    print('db_json_equal=', db_rows == json_rows)
    print('json_xlsx_equal=', json_rows == xlsx_rows)
    print('json_md_equal=', json_rows == md_rows)
    raise SystemExit(1)
print('source_chain_aligned=', len(json_rows), 'steps')
PY
```

If source-chain alignment fails, fix that first and do not execute browser tests.

## 3. Run Browser Execution

If `$ARGUMENTS` contains a TC-ID, run that specific case:

```text
/browse-test-case TC-XXX
```

Otherwise run every KB test case:

```text
/browse-test-case all
```

Follow the full `browse-test-case` workflow, including per-test localStorage reset, plan printing, screenshots, self-healing, report writing, and audit save.

## 4. Run Independent Corporate Audit

After browser execution, run:

```text
/audit-test-run <TC-ID-or-latest-test-results-folder>
```

The audit must confirm:
- Test cases were sourced from the ingestion DB structured `test_cases` and `test_case_steps` tables.
- Exported artifacts match the DB source.
- Browser execution did not depend on webapp source-code inspection.
- Each run produced durable evidence.
- The final verdict is supported by independent artifacts, not by the creating agent's rationale.

If the audit is `Not Approved` or `Inconclusive`, report that result even if browser execution showed `PASS`.

## 5. Final Summary

Print:

```text
=== QUERY BROWSE TEST RESULT ===
Source: ingestion DB structured test_cases/test_case_steps
Source-code independence: webapp source not inspected or used as oracle
Repository spec: test-doc/test-case-repository.json
Repository markdown: test-doc/09-test-case-repository.md
Generated workbook: test_data/TestCases.xlsx
DB inventory: <N> test cases, <M> steps
Executed: all / <TC-ID>
Browser verdicts:
  TC-001: PASS / FAIL / PARTIAL
Reports:
  test_data/test-results/<TC-ID>/browse_run_<timestamp>.md
Audit:
  Approved / Approved with Conditions / Not Approved / Inconclusive
```
