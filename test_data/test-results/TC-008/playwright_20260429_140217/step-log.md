# Playwright Test Run: TC-008

| Field | Value |
|---|---|
| Run ID | 20260429_140217 |
| Test Case | TC-008 |
| Title | Navigation menus expose all trading and admin destinations |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-002 | Login as maker. | Authenticated navbar is visible. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_01_pass.png` |
| 2 | REQ-FR-010 | Verify navbar persists on Dashboard. | Navbar remains visible on Dashboard. | Dashboard state verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_02_pass.png` |
| 3 | REQ-FR-012 | Open Trading dropdown. | Dashboard, New Trade, Trade List, and Approval Queue links are visible. | Trading menu links are visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_03_pass.png` |
| 4 | REQ-FR-012 | Click New Trade. | New Trade page loads. | Navigated with nav-new-trade. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_04_pass.png` |
| 5 | REQ-FR-012 | Open Trading dropdown and click Approval Queue. | Approval Queue page loads. | Navigated with nav-queue. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_05_pass.png` |
| 6 | REQ-FR-012 | Open Trading dropdown and click Trade List. | Trade List page loads. | Navigated with nav-trade-list. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_06_pass.png` |
| 7 | REQ-FR-013 | Open Admin dropdown and click Users. | Users placeholder page loads without breaking the shell. | Navigated with nav-user-list. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_07_pass.png` |
| 8 | REQ-FR-014 | Logout. | Login page is visible. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-008/playwright_20260429_140217/step_08_pass.png` |
