# Test Design Specification (TDS)

**Document ID:** QAMVP-TDS-001  
**Version:** 0.1  
**Date:** 2026-04-22  

**Related:** [BRD](01-business-requirements-document.md) · [FRS](02-functional-requirements-specification.md) · [RTM](06-requirements-traceability-matrix.md) · [README](README.md)

---

## 1. Introduction

### 1.1 Purpose

This Test Design Specification defines **what** will be tested, **how** (technique and level), **priority**, and **traceability** from **REQ-*** in the [FRS](02-functional-requirements-specification.md) and **BR-*** in the [BRD](01-business-requirements-document.md).

### 1.2 Scope of testing

In scope: all REQ-FR, REQ-NFR, REQ-SEC listed in FRS v0.1 for the mock trading SUT. Out of scope: performance benchmarking beyond qualitative observation, production security pen-test.

### 1.3 Test levels

| Level | Description | Tooling (repo context) |
|-------|-------------|------------------------|
| System UI | End-to-end through browser | Java Selenium engine executing JSON scripts |
| Exploratory | Ad hoc session | Manual |
| Repair validation | Locator/DOM drift | Playwright snapshots per LOCATOR_REPAIR.md |

---

## 2. Traceability and tagging

### 2.1 Tags

| Tag | Meaning |
|-----|---------|
| @smoke | Minimal path for CI gate |
| @regression | Full suite candidate |
| @maker | Requires maker session |
| @checker | Requires checker session |
| @nav | Navigation / menu |
| @negative | Error path |

### 2.2 ID reference convention

Each test condition cites **FRS §** and **REQ-**; business intent cites **BRD §** or **BR-** where useful.

---

## 3. Test design by requirement

### TD-REQ-FR-001 — Login fields

| Field | Value |
|-------|-------|
| **REQ** | REQ-FR-001 |
| **FRS** | §3.1 |
| **BR** | BR-001 |
| **Objective** | Verify username, password, submit present |
| **Technique** | Automated UI |
| **Priority** | P1 |
| **Tags** | @smoke |
| **Preconditions** | `/login` |
| **Steps** | Open login; assert three controls |
| **Expected** | All visible/enabled |

### TD-REQ-FR-002 — Maker login

| **REQ** | REQ-FR-002 |
| **FRS** | §3 |
| **BR** | BR-001, BR-006 |
| **Priority** | P1 |
| **Tags** | @smoke @maker |
| **Expected** | Authenticated shell; role shows maker |

### TD-REQ-FR-003 — Checker login

| **REQ** | REQ-FR-003 |
| **Tags** | @smoke @checker |

### TD-REQ-FR-004 — Invalid login

| **REQ** | REQ-FR-004 |
| **Tags** | @negative |
| **Expected** | Error message; no trading access |

### TD-REQ-FR-005 — Route guard

| **REQ** | REQ-FR-005 |
| **Tags** | @regression @negative |

### TD-REQ-FR-010 to REQ-FR-014 — Navigation & logout

| REQ | Focus |
|-----|-------|
| REQ-FR-010 | Navbar after login |
| REQ-FR-011 | User + role |
| REQ-FR-012 | Click Trading dropdown + four links |
| REQ-FR-013 | Admin + Users |
| REQ-FR-014 | Logout → login |

**Tags:** @nav @regression

### TD-REQ-FR-020 to REQ-FR-023 — Dashboard

| REQ | Focus |
|-----|-------|
| REQ-FR-020 | No pending rows |
| REQ-FR-021 | Column headers |
| REQ-FR-022 | Total count |
| REQ-FR-023 | Loading spinner |

**Tags:** @regression @maker (or either role per access)

### TD-REQ-FR-030 to REQ-FR-035 — New trade

| REQ | Focus |
|-----|-------|
| REQ-FR-030 | Field presence |
| REQ-FR-031 | Price + total |
| REQ-FR-032 | GTC shows expiration |
| REQ-FR-033 | Submit |
| REQ-FR-034 | Toast |
| REQ-FR-035 | Validation |

**Tags:** @regression @maker

**Example data:** Use `test_data` defaults where present; tickers per orchestrator docs.

### TD-REQ-FR-040 to REQ-FR-045 — Queue

| REQ | Focus |
|-----|-------|
| REQ-FR-040 | pending_approval only |
| REQ-FR-041 | Columns |
| REQ-FR-042 | Pending count |
| REQ-FR-043 | Approve button |
| REQ-FR-044 | Toast |
| REQ-FR-045 | Leaves queue |

**Tags:** @regression @checker @smoke (subset)

### TD-REQ-FR-050 to REQ-FR-051 — Trade list

**Tags:** @regression

### TD-REQ-FR-060 — Admin placeholder

