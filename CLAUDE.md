# QAMVP — Corporate QA Automation Flow (Claude Code Entry Point)

## What This Project Is

A corporate QA automation PoC where test cases must be derived from approved source documents and the ingestion knowledge base, executed as black-box browser tests, and closed with an independent audit.

The current required flow is:

```text
hard source documents
  → ingestion KB/DB
  → /audit-test-case-ingestion independent DB/KB vs hard-doc gate
  → test-doc/test-case-repository.json
  → test-doc/09-test-case-repository.md
  → test_data/TestCases.xlsx
  → /query-playwright-test-case or /browse-test-case
  → saved run artifacts
  → /audit-test-run independent corporate audit
```

Older JSON/Selenium and Python-orchestrator paths still exist in the repo, but they are not the default audit-critical flow unless the user explicitly asks for them.

## Non-Negotiable Audit Principles

- Do not inspect, read, search, summarize, or rely on the mock webapp source code to construct, validate, execute, or audit test cases.
- Forbidden source-code evidence includes `mock-trading-app/src`, Angular component/service files, route definitions, templates, styles, compiled bundles, source maps, and implementation code used to infer expected behavior.
- The test oracle is: hard source documents, ingestion KB/DB records, exported repository artifacts, `test_data/TestCases.xlsx`, observable browser behavior, screenshots, logs, and saved run artifacts.
- Treat generated tests, generated scripts, prior agent analyses, repair notes, and self-healing explanations as audit subjects, not authority.
- The audit must independently reconcile hard docs, KB/DB records, exported JSON/Markdown, workbook rows, generated scripts, and run artifacts.
- Test-case ingestion must pass `/audit-test-case-ingestion` before browser execution in the governed flow.
- A browser `PASS` is not enough. The final corporate outcome comes from `/audit-test-run`.
- When running `/audit-test-case-ingestion`, `/query-playwright-test-case`, `/query-browse-test-case`, `/audit-test-run`, or `/heal-audit-findings`, create the command's visible checklist before executing the first step and update it throughout the run.

## Primary Command Flow

### Run All KB Test Cases

Use this as the normal governed end-to-end path:

```text
/audit-test-case-ingestion
/query-playwright-test-case all
```

The ingestion audit is a separate command and must complete before execution. It audits DB/KB test-case records against hard source documents only; it does not run Playwright and does not inspect the app.

After that gate passes, execute:

```text
/query-playwright-test-case all
```

Use `/query-browse-test-case all` only when intentionally comparing against the older agent-browser path.

The Playwright command should:
1. Ensure the ingestion DB is available.
2. Verify structured KB tables `test_cases` and `test_case_steps`.
3. Confirm the governed ingestion audit has already passed, or explicitly warn that the independent pre-execution gate was skipped.
4. Export KB test cases to `test-doc/test-case-repository.json`.
5. Render `test-doc/09-test-case-repository.md`.
6. Build `test_data/TestCases.xlsx`.
7. Execute browser tests with bounded Playwright parallelism.
8. Save per-TC Playwright artifacts.
9. Run `/audit-test-run` against the executed evidence.

Legacy agent-browser path:

```text
/query-browse-test-case all
```

This command should:
1. Ensure the ingestion DB is available.
2. Verify structured KB tables `test_cases` and `test_case_steps`.
3. Confirm the governed ingestion audit has already passed, or explicitly warn that the independent pre-execution gate was skipped.
4. Export KB test cases to `test-doc/test-case-repository.json`.
5. Render `test-doc/09-test-case-repository.md`.
6. Build `test_data/TestCases.xlsx`.
7. Execute browser tests through `/browse-test-case all`.
8. Save browser run artifacts.
9. Run `/audit-test-run` against the executed evidence.

### Run One KB Test Case

```text
/query-playwright-test-case TC-001
/query-browse-test-case TC-001
```

Replace `TC-001` with the target test case ID.

### Run Browser Execution Only

Use this only when `test_data/TestCases.xlsx` is already aligned with the KB/DB and hard docs:

```text
/query-playwright-test-case TC-001
/browse-test-case TC-001
/browse-test-case all
```

