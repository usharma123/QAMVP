# Audit Test Run

Corporate QA audit: verify document-to-test translation, test case validity, redundancy, run success, and artifact completeness.

This command must act as an independent audit function. It must not be influenced by the agent, prompt, script, or prior analysis that created the tests.

## Input

$ARGUMENTS

Provide one of:
- A TC-ID like `TC-001`
- A path to a test case repository file, generated script, `.result.json`, report, or run folder
- A broad scope such as `all recent runs`, `test_data/test-results`, or `test-doc`

If no precise target is provided, audit the most recent available test results and related source documents.

## Command Checklist

Before running any audit step, create a visible checklist titled `Audit Checklist`.

The checklist must include every major section in this command and must be updated during execution. Mark one item `in_progress`, mark completed items immediately, and leave blocked items explicit with the blocking reason. Do not wait until the final response to show checklist status.

Use this starting checklist:

```text
Audit Checklist
- [ ] Enforce auditor independence
- [ ] Establish audit scope
- [ ] Load source and test context
- [ ] Reconcile hard docs, KB/DB, exported artifacts, and workbook
- [ ] Build traceability assessment
- [ ] Verify document-to-test translation
- [ ] Validate test case quality and redundancy
- [ ] Audit run artifacts, timestamps, and black-box policy
- [ ] Verify step-level evidence
- [ ] Generate missing reports if appropriate
- [ ] Rate findings
- [ ] Save audit trail
- [ ] Produce final verdict
```

## Steps

### 1. Enforce Auditor Independence

Treat all generated tests, generated scripts, prior Claude analyses, repair notes, and self-healing explanations as untrusted audit subjects, not as authority.

Use this independence standard:
- Primary evidence comes from source documents, executable artifacts, result files, reports, logs, screenshots, and deterministic command output.
- Prior agent rationale may be cited only as context, never as proof that a test is correct.
- Do not inherit assumptions from the agent that generated the tests.
- Do not accept a test's title, description, or expected result as correct until it is checked against the source documents.
- Do not accept a run as successful until the result artifacts support the verdict.
- If the same agent or workflow generated both the test and its analysis, flag that as a reduced-independence condition unless independent evidence confirms the conclusion.
- If independent verification is not possible from available artifacts, mark the relevant area `Inconclusive` or `Insufficient` instead of approving it.

Include an independence statement in the final report explaining whether the audit was based on independent evidence or depended on creator-provided artifacts.

### 2. Establish Audit Scope

Identify and report the scope before conclusions:
- Source documents reviewed
- KB/DB records reviewed
- Test case assets reviewed
- Generated scripts reviewed
- Execution artifacts reviewed
- Prior creator analyses reviewed only as context
- Time range, TC-ID, or run folder reviewed
- Files excluded or unavailable

Look first in:
```bash
test-doc/
test_data/
test_data/generated_scripts/
test_data/test-results/
```

Use targeted discovery when needed:
```bash
find test-doc test_data -maxdepth 4 -type f
rg -n "TC-|REQ-|requirement|expected|PASS|FAIL|PARTIAL" test-doc test_data
```

### 3. Load Source And Test Context

Review relevant source documents and test assets:
- BRD
- FRS
- test strategy
- test plan
- test design specification
- RTM
- test data/environment specification
- test case repository
- `test_data/TestCases.xlsx`
- generated JSON scripts

Also review the ingestion KB/DB when available:
- structured `test_cases` records
- structured `test_case_steps` records
- relevant document chunks or source references used to populate those records
- exported repository spec at `test-doc/test-case-repository.json`
- rendered repository Markdown at `test-doc/09-test-case-repository.md`

When available, use:
```bash
python claude-orchestrator/scripts/show-context.py --tcs
python claude-orchestrator/scripts/show-context.py --locators --actions
```

When the ingestion database is available, verify KB/DB inventory and records:

```bash
export DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion
PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select count(*) from test_cases;"
PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select count(*) from test_case_steps;"
```

Do not assume the RTM, KB/DB, exported artifacts, workbook, or generated tests are correct. Validate each layer against the hard source documents and against each other.

### 4. Reconcile Hard Docs, KB/DB, And Exported Artifacts

Perform a layer-by-layer alignment check before judging execution results.

Compare:
- Hard source documents in `test-doc/`
- Ingestion KB/DB structured records: `test_cases` and `test_case_steps`
- Exported repository spec: `test-doc/test-case-repository.json`
- Rendered repository Markdown: `test-doc/09-test-case-repository.md`
- Workbook consumed by runners: `test_data/TestCases.xlsx`
- Generated scripts, if present

