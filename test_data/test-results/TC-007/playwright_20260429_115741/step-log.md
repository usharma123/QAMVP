# Playwright Test Run: TC-007

| Field | Value |
|---|---|
| Run ID | 20260429_115741 |
| Test Case | TC-007 |
| Title | Unauthenticated deep link is gated and logout clears protected access |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-007/playwright_20260429_115741 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-005 | Open /trade directly while logged out. | Application redirects to login or blocks access to New Trade. | Opened /trade while logged out and verified protected content is unavailable. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-007/playwright_20260429_115741/step_01_pass.png` |
| 2 | REQ-FR-002 | Login as maker. | Dashboard page loads. | Logged in as admin. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-007/playwright_20260429_115741/step_02_pass.png` |
| 3 | REQ-FR-014 | Click Logout. | Login page is visible and session is cleared. | Logged out and login page is visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-007/playwright_20260429_115741/step_03_pass.png` |
