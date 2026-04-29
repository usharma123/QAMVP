# QAMVP Playwright Runner

Deterministic black-box Playwright runner for KB-derived QAMVP test cases.

## Run

Install dependencies:

```bash
npm install --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner
npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner playwright install chromium
```

Run one test case:

```bash
TC_ID=TC-001 PLAYWRIGHT_WORKERS=1 npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner playwright test --config /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner/playwright.config.ts --workers=1 --grep "TC-001"
```

Run all test cases with bounded parallelism:

```bash
TC_ID=all PLAYWRIGHT_WORKERS=2 npx --prefix /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner playwright test --config /Users/utsavsharma/Documents/GitHub/QAMVP/playwright-runner/playwright.config.ts --workers=2
```

## Contract

- Source test cases come from `test-doc/test-case-repository.json`, which is exported from the ingestion DB.
- Runtime evidence is black-box only: visible UI state, screenshots, page text, Playwright traces, and saved artifacts.
- The runner must not inspect or rely on `mock-trading-app/src`, Angular internals, `window.ng`, services, components, stores, or implementation-derived behavior.
- Each TC writes artifacts to `test_data/test-results/<TC-ID>/playwright_<timestamp>/`.
- Unknown natural-language steps fail closed as `BLOCKED_UNMAPPED_STEP`.
- `/audit-test-run` remains the corporate approval gate after execution.
