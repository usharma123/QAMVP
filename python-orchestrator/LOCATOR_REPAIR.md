# Locator repair (Stage 6)

`repair locators` builds a prompt from:

1. **Static templates** — all `mock-trading-app/src/app/**/*.html`
2. **Runtime DOM** (default) — Playwright opens `MOCK_APP_BASE_URL` (default `http://localhost:4200`), logs in as maker using credentials from `test_data/testdatadefaults.xlsx`, then captures HTML + a sorted list of `data-testid` values per route (`/login`, then `/dashboard`, `/trade`, `/queue`, `/trades`, `/admin/users`).

Templates miss dynamic markup (`*ngFor`, tables after API load). Runtime snapshots include that.

## Setup

```bash
pip install -r requirements.txt
playwright install chromium
```

Start the app before running repair:

```bash
cd ../mock-trading-app && npm start
```

## Options

- **`repair locators`** — templates + runtime DOM (requires Playwright + running app).
- **`repair locators --no-browser`** — templates only (offline / CI without browser).

## Environment

- `MOCK_APP_BASE_URL` — base URL if not using port 4200.
