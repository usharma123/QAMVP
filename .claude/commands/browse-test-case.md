# Browse Test Case

Execute a test case directly with `agent-browser`. Do not generate JSON scripts and do not use Java Selenium.

## Input

$ARGUMENTS

Expected: a TC-ID such as `TC-001`, or `all` to run every test case in `test_data/TestCases.xlsx` sequentially.

## Rules

- Use absolute paths for all commands.
- Repo root is `/Users/utsavsharma/Documents/GitHub/QAMVP`.
- Run as an independent black-box browser test. Do not inspect, read, search, summarize, or rely on the mock webapp source code.
- Forbidden source-code evidence includes files under `/Users/utsavsharma/Documents/GitHub/QAMVP/mock-trading-app/src`, Angular component/service files, route definitions, templates, styles, compiled bundles, source maps, and any implementation code used to infer expected behavior.
- The test oracle must come from source documents, the ingestion KB/DB, `test_data/TestCases.xlsx`, rendered browser behavior, screenshots, logs, and saved run artifacts.
- Do not use implementation knowledge to decide that behavior is correct. If the UI behavior conflicts with source documents or test steps, record the conflict as a finding for audit.
- Do not use chained `cd ... && ...` commands.
- Use `source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate` when running Python helpers.
- Element refs from `agent-browser snapshot -i` expire after DOM changes. Re-snapshot after navigation, clicks, form submissions, dropdown opens, and reloads.
- This Angular app has simulated page latency. Wait 2 seconds after normal navigation and 3 seconds for queue/trade-list data if needed.
- Prefer user-level browser actions from `agent-browser snapshot -i`: click, fill, keyboard input, visible dropdown options, navigation, screenshots, and page text.
- Use `agent-browser eval` only for black-box browser observations or DOM-level interactions that a user action would cause, such as `document.body.innerText`, current URL, visible element state, or dispatching normal input/change/click events. Do not use `window.ng`, component instances, services, stores, private variables, or framework internals.

## 0. Preflight

Run before loading or executing test cases:

```bash
/bin/test -d /Users/utsavsharma/Documents/GitHub/QAMVP/.venv || /usr/bin/python3 -m venv /Users/utsavsharma/Documents/GitHub/QAMVP/.venv
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/pip install -r /Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator/requirements.txt -q
```

Check the app:

```bash
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost:4200
```

If the status is not `200`, start it:

```bash
/usr/local/bin/npm install --silent --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/mock-trading-app 2>/dev/null
/usr/local/bin/npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/mock-trading-app ng serve --port 4200 &
for i in $(/usr/bin/seq 1 15); do /bin/sleep 2; /usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 | /usr/bin/grep -q 200 && break; done
```

Check `agent-browser`:

```bash
/usr/local/bin/npx agent-browser --version
```

If any preflight check fails, stop, report the failure, and do not execute test cases.

## 1. Load Test Cases

If input is a TC-ID, load it:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/python -c "
import sys
sys.path.insert(0, '/Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator')
from tools.tc_loader import load_test_case, format_for_llm
tc = load_test_case('TC-XXX')
if tc:
    print(f'Test Case: {tc[\"testCaseId\"]} (Requirement: {tc[\"requirementId\"]})')
    print(f'Steps: {len(tc[\"steps\"])}')
    print()
    print(format_for_llm(tc))
else:
    print('NOT FOUND')
"
```

Replace `TC-XXX` with the requested TC-ID. If not found, stop.

If input is `all`, list IDs first:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/python -c "
import sys
sys.path.insert(0, '/Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator')
from tools.tc_loader import list_test_cases
for tc in list_test_cases():
    print(tc['testCaseId'])
"
```

Execute those IDs sequentially in sorted order.

## 2. Load App Context

Read `/Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator/prompts/app_layout.md` only as navigation and credential context. Treat it as helper KB, not as proof of expected business behavior.

Important credentials:

- Maker: `admin` / `admin`
- Checker: `checker` / `chscker@123`
- App URL: `http://localhost:4200`
- Navigation dropdowns are click-based: click trigger, wait, snapshot, click menu item.