For each test case and step, verify:
- Requirement ID and requirement text align with the hard documents.
- KB/DB test case fields match the exported JSON and rendered Markdown.
- Exported JSON matches `TestCases.xlsx`.
- Step order, action text, test data, and expected results are preserved across DB, JSON, Markdown, and workbook.
- No test case or step exists only in one layer unless explicitly documented.
- No source-document requirement was dropped during ingestion/export.
- No KB/DB or workbook test introduces behavior unsupported by hard documents.

Classify alignment for each layer:
- `Aligned`: materially consistent with the upstream authority.
- `Drift`: meaningful wording, expected result, data, order, or scope changed between layers.
- `Missing`: required record or artifact is absent.
- `Extra`: record exists without a source-document basis.
- `Unverifiable`: the layer cannot be checked from available evidence.

Use `Source Alignment` as the finding category for drift, missing records, unsupported extras, or unverifiable KB/DB mappings.

For executable KB test cases, run or reproduce a strict inventory comparison across DB, JSON, Markdown, and workbook. A row is aligned only when `(TestCaseID, StepNumber, RequirementID, StepDescription, ExpectedOutput, TestData)` matches in every available layer. If the DB is available and differs from the exported artifacts, report drift even when the browser execution passed.

### 5. Build Traceability Assessment

For each relevant requirement or business rule, capture:
- Requirement ID or stable source reference
- Source document and section
- Requirement summary
- Linked test case IDs
- Coverage status: Covered / Partial / Missing / Ambiguous
- Notes on weak or unsupported coverage

Flag any test case that has no reliable source requirement.

### 6. Verify Document-To-Test Translation

For each test case, check whether it faithfully translates the source requirement.

Evaluate:
- Preconditions match the source documents.
- Steps follow the intended business process.
- Expected results are measurable and tied to the requirement.
- Test data is valid for the scenario.
- Negative, boundary, and exception paths are included where required.
- The test does not invent unsupported behavior.
- The test does not omit critical controls, validations, state changes, or approvals.

Classify translation quality:
- `Correct`
- `Partially Correct`
- `Incorrect`
- `Untraceable`
- `Ambiguous`

### 7. Validate Test Case Quality And Redundancy

Assess each test case for corporate QA readiness:
- Unique test objective
- Clear preconditions
- Deterministic steps
- Observable expected result
- Valid input data
- Valid locator/action references where applicable
- No hidden dependency on unrelated prior tests
- Reasonable independence and repeatability
- Appropriate granularity
- Consistent naming and ID conventions

Classify validity:
- `Valid`
- `Needs Revision`
- `Invalid`
- `Duplicate`
- `Redundant`

For duplicates or redundancy, explain whether the overlap is exact, functional, data-only, or expected-result-only.

### 8. Audit Run Artifacts

For every test execution or workflow step, verify durable evidence exists.

Expected artifacts normally include:
- Generated or executed test script
- Machine-readable `.result.json`
- Playwright `manifest.json` and `result.json` when Playwright execution was used
- Human-readable analysis or summary
- Playwright `step-log.md` when Playwright execution was used
- Detailed step trace
- Screenshots or browse-run notes for UI validation
- Playwright `trace.zip` and per-step screenshots when Playwright execution was used
- Detail and summary Excel reports when report generation is part of the workflow
- Error logs or failure details for failed runs

For each run, determine:
- Was it executed?
- Did it pass, fail, or partially complete?
- Are step results visible?
- Are failures explained with root-cause evidence?
- Were retries, repairs, or self-healing events recorded?
- Do generated reports match the underlying result data?
- Are timestamps and test IDs internally consistent?
- Is there enough evidence for an external reviewer to reproduce or verify the conclusion?

For Playwright `manifest.json` and `result.json`, also verify:
- `startedAt` exists.
- `finishedAt` exists.
- `startedAt` is not equal to `finishedAt`.
- `durationMs` exists and is greater than zero.
- `blackBoxPolicy.webappSourceInspected` is `false`.
- `blackBoxPolicy.angularInternalsUsed` is `false`.
- `artifacts.resultJson`, `artifacts.stepLog`, `artifacts.finalPageText`, and `artifacts.trace` point to present files.

If all Playwright tests passed but every `result.json` has `startedAt == finishedAt` or no positive `durationMs`, raise at least a `Medium` finding for machine-readable evidence quality. If black-box policy flags are missing or not false, raise at least a `High` finding unless another artifact proves source independence.

Classify artifact sufficiency:
- `Complete`
- `Partial`
- `Insufficient`
- `Inconsistent`

### 9. Verify Step-Level Evidence

Every completed workflow step must produce a verifiable artifact:
- Generation step → saved generated script or file
- Execution step → result artifact with pass/fail details
- Analysis step → saved analysis or report
- Repair step → original issue, changed artifact, and post-repair result
- Reporting step → durable report file tied to input result data