**Priority** | P3  
**Tags** | @regression

### TD-REQ-NFR-001 to REQ-NFR-005

| REQ | Test approach |
|-----|---------------|
| NFR-001 | Local run checklist |
| NFR-002 | Scan DOM for data-testid on key controls |
| NFR-003 | Resize viewport manual |
| NFR-004 | Negative path UX |
| NFR-005 | Informal timing |

### TD-REQ-SEC-001 to REQ-SEC-003

| REQ | Test approach |
|-----|---------------|
| SEC-001 | Assert role string |
| SEC-002 | Logout + guarded route |
| SEC-003 | Doc review |

---

## 4. Scenario-based test suites

### Suite S-1 — Smoke (15 min target)

1. Login maker (REQ-FR-002)  
2. Open New Trade → submit minimal valid trade (REQ-FR-033, 034)  
3. Logout; login checker (REQ-FR-003)  
4. Open queue; approve one row (REQ-FR-043–045)  
5. Open dashboard; verify approved-only narrative (REQ-FR-020)  

**Traceability:** BR-001–BR-005; FRS §3–§8.

### Suite S-2 — Navigation regression

Iterate all navbar targets (REQ-FR-012, REQ-FR-013).

### Suite S-3 — Negative auth

Invalid login (REQ-FR-004); direct deep link without session (REQ-FR-005).

---

## 5. Test data strategy

Detailed field values: [07-test-data-environment-specification.md](07-test-data-environment-specification.md).  
Locators: `test_data/locators.xlsx` per repo.

Detailed executable test cases are maintained in `test_data/TestCases.xlsx` and mirrored into [09-test-case-repository.md](09-test-case-repository.md). That repository is the source for row-level test-case counts, step descriptions, expected outputs, and automation-ready test data.

---

## 6. Entry criteria for test execution

- SUT reachable at base URL.  
- Known credentials loaded.  
- Locator workbook present or repair run completed.

---

## 7. Exit criteria

- All P1 cases executed; no open S1 defects without waiver.  
- RTM updated for executed scope.

---

## 8. Roles and responsibilities

| Role | Responsibility |
|------|------------------|
| QA lead | Approves TDS, owns priority |
| Automation engineer | Maintains scripts |
| Developer | Fixes SUT defects |

---

## 9. Change history

| Ver | Date | Note |
|-----|------|------|
| 0.1 | 2026-04-22 | Initial |

---

## 10. Consolidated P1 test outline (smoke + regression backbone)

| Order | REQ bundle | Action summary |
|-------|------------|----------------|
| 1 | FR-002 | Maker login |
| 2 | FR-012 | Open New Trade via menu |
| 3 | FR-033, FR-034 | Submit trade |
| 4 | FR-014, FR-003 | Logout; checker login |
| 5 | FR-043–FR-045 | Approve pending |
| 6 | FR-020 | Dashboard shows approved |

## 11. Test data matrix (cross-reference)

| Scenario | Maker creds | Checker creds | Ticker | Side | Qty |
|----------|-------------|---------------|--------|------|-----|
| Smoke | admin/admin | checker/chscker@123 | per env | BUY | 10 |
| Negative auth | bad | bad | — | — | — |

Full detail: [07-test-data-environment-specification.md](07-test-data-environment-specification.md).

## 12. Environment matrix (execution)

| Env | Base URL | Owner |
|-----|----------|-------|
| ENV-LOCAL-01 | http://localhost:4200 | QA |

## 13. Defect triage hooks

When failing, capture: screenshot, console log, REQ ID, TKT ID, `data-testid` of element if applicable.

## 14. Automation JSON script conventions (repo)

Scripts under `test_data/generated-scripts/` should encode steps that map 1:N to TD blocks; validator enforces schema per `python-orchestrator` tooling.

## 15. Metrics

| Metric | Target |
|--------|--------|
| P1 automation coverage | ≥80% over time |
| Pass rate smoke | 100% pre-demo |

## 16. Dependencies

| Dependency | Impact |
|------------|--------|
| Locators workbook | Blocks script repair |
| SUT running | Blocks execution |

## 17. Training requirements for testers

- Read FRS §23 field tables.  
- Read locator_strategy.md.  
- Practice one manual J-1.

## 18. Escalation

S1 defect: notify dev within 4 business hours (PoC guideline).

## 19. Document history (detail)

| Ver | Editor | Sections touched |
|-----|--------|------------------|
| 0.1 | Program | All |

## 20. Approvals (informative)

| Role | Name | Date |
|------|------|------|
| QA Lead | | |

---

*Tracker linkage: [SDLC-Test-Tracker.xlsx](SDLC-Test-Tracker.xlsx)*
