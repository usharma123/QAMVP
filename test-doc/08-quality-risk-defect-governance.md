# Quality, Risk & Defect Governance

**Document ID:** QAMVP-QRDG-001  
**Version:** 0.1  
**Date:** 2026-04-22  

**Related:** [Test Strategy](04-test-strategy.md) · [Test Plan](05-test-plan.md) · [RTM](06-requirements-traceability-matrix.md) · [Tracker](SDLC-Test-Tracker.xlsx)

---

## 1. Purpose

Establish **defect severity**, **SLA-style triage**, **quality gates**, and **sign-off** roles for the QAMVP documentation and testing program.

---

## 2. Quality gates

| Gate | Criteria |
|------|----------|
| G1 — Requirements | BRD+FRS baselined in Git |
| G2 — Test design | TDS + RTM reviewed |
| G3 — Execution | Smoke Pass |
| G4 — Release (PoC) | Sponsor demo approved |

---

## 3. Defect severity

| Sev | Definition | Example |
|-----|------------|---------|
| S1 | Blocker: cannot demo core journey | Login broken |
| S2 | Major: feature wrong | Approve does not change state |
| S3 | Minor: cosmetic | Typo in toast |
| S4 | Trivial | Alignment |

---

## 4. Triage workflow

1. Log in tracker **Defects** sheet or external tool.  
2. Map to **REQ** and **TKT**.  
3. Assign owner.  
4. Retest on fix; update RTM status.

---

## 5. Risk register (testing)

| ID | Risk | Mitigation | Owner |
|----|------|------------|-------|
| R-01 | Locator drift | Repair pipeline | Automation |
| R-02 | Scope creep | BRD change control | Sponsor |
| R-03 | Env mismatch | TDES checklist | QA |

---

## 6. Sign-off template

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Product Proxy | | | |
| Sponsor | | | |

---

## 7. Waivers

Document waiver ID, REQ affected, rationale, approver for any S2+ accepted unresolved.

---

## 8. Expanded governance (corporate)

### 8.1 RACI (illustrated)

| Activity | QA | Dev | Sponsor |
|----------|-----|-----|---------|
| RTM update | R/A | C | I |
| Defect fix | C | R/A | I |
| Demo | R | C | A |

### 8.2 Escalation path

L1 QA → L2 Dev lead → L3 Sponsor within 24h for S1.

### 8.3 Metrics dashboard

| KPI | Source |
|-----|--------|
| Open S1 count | Tracker |
| Mean time to fix | Tracker timestamps |

### 8.4 Audit trail

Git history of `test-doc/*.md` satisfies document audit for PoC.

### 8.5 Ethics

No falsifying Pass status; tracker reflects truth.

### 8.6 Continuity

Backup Markdown in remote Git.

### 8.7 Training

New QA reads this doc + TDS before execution.

### 8.8 Compliance disclaimer

Not a regulated validation package.

### 8.9 Tooling for defects

Excel sheet or JIRA—either is acceptable if RTM REQ link preserved.

### 8.10 Periodic review

Quarterly for long-running PoC; else end-of-phase.

---

*End of governance pack.*
