# Functional Requirements Specification (FRS)

## Mock Trading & Approval Front-End (QAMVP SUT)

**Document ID:** QAMVP-FRS-001  
**Version:** 0.1  
**Status:** Draft  
**Date:** 2026-04-22  

**Related documents:** [BRD](01-business-requirements-document.md) · [TDS](03-test-design-specification.md) · [README](README.md)

**Behavioral reference:** `python-orchestrator/prompts/app_layout.md` (REF-2)  
**Locator / testability reference:** `python-orchestrator/prompts/locator_strategy.md` (REF-3)

---

## 1. Introduction

### 1.1 Purpose

This Functional Requirements Specification translates [BRD](01-business-requirements-document.md) business requirements (**BR-xxx**) into verifiable **shall** statements identified as **REQ-FR-xxx** (functional), **REQ-NFR-xxx** (non-functional), and **REQ-SEC-xxx** (security / control). UI element **data-testid** values cited below match REF-2 where provided.

### 1.2 Definitions

| Term | Definition |
|------|------------|
| SUT | System Under Test — Angular mock trading app |
| Route | Browser path such as `/login`, `/trade` |
| Toast | Ephemeral notification after an action |
| pending_approval | Trade status in queue per REF-2 |

### 1.3 Traceability legend

Each requirement lists **Parent BR** linking to the BRD catalog.

---

## 2. System overview

### REQ-FR-000 — Application shell

**Statement:** The SUT shall be a **single-page application** accessed via web browser, defaulting to `http://localhost:4200` in developer documentation.

**Parent BR:** BR-010  
**Priority:** Must  
**Acceptance:** Application serves login route when unauthenticated per §3.

---

## 3. Route: `/login`

### 3.1 Purpose

Authenticate maker or checker before accessing trading workspace.

### REQ-FR-001 — Login fields

**Statement:** The SUT shall present **username** and **password** fields and a **submit** (sign-in) control on the login page.

**Parent BR:** BR-001  
**Priority:** Must  
**Acceptance:** All three controls are visible and enabled when the page loads.

### REQ-FR-002 — Valid credentials — maker

**Statement:** The SUT shall accept username `admin` with password `admin` and establish an authenticated **maker** session.

**Parent BR:** BR-001, BR-006  
**Priority:** Must  
**Acceptance:** Post-submit navigation reaches authenticated shell; navbar reflects maker role per REF-2.

### REQ-FR-003 — Valid credentials — checker

**Statement:** The SUT shall accept username `checker` with password `chscker@123` and establish an authenticated **checker** session.

**Parent BR:** BR-001, BR-006  
**Priority:** Must  
**Acceptance:** Navbar reflects checker role per Ref-2.

### REQ-FR-004 — Invalid credentials

**Statement:** The SUT shall **not** authenticate users when credentials are incorrect and shall display an **error message** visible on the login page.

**Parent BR:** BR-001  
**Priority:** Must  
**Acceptance:** User remains on login; error text present.

### REQ-FR-005 — No trading access without auth

**Statement:** The SUT shall prevent use of trading routes without an authenticated session (behavior may redirect to login).

**Parent BR:** BR-001  
**Priority:** Must  
**Acceptance:** Direct navigation to `/dashboard` without session results in login or equivalent gate.

---

## 4. Global navigation and session

### 4.1 Navbar presence

### REQ-FR-010 — Persistent navbar

**Statement:** After successful login, the SUT shall display a **global navbar** on trading pages.

**Parent BR:** BR-011  
**Priority:** Must  
**Acceptance:** Navbar visible on `/dashboard`, `/trade`, `/queue`, `/trades`, `/admin/users`.

### REQ-FR-011 — User and role display

**Statement:** The navbar shall show the **current username** and **role** (e.g. `admin (maker)`).

**Parent BR:** BR-006  
**Priority:** Must  
**Acceptance:** Display matches authenticated identity from REF-2 examples.

### REQ-FR-012 — Trading menu — click dropdown

**Statement:** The SUT shall provide a **Trading** dropdown opened by **click** (not hover-only), exposing links to Dashboard, New Trade, Trade List, and Approval Queue.

**Parent BR:** BR-011  
**Priority:** Must  
**Rationale:** REF-2 mandates click-based menus for automation stability.  
**Testids (REF-2):** `trading-menu-trigger`, `nav-dashboard`, `nav-new-trade`, `nav-trade-list`, `nav-queue`.

### REQ-FR-013 — Admin menu

**Statement:** The SUT shall provide an **Admin** dropdown (click-based) containing **Users**.

**Parent BR:** BR-013  
**Priority:** Must  
**Testids:** `nav-admin-trigger`, `nav-user-list`.

### REQ-FR-014 — Logout

**Statement:** The SUT shall provide a **logout** control that clears the session and returns the user to `/login`.

**Parent BR:** BR-012  
**Priority:** Must  
**Testid:** `navbar-logout`.

---

## 5. Route: `/dashboard`

### 5.1 Purpose

Summarize **approved** trades only; support operational snapshot for trainees.

### REQ-FR-020 — Approved-only rows

**Statement:** The dashboard table shall include **only** trades that are **approved**, **excluding** `pending_approval` rows.

**Parent BR:** BR-005  
**Priority:** Must  
**Acceptance:** Pending trades do not appear while still pending.

### REQ-FR-021 — Dashboard columns

**Statement:** The dashboard summary table shall include **TxID**, **Ticker**, **Quantity**, and **Total** columns (per REF-2).

**Parent BR:** BR-005  
**Priority:** Must  

### REQ-FR-022 — Total trades count

**Statement:** The dashboard shall display **Total Trades: N** where N reflects the count of rows consistent with REQ-FR-020.

**Parent BR:** BR-005  
**Priority:** Must  

### REQ-FR-023 — Loading state

**Statement:** While trade data is loading, the dashboard shall show a **loading spinner** (or equivalent loading indicator).

**Parent BR:** BR-008  
**Priority:** Must  

---

## 6. Route: `/trade` (New Trade)

### 6.1 Purpose

Capture trade intent (maker primary persona).

### REQ-FR-030 — Trade form fields

**Statement:** The new trade form shall include: **Side** (BUY/SELL), **Sector**, **Ticker**, **Account Type**, **Quantity**, and **Time in Force**.

**Parent BR:** BR-002  
**Priority:** Must  

### REQ-FR-031 — Async price on ticker

**Statement:** After **Ticker** selection (or equivalent input completion per implementation), the SUT shall **asynchronously fetch** current price and display **Current Price** and **Total Value** derived from quantity and price.

