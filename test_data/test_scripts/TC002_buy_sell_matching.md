# TC-002: Buy and Sell Trade Matching

## Objective
Verify that when a BUY and SELL order are placed for the same ticker, quantity, and price, they are matched automatically.

## Preconditions
- App is running at http://localhost:4200
- No trades exist (fresh session)

## Test Steps

1. Log in with default credentials.
2. Create a BUY trade: 50 shares of JPM, Financials sector, Margin account, Day Order.
3. Create a SELL trade: 50 shares of JPM, Financials sector, Margin account, Day Order.
4. Navigate to the Trade List page.
5. On the Trade List page, verify the total trade count label shows 2.
6. On the Trade List page, verify the matched trade count label shows 2.
7. Take a screenshot of the trade list.

## Expected Results
- Both trades are created successfully.
- The two trades match each other (same ticker, quantity, price, opposite sides).
- Trade List shows both trades with "Matched" status.
