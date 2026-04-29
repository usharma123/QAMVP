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

When available, use:
```bash
python claude-orchestrator/scripts/show-context.py --tcs
python claude-orchestrator/scripts/show-context.py --locators --actions
```

Do not assume the RTM or generated tests are correct. Validate them against the source documents.

### 4. Build Traceability Assessment

For each relevant requirement or business rule, capture:
- Requirement ID or stable source reference
- Source document and section
- Requirement summary
- Linked test case IDs
- Coverage status: Covered / Partial / Missing / Ambiguous
- Notes on weak or unsupported coverage

Flag any test case that has no reliable source requirement.

### 5. Verify Document-To-Test Translation

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

### 6. Validate Test Case Quality And Redundancy

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

### 7. Audit Run Artifacts

For every test execution or workflow step, verify durable evidence exists.

Expected artifacts normally include:
- Generated or executed test script
- Machine-readable `.result.json`
- Human-readable analysis or summary
- Detailed step trace
- Screenshots or browse-run notes for UI validation
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

Classify artifact sufficiency:
- `Complete`
- `Partial`
- `Insufficient`
- `Inconsistent`

### 8. Verify Step-Level Evidence

Every completed workflow step must produce a verifiable artifact:
- Generation step → saved generated script or file
- Execution step → result artifact with pass/fail details
- Analysis step → saved analysis or report
- Repair step → original issue, changed artifact, and post-repair result
- Reporting step → durable report file tied to input result data

If a step has no durable artifact, flag it as a governance gap even if console output appeared successful.

### 9. Generate Missing Reports When Appropriate

If a `.result.json` exists but detail or summary Excel reports are missing, generate them:

```bash
python claude-orchestrator/scripts/generate-reports.py <result.json-path>
```

Report generated paths. If report generation fails, record that as an audit finding and continue.

### 10. Rate Findings

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

### 11. Save Audit Trail

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

## Final Response

Keep the final user-facing response concise:
- Overall verdict
- Finding counts by severity
- Most important blockers
- Saved report path
- Missing or inconsistent artifacts