**Parent BR:** BR-002  
**Priority:** Must  
**Acceptance:** Total updates when quantity or price changes.

### REQ-FR-032 — GTC conditional date

**Statement:** When **Time in Force** implies **GTC** (Good-Til-Cancelled), the SUT shall **conditionally display** an **Expiration Date** field; otherwise hide or disable per implementation.

**Parent BR:** BR-002  
**Priority:** Must  

### REQ-FR-033 — Submit trade

**Statement:** The SUT shall provide a **Submit** control that persists the trade and transitions it to workflow (typically **pending_approval**).

**Parent BR:** BR-002, BR-003  
**Priority:** Must  

### REQ-FR-034 — Submit success feedback

**Statement:** On successful submit, the SUT shall show a **toast notification**.

**Parent BR:** BR-002, BR-008  
**Priority:** Must  

### REQ-FR-035 — Validation (generic)

**Statement:** The SUT shall enforce **reasonable validation** on required fields (exact rules implementation-specific; absence of validation is a defect if submission corrupts state).

**Parent BR:** BR-002  
**Priority:** Should  

---

## 7. Route: `/queue` (Approval Queue)

### 7.1 Purpose

Checker reviews and approves **pending_approval** trades.

### REQ-FR-040 — Pending filter

**Statement:** The queue table shall list trades whose status is **`pending_approval`**.

**Parent BR:** BR-003, BR-004  
**Priority:** Must  

### REQ-FR-041 — Queue columns

**Statement:** The queue shall display **TxID**, **Side**, **Ticker**, **Qty**, **Price**, **Total** per REF-2.

**Parent BR:** BR-004  
**Priority:** Must  

### REQ-FR-042 — Pending count

**Statement:** The queue shall display **Pending: N** reflecting the number of pending rows.

**Parent BR:** BR-004  
**Priority:** Must  

### REQ-FR-043 — Per-row approve

**Statement:** Each pending row shall provide an **Approve** action.

**Parent BR:** BR-004  
**Priority:** Must  

### REQ-FR-044 — Approve feedback

**Statement:** On approval, the SUT shall show a **toast notification**.

**Parent BR:** BR-004  
**Priority:** Must  

### REQ-FR-045 — Post-approve state

**Statement:** After approval, the trade shall **no longer** appear as `pending_approval` in the queue and shall be eligible for **approved-only** views per REQ-FR-020.

**Parent BR:** BR-003, BR-005  
**Priority:** Must  

---

## 8. Route: `/trades` (Trade List)

### 8.1 Purpose

List **approved** trades with operational status and matching hints.

### REQ-FR-050 — Approved trade rows

**Statement:** The trade list shall display approved trades with columns per REF-2: **TxID**, **Side**, **Ticker**, **Quantity**, **Price**, **Total**, **Status**, **Matched With**.

**Parent BR:** BR-005, BR-014  
**Priority:** Must  

### REQ-FR-051 — Summary bar

**Statement:** The trade list shall show a summary bar with **Total** count, **Matched** count, and **Pending** count per REF-2.

**Parent BR:** BR-005  
**Priority:** Must  
**Note:** Naming reflects REF-2; business meaning is training-oriented.

---

## 9. Route: `/admin/users`

### REQ-FR-060 — Placeholder admin page

**Statement:** The SUT shall provide a **Users** page under admin navigation that may be a **placeholder** sufficient for PoC.

**Parent BR:** BR-013  
**Priority:** Could  
**Acceptance:** Route reachable; page does not break authenticated shell.

---

## 10. Non-functional requirements

### REQ-NFR-001 — Local operability

**Statement:** The SUT shall run on a **developer workstation** without mandatory cloud services.

**Parent BR:** BR-010  
**Priority:** Must  

### REQ-NFR-002 — Test automation hooks

**Statement:** Interactive controls shall expose stable **`data-testid`** attributes for automation per REF-3 and REF-2.

**Parent BR:** BR-009  
**Priority:** Must  

### REQ-NFR-003 — Responsiveness (qualitative)

**Statement:** Layout shall remain usable on common laptop resolutions without horizontal scroll **where feasible**; formal mobile support is out of BRD scope.

**Parent BR:** BR-010  
**Priority:** Could  

### REQ-NFR-004 — Error handling UX

**Statement:** User-visible errors shall be **legible** and **non-crashing** for common failure modes (bad login, empty queue).

**Parent BR:** BR-008  
**Priority:** Should  

### REQ-NFR-005 — Performance (PoC)

**Statement:** Screens shall become interactive within **a few seconds** on typical dev hardware under light data volume; formal SLAs are out of scope.

**Parent BR:** BR-008  
**Priority:** Could  

---

## 11. Security and control requirements

### REQ-SEC-001 — Role labeling

**Statement:** The authenticated UI shall **display** role information sufficient to distinguish maker vs checker sessions.

**Parent BR:** BR-006  
**Priority:** Must  

### REQ-SEC-002 — Session termination

**Statement:** Logout shall **invalidate** the client session sufficiently that protected routes require re-login.

**Parent BR:** BR-012  
**Priority:** Must  

### REQ-SEC-003 — Pedagogical limitation notice

**Statement:** Documentation shall state that **server-side** authorization beyond mock scope is **not** guaranteed (see BR-007).

**Parent BR:** BR-007  
**Priority:** Should  

---

## 12. Consolidated requirements matrix (quick reference)

| ID | One-line summary | BR |
|----|------------------|-----|
| REQ-FR-000 | SPA localhost default | BR-010 |
| REQ-FR-001–005 | Login UX and gate | BR-001 |
| REQ-FR-010–014 | Nav + logout | BR-011, BR-012, BR-013 |
| REQ-FR-020–023 | Dashboard | BR-005, BR-008 |
| REQ-FR-030–035 | New trade | BR-002, BR-003 |
| REQ-FR-040–045 | Queue approve | BR-003, BR-004, BR-005 |
| REQ-FR-050–051 | Trade list | BR-005, BR-014 |
| REQ-FR-060 | Admin placeholder | BR-013 |
| REQ-NFR-001–005 | NFR set | BR-008–BR-010 |
| REQ-SEC-001–003 | Security/control | BR-006–BR-007, BR-012 |

---

## 13. Acceptance criteria by feature set

### 13.1 Authentication AC pack

- AC-A1: Maker login succeeds with documented credentials.  
- AC-A2: Checker login succeeds with documented credentials.  
- AC-A3: Invalid login shows error and does not expose trading menus.  

