# Analyze Results

Analyze the results of a completed test run and provide a verdict with root-cause analysis.

## Input

$ARGUMENTS

Provide one of:
- A path to a `.result.json` file (e.g. `test_data/generated_scripts/script_TC-001_....result.json`)
- A path to a `.json` script — the command will look for its `.result.json` sibling
- A TC-ID — the command will find the latest result file for that TC

## Steps

### 1. Load the result file

Read the `.result.json` file. It contains:
- `success`: boolean overall pass/fail
- `summary`: one-line summary from the Java engine
- `execution_trace`: list of step results (`status`: PASS/FAIL/SKIPPED, `action`, `locator`, `detail`)
- `help_exchanges`: any self-healing requests and solutions

Also read the original JSON test script to understand what was supposed to happen.

### 2. Analyze

Read `python-orchestrator/prompts/analysis_prompt.md` for the full analysis guidelines.

Determine:
- **Verdict**: PASS (all steps passed), FAIL (any critical step failed or run crashed), PARTIAL (some non-critical steps skipped but core flow succeeded)
- **Failed steps**: for each failure — what failed, the error detail, most likely root cause
- **Root cause categories**: wrong locator, element not loaded (missing wait), app bug, incorrect test data, missing prerequisite step
- **Healing effectiveness**: did any self-healing events occur? Were they successful?

### 3. Output

Provide a structured report:

```
Verdict: PASS / FAIL / PARTIAL

Summary:
<1-2 sentences>

Failed Steps:
  Step N: <action> on <locator>
    Error: <error detail>
    Root Cause: <your analysis>
    Fix: <specific suggestion>

Self-Healing:
  <summary of any healing events>

Recommendations:
  1. <specific actionable recommendation>
  2. ...
```

### 3b. Generate Excel Reports

Check whether `<TC-ID>_detail_*.xlsx` already exists in `test_data/test-results/<TC-ID>/`.
If not, generate them:

```bash
python claude-orchestrator/scripts/generate-reports.py <result.json-path>
```

This produces:
- `<TC-ID>_detail_<timestamp>.xlsx` — full sub-step trace with actual vs expected
- `<TC-ID>_summary_<timestamp>.xlsx` — TC step summary mirroring TestCases.xlsx

Report the paths. Skip silently if no result file is available.

### 4. Save to Audit Trail

Save the analysis for QA review:
```bash
python claude-orchestrator/scripts/save-analysis.py <TC-ID-or-script-name> "<full analysis text>"
```

This writes to `test_data/test-results/<name>_analysis_<timestamp>.md`.

### 5. Offer to fix

If there are failures that are fixable in the script (not an app bug):
- Offer to update the script and re-run
- Ask: "Would you like me to fix the script and re-run? (y/n)"