If a step has no durable artifact, flag it as a governance gap even if console output appeared successful.

### 10. Generate Missing Reports When Appropriate

If a `.result.json` exists but detail or summary Excel reports are missing, generate them:

```bash
python claude-orchestrator/scripts/generate-reports.py <result.json-path>
```

Report generated paths. If report generation fails, record that as an audit finding and continue.

### 11. Rate Findings

Use these severity levels:
- `Critical`: invalidates the audit conclusion, blocks approval, or creates material compliance risk.
- `High`: significant coverage, correctness, traceability, or evidence gap requiring remediation before release.
- `Medium`: weakens confidence but may not block limited use.
- `Low`: clarity, naming, formatting, or housekeeping issue.

Each finding must include:
- Finding ID
- Severity
- Category
- Evidence
- Impact
- Recommended remediation
- Owner type if obvious: QA, automation, product, engineering, documentation, or release management

Use `Independence` as the category for findings where the audit depends on the same creator agent's assertions, unsourced generated analysis, or unverifiable conclusions.

Use `Source Alignment` as the category for findings where hard documents, KB/DB records, exported JSON, rendered Markdown, workbook rows, or generated scripts do not match.

### 12. Save Audit Trail

Save the audit report for QA review:

```bash
python claude-orchestrator/scripts/save-analysis.py <TC-ID-or-audit-name> "<full audit report text>"
```

If that script is not appropriate for the scope, save a timestamped Markdown report under:

```bash
test_data/test-results/
```

Use a clear name such as:
```bash
audit_<scope>_<YYYYMMDD_HHMMSS>.md
```

## Output

Provide this structured report:

```markdown
# Corporate QA Audit Report

## Executive Summary
Verdict: Approved / Approved with Conditions / Not Approved / Inconclusive

<Short summary of outcome, major risks, and required action.>

## Scope
- Source documents reviewed:
- KB/DB records reviewed:
- Test assets reviewed:
- Execution artifacts reviewed:
- Prior creator analyses reviewed only as context:
- Exclusions or limitations:

## Independence Statement
<State whether conclusions were verified from independent source documents and run artifacts, or whether any area depends on creator-provided assertions.>

## Evidence Inventory
| Artifact | Path | Purpose | Status | Notes |
|---|---|---|---|---|

## Traceability Assessment
| Requirement | Source | Linked Tests | Coverage Status | Notes |
|---|---|---|---|---|

## Source Alignment Assessment
| Test/Requirement | Hard Docs | KB/DB | JSON/Markdown | Workbook | Generated Script | Alignment Status | Notes |
|---|---|---|---|---|---|---|---|

## Test Case Validity Assessment
| Test Case | Source Requirement | Validity | Redundancy | Translation Quality | Notes |
|---|---|---|---|---|---|

## Execution Artifact Assessment
| Test/Run | Result | Required Artifacts | Artifact Sufficiency | Notes |
|---|---|---|---|---|

## Findings
| ID | Severity | Category | Finding | Evidence | Impact | Remediation |
|---|---|---|---|---|---|---|

## Approval Decision
Decision: Approved / Approved with Conditions / Not Approved / Inconclusive

Rationale:
<Explain the decision using cited evidence.>

Required remediations before approval:
1. <Action>

## Residual Risk
<State remaining risk after remediation or explain why risk cannot be assessed.>
```

## Verdict Rules

Use:
- `Approved` only when tests are traceable, valid, sufficiently non-redundant, and run artifacts fully support the stated outcome.
- `Approved with Conditions` when no blocking issue exists but specific remediation is required before broader release or audit closure.
- `Not Approved` when critical or high-severity gaps undermine correctness, coverage, validity, or evidence.
- `Inconclusive` when available files do not provide enough evidence to make a defensible decision.

Do not approve when:
- Source-to-test traceability is missing for core tests.
- Material test cases are invalid or unsupported by requirements.
- Claimed successful runs lack durable artifacts.
- Artifacts conflict with each other.
- Required reports are missing or cannot be tied to run data.
- Failures are present but not analyzed.
- The audit conclusion materially depends on the same agent's unsupported test-generation rationale or analysis.
- Hard documents, KB/DB records, exported artifacts, workbook rows, or generated scripts materially disagree and the drift is not explained.
- Playwright artifacts lack trustworthy timing fields after a runner change was requested, or the audit cannot distinguish stale artifacts from fresh execution evidence.

## Final Response

Keep the final user-facing response concise:
- Overall verdict
- Finding counts by severity
- Most important blockers
- Saved report path
- Missing or inconsistent artifacts
- Any hard-doc, KB/DB, exported artifact, workbook, or script alignment gaps