### 13.2 Trade capture AC pack

- AC-T1: User can complete a BUY or SELL path.  
- AC-T2: Price/total reflect async behavior.  
- AC-T3: GTC exposes expiration per rules.  
- AC-T4: Success toast appears on submit.  

### 13.3 Approval AC pack

- AC-Q1: Pending rows visible with correct columns.  
- AC-Q2: Approve removes row from pending set.  
- AC-Q3: Toast on approve.  

### 13.4 Reporting AC pack

- AC-R1: Dashboard excludes pending.  
- AC-R2: Trade list shows status and matched-with column.  
- AC-R3: Summary counts present.  

---

## 14. Interface assumptions

| Interface | Assumption |
|-----------|------------|
| Browser | Modern Chromium-based for automation |
| Backend | Mock services as implemented by Angular app |
| Time | Local workstation time adequate |

---

## 15. Dependencies and constraints

Same as BRD §4 dependencies; engineering SHALL treat REF-2 as behavioral baseline when source templates are unavailable in a given workspace.

---

## 16. Expanded functional scenarios (detailed)

### 16.1 Scenario SF-1 — Maker submits BUY

**Preconditions:** Maker authenticated on `/trade`.  
**Steps:** Select BUY; choose sector and ticker; enter quantity; select time in force; submit.  
**Expected:** Toast success; new pending visible in `/queue` when viewed by checker session.  
**Maps:** REQ-FR-030–034, REQ-FR-040.

### 16.2 Scenario SF-2 — Checker approves

**Preconditions:** Pending row exists.  
**Steps:** Checker opens `/queue`; click Approve on row.  
**Expected:** Toast; row leaves pending; dashboard can show approved row.  
**Maps:** REQ-FR-043–045, REQ-FR-020.

### 16.3 Scenario SF-3 — Dashboard loading

**Preconditions:** Maker authenticated.  
**Steps:** Navigate `/dashboard` with throttled network (optional test condition).  
**Expected:** Spinner observed before data.  
**Maps:** REQ-FR-023.

### 16.4 Scenario SF-4 — Navigation coverage

**Steps:** From navbar, open each Trading link; open Admin Users.  
**Expected:** No broken routes; navbar persists.  
**Maps:** REQ-FR-012, REQ-FR-013, REQ-FR-010.

### 16.5 Scenario SF-5 — Logout loop

**Steps:** Login → logout → attempt `/trade`.  
**Expected:** Redirect or login gate.  
**Maps:** REQ-FR-014, REQ-FR-005.

---

## 17. Data and state model (functional view)

| State | Description | Visible in |
|-------|-------------|------------|
| pending_approval | Awaiting checker | Queue |
| approved | Cleared for approved views | Dashboard (per rules), Trade list |
| Other status values | Implementation-defined for list | Trade list Status column |

---

## 18. Error catalog (expected behaviors)

| Condition | Expected UX |
|-----------|-------------|
| Bad password | Inline or banner error on login |
| Empty queue | Table empty; Pending: 0 |
| Approve failure (simulated) | Not specified in REF-2; if implemented, error toast |

---

## 19. Future functional backlog

- REQ-FR-FUT-01: Reject with reason  
- REQ-FR-FUT-02: Edit pending trade  
- REQ-FR-FUT-03: Bulk approve  

---

## 20. Appendices

### Appendix A — data-testid inventory (from REF-2)

| Testid | Context |
|--------|---------|
| trading-menu-trigger | Open Trading menu |
| nav-dashboard | Dashboard link |
| nav-new-trade | New Trade link |
| nav-trade-list | Trade List link |
| nav-queue | Approval Queue link |
| nav-admin-trigger | Open Admin menu |
| nav-user-list | Users link |
| navbar-logout | Logout |

### Appendix B — Mapping BR → primary FRS sections

| BR | Sections |
|----|----------|
| BR-001 | §3 |
| BR-002 | §6 |
| BR-003–BR-005 | §5, §7, §8 |
| BR-006 | §4, §11 |
| BR-011 | §4 |
| BR-012 | §4.1 logout |
| BR-013 | §9 |

---

## 21. Detailed requirement narratives (reference compendium)

*This section expands each REQ with duplicate-but-explicit narrative for audit workshops and printed Word volumes. It does not introduce new SHALL statements.*

### 21.1 REQ-FR-001 — Login fields (expanded)

**Stakeholder story:** As a trainee, I need visible credential fields so I understand where identity is asserted. ** Preconditions:** Browser on `/login`. ** Main flow:** Observe username, password, submit. ** Postconditions:** Controls ready for input. ** Parent BR:** BR-001. ** Verification method:** Manual or automated visual check. ** Common failures:** Missing submit button (S1 defect).

### 21.2 REQ-FR-002 — Maker login (expanded)

**Stakeholder story:** As a maker, I authenticate with `admin`/`admin` to enter capture workflows. ** Preconditions:** Logged out. ** Main flow:** Enter credentials; submit. ** Postconditions:** Navbar shows maker context. ** Parent BR:** BR-001, BR-006. ** Cross-reference:** Journey J-1 step 2 in BRD.

### 21.3 REQ-FR-003 — Checker login (expanded)

**Stakeholder story:** As a checker, I authenticate with documented checker credentials to perform approvals independently of maker sessions in training narratives. ** Parent BR:** BR-001, BR-006.

### 21.4 REQ-FR-004 — Invalid login (expanded)

**Stakeholder story:** As security-aware staff, I expect failed authentication to be obvious without exposing which field was wrong beyond a generic safe message. ** Parent BR:** BR-001.

### 21.5 REQ-FR-005 — Route guard (expanded)

**Stakeholder story:** As governance, I expect deep links to trading pages to fail closed to login when no session exists. ** Parent BR:** BR-001.

### 21.6 REQ-FR-010 — Navbar persistent (expanded)

**Orientation aid:** Global navigation reduces “lost in SPA” risk for demos. ** Parent BR:** BR-011.

### 21.7 REQ-FR-011 — Role display (expanded)

**Four-eyes pedagogy:** Visible role reinforces that approval persona differs from capture persona. ** Parent BR:** BR-006.

### 21.8 REQ-FR-012 — Trading menu (expanded)

**Automation note:** Click-based menus avoid hover flake in headless runners. ** Testids:** See Appendix A. ** Parent BR:** BR-011.

### 21.9 REQ-FR-013 — Admin menu (expanded)

**Future growth:** Users route reserved though placeholder page may be minimal. ** Parent BR:** BR-013.

