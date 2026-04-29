# Playwright Test Run: TC-001

| Field | Value |
|---|---|
| Run ID | 20260429_143730 |
| Test Case | TC-001 |
| Title | Maker submits BUY, checker approves, dashboard reflects one approved trade |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker using documented credentials. | Dashboard page loads and navbar shows admin (maker). | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_01_pass.png` |
| 2 | REQ-FR-012 | Open Trading menu and navigate to New Trade. | New Trade form is visible. | Navigated with nav-new-trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_02_pass.png` |
| 3 | REQ-FR-030 | Select BUY, Technology, AAPL, Cash, quantity 100, Day Order. | All required trade form fields are populated. | Trade form fields populated from test data. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_03_pass.png` |
| 4 | REQ-FR-031 | Wait for ticker price and total value to calculate. | Current Price is 178.50 and Total Value is 17850.00. | Price/total verified: 178.50 / 17850.00. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_04_pass.png` |
| 5 | REQ-FR-034 | Submit the order. | Success toast confirms Order TX-1001 and workflow moves toward approval queue. | Submit action completed and confirmation text was observed. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_05_pass.png` |
| 6 | REQ-FR-040 | Open Approval Queue as maker before approval. | Queue shows Pending: 1 and includes BUY AAPL quantity 100. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_06_pass.png` |
| 7 | REQ-FR-014 | Logout maker. | Login page is visible and maker session is cleared. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_07_pass.png` |
| 8 | REQ-FR-003 | Login as checker. | Dashboard page loads and navbar shows checker (checker). | Logged in as checker. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_08_pass.png` |
| 9 | REQ-FR-043 | Open Approval Queue and approve the AAPL BUY row. | Approve action completes for TX-1001. | Approved BUY AAPL row. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_09_pass.png` |
| 10 | REQ-FR-044 | Observe approval feedback. | Toast displays Trade TX-1001 approved. | Observed approval feedback: Trade TX-1001 approved. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_10_pass.png` |
| 11 | REQ-FR-045 | Refresh or revisit Approval Queue. | Queue shows Pending: 0 and the approved row is removed. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_11_pass.png` |
| 12 | REQ-FR-020 | Navigate to Dashboard. | Dashboard includes the approved AAPL trade and excludes pending-only rows. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_12_pass.png` |
| 13 | REQ-FR-022 | Verify Dashboard total count. | Total Trades: 1 is displayed. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_143730/step_13_pass.png` |
