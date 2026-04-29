# Playwright Test Run: TC-011

| Field | Value |
|---|---|
| Run ID | 20260429_120344 |
| Test Case | TC-011 |
| Title | Trade List columns and summary bar reflect approved inventory |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260429_120344 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Authenticated shell is visible. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260429_120344/step_01_pass.png` |
| 2 | REQ-FR-050 | Navigate to Trade List. | Trade List page loads. | Navigated with nav-trade-list. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260429_120344/step_02_pass.png` |
| 3 | REQ-FR-050 | Inspect Trade List headers. | TX-ID, Side, Ticker, Qty, Price, Total, Status, Matched With headers are visible. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260429_120344/step_03_pass.png` |
| 4 | REQ-FR-051 | Inspect summary bar. | Total, Matched, and Pending badges are visible. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260429_120344/step_04_pass.png` |
| 5 | REQ-FR-050 | Verify every populated row includes side, ticker, quantity, total, and status. | Rows have complete operational values and status badge text. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260429_120344/step_05_pass.png` |