### 21.10 REQ-FR-014 — Logout (expanded)

**Session hygiene:** Terminates training session cleanly. ** Parent BR:** BR-012.

### 21.11 REQ-FR-020 — Dashboard approved-only (expanded)

**Reporting integrity:** Trainees must not confuse pending work with closed approved history on summary tiles. ** Parent BR:** BR-005. ** Conflict test:** Create pending; assert absent on dashboard until approved.

### 21.12 REQ-FR-021 — Dashboard columns (expanded)

**Column rationale:** TxID supports call-outs in class; Ticker and Quantity support mental model; Total supports notional discussion.

### 21.13 REQ-FR-022 — Total count (expanded)

**KPI pedagogy:** Simple aggregate trains eye toward volume without BI tooling.

### 21.14 REQ-FR-023 — Loading spinner (expanded)

**UX honesty:** Async fetch acknowledged; avoids false “empty” conclusions during slow networks.

### 21.15 REQ-FR-030 — New trade fields (expanded)

**Capture completeness:** Side, sector, ticker, account, quantity, TIF mirror classroom vocabulary. ** Parent BR:** BR-002.

### 21.16 REQ-FR-031 — Price and total (expanded)

**Economic intuition:** Links quantity to notional exposure in simplified form.

### 21.17 REQ-FR-032 — GTC disclosure (expanded)

**Time horizon:** Introduces Good-Til-Cancelled concept for advanced cohorts.

### 21.18 REQ-FR-033 — Submit (expanded)

**Workflow insertion:** Submission is the business act that creates pending obligation for checker in mock narrative.

### 21.19 REQ-FR-034 — Toast on submit (expanded)

**Feedback loop:** Confirms system received intent; critical for demo polish.

### 21.20 REQ-FR-035 — Validation (expanded)

**Data quality:** Prevents garbage rows that would undermine class discussion.

### 21.21 REQ-FR-040 — Queue filter (expanded)

**Workbench:** Checker sees only actionable pending rows. ** Parent BR:** BR-003.

### 21.22 REQ-FR-041 — Queue columns (expanded)

**Inspection:** Enough data to decide approve in toy world.

### 21.23 REQ-FR-042 — Pending count (expanded)

**Workload signal:** Mirrors operational dashboards at toy scale.

### 21.24 REQ-FR-043 — Approve action (expanded)

**Control point:** Distinct click commits checker decision.

### 21.25 REQ-FR-044 — Approve toast (expanded)

**Acknowledgement:** Confirms action registered.

### 21.26 REQ-FR-045 — State transition (expanded)

**Lifecycle:** Pending becomes approved; visible downstream.

### 21.27 REQ-FR-050 — Trade list (expanded)

**Blotter pedagogy:** Status and Matched With support paired-trade storytelling. ** Parent BR:** BR-014.

### 21.28 REQ-FR-051 — Summary bar (expanded)

**Aggregate literacy:** Multiple counters teach reconciliation thinking.

### 21.29 REQ-FR-060 — Admin placeholder (expanded)

**Roadmap:** Signals enterprise completeness without delivering full IAM.

### 21.30 REQ-NFR-001 — Local operability (expanded)

**Lab safety:** Avoids cloud coupling for foundational PoC.

### 21.31 REQ-NFR-002 — data-testid (expanded)

**Sustainable automation:** Single attribute contract per locator_strategy.md.

### 21.32 REQ-NFR-003 — Responsiveness (expanded)

**Laptop-first:** Classroom projectors and trainee laptops.

### 21.33 REQ-NFR-004 — Error UX (expanded)

**Trust:** Errors should instruct not panic.

### 21.34 REQ-NFR-005 — Performance PoC (expanded)

**Expectation management:** No enterprise SLA; avoid hang perception.

### 21.35 REQ-SEC-001 — Role labeling (expanded)

**Transparency:** Supports challenge “who am I acting as?”

### 21.36 REQ-SEC-002 — Session termination (expanded)

**Clean break:** Logout must mean re-auth for protected routes in PoC scope.

### 21.37 REQ-SEC-003 — Limitation notice (expanded)

**Anti-misinformation:** Pedagogical separation ≠ bank-grade preventive controls.

---

## 22. Gherkin-style illustrations (non-normative)

```gherkin
Feature: Maker submits and checker approves
  Scenario: Happy path
    Given a maker is logged in
    When the maker submits a valid BUY trade
    Then a success toast is shown
    And a checker sees the trade in the approval queue
```

```gherkin
Feature: Dashboard reporting
  Scenario: Pending hidden
    Given a trade is pending approval
    When a user views the dashboard
    Then the pending trade is not listed in the dashboard table
```

*Normative requirements remain the SHALL statements in §2–§11.*

---

## 23. Field-level interface specification (consolidated table)

*Derived from REF-2. If implementation diverges, FRS errata shall be filed.*

### 23.1 Login (`/login`)

| Element | Behavior | REQ |
|---------|----------|-----|
| Username field | Text entry | REQ-FR-001 |
| Password field | Masked entry | REQ-FR-001 |
| Submit | Posts credentials | REQ-FR-002–004 |
| Error region | Visible on failure | REQ-FR-004 |

### 23.2 Dashboard (`/dashboard`)

| Element | Behavior | REQ |
|---------|----------|-----|
| Table | Approved rows only | REQ-FR-020 |
| Columns | TxID, Ticker, Quantity, Total | REQ-FR-021 |
| Total label | Dynamic count | REQ-FR-022 |
| Spinner | During load | REQ-FR-023 |

### 23.3 New Trade (`/trade`)

| Element | Behavior | REQ |
|---------|----------|-----|
| Side | BUY/SELL | REQ-FR-030 |
| Sector | Selection | REQ-FR-030 |
| Ticker | Triggers price fetch | REQ-FR-031 |
| Account Type | Selection | REQ-FR-030 |
| Quantity | Numeric | REQ-FR-030 |
| Time in Force | Drives GTC date visibility | REQ-FR-032 |
| Expiration Date | Conditional | REQ-FR-032 |
| Current Price | Display | REQ-FR-031 |
| Total Value | Display | REQ-FR-031 |
| Submit | Persist workflow | REQ-FR-033 |
| Toast | Success | REQ-FR-034 |

### 23.4 Approval Queue (`/queue`)

| Element | Behavior | REQ |
|---------|----------|-----|
| Table | `pending_approval` | REQ-FR-040 |
| Columns | TxID, Side, Ticker, Qty, Price, Total | REQ-FR-041 |
| Pending label | Count | REQ-FR-042 |
| Approve | Per row | REQ-FR-043 |
| Toast | On approve | REQ-FR-044 |

