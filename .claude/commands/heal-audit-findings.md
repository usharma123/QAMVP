# Heal Audit Findings

Remediate corporate QA audit findings properly, then rerun the independent audit.

## Input

$ARGUMENTS

Supported input:
- A saved audit report path, such as `test_data/test-results/audit_all_20260429_135022.md`
- A TC-ID such as `TC-001`
- `all` or no argument, meaning use the latest audit report under `test_data/test-results/`

## Rules

- Before running any command step, create a visible checklist titled `Heal Audit Findings Checklist`.
- The checklist must include every numbered section in this command plus verification gates and audit rerun.
- Update the checklist as work progresses: mark one item `in_progress`, mark completed items immediately, and leave blocked items explicit with the blocking reason.
- Do not wait until the final response to show checklist status.
- Use absolute paths for all commands.
- Repo root is `/Users/utsavsharma/Documents/GitHub/QAMVP`.
- Never fix only the symptom artifact when an upstream source layer owns the data.
- Preserve unrelated user/audit artifacts already in the worktree.
- Do not inspect or use webapp source code as an oracle.
- After healing, rerun `/audit-test-run` against the repaired evidence. Do not declare closure from the remediation step alone.

## Command Checklist

Create and maintain this checklist before executing:

```text
Heal Audit Findings Checklist
- [ ] Locate and parse findings
- [ ] Choose authoritative source layer for each finding
- [ ] Apply fixes from the source layer
- [ ] Regenerate derived artifacts
- [ ] Verify source-chain alignment
- [ ] Run runner/mapping checks when applicable
- [ ] Decide and perform execution rerun when needed
- [ ] Verify fresh artifact timing and black-box policy when applicable
- [ ] Rerun independent audit
- [ ] Print final summary
```

## 1. Locate And Parse Findings

If a report path is provided, read it. Otherwise find the latest audit report:

```bash
/bin/ls -t /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/audit_*.md | /usr/bin/head -1
```

Extract:
- finding ID
- severity
- affected layer
- evidence path
- required remediation
- whether execution must be rerun

Treat `Critical`, `High`, and approval-condition `Medium` findings as mandatory. Treat `Low` findings as mandatory only when the audit lists them under approval conditions or they affect traceability closure.

## 2. Choose The Authoritative Source Layer

Use this ownership map:

| Finding type | Authoritative layer to edit |
|---|---|
| Requirement ID, test step, expected output, test data | ingestion DB `test_case_steps` first; then export JSON |
| Test case title, objective, priority, suite, tags | ingestion DB `test_cases` first; then export JSON |
| Repository JSON drift | DB export or `test-doc/test-case-repository.json` only when DB unavailable |
| Markdown/workbook drift | regenerate from JSON, do not hand-edit generated artifacts |
| RTM status or coverage wording | `test-doc/06-requirements-traceability-matrix.md`, then regenerate `.docx` |
| Playwright result artifact schema/timestamps | Playwright runner source, then rerun Playwright |
| Missing run artifacts | rerun the affected Playwright/browser execution |
| Black-box policy evidence | runner/audit command metadata, then rerun execution |

If DB is unavailable, say so explicitly and update the JSON source with a follow-up note that DB must be reseeded later. If DB is available, DB and exported artifacts must agree before execution.

## 3. Apply Fixes

Before edits:

```bash
/usr/bin/git -C /Users/utsavsharma/Documents/GitHub/QAMVP status --short
```

For DB-owned test case fixes, use `ingestion/.venv/bin/python` and `psycopg` to update rows. After changing step requirement IDs, refresh `test_cases.requirement_ids` from distinct step rows:

```sql
UPDATE test_cases tc
SET requirement_ids = sub.reqs
FROM (
  SELECT test_case_id, array_agg(DISTINCT requirement_id ORDER BY requirement_id) AS reqs
  FROM test_case_steps
  GROUP BY test_case_id
) sub
WHERE tc.test_case_id = sub.test_case_id;
```

Then export JSON:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/scripts/export_test_case_repository.py --output /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json
```

Regenerate repository Markdown and workbook:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/scripts/build_test_case_repository.py --spec /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json --workbook-out /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/TestCases.xlsx --markdown-out /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/09-test-case-repository.md
```

Regenerate changed Word docs:

```bash
/opt/homebrew/bin/pandoc /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/09-test-case-repository.md -o /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/09-test-case-repository.docx --from markdown --to docx
/opt/homebrew/bin/pandoc /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/06-requirements-traceability-matrix.md -o /Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/06-requirements-traceability-matrix.docx --from markdown --to docx
```

## 4. Mandatory Verification Gates

### Source Chain Alignment

Run the same DB → JSON → Markdown → workbook guard used by `/query-playwright-test-case`. It must print `source_chain_aligned=<N> steps`.

If the guard fails, do not rerun execution or audit. Fix the source-chain drift first.

### Runner And Mapping

For Playwright-related changes:

```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner
/usr/local/bin/npx tsc --noEmit
/usr/local/bin/npx playwright test tests/mapping.spec.ts
```

### Execution Rerun Decision

Rerun Playwright when findings affected:
- runner artifact schema
- timestamps or duration
- black-box policy metadata
- requirement IDs consumed by Playwright
- step descriptions, expected outputs, or test data
- missing screenshots, traces, or result files

Use:

```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner
TC_ID=all PLAYWRIGHT_WORKERS=2 /usr/local/bin/npx playwright test --config /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner/playwright.config.ts --workers=2
```

For a single affected TC:

```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner
TC_ID=TC-XXX PLAYWRIGHT_WORKERS=1 /usr/local/bin/npx playwright test --config /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner/playwright.config.ts --workers=1 --grep "TC-XXX"
```

### Fresh Playwright Artifact Guard

After Playwright rerun, run the fresh artifact guard from `/query-playwright-test-case`. It must confirm:
- `startedAt != finishedAt`
- `durationMs > 0`
- `webappSourceInspected: false`
- `angularInternalsUsed: false`
- manifest/result/step-log/page-text/trace/screenshots are present

## 5. Rerun Audit

After all mandatory verification gates pass, invoke:

```text
/audit-test-run test_data/test-results
```

If only one TC was healed:

```text
/audit-test-run TC-XXX
```

The second audit must explicitly state:
- previous findings addressed
- new run ID or artifact folder reviewed
- remaining findings, if any
- final verdict

## 6. Final Summary

Print:

```text
=== HEAL AUDIT FINDINGS RESULT ===
Input audit: <path-or-latest>
Findings healed:
  F-001: fixed / not fixed / not applicable
Source updates:
  DB: updated / unavailable / not needed
  JSON: regenerated / updated / not needed
  Markdown/workbook/docx: regenerated / not needed
Verification:
  Source chain: PASS / FAIL
  Playwright mapping: PASS / FAIL / not run
  Fresh artifacts: PASS / FAIL / not applicable
Execution:
  Rerun: all / <TC-ID> / not needed
  Result: PASS / FAIL / not run
Audit rerun:
  Report: <path>
  Verdict: Approved / Approved with Conditions / Not Approved / Inconclusive
```
