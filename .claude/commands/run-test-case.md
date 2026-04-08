# Run Test Case

Full pipeline: load test case → generate JSON script → execute via Java Selenium → analyze results.

## Input

$ARGUMENTS

Expected: a TC-ID like `TC-001`, or a path to an existing `.json` script to skip generation.

## Steps

### 1. Load Test Case (if TC-ID given)

```bash
python claude-orchestrator/scripts/show-context.py --tcs
```

Find the matching test case. If not found, report and stop.

Also load locators and actions:
```bash
python claude-orchestrator/scripts/show-context.py --locators --actions
```

### 2. Generate JSON Script

Read `python-orchestrator/prompts/system_prompt.md` for the full generation rules.

Generate the script following macro-first composition:
- Use advanced actions wherever they cover the intent
- Validate: all locators exist, all macro names exist, no duplication
- Save to `test_data/generated_scripts/script_<TC-ID>_<YYYYMMDD_HHMMSS>.json`

Print the step list before executing.

### 3. Execute

Make sure the mock trading app is running at `http://localhost:4200` before proceeding.

```bash
python claude-orchestrator/scripts/run-test.py test_data/generated_scripts/script_<TC-ID>_<timestamp>.json
```

This saves a `<script>.result.json` file and prints per-step results.

### 3b. Generate Excel Reports

```bash
python claude-orchestrator/scripts/generate-reports.py test_data/generated_scripts/script_<TC-ID>_<timestamp>.result.json
```

This produces two files in `test_data/test-results/<TC-ID>/`:
- `<TC-ID>_detail_<timestamp>.xlsx` — one row per sub-step, full trace with actual vs expected
- `<TC-ID>_summary_<timestamp>.xlsx` — one row per TC step, mirrors TestCases.xlsx with Step Result, Actual Output, Failure Detail

Report the paths to the user. If generation fails, warn and continue.

### 4. Analyze Results

Read the `.result.json` file. For each failed step:
- Report the step number, action, locator, and error
- Identify the root cause (wrong locator, missing wait, app bug, bad test data)
- Suggest a fix

### 5. Self-Correct (if failures exist)

If there are failures that look fixable (locator issue, missing wait, wrong assertion style):
1. Fix the JSON script
2. Re-run: `python claude-orchestrator/scripts/run-test.py <fixed-script.json>`
3. Report the new result
4. Maximum 2 correction attempts

### 6. Save Analysis

Save the analysis for QA audit:
```bash
python claude-orchestrator/scripts/save-analysis.py <TC-ID> "<verdict + summary text>"
```

### 7. Final Summary

Report:
- Overall verdict: PASS / FAIL / PARTIAL
- Which steps passed/failed
- Root causes for any failures
- Recommendations for fixes that require human action (app bug, missing testid, etc.)

### 8. Offer Python Orchestrator Handoff

If the test needs real-time self-healing (multiple mid-execution failures) or deterministic retry loops, offer:

> "For CI-grade execution with IPC self-healing, run via the Python orchestrator instead:"
> ```bash
> cd python-orchestrator && python main.py --tc <TC-ID>
> ```
> This gives you: deterministic retry loops, real-time HELP_REQUEST handling, and structured audit trails in `test_data/test-results/`.