### 23.5 Trade List (`/trades`)

| Element | Behavior | REQ |
|---------|----------|-----|
| Table columns | Incl. Status, Matched With | REQ-FR-050 |
| Summary bar | Totals / matched / pending counts | REQ-FR-051 |

### 23.6 Global navbar

| Element | Testid (REF-2) | REQ |
|---------|----------------|-----|
| Trading trigger | `trading-menu-trigger` | REQ-FR-012 |
| Dashboard link | `nav-dashboard` | REQ-FR-012 |
| New Trade link | `nav-new-trade` | REQ-FR-012 |
| Trade List link | `nav-trade-list` | REQ-FR-012 |
| Queue link | `nav-queue` | REQ-FR-012 |
| Admin trigger | `nav-admin-trigger` | REQ-FR-013 |
| Users link | `nav-user-list` | REQ-FR-013 |
| Logout | `navbar-logout` | REQ-FR-014 |

---

## 24. Test condition catalog (for QA scripting)

| TC_Ref | Preconditions | Steps summary | Expected | REQ |
|--------|---------------|---------------|----------|-----|
| TC-LGN-01 | On login | Enter valid maker creds | Authenticated | FR-002 |
| TC-LGN-02 | On login | Enter invalid creds | Error | FR-004 |
| TC-NAV-01 | Authenticated | Open each Trading link | Pages load | FR-012 |
| TC-TRD-01 | On trade | Full BUY submit | Toast; pending | FR-033–034 |
| TC-QU-01 | Pending exists | Approve | Toast; off queue | FR-043–045 |
| TC-DSH-01 | Approved exists | View dashboard | Row visible | FR-020 |

---

## 25. Change impact analysis template

| Change | Impacted REQ | Impacted BR | Retest suite |
|--------|--------------|-------------|--------------|
| New column on queue | FR-041 | BR-004 | S-1, S-2 |
| Dashboard filter logic | FR-020 | BR-005 | S-1 |

---

## 26. Assumptions and dependencies (duplicate for signatories)

1. Browser ECMAScript features supported by current Angular build.  
2. Clock skew irrelevant.  
3. No multi-tab session synchronization requirement unless added.  
4. REF-2 maintained alongside code or superseded formally.

---

## 27. Acronym list

| Acronym | Expansion |
|---------|-----------|
| BRD | Business Requirements Document |
| FRS | Functional Requirements Specification |
| GTC | Good-Til-Cancelled |
| TIF | Time in Force |
| TDS | Test Design Specification |
| RTM | Requirements Traceability Matrix |
| SUT | System Under Test |
| UI | User Interface |
| UX | User Experience |
| NFR | Non-Functional Requirement |

---

## 28. Document approval block (informative)

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | | | |
| Technical reviewer | | | |
| QA reviewer | | | |

---

## 29. Pairwise & combinatorial test design (SUT)

*Technique: reduce exhaustive field combinations while covering **pairs** of high-variance dimensions. Primary dimensions for `/trade`: **Side**, **Time in Force (TIF)**, **Account Type** (if enumerated in SUT), **Ticker class** (e.g. liquid vs illiquid if seeded). Below is a **documented** pairwise set; extend when FRS adds enums.*

### 29.1 Pairwise table — Side × TIF (minimum 6 rows)

| Case | Side | TIF | Expect GTC date field | REQ |
|------|------|-----|------------------------|-----|
| PW-01 | BUY | DAY | Hidden or non-GTC behavior | FR-032 |
| PW-02 | BUY | GTC | Visible | FR-032 |
| PW-03 | SELL | DAY | Hidden or non-GTC | FR-032 |
| PW-04 | SELL | GTC | Visible | FR-032 |
| PW-05 | BUY | IOC | Per implementation | FR-032 |
| PW-06 | SELL | IOC | Per implementation | FR-032 |

*If IOC is not implemented, mark PW-05/06 N/A and substitute next TIF variant from SUT.*

### 29.2 Orthogonal array L9 (conceptual) — 3 factors × 3 levels

*Use when three factors each have three levels; illustrative for test planning courses.*

| Run | Factor A (Side) | Factor B (TIF) | Factor C (Qty band) |
|-----|-----------------|----------------|---------------------|
| OA-1 | BUY | DAY | Small |
| OA-2 | BUY | GTC | Medium |
| OA-3 | BUY | IOC | Large |
| OA-4 | SELL | DAY | Medium |
| OA-5 | SELL | GTC | Large |
| OA-6 | SELL | IOC | Small |
| OA-7 | (repeat) | — | — |
| OA-8 | (repeat) | — | — |
| OA-9 | (repeat) | — | — |

*Trim runs to match real SUT enums; this annex teaches **test reduction**, not mandating nine runs.*

### 29.3 Decision table — GTC expiration visibility

| TIF selected | Expiration control | REQ |
|--------------|-------------------|-----|
| GTC | SHALL show | FR-032 |
| Not GTC | SHALL NOT require (or hide) | FR-032 |
| Unknown / default | Document SUT behavior | FR-032 |

---

## 30. JIRA-ready technical stories (copy-paste)

*Each block maps to **REQ-** for RTM. Replace project key as needed.*

### TKT-QAMVP-101 — [REQ-FR-001,002,003] Login UI and successful auth

**Description:**  
Implement/verify login page with username, password, submit. Support maker (`admin`/`admin`) and checker (`checker`/`chscker@123`) per REF-2.

**Acceptance criteria (technical):**  
- [ ] REQ-FR-001: Fields and submit present  
- [ ] REQ-FR-002: Maker session established  
- [ ] REQ-FR-003: Checker session established  
- [ ] REQ-FR-011: Role surfaced in navbar (linked story)

**FRS:** §3 · **BR:** BR-001, BR-006

---

### TKT-QAMVP-102 — [REQ-FR-004,005] Invalid login & route guard

**Acceptance criteria:**  
- [ ] REQ-FR-004: Error on bad creds  
- [ ] REQ-FR-005: Unauthenticated access blocked  

**FRS:** §3 · **BR:** BR-001

---

### TKT-QAMVP-110 — [REQ-FR-010,011,012] Navbar & Trading menu

**Acceptance criteria:**  
- [ ] REQ-FR-010: Navbar after login  
- [ ] REQ-FR-011: User + role  
- [ ] REQ-FR-012: Click dropdown; `nav-dashboard`, `nav-new-trade`, `nav-trade-list`, `nav-queue`  

