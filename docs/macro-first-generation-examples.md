# Macro-first generation — acceptance examples

Use these **natural-language** inputs to verify that script generation **prefers advanced actions** (macros) over long primitive sequences. Expected shapes are illustrative; `test_input` values may vary with defaults.

See also: [`test-script-composition.md`](test-script-composition.md), [`composition_rules.md`](../python-orchestrator/prompts/composition_rules.md).

---

## Example A — Maker–checker buy (macro chain)

**Input (NL steps):**

1. Login as maker  
2. Create a buy trade for AAPL, 100 shares  
3. Logout  
4. Login as checker  
5. Approve the trade  
6. Verify the trade appears on the dashboard  

**Expected macro-first script (shape):**

- Steps use **`LoginAsMaker`**, **`CreateBuyTrade`** (not many CLICK/TYPE primitives), **`Logout`**, **`LoginAsChecker`**, **`ApproveTrade`**, **`VerifyDashboardCount`** (or equivalent macro/assertion consistent with registry).  
- **Not** 15+ primitive steps that duplicate what those macros already do.

```json
{
  "testCaseId": "",
  "requirementId": "",
  "steps": [
    {"tcStep": 1, "action": "LoginAsMaker", "locator": "", "test_input": "", "output": ""},
    {"tcStep": 2, "action": "CreateBuyTrade", "locator": "", "test_input": "sector=Technology,ticker=AAPL,quantity=100,accountType=Cash,timeInForce=Day Order", "output": ""},
    {"tcStep": 3, "action": "Logout", "locator": "", "test_input": "", "output": ""},
    {"tcStep": 4, "action": "LoginAsChecker", "locator": "", "test_input": "", "output": ""},
    {"tcStep": 5, "action": "ApproveTrade", "locator": "", "test_input": "", "output": ""},
    {"tcStep": 6, "action": "VerifyDashboardCount", "locator": "", "test_input": "expectedCount=1", "output": ""}
  ]
}
```

---

## Example B — Create and match (single macro when intent matches)

**Input:**  
“Login as maker, then create and match a Technology sector trade: ticker MSFT, 50 shares, Cash account, Day order.”

**Expected:** If **`CreateAndMatchTrade`** is registered and keywords/intent match, prefer **one** `CreateAndMatchTrade` step (with appropriate `test_input`) instead of separate Create + Approve + … primitives unless the NL explicitly asks for step-by-step UI.

```json
{
  "testCaseId": "",
  "requirementId": "",
  "steps": [
    {"tcStep": 1, "action": "LoginAsMaker", "locator": "", "test_input": "", "output": ""},
    {"tcStep": 2, "action": "CreateAndMatchTrade", "locator": "", "test_input": "sector=Technology,ticker=MSFT,accountType=Cash,quantity=50,timeInForce=Day Order", "output": ""}
  ]
}
```

---

## Example C — When primitives are OK

**Input:**  
“After login as maker, assert that the sector dropdown shows exactly the placeholder text ‘Select sector’ before choosing Technology.”

**Expected:** **Primitives** (`WAIT_VISIBLE`, `ASSERT_TEXT` or similar on the dropdown) are appropriate because the test targets **specific low-level UI** not covered by a single macro assertion.

---

## Manual check

1. Run the orchestrator NL → JSON path for Examples A–B.  
2. Confirm step counts stay **small** and **action names** match registry macros.  
3. Run refinement on a macro-based script with unrelated feedback — macros should **remain** unless feedback demands a change.