Both Playwright and `/browse-test-case` must remain black-box. They may use visible UI behavior, screenshots, browser text, traces, and saved artifacts, but they must not use webapp source code or framework internals as the oracle.

### Run Ingestion Audit Only

Use this immediately after ingestion/reseed and before any browser execution:

```text
/audit-test-case-ingestion
/audit-test-case-ingestion strict
```

This command is independent from `/query-playwright-test-case`. It verifies the structured DB/KB inventory against hard documents and blocks execution when critical or high findings exist. Use `strict` when medium findings should also block execution.

### Run Audit Only

Use this after a run, or to inspect an existing evidence set:

```text
/audit-test-run TC-001
/audit-test-run test_data/test-results
/audit-test-run test_data/test-results/TC-001/browse_run_<timestamp>.md
```

The audit must verify:
- hard-doc to KB/DB alignment
- KB/DB to JSON/Markdown/workbook alignment
- workbook to executed test-step alignment
- browser result artifact completeness
- independence from the test-creating agent
- no reliance on webapp source-code inspection

## Repo Layout

```
QAMVP/
├── CLAUDE.md                          ← you are here
├── .claude/commands/                  ← Claude Code slash commands
│   ├── query-browse-test-case.md      ← primary end-to-end KB → browser → audit flow
│   ├── query-playwright-test-case.md  ← KB → Playwright parallel runner → audit flow
│   ├── audit-test-case-ingestion.md   ← independent pre-execution DB/KB vs hard-doc gate
│   ├── browse-test-case.md            ← black-box agent-browser execution from TestCases.xlsx
│   ├── audit-test-run.md              ← independent corporate QA audit
│   └── heal-audit-findings.md         ← remediate audit findings, regenerate, rerun audit
├── claude-orchestrator/               ← Claude Code helper scripts
│   └── scripts/
│       ├── run-test.py                ← execute JSON script → saves .result.json (with TC metadata)
│       ├── generate-reports.py        ← generate detail + summary Excel reports from .result.json
│       ├── show-context.py            ← dump locators + actions as readable text
│       ├── validate-script.py         ← deterministic validator (hard gate)
│       └── save-analysis.py           ← save analysis text to audit trail
├── python-orchestrator/               ← Python+Gemini orchestrator (alternative approach)
│   ├── main.py                        ← REPL + CLI entry point
│   ├── tools/                         ← context loaders, LLM client, Java runner, validator
│   └── prompts/                       ← prompt reference docs (shared by both approaches)
│       ├── app_layout.md              ← app pages, routes, user roles
│       ├── locator_strategy.md        ← XPath rules and locator conventions
│       ├── composition_rules.md       ← macro-first generation rules
│       └── system_prompt.md           ← full generation rules + examples
├── java-framework/                    ← Maven Selenium execution engine (DO NOT MODIFY)
├── playwright-runner/                 ← deterministic black-box Playwright runner
├── ingestion/                         ← source-document ingestion and structured KB/DB export
├── mock-trading-app/                  ← Angular SUT running at http://localhost:4200 (do not inspect source for test oracle)
├── test-doc/                          ← hard docs and exported test case repository artifacts
└── test_data/
    ├── TestCases.xlsx                 ← test case definitions (ID, steps, expected)
    ├── locators.xlsx                  ← element registry (name → XPath), per-page sheets
    ├── testdatadefaults.xlsx          ← default test data values
    ├── generated_scripts/             ← shared volume: both orchestrators write here, Java reads
    │   └── AdvancedActions.xlsx       ← macro action registry
    └── test-results/                  ← per-TC audit trail
        └── TC-001/
            ├── TC-001_detail_<ts>.xlsx   ← full sub-step trace (one row per execution step)
            └── TC-001_summary_<ts>.xlsx  ← TC step summary (mirrors TestCases.xlsx + results)
```

## Source Alignment Requirements

The accepted source chain is:

```text
test-doc hard documents
  → ingestion DB structured records
  → /audit-test-case-ingestion
  → test-doc/test-case-repository.json
  → test-doc/09-test-case-repository.md
  → test_data/TestCases.xlsx
```

