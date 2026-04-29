# Playwright Test Run: TC-001

| Field | Value |
|---|---|
| Run ID | 20260429_114616 |
| Test Case | TC-001 |
| Title | Maker submits BUY, checker approves, dashboard reflects one approved trade |
| Execution Method | Playwright black-box runner |
| Overall Verdict | FAIL |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_114616 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker using documented credentials. | Dashboard page loads and navbar shows admin (maker). | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_114616/step_01_pass.png` |
| 2 | REQ-FR-012 | Open Trading menu and navigate to New Trade. | New Trade form is visible. | Navigated with nav-new-trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_114616/step_02_pass.png` |
| 3 | REQ-FR-030 | Select BUY, Technology, AAPL, Cash, quantity 100, Day Order. | All required trade form fields are populated. | Trade form fields populated from test data. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_114616/step_03_pass.png` |
| 4 | REQ-FR-031 | Wait for ticker price and total value to calculate. | Current Price is 178.50 and Total Value is 17850.00. | Step execution failed. | FAIL | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-001/playwright_20260429_114616/step_04_fail.png` |
