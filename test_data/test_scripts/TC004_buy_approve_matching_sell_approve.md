# TC-004: Buy Trade, Approve, Matching Sell, Approve (Maker–Checker)

## Objective

Verify the full maker–checker lifecycle for a matched pair: a BUY is submitted and approved, then a **matching** SELL (same ticker, quantity, sector, account type, and time-in-force) is submitted and approved, leading to both trades appearing as matched on the Trade List.

## Preconditions

- App is running at http://localhost:4200
- No trades exist (fresh session)

## Test Steps

1. Log in as **maker** (maker role).
2. Create a **BUY** trade: 50 shares of JPM, Financials sector, Margin account, Day Order.
3. Log out.
4. Log in as **checker** (checker role).
5. Approve the pending trade in the approval queue.
6. Log out.
7. Log in as **maker**.
8. Create a **SELL** trade: 50 shares of JPM, Financials sector, Margin account, Day Order (same parameters as the BUY so the orders can match).
9. Log out.
10. Log in as **checker**.
11. Approve the pending trade in the approval queue.
12. Navigate to the Trade List page.
13. Verify the total trade count is 2.
14. Verify the matched count is 2.
15. Take a screenshot of the trade list.

## Expected Results

- Both trades are approved successfully after checker actions.
- The two trades match each other (same ticker, quantity, and compatible sides/parameters).
- Trade List shows both trades with "Matched" status (or equivalent app-visible matched indicators).

## Generation hints

- When generating executable JSON for this scenario, prefer the **`CreateAndMatchTrade`** advanced action with parameter bindings aligned to the BUY/SELL example above (`sector`, `ticker`, `accountType`, `quantity`, `timeInForce`), which implements: create buy → approve → create matching sell → approve.