**FRS:** §4.1 · **BR:** BR-011

---

### TKT-QAMVP-131 — [REQ-FR-030–034] Trade capture

**Acceptance criteria:**  
- [ ] REQ-FR-030: All fields present  
- [ ] REQ-FR-031: Async price + total  
- [ ] REQ-FR-032: GTC → expiration  
- [ ] REQ-FR-033: Submit  
- [ ] REQ-FR-034: Toast  

**FRS:** §6 · **BR:** BR-002, BR-003

---

### TKT-QAMVP-141 — [REQ-FR-040–045] Queue & approve

**Acceptance criteria:**  
- [ ] REQ-FR-040: pending_approval filter  
- [ ] REQ-FR-041–042: Columns + count  
- [ ] REQ-FR-043–044: Approve + toast  
- [ ] REQ-FR-045: State transition  

**FRS:** §7 · **BR:** BR-003–BR-005

---

## 31. Expanded test condition catalog (TC-XXX)

| TC_ID | REQ | Preconditions | Steps | Expected |
|-------|-----|---------------|-------|----------|
| TC-001 | FR-001 | /login | Observe UI | Fields + button |
| TC-002 | FR-002 | /login | Maker login | Authenticated |
| TC-003 | FR-003 | /login | Checker login | Authenticated |
| TC-004 | FR-004 | /login | Bad password | Error |
| TC-005 | FR-005 | Logged out | Hit /dashboard | Gate |
| TC-006 | FR-010 | Logged in | Load page | Navbar |
| TC-007 | FR-011 | Logged in | Read navbar | Role text |
| TC-008 | FR-012 | Logged in | Open Trading menu | Links work |
| TC-009 | FR-013 | Logged in | Open Admin | Users link |
| TC-010 | FR-014 | Logged in | Logout | /login |
| TC-011 | FR-020 | Approved exists | Dashboard | No pending |
| TC-012 | FR-021 | Dashboard loaded | Check headers | 4 cols |
| TC-013 | FR-022 | Dashboard loaded | Compare N | Matches rows |
| TC-014 | FR-023 | Slow network (opt) | Load dashboard | Spinner |
| TC-015 | FR-030 | /trade | Field sweep | All present |
| TC-016 | FR-031 | /trade | Pick ticker | Price updates |
| TC-017 | FR-032 | /trade | Toggle TIF | Expiration |
| TC-018 | FR-033 | /trade | Submit | Pending |
| TC-019 | FR-034 | /trade | Submit | Toast |
| TC-020 | FR-035 | /trade | Invalid submit | Validation |
| TC-021 | FR-040 | /queue | Pending rows | Filter |
| TC-022 | FR-041 | /queue | Row | Columns |
| TC-023 | FR-042 | /queue | Count | Pending N |
| TC-024 | FR-043 | /queue | Click Approve | Action |
| TC-025 | FR-044 | /queue | Approve | Toast |
| TC-026 | FR-045 | /queue + dash | Approve then dash | Visible |
| TC-027 | FR-050 | /trades | Load | Columns |
| TC-028 | FR-051 | /trades | Summary | 3 metrics |
| TC-029 | FR-060 | /admin/users | Load | Placeholder OK |
| TC-030 | NFR-001 | Dev machine | Start app | Local |
| TC-031 | NFR-002 | Any page | Inspect | testids |
| TC-032 | NFR-003 | Resize | Layout | Usable |
| TC-033 | NFR-004 | Bad login | Message | Clear |
| TC-034 | NFR-005 | Timer | Interaction | < few s |
| TC-035 | SEC-001 | Login | Role | Shown |
| TC-036 | SEC-002 | Logout | /trade | Blocked |
| TC-037 | SEC-003 | Review | Docs | Stated |
| TC-038 | FR-012 | Keyboard (opt) | Menu | Accessible |
| TC-039 | FR-031 | /trade | Change qty | Total |
| TC-040 | FR-040 | No pending | Queue | Empty |
| TC-041 | FR-043 | Multi pending | Approve one | Others remain |
| TC-042 | FR-020 | Mixed state | Dashboard | Approved only |
| TC-043 | FR-050 | Approved | Status col | Populated |
| TC-044 | FR-051 | /trades | Counts | Consistent |
| TC-045 | FR-014 | Double logout | /login | Stable |

---

## 32. State transition matrix (pending → approved)

| From | Event | To | REQ |
|------|-------|-----|-----|
| (none) | Maker submit | pending_approval | FR-033 |
| pending_approval | Checker approve | approved | FR-045 |
| pending_approval | (reject N/A) | — | Future |
| approved | View dashboard | visible row | FR-020 |

---

## 33. Negative & edge inventory

| ID | Condition | Expected | REQ |
|----|-----------|----------|-----|
| N-01 | Empty ticker submit | Validation or block | FR-035 |
| N-02 | Zero quantity | Validation | FR-035 |
| N-03 | Approve with no session | Redirect login | FR-005 |
| N-04 | Double submit spam | Single pending or idempotent per SUT | FR-033 |
| N-05 | Concurrent maker/checker same browser | Last session wins — document | SEC-002 |

---

## 34. Requirements volatility log (template)

| Date | REQ | Change | Impacted TC |
|------|-----|--------|-------------|
| | | | |

---

## 35. Sign-off matrix (multi-party)

| REQ range | Dev | QA | Product |
|-----------|-----|-----|---------|
| FR-001–005 | | | |
| FR-010–014 | | | |
| FR-020–023 | | | |
| FR-030–035 | | | |
| FR-040–045 | | | |
| FR-050–051 | | | |
| FR-060 | | | |
| NFR / SEC | | | |

---

## 36. Pairwise coverage matrix — Navigation × Role

*Ensures menu coverage does not only use maker session.*

| Run | Role | Menu action | Target route | REQ |
|-----|------|-------------|--------------|-----|
| PN-01 | Maker | Trading → Dashboard | /dashboard | FR-012 |
| PN-02 | Maker | Trading → New Trade | /trade | FR-012 |
| PN-03 | Maker | Trading → Trade List | /trades | FR-012 |
| PN-04 | Maker | Trading → Queue | /queue | FR-012 |
| PN-05 | Checker | Trading → Dashboard | /dashboard | FR-012 |
| PN-06 | Checker | Trading → Queue | /queue | FR-012 |
| PN-07 | Maker | Admin → Users | /admin/users | FR-013 |
| PN-08 | Checker | Admin → Users | /admin/users | FR-013 |

