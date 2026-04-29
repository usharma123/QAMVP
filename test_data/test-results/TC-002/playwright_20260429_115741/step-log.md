# Playwright Test Run: TC-002

| Field | Value |
|---|---|
| Run ID | 20260429_115741 |
| Test Case | TC-002 |
| Title | Two pending trades are counted in queue and absent from dashboard until approval |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Navbar shows admin (maker). | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_01_pass.png` |
| 2 | REQ-FR-033 | Create BUY AAPL 100 Cash Day Order. | First trade is submitted and routed to pending approval. | Submitted BUY AAPL trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_02_pass.png` |
| 3 | REQ-FR-033 | Create SELL AAPL 100 Cash Day Order. | Second trade is submitted and routed to pending approval. | Submitted SELL AAPL trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_03_pass.png` |
| 4 | REQ-FR-042 | Navigate to Approval Queue. | Pending: 2 is displayed. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_04_pass.png` |
| 5 | REQ-FR-041 | Inspect queue columns and row values. | TX-ID, Side, Ticker, Qty, Price, Total, Action columns are visible with both AAPL rows. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_05_pass.png` |
| 6 | REQ-FR-020 | Navigate to Dashboard without approving either trade. | Dashboard does not show the pending AAPL trades. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_06_pass.png` |
| 7 | REQ-FR-022 | Verify dashboard approved count remains zero. | Total Trades: 0 is displayed. | Approved   row. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-002/playwright_20260429_115741/step_07_pass.png` |
