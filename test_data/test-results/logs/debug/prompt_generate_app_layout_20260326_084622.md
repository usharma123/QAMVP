# Prompt: generate_app_layout

```
You are a technical documentation writer for a web application test automation project.

Your task is to produce an **App Layout** reference document in Markdown. This document will be
injected into the system prompt of an AI test orchestrator, so it must be accurate, concise, and
structured for machine consumption.

Below is a live DOM snapshot of every page in the application, captured by a Playwright crawler.
Each element is listed with its tier (1 = data-testid, 2 = semantic id, 3 = structural) and XPath.

---

## Live DOM Snapshot

### Page: login
  - [tier-1] login-page  →  //*[@data-testid='login-page']
  - [tier-1] login-form  →  //*[@data-testid='login-form']
  - [tier-1] login-title  →  //*[@data-testid='login-title']
  - [tier-1] auth-username-field  →  //*[@data-testid='auth-username-field']
  - [tier-1] login-password  →  //*[@data-testid='login-password']
  - [tier-1] auth-sign-in-btn  →  //*[@data-testid='auth-sign-in-btn']

### Page: navbar
  - [tier-1] nav-trading  →  //*[@data-testid='nav-trading']
  - [tier-1] trading-menu-trigger  →  //*[@data-testid='trading-menu-trigger']
  - [tier-1] nav-trading-menu  →  //*[@data-testid='nav-trading-menu']
  - [tier-1] nav-dashboard  →  //*[@data-testid='nav-dashboard']
  - [tier-1] nav-new-trade  →  //*[@data-testid='nav-new-trade']
  - [tier-1] nav-trade-list  →  //*[@data-testid='nav-trade-list']
  - [tier-1] nav-queue  →  //*[@data-testid='nav-queue']
  - [tier-1] nav-admin  →  //*[@data-testid='nav-admin']
  - [tier-1] nav-admin-trigger  →  //*[@data-testid='nav-admin-trigger']
  - [tier-1] nav-admin-menu  →  //*[@data-testid='nav-admin-menu']
  - [tier-1] nav-user-list  →  //*[@data-testid='nav-user-list']
  - [tier-1] navbar-user  →  //*[@data-testid='navbar-user']
  - [tier-1] navbar-logout  →  //*[@data-testid='navbar-logout']
  - [tier-1] navbar  →  //*[@data-testid='navbar']

### Page: dashboard
  - [tier-1] dashboard-page  →  //*[@data-testid='dashboard-page']
  - [tier-1] dashboard-title  →  //*[@data-testid='dashboard-title']
  - [tier-1] dashboard-loading  →  //*[@data-testid='dashboard-loading']

### Page: trade
  - [tier-1] trade-page  →  //*[@data-testid='trade-page']
  - [tier-1] trade-title  →  //*[@data-testid='trade-title']
  - [tier-1] trade-form  →  //*[@data-testid='trade-form']
  - [tier-1] trade-side-new  →  //*[@data-testid='trade-side-new']
  - [tier-1] trade-sector  →  //*[@data-testid='trade-sector']
  - [tier-1] trade-ticker  →  //*[@data-testid='trade-ticker']
  - [tier-1] trade-account-type  →  //*[@data-testid='trade-account-type']
  - [tier-1] trade-quantity  →  //*[@data-testid='trade-quantity']
  - [tier-1] trade-time-in-force  →  //*[@data-testid='trade-time-in-force']
  - [tier-1] trade-current-price  →  //*[@data-testid='trade-current-price']
  - [tier-1] trade-total-value  →  //*[@data-testid='trade-total-value']
  - [tier-1] trade-submit  →  //*[@data-testid='trade-submit']

### Page: queue
  - [tier-1] queue-page  →  //*[@data-testid='queue-page']
  - [tier-1] queue-title  →  //*[@data-testid='queue-title']
  - [tier-1] queue-pending-count  →  //*[@data-testid='queue-pending-count']
  - [tier-1] queue-table  →  //*[@data-testid='queue-table']
  - [tier-1] queue-th-txid  →  //*[@data-testid='queue-th-txid']
  - [tier-1] queue-th-side  →  //*[@data-testid='queue-th-side']
  - [tier-1] queue-th-ticker  →  //*[@data-testid='queue-th-ticker']
  - [tier-1] queue-th-quantity  →  //*[@data-testid='queue-th-quantity']
  - [tier-1] queue-th-price  →  //*[@data-testid='queue-th-price']
  - [tier-1] queue-th-total  →  //*[@data-testid='queue-th-total']
  - [tier-1] queue-empty  →  //*[@data-testid='queue-empty']

### Page: trade-list
  - [tier-1] trade-list-page  →  //*[@data-testid='trade-list-page']
  - [tier-1] trade-list-title  →  //*[@data-testid='trade-list-title']
  - [tier-1] trade-list-summary  →  //*[@data-testid='trade-list-summary']
  - [tier-1] trade-list-total  →  //*[@data-testid='trade-list-total']
  - [tier-1] trade-list-matched-count  →  //*[@data-testid='trade-list-matched-count']
  - [tier-1] trade-list-pending-count  →  //*[@data-testid='trade-list-pending-count']
  - [tier-1] trade-list-table  →  //*[@data-testid='trade-list-table']
  - [tier-1] trade-list-th-txid  →  //*[@data-testid='trade-list-th-txid']
  - [tier-1] trade-list-th-side  →  //*[@data-testid='trade-list-th-side']
  - [tier-1] trade-list-th-ticker  →  //*[@data-testid='trade-list-th-ticker']
  - [tier-1] trade-list-th-quantity  →  //*[@data-testid='trade-list-th-quantity']
  - [tier-1] trade-list-th-price  →  //*[@data-testid='trade-list-th-price']
  - [tier-1] trade-list-th-total  →  //*[@data-testid='trade-list-th-total']
  - [tier-1] trade-list-th-status  →  //*[@data-testid='trade-list-th-status']
  - [tier-1] trade-list-th-matched-with  →  //*[@data-testid='trade-list-th-matched-with']
  - [tier-1] trade-list-empty  →  //*[@data-testid='trade-list-empty']

### Page: user-list
  - [tier-1] user-list-page  →  //*[@data-testid='user-list-page']
  - [tier-1] user-list-title  →  //*[@data-testid='user-list-title']
  - [tier-1] user-list-placeholder  →  //*[@data-testid='user-list-placeholder']


---

## Instructions

From the snapshot above, produce a Markdown document with the following sections.
Do NOT include any preamble, explanation, or commentary — output ONLY the document itself.

### Required sections

1. **## Application Layout** — top-level heading

2. **### User Roles** — a table with columns: Role | Username | Password | Can do
   - Infer roles from login-page elements (e.g. fields labelled "username", "role selector").
   - If credentials cannot be inferred from the DOM, leave the Username/Password cells as `(unknown)`.

3. **### Pages** — a table with columns: Route | Page | Key Elements
   - One row per page/sheet found in the snapshot.
   - "Key Elements" should list the most important data-testid names (tier-1) and any other
     notable interactive elements. Use backtick formatting for element names.

4. **### Navigation** — bullet list describing the global navigation structure:
   - Which elements are nav triggers / dropdowns.
   - Which elements are nav links and where they lead.
   - Logout element, if present.

Be precise. Use the exact element names from the snapshot (they are the locator keys used by the
test engine). Prefer tier-1 (data-testid) names where available.

```
