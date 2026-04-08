# TC-003: Multiple Trades and Dashboard Verification

## Objective
Verify that the dashboard count accurately reflects multiple trades created in sequence.

## Preconditions
- App is running at http://localhost:4200
- No trades exist (fresh session)

## Test Steps

1. Log in with default credentials.
2. Verify the dashboard shows "Total Trades: 0".
3. Create a BUY trade: 200 shares of MSFT, Technology sector, Cash account, Day Order.
4. Verify the dashboard shows "Total Trades: 1".
5. Create a SELL trade: 75 shares of BAC, Financials sector, Margin account, Day Order.
6. Verify the dashboard shows "Total Trades: 2".
7. Create a BUY trade: 150 shares of NVDA, Technology sector, Cash account, Day Order.
8. Verify the dashboard shows "Total Trades: 3".
9. Take a screenshot.

## Expected Results
- Each trade creation increments the dashboard count by 1.
- Final count is 3 after three trades.
