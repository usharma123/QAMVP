# TC-001: Create a Buy Trade and Verify Dashboard Count

## Objective
Verify that a user can log in, place a BUY order, and the dashboard trade count increments correctly.

## Preconditions
- App is running at http://localhost:4200
- No trades exist (fresh session)

## Test Steps

1. Log in with default credentials (admin / admin).
2. Verify the dashboard shows "Total Trades: 0".
3. Create a BUY trade for 100 shares of AAPL in the Technology sector, Cash account, Day Order.
4. Verify the toast message confirms the trade was submitted.
5. Verify the dashboard now shows "Total Trades: 1".
6. Take a screenshot of the final dashboard state.

## Expected Results
- Login succeeds and redirects to dashboard.
- Trade count starts at 0.
- Trade is submitted successfully with a confirmation toast.
- Trade count increments to 1 after the trade.
