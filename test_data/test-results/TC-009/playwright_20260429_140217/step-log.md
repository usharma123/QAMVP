# Playwright Test Run: TC-009

| Field | Value |
|---|---|
| Run ID | 20260429_140217 |
| Test Case | TC-009 |
| Title | Trade form prevents submission when required fields are missing |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Maker dashboard loads. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217/step_01_pass.png` |
| 2 | REQ-FR-012 | Navigate to New Trade. | New Trade form is visible. | Navigated with nav-new-trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217/step_02_pass.png` |
| 3 | REQ-FR-035 | Leave Market Sector and Quantity blank. | Submit Order remains disabled or submission is blocked. | Submit is disabled. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217/step_03_pass.png` |
| 4 | REQ-FR-035 | Select Technology and leave Ticker blank. | Submit Order remains disabled or submission is blocked. | Trade form fields populated from test data. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217/step_04_pass.png` |
| 5 | REQ-FR-035 | Enter quantity 0. | Quantity validation prevents valid submission. | Submit is disabled. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217/step_05_pass.png` |
| 6 | REQ-FR-033 | Verify no queue row was created. | Approval Queue still shows Pending: 0. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-009/playwright_20260429_140217/step_06_pass.png` |
