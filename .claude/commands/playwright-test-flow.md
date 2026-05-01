# Playwright Test Flow

Execute structured KB test cases with the deterministic Playwright black-box runner, with a mandatory ingestion audit and healing loop before execution, then run the independent corporate audit.

## Input

$ARGUMENTS

Supported input:
- `all` — default; run every TC from the KB with bounded Playwright parallelism.
- A TC-ID such as `TC-001` — run only that KB test case after syncing artifacts.

## Rules

- Before running any command step, create a visible checklist titled `Playwright Test Flow Checklist`.
- The checklist must include every numbered section in this command plus the nested source-chain and artifact guards.
- Update the checklist as work progresses: mark one item `in_progress`, mark completed items immediately, and leave blocked items explicit with the blocking reason.
- Do not wait until the final response to show checklist status.
- Use absolute paths for all commands.
- Repo root is `/Users/utsavsharma/Documents/GitHub/QAMVP`.
- The ingestion DB structured tables are the source of truth: `test_cases` and `test_case_steps`.
- This command must invoke the independent pre-execution gate `/audit-test-case-ingestion` after ingestion/reseed and before Playwright execution.
- The ingestion gate remains a separate audit function, but this command orchestrates it as a required stage.
- If `/audit-test-case-ingestion` fails, do not start Playwright. Heal the authoritative source layer, regenerate derived artifacts, save healing artifacts, and invoke `/audit-test-case-ingestion` again.
- Continue the gate → heal → gate loop until the gate passes, the same blocking finding repeats after three remediation attempts, or a human explicitly stops/redirects the run.
- Human-in-the-loop checkpoints are mandatory before any material source-document change, ambiguous DB/KB remediation, third remediation attempt, or execution after unresolved medium findings.
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
- If the final audit is `Not Approved` or `Inconclusive`, invoke `/heal-audit-findings`, preserve artifacts, rerun required execution when the healing command requires it, and invoke `/audit-test-run` again until approved, approved with conditions accepted by the user, or human direction stops the run.
- Do not treat a Playwright `PASS` as sufficient. Before audit, verify the fresh result artifacts contain non-stale timing fields and that the DB → JSON → Markdown → workbook source chain is aligned.

## Command Checklist

Create and maintain this checklist before executing:

```text
Playwright Test Flow Checklist
- [ ] Preflight dependencies
- [ ] Ensure DB is ready
- [ ] Run ingestion audit gate
- [ ] Heal ingestion findings and rerun gate until pass
- [ ] Human checkpoint before execution
- [ ] Export KB test cases to JSON, Markdown, and workbook
- [ ] Verify DB → JSON → Markdown → workbook alignment
- [ ] Run Playwright execution
- [ ] Verify fresh Playwright artifact timing and black-box policy
- [ ] Run independent corporate audit
- [ ] Heal final audit findings and rerun audit when needed
- [ ] Print final summary
```

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

## 1A. Run Ingestion Audit Gate

Invoke the standalone gate before execution:

```text
/audit-test-case-ingestion
```

Record the latest gate artifact paths:

```bash
/bin/ls -t /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/ingestion_audit_*.json 2>/dev/null | /usr/bin/head -1
```

If no artifact exists after invoking the gate, stop. The run cannot proceed without an ingestion-audit artifact.

Summarize the gate finding counts:

```bash
/usr/local/bin/node - <<'NODE'
const fs = require('fs');
const cp = require('child_process');
const latest = cp.execFileSync('/bin/zsh', ['-lc', '/bin/ls -t /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/ingestion_audit_*.json 2>/dev/null | /usr/bin/head -1'], { encoding: 'utf8' }).trim();
if (!latest) {
  console.error('ingestion_audit_gate=missing');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(latest, 'utf8'));
console.log('ingestion_audit_gate=' + latest);
console.log('finding_counts=' + JSON.stringify(data.summary?.finding_counts || {}));
const counts = data.summary?.finding_counts || {};
if ((counts.critical || 0) > 0 || (counts.high || 0) > 0) process.exit(2);
NODE
```

If the gate exits cleanly, continue to human checkpoint before execution.

## 1B. Heal Ingestion Findings And Rerun Gate Until Pass

If `/audit-test-case-ingestion` reports critical or high findings:

1. Read the latest `ingestion_audit_<timestamp>.json` and `.md`.
2. Create a remediation artifact before editing:

```text
test_data/test-results/ingestion_heal_<YYYYMMDD_HHMMSS>.md
```

3. Classify each blocking finding by authoritative owner:

| Finding type | Primary remediation owner |
|---|---|
| Missing DB test cases or steps | ingestion/reseed pipeline |
| Missing KB chunks | ingestion/reseed pipeline |
| Missing requirement IDs | DB `test_case_steps`, sourced from hard docs |
| Requirement not present in hard docs | test-case repository or approved hard docs, with human approval |
| Missing expected output | DB/source test repository, with observable expected result |
| Step numbering or case requirement mismatch | DB structured rows, then regenerate exports |
| Missing hard document in DB | document ingestion pipeline |

4. Ask the user for human feedback before any ambiguous or material change:

```text
The ingestion audit found <finding summary>. I can remediate by <specific source-layer change>. Approve this remediation, or provide the expected requirement/test-case wording?
```

5. Apply only source-layer fixes. Do not hand-edit generated Markdown/workbook artifacts as the primary fix.
6. Regenerate derived artifacts after each remediation attempt.
7. Append to the remediation artifact:
   - input gate report path
   - findings addressed
   - user decision or approval text
   - files or DB rows changed
   - regeneration commands run
   - next gate report path
8. Invoke `/audit-test-case-ingestion` again.

