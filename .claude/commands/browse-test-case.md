# Browse Test Case

Execute a test case directly using `agent-browser` — no JSON scripts, no Java Selenium.
Claude reads the test case, plans each step, then uses `agent-browser` CLI to interact with the live app.

## Input

$ARGUMENTS

Expected: a TC-ID like `TC-001`, or `all` to run every test case sequentially.

## Steps

### 0. Pre-Flight Checks

Run these checks before doing anything else. Stop and fix any that fail.

**a) Python venv:**
```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP
test -d .venv || python3 -m venv .venv
source .venv/bin/activate && pip install -r python-orchestrator/requirements.txt -q
```

**b) App running:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200
```
If not `200`, start it:
```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP/mock-trading-app
npm install --silent 2>/dev/null
npx ng serve --port 4200 &
# Wait up to 30s for startup
for i in $(seq 1 15); do sleep 2; curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 | grep -q 200 && break; done
```

**c) agent-browser available:**
```bash
npx agent-browser --version
```

**IMPORTANT:** Use absolute paths for ALL commands throughout this skill. The working directory
is `/Users/utsavsharma/Documents/GitHub/QAMVP`. Never use `cd` in chained commands — it breaks
subsequent relative paths.

### 0b. App State Reset (Before Each Test Case)

The mock trading app persists trades in `localStorage`. When running multiple test cases
sequentially (or re-running a TC), stale data from prior runs will contaminate assertions
(e.g., "Total Trades: 0" shows "Total Trades: 6" because old trades are still there).

**Before every test case execution**, reset the app state:

```bash
# 1. Open the app (ensures we have a page context for localStorage access)
npx agent-browser open http://localhost:4200/login

# 2. Clear trade data from localStorage and reload
sleep 2 && npx agent-browser eval "
  localStorage.removeItem('mock_trading_trades');
  localStorage.removeItem('mock_trading_tx_counter');
  location.reload();
  'App state cleared — localStorage wiped, page reloading';
"

# 3. Wait for reload to complete
sleep 3 && npx agent-browser snapshot -i
```

This gives each test case a clean slate with zero trades and a fresh TX counter.

**When running `all`:** perform this reset before EACH test case, not just once at the start.

Log the reset:
```
[HH:MM:SS] RESET | Cleared localStorage (mock_trading_trades, mock_trading_tx_counter) | App reloaded
```

### 1. Load Test Case

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && python3 -c "
import sys; sys.path.insert(0, 'python-orchestrator')
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

Replace `TC-XXX` with the actual TC-ID. If not found, report and stop.
If `all` was given, iterate all TC-IDs by calling `list_test_cases()` first.

### 2. Load App Context

Read `python-orchestrator/prompts/app_layout.md` for page routes, elements, and user credentials.

Key details:
- **Maker**: username=`admin`, password=`admin`
- **Checker**: username=`checker`, password=`chscker@123`
- **App URL**: `http://localhost:4200`
- **Navigation**: Click-based dropdowns — must CLICK trigger, wait, THEN click menu item
- **Latency**: Pages have ~1.5s simulated loading; always `sleep 2` then re-snapshot after navigation

### 3. Create Test Plan

Before executing, produce a structured test plan and print it to the user.

Format:
```
=== TEST PLAN: <TC-ID> ===
Requirement: <REQ-ID>
Total Steps: <N>

Step 1: <StepDescription>
  Intent: <concrete agent-browser commands needed>
  TestData: <key=value pairs from TC, or "none">
  Expected: <expected output from TC, or "Step succeeds without error">
  Verification: <how to verify — snapshot text, screenshot, etc.>

Step 2: ...
```

Each plan entry maps 1:1 to a test case step. The "Intent" field breaks the natural-language
step description into concrete browser commands (open URL, fill field, click button, etc.).

Store the plan text — it will be included in the final report.

### 4. Execute Each Step via agent-browser

For each step in the test plan, execute it using `agent-browser` CLI commands via Bash.

#### Core Workflow

Every browser interaction follows this cycle:

```bash
# 1. Navigate (if needed)
npx agent-browser open http://localhost:4200/login

# 2. Wait for page load, then snapshot for interactive element refs
sleep 2 && npx agent-browser snapshot -i

# 3. Interact using the refs from the snapshot
npx agent-browser fill @e3 "admin"
npx agent-browser fill @e4 "admin"
npx agent-browser click @e5

# 4. ALWAYS wait + re-snapshot after any DOM change
sleep 2 && npx agent-browser snapshot -i

# 5. Screenshot at key checkpoints — then READ the screenshot to verify visually
npx agent-browser screenshot
# Use the Read tool on the screenshot path to actually see what's on screen
```