Before trusting a test run, verify that:
- `/audit-test-case-ingestion` passed after the latest ingestion/reseed.
- `test_cases` and `test_case_steps` exist in the ingestion DB.
- DB records match `test-doc/test-case-repository.json`.
- JSON records match `test-doc/09-test-case-repository.md`.
- JSON/Markdown records match `test_data/TestCases.xlsx`.
- Requirement IDs, step order, test data, and expected results are preserved across layers.
- No test exists only in the workbook unless explicitly documented.
- No KB/DB or workbook test introduces behavior unsupported by the hard docs.

Drift between these layers is an audit finding, even if browser execution passes.

## Black-Box Browser Execution Rules

When using `/browse-test-case` or `/query-browse-test-case`:

- Use `agent-browser` against `http://localhost:4200`.
- Use visible browser state, screenshots, URL, page text, and durable artifacts for evidence.
- Prefer user-level actions: click, fill, keyboard input, visible dropdown choices, navigation, screenshots, and page text.
- Use DOM-level `eval` only for black-box observations or user-equivalent events such as `document.body.innerText`, current URL, visible element state, or dispatching normal input/change/click events.
- Do not use `window.ng`, component instances, services, stores, private variables, source files, route code, or implementation details.
- If observed UI behavior conflicts with hard docs or test steps, record the conflict and let `/audit-test-run` decide approval.

## Playwright Runner Rules

Use `/query-playwright-test-case` for faster deterministic execution.

- Default to `PLAYWRIGHT_WORKERS=2`; use `PLAYWRIGHT_WORKERS=1` for debugging.
- Each test case gets a fresh Playwright browser context.
- Each run writes artifacts under `test_data/test-results/<TC-ID>/playwright_<timestamp>/`.
- Required artifacts are `manifest.json`, `result.json`, `step-log.md`, `final-page-text.txt`, `trace.zip`, and per-step screenshots.
- Unknown natural-language steps must fail closed as `BLOCKED_UNMAPPED_STEP`; do not guess.
- If Playwright reports `PASS`, still run `/audit-test-run`; audit is the approval gate.

## Independent Audit Rules

`/audit-test-run` is the approval gate.

It must:
- act independently from the agent or command that created/executed the tests
- treat prior generated analyses as context only
- reconcile hard docs, KB/DB, JSON, Markdown, workbook, scripts, and run artifacts
- rate findings by severity
- produce an approval decision: `Approved`, `Approved with Conditions`, `Not Approved`, or `Inconclusive`
- block approval when artifacts are missing, layers drift, source traceability is weak, or conclusions depend on unsupported creator-agent rationale

## Java Execution Engine — Commands

The Java/Selenium JSON path is retained for legacy or explicit use. Do not treat it as the default corporate audit path.

Run ALL Java commands from the `java-framework/` directory:

```bash
# Execute a JSON test script
cd java-framework && mvn exec:java -q -Dexec.mainClass=com.poc.engine.Main -Dexec.args="run-json /absolute/path/to/script.json"

# Execute + save results to a specific folder
cd java-framework && mvn exec:java -q -Dexec.mainClass=com.poc.engine.Main -Dexec.args="run-json /absolute/path/to/script.json /absolute/results/dir"

# Register a new advanced action from a JSON file
cd java-framework && mvn exec:java -q -Dexec.mainClass=com.poc.engine.Main -Dexec.args="create-action /absolute/path/to/action.json"

# Update a single locator in locators.xlsx
cd java-framework && mvn exec:java -q -Dexec.mainClass=com.poc.engine.Main -Dexec.args="update-locator element-name //*[@data-testid='element-name']"
```

**Or use the helper scripts (preferred):**