Repeat until the gate passes.

Stop and ask the user for direction when:
- the same critical/high finding remains after three remediation attempts
- the remediation would change hard source document meaning
- the remediation requires choosing between multiple valid business interpretations
- the gate passes but medium findings remain and execution would be materially affected
- DB is unavailable and a source-of-truth remediation cannot be verified

Use this prompt shape:

```text
The ingestion gate is still blocked after <N> attempt(s).
Blocking findings: <summary>
Artifacts:
- Gate report: <path>
- Heal report: <path>
Options:
1. Approve another remediation attempt: <specific proposed change>
2. Provide corrected source wording/test-case data
3. Stop before execution
How should I proceed?
```

## 1C. Human Checkpoint Before Execution

Before Playwright starts, print:

```text
=== PRE-EXECUTION HUMAN CHECKPOINT ===
Ingestion gate: PASS
Latest gate artifacts: <md>, <json>
Healing attempts: <N>
Remaining medium/low findings: <summary or none>
Execution scope: all / <TC-ID>
Workers: <N>
Proceeding to Playwright unless you want to pause or change scope now.
```

If the user responds with changes, apply them before execution and rerun `/audit-test-case-ingestion`.

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
source /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/ingestion/.venv/bin/python -c "
import json
from pathlib import Path
from openpyxl import load_workbook
spec = json.loads(Path('/Users/utsavsharma/Documents/GitHub/QAMVP/test-doc/test-case-repository.json').read_text())
wb = load_workbook('/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/TestCases.xlsx', data_only=True)
print('spec_cases=', len(spec['cases']))
print('workbook_rows=', wb['TestCases'].max_row - 1)
"
```

Confirm DB, JSON, Markdown, and workbook carry the same step inventory before execution:

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

If artifact export, source-chain alignment, or loader verification fails, fix that first and do not execute Playwright tests.

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

## 4. Verify Fresh Playwright Artifacts

Before audit, verify every fresh Playwright `result.json` and `manifest.json` has real elapsed timing and black-box policy evidence:

```bash
/usr/local/bin/node - <<'NODE'
const fs = require('fs');
const path = require('path');
const root = '/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results';
const selected = (process.env.TC_ID || 'all').toUpperCase();
const tcDirs = fs.readdirSync(root).filter((name) => /^TC-\d+$/.test(name) && (selected === 'ALL' || name === selected));
const failures = [];
for (const tc of tcDirs) {
  const tcRoot = path.join(root, tc);
  const runs = fs.readdirSync(tcRoot).filter((name) => /^playwright_\d{8}_\d{6}$/.test(name)).sort().reverse();
  if (!runs.length) {
    failures.push(`${tc}: no playwright run directory`);
    continue;
  }
  const runDir = path.join(tcRoot, runs[0]);
  for (const file of ['manifest.json', 'result.json']) {
    const p = path.join(runDir, file);
    if (!fs.existsSync(p)) {
      failures.push(`${tc}: missing ${file}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (file === 'result.json' && !['PASS', 'FAIL', 'BLOCKED'].includes(data.status)) failures.push(`${tc}/${file}: status is not PASS, FAIL, or BLOCKED`);
    if (file === 'result.json' && data.status !== data.verdict) failures.push(`${tc}/${file}: status does not match verdict`);
    if (!data.startedAt || !data.finishedAt) failures.push(`${tc}/${file}: missing startedAt or finishedAt`);
    if (data.startedAt === data.finishedAt) failures.push(`${tc}/${file}: startedAt equals finishedAt`);
    if (typeof data.durationMs !== 'number' || data.durationMs <= 0) failures.push(`${tc}/${file}: missing positive durationMs`);
    if (data.blackBoxPolicy?.webappSourceInspected !== false) failures.push(`${tc}/${file}: webappSourceInspected is not false`);
    if (data.blackBoxPolicy?.angularInternalsUsed !== false) failures.push(`${tc}/${file}: angularInternalsUsed is not false`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('fresh_playwright_artifacts_valid=', tcDirs.length);
NODE
```

If this check fails, fix the Playwright runner or rerun execution before invoking `/audit-test-run`.

## 5. Run Independent Corporate Audit

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

## 5A. Heal Final Audit Findings And Rerun Audit When Needed

If `/audit-test-run` returns `Not Approved` or `Inconclusive`:

1. Ask the user before remediation:

```text
The final corporate audit returned <verdict>.
Blocking findings: <summary>
I can invoke /heal-audit-findings against <audit report path>, then rerun execution/audit when required.
Approve this remediation loop, provide different remediation instructions, or stop?
```

2. If approved, invoke:

```text
/heal-audit-findings <audit report path>
```

3. Ensure `/heal-audit-findings` writes remediation evidence and reruns `/audit-test-run`.
4. Repeat until:
   - `/audit-test-run` returns `Approved`
   - `/audit-test-run` returns `Approved with Conditions` and the user explicitly accepts the conditions
   - the same blocking finding remains after three remediation attempts
   - the user stops or redirects the run

If the audit is `Approved with Conditions`, ask:

```text
The corporate audit is Approved with Conditions.
Conditions: <summary>
Accept these conditions for this run, remediate them now, or stop?
```

## 6. Final Summary

Print:

```text
=== PLAYWRIGHT TEST FLOW RESULT ===
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
Artifact timing:
  result.status populated, startedAt != finishedAt, durationMs > 0 confirmed / failed
Audit:
  Approved / Approved with Conditions / Not Approved / Inconclusive
Healing loops:
  Ingestion gate attempts: <N>
  Ingestion heal artifacts: <paths or none>
  Final audit heal attempts: <N>
Human checkpoints:
  <decisions recorded>
```
