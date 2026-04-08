# Repair Locators

Reconcile `test_data/locators.xlsx` after an Angular upgrade — detect renames, removals, and new elements.

## Input

$ARGUMENTS

Optional: `--no-browser` to skip live DOM capture and use HTML templates only.

## Steps

### 1. Read the locator strategy

Read `python-orchestrator/prompts/locator_strategy.md` — understand what "broken" means (ONLY report a change if the locator no longer works).

### 2. Load current locator inventory

```bash
python claude-orchestrator/scripts/show-context.py --locators
```

Note which elements are on which pages (sheet names = page names).

### 3. Inspect the Angular templates

Read the Angular component templates for each page in `mock-trading-app/src/`:
- Login: `src/app/login/` 
- Dashboard: `src/app/dashboard/`
- New Trade: `src/app/trade/` or `src/app/new-trade/`
- Approval Queue: `src/app/queue/` or `src/app/approval-queue/`
- Trade List: `src/app/trades/` or `src/app/trade-list/`
- Navbar: `src/app/navbar/` or `src/app/shared/`

Look for `data-testid` attributes in the HTML templates.

### 4. Capture live DOM (unless --no-browser)

If not `--no-browser`, use browser tools to visit each page of `http://localhost:4200` and collect all `data-testid` attribute values.

### 5. Analyze per page

For each page, compare inventory vs template/DOM:
- **unchanged**: locator still works (data-testid exists and xpath is valid)
- **renamed**: element exists but data-testid value changed — provide new_xpath
- **removed**: element no longer in template
- **added**: new data-testid values not yet in inventory
- **flagged**: element missing data-testid (needs developer action)

**IMPORTANT**: Only report a change if the locator is BROKEN. Do not "upgrade" working structural XPaths to data-testid style.

### 6. Report findings

Print a summary table:
```
Page       | Unchanged | Renamed | Removed | Added | Flagged
-----------|-----------|---------|---------|-------|--------
login      |     5     |    0    |    0    |   0   |   0
dashboard  |     8     |    1    |    0    |   2   |   0
...
```

Show details for any renames, removals, additions, and flagged items.

### 7. Apply changes (with confirmation)

Ask the user: "Apply N rename(s) and N addition(s) to locators.xlsx? (y/n)"

If yes, for each rename:
```bash
cd java-framework && mvn exec:java -q -Dexec.mainClass=com.poc.engine.Main \
  -Dexec.args="update-locator <element-name> <new-xpath>"
```

For additions, update `test_data/locators.xlsx` directly using openpyxl.

After applying, check if any advanced actions or prompt files reference the old names and update them.

### 8. Validate

Re-run `python claude-orchestrator/scripts/show-context.py --locators` and confirm the changes look correct.
