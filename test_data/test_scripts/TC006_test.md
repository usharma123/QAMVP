# TC-006:  Test

## Objective
Verify the maker-checker flow with dashboard verification. 

## Preconditions
- App is running at http://localhost:4200
- No pending trades in the queue

## Test Steps

1. Log in as maker (admin / admin).
2. Create a SELL trade: 200 shares of MSFT, Technology sector, Margin account, Day Order.
3. Verify the confirmation-banner shows the trade was confirmed.
4. Log out.
5. Log in as checker (checker / chscker@123).
6. Approve the pending trade.
7. Verify the trade-approval-status shows "Approved".
8. Navigate to Dashboard and verify the trade count is 1.

## Expected Results
- Maker submits trade; it lands in queue.
- Checker approves; trade moves to dashboard.
- Dashboard shows 1 trade.


