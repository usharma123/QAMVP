# Test Plan

**Document ID:** QAMVP-TPLAN-001  
**Version:** 0.1  
**Date:** 2026-04-22  

**Related:** [Strategy](04-test-strategy.md) · [TDS](03-test-design-specification.md) · [RTM](06-requirements-traceability-matrix.md) · [Test Data](07-test-data-environment-specification.md)

---

## 1. Introduction

This **Test Plan** schedules and scopes execution for the mock trading SUT. It implements [04-test-strategy.md](04-test-strategy.md).

---

## 2. Features in scope

| Area | FRS sections | Priority |
|------|--------------|----------|
| Login | §3 | P1 |
| Navigation | §4 | P1 |
| Dashboard | §5 | P1 |
| New Trade | §6 | P1 |
| Queue | §7 | P1 |
| Trade List | §8 | P2 |
| Admin | §9 | P3 |
| NFR/SEC | §10–11 | P2–P3 |

---

## 3. Schedule (illustrative)

| Phase | Duration | Activities |
|-------|----------|------------|
| Test design review | 2 days | Walk TDS + RTM |
| Execution cycle 1 | 3 days | Smoke + P1 |
| Execution cycle 2 | 3 days | Regression |
| Closure | 1 day | Report + tracker update |

---

## 4. Resources

| Role | Count | Notes |
|------|-------|-------|
| QA engineer | 1 | Executes / maintains |
| Automation engineer | 0.5 FTE | Script repair |
| Dev | On demand | Defects |

---

## 5. Deliverables

| Deliverable | Location |
|-------------|----------|
| Results | `test_data/test-results/` (existing pattern) |
| Tracker | `SDLC-Test-Tracker.xlsx` |
| Defects | Per governance doc |

---

## 6. Entry criteria

- Build runs locally.  
- TDS v0.1 approved.  
- Test data sheet available.

---

## 7. Exit criteria

- ≥95% P1 cases Pass (waivers documented).  
- No open S1 defects.  
- RTM execution column updated.

---

## 8. Suspension / resumption

Suspend if SUT unavailable >4 hours; resume from last checkpoint in tracker.

---

## 9. Detailed work breakdown (expanded)

### 9.1 WBS — Preparation

| Task ID | Description | Owner | Output |
|---------|-------------|-------|--------|
| TP-01 | Confirm base URL | QA | Env checklist |
| TP-02 | Validate credentials | QA | Sign-off note |
| TP-03 | Import locators | Automation | Fresh `locators.xlsx` |

### 9.2 WBS — Execution

| Task ID | Description | Suite |
|---------|-------------|-------|
| TE-01 | Smoke S-1 | @smoke |
| TE-02 | Nav regression | S-2 |
| TE-03 | Negative auth | S-3 |
| TE-04 | Full REQ sweep | @regression |

### 9.3 WBS — Closure

| Task ID | Description |
|---------|-------------|
| TC-01 | RTM update |
| TC-02 | Executive summary |
| TC-03 | Lessons learned |

### 9.4 Communication plan

| Event | Audience | Channel |
|-------|----------|---------|
| Daily status | Program | Email/slack |
| Blocker | Dev lead | Immediate ping |

### 9.5 Dependencies

- Angular `npm start` for local runs.  
- Java runtime for Selenium engine.

### 9.6 Assumptions

- Single browser version pinned for PoC.  
- English UI only.

### 9.7 Training needs

- QA reads locator_strategy.md.  
- Automation reads LOCATOR_REPAIR.md.

### 9.8 Compliance checkpoints

- Maker–checker scenarios executed before demo labeled “control ready.”

### 9.9 Metrics

| Metric | Target |
|--------|--------|
| Pass rate P1 | 100% |
| Defect density | Track in tracker |

### 9.10 Risks to schedule

| Risk | Contingency |
|------|-------------|
| Locator breakage | Repair job same day |
| Env down | Switch machine |

---

*Tracker: [SDLC-Test-Tracker.xlsx](SDLC-Test-Tracker.xlsx)*
