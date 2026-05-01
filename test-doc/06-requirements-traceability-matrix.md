# Requirements Traceability Matrix (RTM)

**Document ID:** QAMVP-RTM-001  
**Version:** 0.1  
**Date:** 2026-04-22  

**Related:** [BRD](01-business-requirements-document.md) · [FRS](02-functional-requirements-specification.md) · [TDS](03-test-design-specification.md) · [Tracker](SDLC-Test-Tracker.xlsx)

---

## 1. Purpose

This RTM links **business requirements (BR-)** → **functional requirements (REQ-)** → **test design (TD-REQ- / TDS §)** → **tickets (TKT-)** → **test cases (TC-)**. It is the **authoritative matrix** for coverage arguments; the Excel tracker mirrors these rows for SDLC progression.

---

## 2. Legend

| Column | Meaning |
|--------|---------|
| **BR** | Business requirement ID from BRD |
| **BRD §** | Section in BRD |
| **REQ** | REQ-FR / REQ-NFR / REQ-SEC |
| **FRS §** | Section in FRS |
| **TDS ref** | TDS §3 TD block or suite |
| **TKT** | Work item |
| **TC** | Test case / script id |
| **Status** | Planned / In Progress / Pass / Fail / N/A |

---

## 3. Master traceability table

| BR | BRD § | REQ | FRS § | TDS ref | TKT | TC | Status |
|----|-------|-----|-------|---------|-----|-----|--------|
| BR-001 | §6 | REQ-FR-001 | §3.1 | TD-REQ-FR-001 | TKT-QAMVP-101 | TC-AUTH-001 | Pass |
| BR-001 | §6 | REQ-FR-002 | §3 | TD-REQ-FR-002 | TKT-QAMVP-101 | TC-AUTH-002 | Pass |
| BR-001 | §6 | REQ-FR-003 | §3 | TD-REQ-FR-003 | TKT-QAMVP-101 | TC-AUTH-003 | Pass |
| BR-001 | §7 J-4 | REQ-FR-004 | §3 | TD-REQ-FR-004 | TKT-QAMVP-102 | TC-AUTH-004 | Pass |
| BR-001 | §7 J-4 | REQ-FR-005 | §3 | TD-REQ-FR-005 | TKT-QAMVP-102 | TC-AUTH-005 | Pass |
| BR-011 | §6 | REQ-FR-010 | §4.1 | TD-REQ-FR-010 | TKT-QAMVP-110 | TC-NAV-001 | Pass |
| BR-006 | §6 | REQ-FR-011 | §4.1 | TD-REQ-FR-011 | TKT-QAMVP-110 | TC-NAV-002 | Pass |
| BR-011 | §6 | REQ-FR-012 | §4.1 | TD-REQ-FR-012 | TKT-QAMVP-110 | TC-NAV-003 | Pass |
| BR-013 | §6 | REQ-FR-013 | §4.1 | TD-REQ-FR-013 | TKT-QAMVP-111 | TC-NAV-004 | Pass |
| BR-012 | §7 J-3 | REQ-FR-014 | §4.1 | TD-REQ-FR-014 | TKT-QAMVP-112 | TC-NAV-005 | Pass |
| BR-005 | §7 J-2 | REQ-FR-020 | §5 | TD-REQ-FR-020 | TKT-QAMVP-120 | TC-DASH-001 | Pass |
| BR-005 | §7 J-2 | REQ-FR-021 | §5 | TD-REQ-FR-021 | TKT-QAMVP-120 | TC-DASH-002 | Pass |
| BR-005 | §7 J-2 | REQ-FR-022 | §5 | TD-REQ-FR-022 | TKT-QAMVP-120 | TC-DASH-003 | Pass |
| BR-008 | §9 | REQ-FR-023 | §5 | TD-REQ-FR-023 | TKT-QAMVP-120 | TC-DASH-004 | Pass |
| BR-002 | §7 J-1 | REQ-FR-030 | §6 | TD-REQ-FR-030 | TKT-QAMVP-130 | TC-TRADE-001 | Pass |
| BR-002 | §7 J-1 | REQ-FR-031 | §6 | TD-REQ-FR-031 | TKT-QAMVP-130 | TC-TRADE-002 | Pass |
| BR-002 | §7 J-1 | REQ-FR-032 | §6 | TD-REQ-FR-032 | TKT-QAMVP-130 | TC-TRADE-003 | Pass |
| BR-002,BR-003 | §7 J-1 | REQ-FR-033 | §6 | TD-REQ-FR-033 | TKT-QAMVP-131 | TC-TRADE-004 | Pass |
| BR-002 | §7 J-1 | REQ-FR-034 | §6 | TD-REQ-FR-034 | TKT-QAMVP-131 | TC-TRADE-005 | Pass |
| BR-002 | §6 | REQ-FR-035 | §6 | TD-REQ-FR-035 | TKT-QAMVP-132 | TC-TRADE-006 | Pass |
| BR-003 | §7 J-1 | REQ-FR-040 | §7 | TD-REQ-FR-040 | TKT-QAMVP-140 | TC-QUEUE-001 | Pass |
| BR-004 | §7 J-1 | REQ-FR-041 | §7 | TD-REQ-FR-041 | TKT-QAMVP-140 | TC-QUEUE-002 | Pass |
| BR-004 | §7 J-1 | REQ-FR-042 | §7 | TD-REQ-FR-042 | TKT-QAMVP-140 | TC-QUEUE-003 | Pass |
| BR-004 | §7 J-1 | REQ-FR-043 | §7 | TD-REQ-FR-043 | TKT-QAMVP-141 | TC-QUEUE-004 | Pass |
| BR-004 | §7 J-1 | REQ-FR-044 | §7 | TD-REQ-FR-044 | TKT-QAMVP-141 | TC-QUEUE-005 | Pass |
| BR-003,BR-005 | §7 J-1 | REQ-FR-045 | §7 | TD-REQ-FR-045 | TKT-QAMVP-141 | TC-QUEUE-006 | Pass |
| BR-005,BR-014 | §6 | REQ-FR-050 | §8 | TD-REQ-FR-050 | TKT-QAMVP-150 | TC-LIST-001 | Pass |
| BR-005 | §6 | REQ-FR-051 | §8 | TD-REQ-FR-051 | TKT-QAMVP-150 | TC-LIST-002 | Pass |
| BR-013 | §6 | REQ-FR-060 | §9 | TD-REQ-FR-060 | TKT-QAMVP-160 | TC-ADM-001 | Pass |
| BR-010 | §4 | REQ-NFR-001 | §10 | TD-REQ-NFR-001 | TKT-QAMVP-201 | TC-NFR-001 | Pass |
| BR-009 | §6 | REQ-NFR-002 | §10 | TD-REQ-NFR-002 | TKT-QAMVP-201 | TC-NFR-002 | Pass |
| BR-010 | §4 | REQ-NFR-003 | §10 | TD-REQ-NFR-003 | TKT-QAMVP-202 | TC-NFR-003 | Planned |
| BR-008 | §9 | REQ-NFR-004 | §10 | TD-REQ-NFR-004 | TKT-QAMVP-202 | TC-NFR-004 | Pass |
| BR-008 | §9 | REQ-NFR-005 | §10 | TD-REQ-NFR-005 | TKT-QAMVP-203 | TC-NFR-005 | Planned |
| BR-006 | §8 | REQ-SEC-001 | §11 | TD-REQ-SEC-001 | TKT-QAMVP-301 | TC-SEC-001 | Pass |
| BR-012 | §7 J-3 | REQ-SEC-002 | §11 | TD-REQ-SEC-002 | TKT-QAMVP-301 | TC-SEC-002 | Pass |
| BR-007 | §8 | REQ-SEC-003 | §11 | TD-REQ-SEC-003 | TKT-QAMVP-302 | TC-SEC-003 | Planned |
| BR-010 | §4 | REQ-FR-000 | §2 | Suite S-1 | TKT-QAMVP-000 | TC-SYS-000 | Planned |