---

## 37. Pairwise coverage — Approve × Pending count

| Run | Pending rows | Approve index | Expected remaining |
|-----|--------------|---------------|--------------------|
| PA-01 | 1 | first | 0 |
| PA-02 | 2 | first | 1 |
| PA-03 | 2 | second | 0 after second action |
| PA-04 | 0 | n/a | Empty table FR-040 |

---

## 38. Mock service contract (informative — no wire protocol guarantee)

*The Angular SUT may call REST or in-memory services; this annex states **observable** expectations for testers.*

| Operation | Observable effect | REQ |
|-----------|-------------------|-----|
| Login POST | Session cookie/token; redirect | FR-002–003 |
| Trade POST | Toast; pending in queue | FR-033–034, FR-040 |
| Approve POST | Toast; row removed | FR-043–045 |
| Dashboard GET | Spinner then rows | FR-023, FR-020 |
| Price GET | Updates Current Price | FR-031 |

---

## 39. Extended TC catalog (TC-046 — TC-090)

| TC_ID | REQ | Steps summary |
|-------|-----|---------------|
| TC-046 | FR-002 | Maker login ×3 sessions stability |
| TC-047 | FR-003 | Checker login ×3 |
| TC-048 | FR-004 | Random string password |
| TC-049 | FR-005 | /trade direct |
| TC-050 | FR-005 | /queue direct |
| TC-051 | FR-005 | /trades direct |
| TC-052 | FR-005 | /admin/users direct |
| TC-053 | FR-012 | Open/close menu twice |
| TC-054 | FR-012 | Navigate order D→T→Q→L |
| TC-055 | FR-012 | Navigate order L→Q→T→D |
| TC-056 | FR-014 | Login→logout→login |
| TC-057 | FR-020 | Approve then refresh dashboard |
| TC-058 | FR-023 | Rapid navigate dashboard |
| TC-059 | FR-031 | Ticker change clears then reloads price |
| TC-060 | FR-032 | All TIF options if >2 |
| TC-061 | FR-034 | Toast dismiss or timeout |
| TC-062 | FR-035 | Max quantity boundary |
| TC-063 | FR-035 | Min quantity boundary |
| TC-064 | FR-041 | Sort order (if implemented) |
| TC-065 | FR-042 | Approve decrements N |
| TC-066 | FR-050 | Scroll long list |
| TC-067 | FR-051 | Refresh trades page |
| TC-068 | NFR-002 | Sample 10 random testids exist |
| TC-069 | NFR-004 | Network offline message (if any) |
| TC-070 | SEC-002 | Session after browser back |
| TC-071 | FR-030 | SELL full path |
| TC-072 | FR-030 | BUY full path |
| TC-073 | FR-031 | Quantity 1 |
| TC-074 | FR-031 | Quantity 99999 |
| TC-075 | FR-043 | Approve last row first |
| TC-076 | FR-045 | Verify trade list after approve |
| TC-077 | FR-051 | Matched count changes |
| TC-078 | FR-060 | Back from users |
| TC-079 | FR-011 | Role string contains maker or checker |
| TC-080 | FR-010 | Navbar on each route |
| TC-081 | PW-01 | Pairwise row execution |
| TC-082 | PW-02 | Pairwise row execution |
| TC-083 | PW-03 | Pairwise row execution |
| TC-084 | PW-04 | Pairwise row execution |
| TC-085 | PN-01 | Nav pairwise |
| TC-086 | PN-05 | Nav pairwise checker |
| TC-087 | PA-01 | Approve pairwise |
| TC-088 | PA-02 | Approve pairwise |
| TC-089 | PA-03 | Approve pairwise |
| TC-090 | PA-04 | Empty queue |

---

## 40. Requirement-to-testcase density (metrics)

| REQ group | REQ count | Min TC (this annex) |
|-----------|-----------|---------------------|
| Login | 5 | TC-001–005, 048–052 |
| Nav | 5 | TC-006–010, 053–056, 080, 085–086 |
| Dashboard | 4 | TC-011–014, 057–058 |
| Trade | 6 | TC-015–020, 059–063, 071–074, 081–084 |
| Queue | 6 | TC-021–026, 063–065, 075, 087–089 |
| List | 2 | TC-027–028, 066–067, 076–077 |
| Admin | 1 | TC-029, 078 |
| NFR | 5 | TC-030–034, 068–069 |
| SEC | 3 | TC-035–037, 070 |

---

## 41. Gherkin feature pack (expanded, non-normative)

```gherkin
Feature: Login and role display
  Scenario Outline: Successful login
    Given the login page is displayed
    When the user logs in as <role>
    Then the navbar shows an authenticated <role> context
    Examples:
      | role   |
      | maker  |
      | checker |
```

```gherkin
Feature: Approval queue
  Scenario: Pending trade appears for checker
    Given a maker has submitted a trade
    And the trade is in pending_approval state
    When the checker opens the approval queue
    Then the trade row is visible
    And the pending count is at least 1
```

```gherkin
Feature: Dashboard filtering
  Scenario: Pending trade hidden from dashboard
    Given a trade exists in pending_approval state
    When the user opens the dashboard
    Then the pending trade is not in the dashboard table
```

---

## 42. Compatibility statement (browser)

**Target:** Chromium-based automation. **Other browsers:** Best-effort; defects logged against REQ-NFR-003 / NFR-004 if severe.

---

## 43. Document size maintenance

When REQ IDs grow, extend §31 and §39; regenerate `.docx`; update [06-requirements-traceability-matrix.md](06-requirements-traceability-matrix.md) and `build_sdlc_tracker.py` row lists.

---

## 44. Master manual procedure — smoke path (numbered steps)

**Procedure ID:** MAN-SMOKE-001 · **Estimated duration:** 20 minutes · **Environment:** ENV-LOCAL-01  

