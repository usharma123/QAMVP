# Playwright Test Run: TC-014

| Field | Value |
|---|---|
| Run ID | 20260429_144333 |
| Test Case | TC-014 |
| Title | Ticker selection drives price and total recalculation |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Maker dashboard loads. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333/step_01_pass.png` |
| 2 | REQ-FR-012 | Navigate to New Trade. | New Trade form is visible. | Navigated with nav-new-trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333/step_02_pass.png` |
| 3 | REQ-FR-030 | Select Financials sector. | Ticker dropdown enables JPM, BAC, and V choices. | Trade form fields populated from test data. Price/total verified: present / present. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333/step_03_pass.png` |
| 4 | REQ-FR-031 | Select V and enter quantity 3. | Current Price is 278.90 and Total Value is 836.70. | Trade form fields populated from test data. Price/total verified: 278.90 / 836.70. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333/step_04_pass.png` |
| 5 | REQ-FR-031 | Change quantity to 4. | Total Value recalculates to 1115.60 without changing price. | Trade form fields populated from test data. Price/total verified: present / 1115.60. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333/step_05_pass.png` |
| 6 | REQ-FR-031 | Change ticker to BAC. | Current Price updates to 35.60 and Total Value recalculates to 142.40. | Trade form fields populated from test data. Price/total verified: 35.60 / 142.40. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-014/playwright_20260429_144333/step_06_pass.png` |