## 3. Reset App State Before Each Test Case

Run this before every TC, including every TC in `all`:

```bash
/usr/local/bin/npx agent-browser open http://localhost:4200/login
/bin/sleep 2 && /usr/local/bin/npx agent-browser eval "
  localStorage.removeItem('mock_trading_trades');
  localStorage.removeItem('mock_trading_tx_counter');
  location.reload();
  'App state cleared - localStorage wiped, page reloading';
"
/bin/sleep 3 && /usr/local/bin/npx agent-browser snapshot -i
```

Log:

```text
[HH:MM:SS] RESET | Cleared localStorage (mock_trading_trades, mock_trading_tx_counter) | App reloaded
```

## 4. Create And Print A Test Plan

Before executing each TC, print this format to the user and retain it for the final report:

```text
=== TEST PLAN: <TC-ID> ===
Requirement: <REQ-ID>
Total Steps: <N>

Step 1: <StepDescription>
  Intent: <concrete agent-browser commands needed>
  TestData: <key=value pairs from TC, or "none">
  Expected: <expected output from TC, or "Step succeeds without error">
  Verification: <snapshot text, eval text, screenshot, or URL check>
```

The plan must map 1:1 to the spreadsheet test steps.

The plan must not reference webapp source files, component names, service methods, route implementation, or code-derived behavior. If a step cannot be mapped from the spreadsheet and source-document context alone, mark the step as ambiguous before execution.

## 5. Execute With agent-browser

Use this loop for browser actions:

```bash
/usr/local/bin/npx agent-browser open http://localhost:4200/login
/bin/sleep 2 && /usr/local/bin/npx agent-browser snapshot -i
/usr/local/bin/npx agent-browser fill @e3 "admin"
/usr/local/bin/npx agent-browser fill @e4 "admin"
/usr/local/bin/npx agent-browser click @e5
/bin/sleep 2 && /usr/local/bin/npx agent-browser snapshot -i
```

After screenshots, read the saved screenshot path with the Read tool before claiming visual verification.

Use browser-observable interactions for forms. Prefer filling controls through visible fields and clicking visible buttons. If `agent-browser select` is unreliable, use DOM-level input/change events against visible form controls without reading or invoking framework internals:

```bash
/usr/local/bin/npx agent-browser eval "
(() => {
  const setValue = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return selector + ' not found';
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return selector + '=' + el.value;
  };
  return [
    setValue('select[name=\"side\"]', 'BUY'),
    setValue('select[name=\"marketSector\"]', 'Technology'),
    setValue('input[name=\"ticker\"]', 'AAPL'),
    setValue('input[name=\"quantity\"]', '100'),
    setValue('select[name=\"accountType\"]', 'Cash'),
    setValue('select[name=\"timeInForce\"]', 'Day Order')
  ].join('\\n');
})()
"
```

Wait for visible UI effects and read only browser-visible values:

```bash
/bin/sleep 2 && /usr/local/bin/npx agent-browser eval "
(() => {
  return document.body.innerText;
})()
"
```

Submit with a visible button click or a DOM-level click event on the visible submit control. Do not call component methods:

```bash
/usr/local/bin/npx agent-browser eval "
(() => {
  const buttons = [...document.querySelectorAll('button')];
  const submit = buttons.find(btn => /submit|place|create|save|approve/i.test(btn.innerText || btn.textContent || ''));
  if (!submit) return 'submit button not found';
  submit.click();
  return 'clicked: ' + (submit.innerText || submit.textContent || 'submit');
})()
"
```

Read non-interactive text with `eval`:

```bash
/usr/local/bin/npx agent-browser eval "document.body.innerText"
```

## 6. Logging

Log every browser action:

```text
[HH:MM:SS] STEP <tcStep>.<subStep> | <ACTION> | <target> | <input> | <result>
```

Take screenshots and read them:

- After login
- After page navigation
- Immediately after form submission or approval to capture toast messages
- After assertion checks
- On any failure before healing