1. Open browser to `/login`.  
2. Verify username field present (REQ-FR-001).  
3. Verify password field present.  
4. Verify submit control present.  
5. Enter maker username `admin`.  
6. Enter maker password `admin`.  
7. Submit login.  
8. Verify authenticated shell (REQ-FR-002).  
9. Verify navbar visible (REQ-FR-010).  
10. Note role text contains maker concept (REQ-FR-011).  
11. Click Trading menu trigger.  
12. Click New Trade (REQ-FR-012).  
13. Verify `/trade` loaded.  
14. Select Side BUY (REQ-FR-030).  
15. Select Sector per SUT options.  
16. Select or enter Ticker; wait for price (REQ-FR-031).  
17. Select Account Type.  
18. Enter Quantity `10`.  
19. Select Time in Force; if GTC, verify expiration field visibility (REQ-FR-032).  
20. Observe Current Price non-empty when applicable.  
21. Observe Total Value consistent with quantity × price.  
22. Submit trade (REQ-FR-033).  
23. Verify success toast (REQ-FR-034).  
24. Click Trading → Approval Queue.  
25. Verify pending row exists (REQ-FR-040).  
26. Verify Pending count ≥ 1 (REQ-FR-042).  
27. Click Logout (REQ-FR-014).  
28. Verify login page.  
29. Login as checker `checker` / `chscker@123` (REQ-FR-003).  
30. Open Approval Queue.  
31. Locate prior trade row.  
32. Click Approve on row (REQ-FR-043).  
33. Verify approve toast (REQ-FR-044).  
34. Verify Pending count decremented (REQ-FR-042).  
35. Open Trading → Dashboard.  
36. Verify approved trade appears per rules (REQ-FR-020).  
37. Verify Total Trades count (REQ-FR-022).  
38. Open Trade List.  
39. Verify row with Status / Matched With columns (REQ-FR-050).  
40. Verify summary bar metrics (REQ-FR-051).  
41. Open Admin → Users (REQ-FR-013).  
42. Verify placeholder acceptable (REQ-FR-060).  
43. Logout.  
44. Attempt `/dashboard` directly (REQ-FR-005).  
45. Verify login or gate.  
46. **Pass** if all expectations met; else log defect with REQ ID.

**Extensions (repeat MAN-SMOKE-001 with variations):**  
- Run steps 14–23 with Side SELL.  
- Run steps 19 with each TIF option (REQ-FR-032 matrix §29).  
- Run steps 27–36 with two pending rows (PA-02, PA-03).

---

## 45. Design rationale appendix (per REQ, engineering + QA)

| REQ | Why this requirement exists | Failure mode if omitted |
|-----|----------------------------|-------------------------|
| FR-001 | Without visible fields, auth cannot be exercised | Blocks all journeys |
| FR-002 | Maker is primary capture persona | No trade entry story |
| FR-003 | Checker independence | Four-eyes story collapses |
| FR-004 | Unsafe UX implies false confidence | Training backfires |
| FR-005 | Deep links are real attack/UX vector | Skipped login |
| FR-010 | Users get lost in SPA | Abandoned demos |
| FR-011 | Role confusion undermines BR-006 | Wrong lessons |
| FR-012 | Menus must be automation-stable | Flaky CI |
| FR-013 | Admin path reserved | Dead link breaks trust |
| FR-014 | Session must end cleanly | Shared-kiosk risk |
| FR-020 | Dashboard/pending confusion | BR-005 violated |
| FR-021 | Columns enable verbal audit | Silent data |
| FR-022 | Count supports exercises | Math distrust |
| FR-023 | Async honesty | False empty |
| FR-030 | Capture needs minimal set | Incomplete trades |
| FR-031 | Notional risk teaching | Meaningless qty |
| FR-032 | TIF literacy | Hidden expiry |
| FR-033 | No submit = no workflow | Dead demo |
| FR-034 | No feedback = double submit | Noise |
| FR-035 | Garbage in breaks class | Derailed debrief |
| FR-040 | Queue must be actionable | Checker blind |
| FR-041 | Columns for inspection | Approve blindness |
| FR-042 | Workload signal | Anxiety |
| FR-043 | Distinct approve act | Ambiguous consent |
| FR-044 | Acknowledgement | Uncertainty |
| FR-045 | Lifecycle integrity | Ghost state |
| FR-050 | Blotter pedagogy | No reconciliation |
| FR-051 | Aggregate literacy | No totals |
| FR-060 | Future IAM | — |
| NFR-001 | Lab-first PoC | Cloud blocker |
| NFR-002 | Sustainable automation | XPath hell |
| NFR-003 | Laptop variance | Layout breaks |
| NFR-004 | Trust in errors | Confusion |
| NFR-005 | Hang perception | “Broken” narrative |
| SEC-001 | Accountability | Role repudiation |
| SEC-002 | Session boundary | Hijack feel |
| SEC-003 | Honest scope | Compliance overclaim |

---

## 46. TC-091 — TC-120 catalog (continuation)

| TC_ID | REQ | Steps summary |
|-------|-----|---------------|
| TC-091 | FR-012 | Tab key through menu |
| TC-092 | FR-014 | Session timeout (if any) |
| TC-093 | FR-020 | Filter discussion only |
| TC-094 | FR-031 | Rapid ticker switch |
| TC-095 | FR-040 | Refresh queue page |
| TC-096 | FR-043 | Double-click approve guard |
| TC-097 | FR-050 | Export discussion (N/A) |
| TC-098 | FR-051 | Zero trades state |
| TC-099 | NFR-002 | Duplicate testid scan |
| TC-100 | SEC-002 | Close browser reopen |
| TC-101 | FR-030 | Long sector name (if allowed) |
| TC-102 | FR-035 | Non-numeric quantity |
| TC-103 | FR-004 | Blank password |
| TC-104 | FR-004 | Blank username |
| TC-105 | FR-005 | Bookmark /login then navigate |
| TC-106 | FR-012 | Mobile width 375px |
| TC-107 | FR-023 | Cancel navigation mid-load |
| TC-108 | FR-034 | Multiple toasts sequence |
| TC-109 | FR-045 | Approve all pending |
| TC-110 | FR-051 | Pending count zero |
| TC-111 | FR-060 | Direct URL users |
| TC-112 | FR-011 | Unicode username (if supported) |
| TC-113 | FR-031 | Price zero handling |
| TC-114 | FR-032 | TIF default value |
| TC-115 | FR-041 | Column order |
| TC-116 | FR-042 | Large N display |
| TC-117 | FR-050 | Matched With empty |
| TC-118 | FR-014 | Logout from each page |
| TC-119 | FR-012 | Keyboard Enter on menu |
| TC-120 | MAN-SMOKE-001 | Full procedure twice |

---

## 47. Observable assertions cheat-sheet (automation)

| Screen | Observable | XPath style |
|--------|------------|-------------|
| Login | Error banner | `data-testid` per store |
| Trade | Toast | text contains success |
| Queue | Row count | table row count |
| Dashboard | Spinner absent | not visible |

*Authoritative locators: `test_data/locators.xlsx`.*

---

*End of FRS. Test design: [03-test-design-specification.md](03-test-design-specification.md).*