---

## 4. Suite-to-REQ mapping

| Suite | REQ covered (summary) |
|-------|------------------------|
| S-1 Smoke | FR-002,003,033,034,043–045,020 |
| S-2 Nav | FR-012,013,010 |
| S-3 Negative | FR-004,005 |

---

## 5. Ticket backlog cross-reference

| TKT | Theme |
|-----|-------|
| TKT-QAMVP-101 | Authentication happy path |
| TKT-QAMVP-102 | Authentication negative |
| TKT-QAMVP-110 | Navigation shell |
| TKT-QAMVP-111 | Admin menu |
| TKT-QAMVP-112 | Logout |
| TKT-QAMVP-120 | Dashboard |
| TKT-QAMVP-130–132 | Trade capture |
| TKT-QAMVP-140–141 | Approval queue |
| TKT-QAMVP-150 | Trade list |
| TKT-QAMVP-160 | Admin placeholder |
| TKT-QAMVP-201–203 | NFR |
| TKT-QAMVP-301–302 | SEC |

---

## 6. Automation artifact mapping (illustrative)

Repo examples under `test_data/generated-scripts/` and `test_data/test_scripts/` may be cited in tracker **Automation_Path** column; this RTM does not require one-to-one filenames for every TC.

The detailed executable repository lives in `test_data/TestCases.xlsx` and [09-test-case-repository.md](09-test-case-repository.md). It currently contains **TC-001 through TC-016** with step-level RequirementID, StepDescription, ExpectedOutput, and TestData fields. The ingestion DB loads those rows into `test_cases` and `test_case_steps` for exact inventory counts.

