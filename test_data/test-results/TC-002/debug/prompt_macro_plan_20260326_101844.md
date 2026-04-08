# Prompt: macro_plan

```
# Macro planning — select advanced actions for the whole test

You are choosing which **registered advanced actions (macros)** best cover the **entire** test flow before any step-by-step JSON is written.

## Registry (names only — you must pick from this list)

- **ApproveTrade** — Navigates to Approval Queue, clicks Approve on the first pending trade. End state: Approval Queue page with toast confirmed. | parameters: (none)
- **CreateAndMatchTrade** — Creates a BUY trade, approves it, creates a matching SELL trade, approves it. Use when test needs two matched/approved trades. End state: Approval Queue page. | parameters: `sector`, `ticker`, `accountType`, `quantity`, `timeInForce`
- **CreateBuyTrade** — Same as CreateTrade but side is hardcoded to BUY. End state: Approval Queue page with trade pending. | parameters: `sector`, `ticker`, `accountType`, `quantity`, `timeInForce`
- **CreateSellTrade** — Same as CreateTrade but side is hardcoded to SELL. End state: Approval Queue page with trade pending. | parameters: `sector`, `ticker`, `accountType`, `quantity`, `timeInForce`
- **CreateTrade** — Navigates to New Trade form, fills side/sector/ticker/accountType/quantity/timeInForce, submits. End state: Approval Queue page with trade pending. | parameters: `side`, `sector`, `ticker`, `accountType`, `quantity`, `timeInForce`
- **Login** — Navigates to /login and logs in with provided username/password. End state: dashboard page. | parameters: `username`, `password`
- **LoginAsChecker** — Navigates to /login and logs in as checker (checker/chscker@123). End state: dashboard page. | parameters: (none)
- **LoginAsMaker** — Navigates to /login and logs in as maker (admin/admin). End state: dashboard page. | parameters: (none)
- **Logout** — Clicks the navbar logout button. End state: login page. | parameters: (none)
- **VerifyDashboardCount** — Navigates to the Dashboard page (NOT Trade List) and asserts the Total Trades label equals expectedCount. Only counts approved trades. | parameters: `expectedCount`

## Advanced action composition (default)

**Default:** Prefer **advanced actions** (macros from the registry) over **primitive** steps whenever the test intent is fully covered by one or more macros.

- Emit **one JSON step per macro** with the correct `action` name and `test_input` parameter bindings (`key=value` comma-separated).
- **Do not** expand a macro into its internal CLICK / TYPE / WAIT / SELECT sequence unless the test explicitly requires inspecting or manipulating those individual UI elements.
- When a scenario needs **multiple** macros (e.g. login → trade → logout → approve), use the **smallest** set of macro steps that covers the flow—not the longest primitive sequence.

**Use primitives when:**

- No registered advanced action matches the intent.
- The test explicitly targets low-level UI behavior (specific waits, malformed input, focus, etc.).
- You only need a short assertion or navigation **after** a macro completes (e.g. `ASSERT_CONTAINS`, `CLICK` to open a menu the macro does not cover).

**Refinement:** Do not replace a macro that matches the test with a long primitive sequence unless feedback explicitly requires it.


## Your task

Read the full test description below. Output an **ordered** list of macro **names** you intend the script generator to use, in **execution order**.

- Prefer **one composite macro** when it covers the full flow (e.g. a single macro that creates buy, approves, creates matching sell, approves).
- Include **login/logout** macros when the test switches users (maker vs checker).
- Do **not** list built-in primitives (`CLICK`, `TYPE`, …) here — only advanced action names from the registry.
- If the test is only low-level UI assertions with no suitable macro, return an empty `macros` array and explain in `notes`.

## Output format

Return **only** valid JSON:

```json
{
  "macros": ["LoginAsMaker", "CreateBuyTrade", "Logout"],
  "notes": "One sentence why this ordering fits the test."
}
```


# Full test description
1. Login as maker  [TestData: username=admin,password=admin]
2. Create a buy trade for 100 AAPL  [TestData: sector=Technology,ticker=AAPL,quantity=100,accountType=Cash,timeInForce=Day Order]
3. Create a sell trade for 100 AAPL  [TestData: sector=Technology,ticker=AAPL,quantity=100,accountType=Cash,timeInForce=Day Order]
4. Verify approval queue has 2 pending trades  [ExpectedOutput: Pending: 2]
5. Logout
6. Login as checker  [TestData: username=checker,password=checker]
7. Approve both pending trades
8. Navigate to trade list
9. Verify both trades are matched  [ExpectedOutput: Both trades show Matched status]
```
