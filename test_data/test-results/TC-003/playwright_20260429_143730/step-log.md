# Playwright Test Run: TC-003

| Field | Value |
|---|---|
| Run ID | 20260429_143730 |
| Test Case | TC-003 |
| Title | Approved BUY and matching SELL become Matched in Trade List |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Maker session is established. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_01_pass.png` |
| 2 | REQ-FR-033 | Create BUY JPM 50 Margin Day Order. | BUY JPM is submitted as pending approval. | Submitted BUY JPM trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_02_pass.png` |
| 3 | REQ-FR-014 | Logout maker. | Login page is visible. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_03_pass.png` |
| 4 | REQ-FR-003 | Login as checker. | Checker session is established. | Logged in as checker. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_04_pass.png` |
| 5 | REQ-FR-043 | Approve the pending BUY JPM row. | BUY JPM row is approved and leaves queue. | Approved BUY JPM row. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_05_pass.png` |
| 6 | REQ-FR-014 | Logout checker. | Login page is visible. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_06_pass.png` |
| 7 | REQ-FR-002 | Login as maker again. | Maker session is established. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_07_pass.png` |
| 8 | REQ-FR-033 | Create SELL JPM 50 Margin Day Order. | SELL JPM is submitted as pending approval. | Submitted SELL JPM trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_08_pass.png` |
| 9 | REQ-FR-014 | Logout maker. | Login page is visible. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_09_pass.png` |
| 10 | REQ-FR-003 | Login as checker again. | Checker session is established. | Logged in as checker. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_10_pass.png` |
| 11 | REQ-FR-043 | Approve the pending SELL JPM row. | SELL JPM is approved and matching logic runs. | Approved SELL JPM row. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_11_pass.png` |
| 12 | REQ-FR-050 | Navigate to Trade List. | Trade List displays both approved JPM rows with Status column populated. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_12_pass.png` |
| 13 | REQ-FR-051 | Verify summary counts. | Total: 2, Matched: 2, Pending: 0 are displayed. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_13_pass.png` |
| 14 | REQ-FR-050 | Verify Matched With values. | Each JPM row references the opposite TX-ID in Matched With. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-003/playwright_20260429_143730/step_14_pass.png` |