**CRITICAL:** Element refs (`@e1`, `@e2`) are invalidated after every DOM mutation.
You MUST `sleep 2 && npx agent-browser snapshot -i` after:
- Any navigation or page load
- Clicking a button that changes the page
- Opening/closing a dropdown
- Submitting a form

#### Angular Reactive Form Workaround

**`agent-browser select` does NOT trigger Angular reactive form `valueChanges`.**
The DOM `<select>` value changes but Angular's `ControlValueAccessor` doesn't fire,
so the form stays invalid and submit buttons remain disabled.

**For `<select>` dropdowns in this Angular app, use `agent-browser eval` instead:**

```bash
npx agent-browser eval "
  const appEl = document.querySelector('app-trade');
  const comp = window.ng.getComponent(appEl);
  comp.form.patchValue({
    marketSector: 'Technology',
    ticker: 'AAPL',
    quantity: 100,
    accountType: 'Cash',
    timeInForce: 'Day Order'
  });
  'form valid: ' + comp.form.valid;
"
```

Wait for async effects (price fetch after ticker change):
```bash
sleep 2 && npx agent-browser eval "
  const appEl2 = document.querySelector('app-trade');
  const comp2 = window.ng.getComponent(appEl2);
  'price=' + comp2.form.get('currentPrice').value + ', total=' + comp2.form.get('totalValue').value + ', valid=' + comp2.form.valid;
"
```

Submit via component method (more reliable than clicking the button after eval):
```bash
npx agent-browser eval "
  const appEl3 = document.querySelector('app-trade');
  const comp3 = window.ng.getComponent(appEl3);
  comp3.onSubmit();
  'submitted, submitting=' + comp3.submitting;
"
```

**NOTE:** `agent-browser eval` uses an incremental JS scope — variable names cannot be
redeclared across calls in the same session. Use unique names (e.g., `appEl`, `appEl2`, `appEl3`)
or wrap in IIFEs.

**When to use `eval` vs native commands:**
- `fill` and `click` work fine for `<input>` and `<button>` elements
- `select` does NOT work for Angular reactive forms — always use `eval` for `<select>` dropdowns
- `eval` is also useful for reading non-interactive text (e.g., "Pending: 1", "Total Trades: 1")

#### Reading Non-Interactive Text

Snapshot only shows interactive elements. To read page text (headings, counts, labels):
```bash
npx agent-browser eval "document.querySelector('[data-testid=\"queue-pending-count\"]')?.textContent || document.body.innerText.match(/Pending: \\d+/)?.[0] || 'NOT FOUND'"
```

Or take a screenshot and use the Read tool to visually verify.

#### Action Mapping

| Test Intent | agent-browser Commands |
|------------|----------------------|
| Login as maker | `open http://localhost:4200/login` → `sleep 2 && snapshot -i` → `fill @username "admin"` → `fill @password "admin"` → `click @submit` → `sleep 2 && snapshot -i` (verify /dashboard) |
| Login as checker | Same flow with `"checker"` / `"chscker@123"` |
| Navigate via dropdown | `snapshot -i` → `click @trading-dropdown` → `sleep 1 && snapshot -i` → `click @target-link` → `sleep 2 && snapshot -i` |
| Create trade | Navigate to /trade → `sleep 2 && snapshot -i` → **use `eval` with `ng.getComponent` + `patchValue`** to fill form → **use `eval` with `onSubmit()`** to submit → `sleep 3 && snapshot -i` (captures redirect to /queue) |
| Approve trade | Navigate to /queue → `sleep 2 && snapshot -i` → `click @approve-btn` → `sleep 1 && screenshot` (capture toast) |
| Read/verify text | `eval` to read `textContent` OR `screenshot` + `Read` tool to visually verify |
| Logout | `snapshot -i` → `click @logout-btn` → `sleep 2 && snapshot -i` (verify /login) |

#### Logging

Log EVERY browser command in this format. Build up the log as you execute — you will include it in the final report.

