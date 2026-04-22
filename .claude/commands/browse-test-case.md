# Browse Test Case

Execute a test case directly with `agent-browser`. Do not generate JSON scripts and do not use Java Selenium.

## Input

$ARGUMENTS

Expected: a TC-ID such as `TC-001`, or `all` to run every test case in `test_data/TestCases.xlsx` sequentially.

## Rules

- Use absolute paths for all commands.
- Repo root is `/Users/utsavsharma/Documents/GitHub/QAMVP`.
- Do not use chained `cd ... && ...` commands.
- Use `source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate` when running Python helpers.
- Element refs from `agent-browser snapshot -i` expire after DOM changes. Re-snapshot after navigation, clicks, form submissions, dropdown opens, and reloads.
- This Angular app has simulated page latency. Wait 2 seconds after normal navigation and 3 seconds for queue/trade-list data if needed.
- For Angular reactive form `<select>` controls, use `agent-browser eval` with `window.ng.getComponent(...).form.patchValue(...)`. Do not rely on `agent-browser select`.

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

Read `/Users/utsavsharma/Documents/GitHub/QAMVP/python-orchestrator/prompts/app_layout.md`.

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

Use `eval` for the Angular trade form:

```bash
/usr/local/bin/npx agent-browser eval "
(() => {
  const appEl = document.querySelector('app-trade');
  const comp = window.ng.getComponent(appEl);
  comp.form.patchValue({
    side: 'BUY',
    marketSector: 'Technology',
    ticker: 'AAPL',
    quantity: 100,
    accountType: 'Cash',
    timeInForce: 'Day Order'
  });
  return 'form valid: ' + comp.form.valid;
})()
"
```

Wait for price/total effects:

```bash
/bin/sleep 2 && /usr/local/bin/npx agent-browser eval "
(() => {
  const appEl = document.querySelector('app-trade');
  const comp = window.ng.getComponent(appEl);
  return 'price=' + comp.form.get('currentPrice').value + ', total=' + comp.form.get('totalValue').value + ', valid=' + comp.form.valid;
})()
"
```

Submit via component method:

```bash
/usr/local/bin/npx agent-browser eval "
(() => {
  const appEl = document.querySelector('app-trade');
  const comp = window.ng.getComponent(appEl);
  comp.onSubmit();
  return 'submitted, submitting=' + comp.submitting;
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
3. Diagnose the current page, refs, loading state, dropdown state, Angular form validity, or localStorage state.
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

## 10. Cleanup And Final Summary

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
```

If steps failed, offer to retry failed steps or investigate app behavior for failed assertions.
