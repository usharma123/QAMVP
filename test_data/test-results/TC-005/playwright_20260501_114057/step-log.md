# Playwright Test Run: TC-005

| Field | Value |
|---|---|
| Run ID | 20260501_114057 |
| Test Case | TC-005 |
| Title | Trade list shows unmatched approved trade until compatible opposite trade is approved |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Maker session is established. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_01_pass.png` |
| 2 | REQ-FR-033 | Create BUY NVDA 10 Cash Day Order. | BUY NVDA is pending approval. | Submitted BUY NVDA trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_02_pass.png` |
| 3 | REQ-FR-014 | Logout maker. | Login page is visible. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_03_pass.png` |
| 4 | REQ-FR-003 | Login as checker. | Checker session is established. | Logged in as checker. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_04_pass.png` |
| 5 | REQ-FR-043 | Approve BUY NVDA. | BUY NVDA is approved. | Approved BUY NVDA row. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_05_pass.png` |
| 6 | REQ-FR-050 | Navigate to Trade List. | Trade List displays the NVDA row with Status Pending and blank Matched With. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_06_pass.png` |
| 7 | REQ-FR-051 | Verify summary after unmatched approval. | Total: 1, Matched: 0, Pending: 1 are displayed. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-005/playwright_20260501_114057/step_07_pass.png` |