### Legacy TC-ID to current KB-ID cross-reference

The master traceability table above (§3) uses legacy domain-scoped TC-ID labels (e.g. `TC-AUTH-001`, `TC-NFR-001`). The ingestion KB and Playwright runner use a sequential numeric scheme (`TC-001` through `TC-016`). The mapping between the two conventions is:

| Legacy TC-ID (§3 RTM) | Current KB ID | REQ covered | Suite |
|---|---|---|---|
| TC-AUTH-001 | TC-006 | REQ-FR-001, REQ-FR-004, REQ-FR-005 | S-3 Negative |
| TC-AUTH-002 | TC-007 | REQ-FR-002, REQ-FR-005, REQ-FR-014, REQ-SEC-002 | S-3 Negative |
| TC-AUTH-003 | TC-013 | REQ-FR-002, REQ-FR-003, REQ-FR-011, REQ-FR-014, REQ-SEC-001 | S-4 Detailed Regression |
| TC-AUTH-004 | TC-006 | REQ-FR-004 | S-3 Negative |
| TC-AUTH-005 | TC-007 | REQ-FR-005 | S-3 Negative |
| TC-NAV-001 | TC-008 | REQ-FR-010, REQ-FR-012, REQ-FR-013, REQ-FR-014 | S-2 Navigation |
| TC-NAV-002 | TC-013 | REQ-FR-011, REQ-SEC-001 | S-4 Detailed Regression |
| TC-NAV-003 | TC-008 | REQ-FR-012 | S-2 Navigation |
| TC-NAV-004 | TC-015 | REQ-FR-013, REQ-FR-060 | S-2 Navigation |
| TC-NAV-005 | TC-007 | REQ-FR-014 | S-3 Negative |
| TC-DASH-001 | TC-002 | REQ-FR-020, REQ-FR-022 | S-4 Detailed Regression |
| TC-DASH-002 | TC-010 | REQ-FR-021 | S-4 Detailed Regression |
| TC-DASH-003 | TC-001, TC-010 | REQ-FR-022 | S-1 Smoke, S-4 Regression |
| TC-DASH-004 | TC-010 | REQ-FR-023 | S-4 Detailed Regression |
| TC-TRADE-001 | TC-001, TC-004, TC-014 | REQ-FR-030 | S-1 Smoke, S-4 Regression |
| TC-TRADE-002 | TC-001, TC-014 | REQ-FR-031 | S-1 Smoke, S-4 Regression |
| TC-TRADE-003 | TC-004 | REQ-FR-032 | S-4 Detailed Regression |
| TC-TRADE-004 | TC-001–TC-005 | REQ-FR-033 | S-1 Smoke, S-4 Regression |
| TC-TRADE-005 | TC-001 | REQ-FR-034 | S-1 Smoke |
| TC-TRADE-006 | TC-009 | REQ-FR-035 | S-4 Detailed Regression |
| TC-QUEUE-001 | TC-001, TC-002, TC-004 | REQ-FR-040 | S-1 Smoke, S-4 Regression |
| TC-QUEUE-002 | TC-002, TC-012 | REQ-FR-041 | S-4 Detailed Regression |
| TC-QUEUE-003 | TC-002, TC-012 | REQ-FR-042 | S-4 Detailed Regression |
| TC-QUEUE-004 | TC-001, TC-003, TC-005 | REQ-FR-043 | S-1 Smoke, S-4 Regression |
| TC-QUEUE-005 | TC-001 | REQ-FR-044 | S-1 Smoke |
| TC-QUEUE-006 | TC-001 | REQ-FR-045 | S-1 Smoke |
| TC-LIST-001 | TC-003, TC-005, TC-011 | REQ-FR-050 | S-4 Detailed Regression |
| TC-LIST-002 | TC-003, TC-005, TC-011 | REQ-FR-051 | S-4 Detailed Regression |
| TC-ADM-001 | TC-015 | REQ-FR-060 | S-2 Navigation |
| TC-NFR-001 | TC-016 | REQ-NFR-001 | S-5 NFR Evidence |
| TC-NFR-002 | TC-016 | REQ-NFR-002 | S-5 NFR Evidence |
| TC-NFR-003 | — (Planned) | REQ-NFR-003 | — |
| TC-NFR-004 | TC-012 | REQ-NFR-004 | S-4 Detailed Regression |
| TC-NFR-005 | — (Planned) | REQ-NFR-005 | — |
| TC-SEC-001 | TC-013 | REQ-SEC-001 | S-4 Detailed Regression |
| TC-SEC-002 | TC-007 | REQ-SEC-002 | S-3 Negative |
| TC-SEC-003 | — (Planned) | REQ-SEC-003 | — |

