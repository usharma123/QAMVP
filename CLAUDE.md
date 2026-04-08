# QAMVP — AI-Driven UI Automation (Claude Code Entry Point)

## What This Project Is

A polyglot UI automation PoC with two orchestration approaches:
- **Claude Code** (this file + `.claude/commands/`) — Claude IS the LLM; no separate API needed
- **Python orchestrator** (`python-orchestrator/`) — standalone Python+Gemini pipeline with IPC self-healing

Both produce the same JSON test scripts in `test_data/generated_scripts/`. The Java Selenium engine executes them.

## Repo Layout

```
QAMVP/
├── CLAUDE.md                          ← you are here
├── .claude/commands/                  ← Claude Code slash commands
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
├── mock-trading-app/                  ← Angular SUT running at http://localhost:4200
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

## Java Execution Engine — Commands

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

For CI runs or when real-time IPC self-healing is needed, use the Python orchestrator instead. It provides:
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
| Ad-hoc script generation, exploration | Claude Code (`/generate-test-script`) |
| Create/repair actions and locators | Claude Code (`/create-advanced-action`, `/repair-locators`) |
| CI pipeline, batch runs, audit-critical | Python orchestrator (`python main.py --tc`) |
| Runs needing real-time self-healing | Python orchestrator (owns the IPC channel) |

## Reference Files

For full details on generation rules and examples, read:
- `python-orchestrator/prompts/system_prompt.md` — complete rules + few-shot examples
- `python-orchestrator/prompts/app_layout.md` — detailed page/element descriptions
- `python-orchestrator/prompts/locator_strategy.md` — XPath strategy + repair rules
- `python-orchestrator/prompts/composition_rules.md` — macro-first rules
