# Prompt: generate_app_layout

```
You are a technical documentation writer for a web application test automation project.

Your task is to produce an **App Layout** reference document in Markdown. This document will be
injected into the system prompt of an AI test orchestrator, so it must be accurate, concise, and
structured for machine consumption.

Below is a live DOM snapshot of every page in the application, captured by a Playwright crawler.
Each element is listed with its tier (1 = data-testid, 2 = semantic id, 3 = structural).

---

## Live DOM Snapshot

### Page: login
  - login-page (tier-1)
  - login-form (tier-1)
  - login-title (tier-1)
  - auth-username-field (tier-1)
  - login-password (tier-1)
  - auth-sign-in-btn (tier-1)

### Page: navbar
  - nav-trading (tier-1)
  - trading-menu-trigger (tier-1)
  - nav-trading-menu (tier-1)
  - nav-dashboard (tier-1)
  - nav-new-trade (tier-1)
  - nav-trade-list (tier-1)
  - nav-queue (tier-1)
  - nav-admin (tier-1)
  - nav-admin-trigger (tier-1)
  - nav-admin-menu (tier-1)
  - nav-user-list (tier-1)
  - navbar-user (tier-1)
  - navbar-logout (tier-1)
  - navbar (tier-1)

### Page: dashboard
  - dashboard-page (tier-1)
  - dashboard-title (tier-1)
  - dashboard-loading (tier-1)

### Page: trade
  - trade-page (tier-1)
  - trade-title (tier-1)
  - trade-form (tier-1)
  - trade-side-new (tier-1)
  - trade-sector (tier-1)
  - trade-ticker (tier-1)
  - trade-account-type (tier-1)
  - trade-quantity (tier-1)
  - trade-time-in-force (tier-1)
  - trade-current-price (tier-1)
  - trade-total-value (tier-1)
  - trade-submit (tier-1)

### Page: queue
  - queue-page (tier-1)
  - queue-title (tier-1)
  - queue-pending-count (tier-1)
  - queue-table (tier-1)
  - queue-th-txid (tier-1)
  - queue-th-side (tier-1)
  - queue-th-ticker (tier-1)
  - queue-th-quantity (tier-1)
  - queue-th-price (tier-1)
  - queue-th-total (tier-1)
  - queue-empty (tier-1)

### Page: trade-list
  - trade-list-page (tier-1)
  - trade-list-title (tier-1)
  - trade-list-summary (tier-1)
  - trade-list-total (tier-1)
  - trade-list-matched-count (tier-1)
  - trade-list-pending-count (tier-1)
  - trade-list-table (tier-1)
  - trade-list-th-txid (tier-1)
  - trade-list-th-side (tier-1)
  - trade-list-th-ticker (tier-1)
  - trade-list-th-quantity (tier-1)
  - trade-list-th-price (tier-1)
  - trade-list-th-total (tier-1)
  - trade-list-th-status (tier-1)
  - trade-list-th-matched-with (tier-1)
  - trade-list-empty (tier-1)

### Page: user-list
  - user-list-page (tier-1)
  - user-list-title (tier-1)
  - user-list-placeholder (tier-1)


---

## Instructions

From the snapshot above, produce a Markdown document with the following sections.
Do NOT include any preamble, explanation, or commentary — output ONLY the document itself.

**Formatting rules (strictly enforced):**
- Keep table cell content short — one brief phrase per cell, no padding.
- Do NOT pad table columns with extra spaces to align them.
- Use plain pipe-delimited Markdown tables only.
- The entire document must fit within 60 lines.

### Required sections

1. **## Application Layout** — top-level heading

2. **### User Roles** — a table with columns: Role | Username | Password | Can do
   - Infer roles from login-page elements (e.g. fields labelled "username", "role selector").
   - If credentials cannot be inferred from the DOM, leave the cell as `(unknown)`.

3. **### Pages** — a table with columns: Route | Page | Key Elements
   - One row per page/sheet found in the snapshot.
   - "Key Elements" lists the most important tier-1 element names only, comma-separated.
   - Use backtick formatting for element names.

4. **### Navigation** — bullet list describing the global navigation structure:
   - Which elements are nav triggers / dropdowns.
   - Which elements are nav links and where they lead.
   - Logout element, if present.

```