```bash
# Run a test and save full JSON result
python claude-orchestrator/scripts/run-test.py test_data/generated_scripts/script_TC-001_....json

# Show current locators + advanced actions as text
python claude-orchestrator/scripts/show-context.py
python claude-orchestrator/scripts/show-context.py --locators
python claude-orchestrator/scripts/show-context.py --actions
python claude-orchestrator/scripts/show-context.py --tcs

# Validate a script (deterministic gate — exits 0 or 1)
python claude-orchestrator/scripts/validate-script.py test_data/generated_scripts/script_TC-001_....json

# Generate Excel reports from a result (detail trace + TC step summary)
python claude-orchestrator/scripts/generate-reports.py TC-001
python claude-orchestrator/scripts/generate-reports.py test_data/generated_scripts/script_TC-001_....result.json

# Save analysis to audit trail
python claude-orchestrator/scripts/save-analysis.py TC-001 "Verdict: PASS. All 8 steps passed..."
```

## JSON Test Script Schema

Scripts are saved as `test_data/generated_scripts/script_<ID>_<YYYYMMDD_HHMMSS>.json`:

```json
{
  "testCaseId": "TC-001",
  "requirementId": "REQ-001",
  "steps": [
    {
      "tcStep": 1,
      "action": "LoginAsMaker",
      "locator": "",
      "test_input": "",
      "output": ""
    },
    {
      "tcStep": 2,
      "action": "CreateBuyTrade",
      "locator": "",
      "test_input": "sector=Technology,ticker=AAPL,quantity=100,accountType=Cash,timeInForce=Day Order",
      "output": ""
    }
  ]
}
```

- `tcStep`: which test case step number this implements (integer or null)
- `action`: built-in action name or advanced action name (macro)
- `locator`: `$element-name` for built-in actions; empty for macros
- `test_input`: value for the action (or comma-separated `key=value` bindings for macros)
- `output`: variable name to capture a value into (or empty)

## Built-in Actions

| Action | locator | test_input | output |
|--------|---------|------------|--------|
| `OPEN_URL` | (empty) | URL | |
| `CLICK` | `$element` | | |
| `TYPE` | `$element` | text to type | |
| `SELECT` | `$element` | visible option text | |
| `READ_TEXT` | `$element` | | varName |
| `READ_ATTRIBUTE` | `$element` | attribute name | varName |
| `WAIT_VISIBLE` | `$element` | timeout seconds | |
| `WAIT_HIDDEN` | `$element` | timeout seconds | |
| `SCREENSHOT` | (empty) | filename (optional) | |
| `ASSERT_TEXT` | `$element` | expected text | |
| `ASSERT_VISIBLE` | `$element` | | |
| `ASSERT_VARIABLE` | (empty) | `varName=expected` | |
| `ASSERT_CONTAINS` | (empty) | `varName=substring` | |

## Locator Rules

- All locators are `$element-name` — they resolve to `//*[@data-testid='element-name']`
- **NEVER** use raw XPaths, CSS selectors, or tag names in a test script
- Look up valid element names from `test_data/locators.xlsx` (or run `python claude-orchestrator/scripts/show-context.py --locators`)
- Locators are globally unique across the app

## Composition Rules (Macro-First)

1. **Always prefer advanced actions (macros) over primitives.** If an action in `AdvancedActions.xlsx` covers the intent, use it as a single step with `key=value` parameter bindings.
2. Use the smallest set of macros that covers the flow.
3. **NEVER duplicate what a macro already does.** Each macro's steps are its internal implementation — don't re-add those steps after calling the macro.
4. Only use primitive built-in actions when no macro matches, or the test specifically targets low-level UI behavior.

## App Layout Summary

### User Roles
| Role | Username | Password |
|------|----------|----------|
| Maker | `admin` | `admin` |
| Checker | `checker` | `chscker@123` |

### Pages
| Route | Page | Notes |
|-------|------|-------|
| `/login` | Login | Start here unless already logged in |
| `/dashboard` | Dashboard | Shows only **approved** trades |
| `/trade` | New Trade | Trade entry form (Maker) |
| `/queue` | Approval Queue | `pending_approval` trades (Checker) |
| `/trades` | Trade List | All approved trades |

### Maker-Checker Workflow
1. Maker submits trade → goes to Approval Queue (NOT on Dashboard yet)
2. Checker logs in → approves from queue
3. Approved trades appear on Dashboard

