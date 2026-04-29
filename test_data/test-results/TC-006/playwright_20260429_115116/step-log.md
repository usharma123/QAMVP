# Playwright Test Run: TC-006

| Field | Value |
|---|---|
| Run ID | 20260429_115116 |
| Test Case | TC-006 |
| Title | Invalid credentials do not authenticate and show safe error |
| Execution Method | Playwright black-box runner |
| Overall Verdict | PASS |
| Artifact Directory | /Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-006/playwright_20260429_115116 |

## Step Results

| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |
|---:|---|---|---|---|---|---|
| 1 | REQ-FR-001 | Open login page. | Username, password, and Sign in controls are visible. | Login controls are visible. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-006/playwright_20260429_115116/step_01_pass.png` |
| 2 | REQ-FR-004 | Enter invalid credentials and submit. | User remains on login page. | Invalid login remained on login page. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-006/playwright_20260429_115116/step_02_pass.png` |
| 3 | REQ-FR-004 | Inspect login error message. | Invalid username or password is visible. | Login error message verified. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-006/playwright_20260429_115116/step_03_pass.png` |
| 4 | REQ-FR-005 | Verify Trading menu is unavailable after failed login. | Authenticated navbar and trading links are not visible. | Authenticated navbar is unavailable. | PASS | `/Users/utsavsharma/Documents/GitHub/QAMVP/test_data/test-results/TC-006/playwright_20260429_115116/step_04_pass.png` |
