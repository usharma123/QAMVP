# Audit Test Case Ingestion

Run the independent DB/KB test-case ingestion audit before any browser execution.

## Input

$ARGUMENTS

Supported input:
- no argument — audit with critical/high findings as blockers.
- `strict` — also block on medium findings.

## Rules

- This command is independent and separate from `/query-playwright-test-case`.
- Do not run Playwright.
- Do not run `/query-playwright-test-case`.
- Do not run `/browse-test-case`.
- Do not inspect, read, search, summarize, or rely on webapp source code.
- Forbidden source-code evidence includes `mock-trading-app/src`, Angular internals, route definitions, templates, styles, compiled bundles, source maps, `window.ng`, services, stores, and implementation-derived oracles.
- The only allowed oracle for this gate is hard source documents plus the ingestion DB/KB structured records.
- Run this after ingestion/reseed has populated the DB/KB and before browser execution.
- If this gate fails, stop. Remediate the DB/KB, hard docs, exported repository, or runner mapping before executing tests.

## Command Checklist

Create and maintain this checklist before executing:

```text
Audit Test Case Ingestion Checklist
- [ ] Preflight dependencies
- [ ] Ensure DB is reachable
- [ ] Verify structured DB/KB inventory exists
- [ ] Run independent ingestion audit
- [ ] Review blocking findings
- [ ] Print final gate decision
```

## 0. Preflight

Use absolute paths and the repo root:

```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP
```

Ensure ingestion dependencies exist:

```bash
/bin/test -d /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv || /usr/bin/python3 -m venv /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/pip install -r /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/requirements.txt -q
```

## 1. Ensure DB Is Reachable

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

## 2. Verify Structured Inventory Exists

Check DB test-case and step counts:

```bash
PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select count(*) from test_cases;"
PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select count(*) from test_case_steps;"
```

If `test_cases` or `test_case_steps` is `0`, run the repeatable reseed:

```bash
DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/reseed_knowledge_base.sh
```

Then re-check the counts. If either count is still `0`, stop and report that ingestion did not produce executable structured test cases.

## 3. Run Independent Ingestion Audit

Create timestamped artifacts:

```bash
export INGESTION_AUDIT_TS=$(/bin/date +%Y%m%d_%H%M%S)
export INGESTION_AUDIT_MD=/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/ingestion_audit_${INGESTION_AUDIT_TS}.md
export INGESTION_AUDIT_JSON=/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/ingestion_audit_${INGESTION_AUDIT_TS}.json
```

Normal gate:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/audit_test_case_ingestion.py --report "$INGESTION_AUDIT_MD" --json "$INGESTION_AUDIT_JSON"
```

Strict gate, when `$ARGUMENTS` contains `strict`:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/audit_test_case_ingestion.py --fail-on-medium --report "$INGESTION_AUDIT_MD" --json "$INGESTION_AUDIT_JSON"
```

## 4. Gate Decision

If the audit exits nonzero:
- Mark the gate `BLOCKED`.
- Report the finding counts and artifact paths.
- Do not proceed to `/query-playwright-test-case`.
- Remediate the DB/KB, hard source documents, exported repository artifacts, or runner step mapping.
- Re-run `/audit-test-case-ingestion` after remediation.

If the audit exits zero:
- Mark the gate `PASS`.
- Report the finding counts and artifact paths.
- The next governed command is `/query-playwright-test-case all` or `/query-playwright-test-case <TC-ID>`.

## 5. Final Summary

Print:

```text
=== TEST CASE INGESTION AUDIT GATE ===
Gate: PASS / BLOCKED
Scope: ingestion DB/KB test_cases and test_case_steps vs hard source documents
Independence: no browser execution, no Playwright, no webapp source-code inspection
Cases: <N>
Steps: <N>
Findings: {critical: N, high: N, medium: N, low: N}
Report: test_data/test-results/ingestion_audit_<timestamp>.md
JSON: test_data/test-results/ingestion_audit_<timestamp>.json
Next: /query-playwright-test-case all / remediate and rerun this gate
```