**Macros for this flow:** `LoginAsMaker`, `LoginAsChecker`, `Logout`, `CreateBuyTrade`, `CreateSellTrade`, `CreateTrade`, `ApproveTrade`

### Navigation
- Navbar always visible after login
- Click-based dropdowns (not hover): must CLICK trigger then CLICK item
- `$nav-trading-trigger` → dropdown with Dashboard, New Trade, Trade List, Approval Queue
- `$navbar-logout` → logout button

## Important Generation Rules

1. Always start with `LoginAsMaker` or `LoginAsChecker` unless test says "already logged in"
2. Always add `WAIT_VISIBLE` after navigation (app has ~1.5s simulated latency)
3. Use `ASSERT_VARIABLE` / `ASSERT_CONTAINS` for captured variables — NOT `ASSERT_TEXT`
4. Only add assertions for test steps with a non-empty `ExpectedOutput`
5. App runs at `http://localhost:4200`

## Validation Rules (check before saving)

Before saving a script, verify:
- [ ] Every `locator` in primitive steps starts with `$`
- [ ] Every locator name exists in `locators.xlsx`
- [ ] Every macro name exists in `AdvancedActions.xlsx`
- [ ] No step duplicates what a preceding macro already did
- [ ] `tcStep` numbers match the original test case steps

## Deterministic Script Validation

Always run the validator before considering a script done:

```bash
python claude-orchestrator/scripts/validate-script.py test_data/generated_scripts/script_TC-001_....json
```

Exit 0 = VALID. Exit 1 = ERRORS (fix them and re-validate, up to 3 attempts).

This catches UNKNOWN_LOCATOR, WRONG_PAGE, and MISSING_WAIT errors deterministically — no LLM judgment involved.

## Saving Analysis to Audit Trail

After analyzing results, save the analysis for QA review:

```bash
python claude-orchestrator/scripts/save-analysis.py <TC-ID-or-script-name> "analysis text here"
```

This writes to `test_data/test-results/<name>_analysis_<timestamp>.md`.

## Handoff to Python Orchestrator (CI / Full Pipeline)

For legacy CI runs or when real-time IPC self-healing is explicitly requested, use the Python orchestrator. It provides:
- Deterministic retry loops (up to 3 generation attempts, 2 execution retries)
- Real-time IPC self-healing (HELP_REQUEST → LLM → SOLUTION during execution)
- Structured audit trail (`test_data/test-results/`)

```bash
# Full pipeline: generate → validate → execute → heal → analyze → log
cd python-orchestrator && python main.py --tc TC-001

# Run a specific .md test script
cd python-orchestrator && python main.py --file ../test_data/test_scripts/buy_trade.md

# Interactive REPL with all commands
cd python-orchestrator && python main.py
```

**When to use which:**
| Task | Use |
|------|-----|
| Corporate end-to-end KB → Playwright → audit flow | Claude Code (`/query-playwright-test-case`) |
| Agent-browser comparison path | Claude Code (`/query-browse-test-case`) |
| Browser execution from existing workbook | Claude Code (`/browse-test-case`) |
| Independent corporate audit | Claude Code (`/audit-test-run`) |
| Remediate audit findings and rerun audit | Claude Code (`/heal-audit-findings`) |
| Ad-hoc legacy script generation, exploration | Claude Code (`/generate-test-script`) |
| Create/repair actions and locators | Claude Code (`/create-advanced-action`, `/repair-locators`) |
| Legacy JSON/Selenium CI pipeline | Python orchestrator (`python main.py --tc`) |
| Runs explicitly needing real-time IPC self-healing | Python orchestrator (owns the IPC channel) |

## Reference Files

For full details on generation rules and examples, read:
- `python-orchestrator/prompts/system_prompt.md` — complete rules + few-shot examples
- `python-orchestrator/prompts/app_layout.md` — detailed page/element descriptions
- `python-orchestrator/prompts/locator_strategy.md` — XPath strategy + repair rules
- `python-orchestrator/prompts/composition_rules.md` — macro-first rules