---

## 7. Change process

RTM updates require: REQ change in FRS → new row → tracker sync → TDS TD block.

---

## 8. Expanded narrative traceability (audit-friendly)

### 8.1 BR-001 chain

**Business ask:** Only authenticated users access trading. **Decomposes to** REQ-FR-001–005. **Verified by** TD blocks TD-REQ-FR-001 through TD-REQ-FR-005 and suites S-1, S-3. **Tickets** TKT-QAMVP-101/102 group execution ownership.

### 8.2 BR-004 chain

**Business ask:** Checker approves pending work. **Decomposes to** REQ-FR-040–045. **Critical path** TC-QUEUE-004/006 for approve + state transition.

### 8.3 BR-005 chain

**Business ask:** Approved-only dashboard clarity. **Decomposes to** REQ-FR-020–023 vs queue REQ-FR-040. **Conflict test:** Pending trade must not appear on dashboard until approved.

---

## 9. Coverage metrics (to be filled during execution)

| Metric | Formula | Target |
|--------|---------|--------|
| REQ coverage | Rows Pass / Total REQ | 100% P1 |
| BR coverage | BR with ≥1 Pass REQ | 100% |

---

## 10. Appendices

### Appendix A — ID index count

- **BR:** 14 (BR-001–BR-014, plus narrative BR-000 only for REQ-FR-000 shell—adjust as needed)  
- **REQ:** Functional + NFR + SEC as in FRS  
- **TKT:** 16 groups in §5  

### Appendix B — RTM maintenance checklist

- [ ] FRS version bumped  
- [ ] TDS TD IDs added for new REQ  
- [ ] Tracker Requirements sheet rows added  
- [ ] Execution sheet linked  

---

*Source Markdown is authoritative for hyperlinks; Word export is secondary.*
