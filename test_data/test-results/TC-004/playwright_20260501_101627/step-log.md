# Playwright Test Run: TC-004

| Field | Value |
|---|---|
| Run ID | 20260501_101627 |
| Test Case | TC-004 |
| Title | GTC trade requires expiration date and calculates notional total |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Maker dashboard loads. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_01_pass.png` |
| 2 | REQ-FR-012 | Navigate to New Trade. | New Trade form is visible. | Navigated with nav-new-trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_02_pass.png` |
| 3 | REQ-FR-032 | Change Time in Force to GTC. | Expiration Date field appears and is required. | Time in force set to GTC. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_03_pass.png` |
| 4 | REQ-FR-030 | Populate SELL MSFT 20 Margin GTC with expiration date. | All required fields including expiration date are populated. | Trade form fields populated from test data. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_04_pass.png` |
| 5 | REQ-FR-031 | Wait for MSFT price and total value. | Current Price is 415.20 and Total Value is 8304.00. | Price/total verified: 415.20 / 8304.00. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_05_pass.png` |
| 6 | REQ-FR-033 | Submit the GTC order. | Order confirmation toast appears and trade is pending approval. | Submit action completed and confirmation text was observed. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_06_pass.png` |
| 7 | REQ-FR-040 | Open Approval Queue. | Pending row shows SELL MSFT quantity 20. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-004/playwright_20260501_101627/step_07_pass.png` |
