# Playwright Test Run: TC-010

| Field | Value |
|---|---|
| Run ID | 20260429_120344 |
| Test Case | TC-010 |
| Title | Dashboard columns and loading state render for approved trades |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-010/playwright_20260429_120344 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Dashboard route starts loading. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-010/playwright_20260429_120344/step_01_pass.png` |
| 2 | REQ-FR-023 | Observe Dashboard immediately after navigation. | Loading trades indicator is visible before data resolves. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-010/playwright_20260429_120344/step_02_pass.png` |
| 3 | REQ-FR-021 | Inspect Dashboard table headers after loading. | TX-ID, Ticker, Quantity, and Total Value headers are visible. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-010/playwright_20260429_120344/step_03_pass.png` |
| 4 | REQ-FR-022 | Inspect Dashboard summary. | Total Trades: N is displayed and matches approved row count. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-010/playwright_20260429_120344/step_04_pass.png` |
| 5 | REQ-FR-020 | Compare Dashboard rows to Approval Queue pending rows. | No pending_approval row appears on Dashboard. | Approval Queue state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-010/playwright_20260429_120344/step_05_pass.png` |
