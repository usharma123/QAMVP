# Playwright Test Run: TC-016

| Field | Value |
|---|---|
| Run ID | 20260429_144333 |
| Test Case | TC-016 |
| Title | Local operability and automation hooks are verifiable from the browser |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-016/playwright_20260429_144333 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-NFR-001 | Open login page at the local Playwright base URL. | Login page and controls render from the local SUT without mandatory cloud services. | Login controls are visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-016/playwright_20260429_144333/step_01_pass.png` |
| 2 | REQ-NFR-002 | Verify login page automation hooks expose stable data-testid attributes. | Login page, username, password, and sign-in controls are reachable by data-testid. | Verified data-testid hooks: login-page, auth-username-field, login-password, auth-sign-in-btn. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-016/playwright_20260429_144333/step_02_pass.png` |