## 7. Self-Healing

Maintain a run-level lessons list. Apply successful lessons to later steps.

On failure:

1. Screenshot and read it.
2. Re-snapshot after a 2 second wait.
3. Diagnose the current page, refs, loading state, dropdown state, visible form state, or controlled test-environment state.
4. Retry with a targeted fix.
5. Log:

```text
[HH:MM:SS] HEAL <tcStep>.<subStep> | Cause: <diagnosis> | Action: <what was tried> | Result: OK/FAIL
[HH:MM:SS] LESSON | "<what to do differently from now on>"
```

Maximum 3 healing attempts per sub-step. After 3 failures, mark that step `FAIL` and continue to the next step.

If the app is in a broken state, recover by opening `/login`, logging in as the correct role, navigating to the current page, and logging:

```text
[HH:MM:SS] RECOVERY | Reset to login page, re-logged in as <user>, navigated to <page>
```

## 8. Step Verdicts

For steps with `ExpectedOutput`, read page text with `agent-browser eval "document.body.innerText"` or screenshot verification and compare by substring unless the test case clearly requires exact match.

For steps without `ExpectedOutput`, pass the step if all sub-actions completed without error.

Log:

```text
[HH:MM:SS] STEP <tcStep> VERDICT: PASS | <detail>
[HH:MM:SS] STEP <tcStep> VERDICT: FAIL | Expected "<expected>", got "<actual>"
```

## 9. Save Results

Create:

```bash
/bin/mkdir -p /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/<TC-ID>
```

Write:

```text
/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/<TC-ID>/browse_run_<YYYYMMDD_HHMMSS>.md
```

Report format:

```markdown
# Browser Test Run: <TC-ID>

| Field | Value |
|-------|-------|
| Timestamp | <YYYY-MM-DD HH:MM:SS> |
| Test Case | <TC-ID> |
| Requirement | <REQ-ID> |
| Execution Method | agent-browser (Vercel Labs) |
| Overall Verdict | <PASS / FAIL / PARTIAL> |

## Test Plan
<plan text>

## Execution Log
<all command log lines>

## Step Results
| TC Step | Description | Expected | Actual | Verdict | Healing Attempts |
|---------|-------------|----------|--------|---------|-----------------|

## Self-Healing Events
<events or "None">

## Lessons Learned During Run
<lessons or "None">

## Strategy Changes
<strategy changes or "None">

## Summary
Verdict: <PASS / FAIL / PARTIAL>
Steps passed: <N> / <total>
Healing events: <N> (<M> successful)
Lessons learned: <N>
Strategy changes: <N>
```

Save audit analysis:

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/python /Users/utsavsharma/Documents/GitHub/QAMVP/claude-orchestrator/scripts/save-analysis.py <TC-ID> "<verdict + summary text>"
```

## 10. Run Independent Corporate Audit

After saving the browser run report, run the independent audit command against the generated evidence:

```text
/audit-test-run <TC-ID-or-browse-run-report-path>
```

The audit must verify:
- The test case came from source documents, KB/DB, or `TestCases.xlsx`, not webapp source code.
- Browser execution evidence supports the verdict.
- Each completed step produced a durable artifact.
- No conclusion depends on the test-creating agent's unsupported rationale.

## 11. Cleanup And Final Summary

Close the browser:

```bash
/usr/local/bin/npx agent-browser close
```

Print:

```text
=== BROWSE TEST RESULT: <TC-ID> ===
Verdict: PASS / FAIL / PARTIAL
Steps: <passed>/<total> passed
Healing: <N> attempts (<M> successful)

Step Results:
  Step 1: PASS - Login as maker
  Step 2: PASS - Create buy trade for AAPL

Report saved to: test_data/test-results/<TC-ID>/browse_run_<timestamp>.md
Analysis saved to: test_data/test-results/<TC-ID>_analysis_<timestamp>.md
Audit saved to: test_data/test-results/<audit-report>.md
```

If steps failed, offer to retry failed steps or investigate app behavior for failed assertions.
