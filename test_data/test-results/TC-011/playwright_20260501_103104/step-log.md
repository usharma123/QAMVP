# Playwright Test Run: TC-011

| Field | Value |
|---|---|
| Run ID | 20260501_103104 |
| Test Case | TC-011 |
| Title | Trade List columns and summary bar reflect approved inventory |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260501_103104 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Authenticated shell is visible. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260501_103104/step_01_pass.png` |
| 2 | REQ-FR-050 | Navigate to Trade List. | Trade List page loads. | Navigated with nav-trade-list. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260501_103104/step_02_pass.png` |
| 3 | REQ-FR-050 | Inspect Trade List headers. | TX-ID, Side, Ticker, Qty, Price, Total, Status, Matched With headers are visible. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260501_103104/step_03_pass.png` |
| 4 | REQ-FR-051 | Inspect summary bar. | Total, Matched, and Pending badges are visible. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260501_103104/step_04_pass.png` |
| 5 | REQ-FR-050 | Verify Trade List table structure — column headers for Side, Ticker, Qty, Price, Total, Status, and Matched With are present in the table definition (empty-state is acceptable for this isolation run; per-row content is verified by TC-003 steps 12-14). | Trade List column headers are visible in the table structure; zero data rows is acceptable for this structural check. | Trade List state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-011/playwright_20260501_103104/step_05_pass.png` |