```
[HH:MM:SS] STEP <tcStep>.<subStep> | <ACTION>     | <target>                    | <input> | <result>
[14:02:01] STEP 1.1               | OPEN         | http://localhost:4200/login | —       | OK
[14:02:03] STEP 1.2               | SNAPSHOT     | —                          | —       | 4 interactive elements
[14:02:04] STEP 1.3               | FILL         | @e2 (username)             | admin   | OK
[14:02:05] STEP 1.4               | FILL         | @e3 (password)             | admin   | OK
[14:02:06] STEP 1.5               | CLICK        | @e4 (Sign in)              | —       | OK
[14:02:08] STEP 1.6               | SNAPSHOT     | —                          | —       | Dashboard heading visible
[14:02:09] STEP 1.7               | SCREENSHOT   | after_login                | —       | Captured + verified via Read
```

#### When to Screenshot (and Read)

Take screenshots AND use the Read tool to view them at these moments:
- After successful login
- After navigating to a new page
- After form submission (capture toast messages — toasts disappear after ~3s)
- After any assertion check (to visually confirm text values)
- On ANY failure (before healing attempts)

**IMPORTANT:** `agent-browser screenshot` saves a file. You MUST use the Read tool on the
saved path to actually see the screenshot. Without reading it, you're flying blind.

### 5. Self-Healing Protocol

This section covers two levels of healing: **reactive** (fix the current failure) and
**adaptive** (learn from failures and change strategy for the rest of the run).

#### 5a. Maintain a Run-Level Lessons List

At the start of execution, initialize an empty mental list of lessons learned during this run.
When a healing attempt succeeds, add a lesson. Apply ALL accumulated lessons to every
subsequent step — don't wait for the same failure to happen again.

Example lessons:
- "agent-browser select doesn't work on this Angular app — use eval + patchValue for all dropdowns"
- "Page /queue takes 3s to load data, not the usual 2s — use sleep 3 for queue"
- "Toast disappears in <2s — screenshot immediately after submit, don't wait"
- "Navbar dropdown ref changes after every page nav — always re-snapshot before clicking dropdown"
- "Variable names in eval can't be reused — use unique names per call"

**Before each step**, review the lessons list and adjust your approach preemptively.
This is the key difference from basic retry logic — you adapt, not just retry.

#### 5b. Reactive Healing (Per-Failure)

If any `agent-browser` command fails or produces unexpected results:

1. **Screenshot + Read** immediately:
   ```bash
   npx agent-browser screenshot
   ```
   Then use the Read tool on the saved path to see the current state.

2. **Re-snapshot** for fresh refs:
   ```bash
   sleep 2 && npx agent-browser snapshot -i
   ```

3. **Diagnose** from snapshot output and screenshot. Common failure patterns:

   | Symptom | Diagnosis | Fix |
   |---------|-----------|-----|
   | Snapshot shows only heading, no table/form | Page data still loading | `sleep 3`, re-snapshot |
   | Wrong page URL or heading | Navigation didn't complete | `open <correct-url>`, `sleep 2 && snapshot -i` |
   | Element ref not found | Refs invalidated by DOM change | Re-snapshot for fresh refs |
   | Dropdown items not visible | Dropdown not open | Click trigger first, `sleep 1 && snapshot -i`, then click item |
   | `select` command succeeds but form invalid | Angular reactive form binding | Switch to `eval` with `ng.getComponent` + `patchValue` |
   | Submit button disabled after fill | Form validation not triggered | Use `eval` to `patchValue` and check `form.valid` |
   | Toast not captured in screenshot | Toast already disappeared (<3s lifetime) | Use `eval` to check underlying state (e.g., queue count, trade list) |
   | `eval` throws "already been declared" | Variable name collision in session | Use unique variable names (`el1`, `el2`, ...) or wrap in IIFE |
   | Click succeeds but nothing happens | Element was decorative, not the actual button | Re-snapshot, look for a nested `<button>` ref instead |
   | Page shows spinner or loading state | Async data fetch in progress | `sleep 3`, re-snapshot; if still loading, `sleep 5` |

4. **Retry** the failed action with the fix applied.

5. **Add a lesson** if the fix worked:
   ```
   [HH:MM:SS] LESSON | "<what to do differently from now on>"
   ```
   Apply this lesson to ALL subsequent steps in the run.

6. **Log the healing attempt**:
   ```
   [HH:MM:SS] HEAL <tcStep>.<subStep> | Cause: <diagnosis> | Action: <what was tried> | Result: OK/FAIL
   ```

7. **Maximum 3 healing attempts** per sub-step. After 3 failures, mark the step as FAIL and continue to the next step.

#### 5c. Adaptive Strategy Escalation

If you see the **same failure pattern across 2+ steps**, escalate your strategy:

1. **First occurrence**: Try the standard fix from the table above.
2. **Second occurrence of same pattern**: Switch to the alternative approach permanently for the rest of the run. Log:
   ```
   [HH:MM:SS] STRATEGY CHANGE | "<old approach>" -> "<new approach>" | Reason: repeated failure
   ```
3. **Unfamiliar failure** (not in the table): Use `eval` to inspect the DOM and Angular state:
   ```bash
   npx agent-browser eval "
     JSON.stringify({
       url: location.href,
       title: document.title,
       angularReady: typeof window.ng !== 'undefined',
       bodyText: document.body.innerText.substring(0, 500)
     })
   "
   ```
   Use the diagnostic output to form a hypothesis, try a fix, and add a lesson if it works.

#### 5d. Recovery from Broken State

If the app is in a bad state (wrong user logged in, unexpected page, stale data):

1. **Hard reset**: Navigate directly to `/login`:
   ```bash
   npx agent-browser open http://localhost:4200/login
   ```
2. **Re-login** as the correct user for the current step.
3. **Re-navigate** to where the test needs to be.
4. **Log the recovery**:
   ```
   [HH:MM:SS] RECOVERY | Reset to login page, re-logged in as <user>, navigated to <page>
   ```
5. **Resume** the test from the current step (don't re-run passed steps).

### 6. Step Verdict

After executing each test case step:

**If the step has an `ExpectedOutput`:**
- Use `agent-browser eval` to read the relevant text from the DOM:
  ```bash
  npx agent-browser eval "document.body.innerText"
  ```
  Or take a screenshot and Read it to visually extract the value.
- Compare against the expected value (exact match or substring contains)
- Verdict: PASS if matches, FAIL if not

**If the step has NO `ExpectedOutput`:**
- Verdict: PASS if all sub-actions completed without error
- Verdict: FAIL if any sub-action failed after healing attempts

Log the verdict:
```
[HH:MM:SS] STEP <tcStep> VERDICT: PASS | <detail>
[HH:MM:SS] STEP <tcStep> VERDICT: FAIL | Expected "<expected>", got "<actual>"
```

### 7. Save Results

#### 7a. Create the report directory if needed

```bash
mkdir -p /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/<TC-ID>
```

#### 7b. Write the structured report

Save to: `test_data/test-results/<TC-ID>/browse_run_<YYYYMMDD_HHMMSS>.md`

Use this format:

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

<the full plan text from Step 3>

## Execution Log

<all action log lines from Step 4, including any healing entries from Step 5>

## Step Results

| TC Step | Description | Expected | Actual | Verdict | Healing Attempts |
|---------|-------------|----------|--------|---------|-----------------|
| 1 | Login as maker | — | Redirected to /dashboard | PASS | 0 |
| 2 | Create buy trade | Trade confirmed | Toast: "Trade confirmed" | PASS | 0 |
| ... | ... | ... | ... | ... | ... |

## Self-Healing Events

<summary of all healing events, or "None">

## Lessons Learned During Run

<list of all lessons added during execution, or "None">
Example:
- "agent-browser select doesn't trigger Angular reactive forms — use eval + patchValue"
- "Queue page needs 3s to load, not 2s"

## Strategy Changes

<any strategy escalations that happened, or "None">

## Summary

Verdict: <PASS / FAIL / PARTIAL>
Steps passed: <N> / <total>
Healing events: <N> (<M> successful)
Lessons learned: <N>
Strategy changes: <N>
```

#### 7c. Save analysis to audit trail

```bash
source /Users/utsavsharma/Documents/GitHub/QAMVP/.venv/bin/activate && python3 /Users/utsavsharma/Documents/GitHub/QAMVP/claude-orchestrator/scripts/save-analysis.py <TC-ID> "<verdict + summary text>"
```

### 8. Cleanup and Final Summary

Close the browser session:
```bash
npx agent-browser close
```

Print a summary to the user:

```
=== BROWSE TEST RESULT: <TC-ID> ===
Verdict: PASS / FAIL / PARTIAL
Steps: <passed>/<total> passed
Healing: <N> attempts (<M> successful)

Step Results:
  Step 1: PASS — Login as maker
  Step 2: PASS — Create buy trade for AAPL
  Step 3: FAIL — Verify queue count (expected "Pending: 1", got "Pending: 0")

Report saved to: test_data/test-results/<TC-ID>/browse_run_<timestamp>.md
Analysis saved to: test_data/test-results/<TC-ID>_analysis_<timestamp>.md
```

If any steps failed, offer:
- "Would you like me to retry the failed steps?"
- "Would you like me to investigate the app behavior for the failed assertions?"
