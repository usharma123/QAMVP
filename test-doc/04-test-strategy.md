# Test Strategy

**Document ID:** QAMVP-TSTRAT-001  
**Version:** 0.1  
**Date:** 2026-04-22  

**Related documents:** [README](README.md) · [BRD](01-business-requirements-document.md) · [FRS](02-functional-requirements-specification.md) · [TDS](03-test-design-specification.md) · [Test Plan](05-test-plan.md)

---

## 1. Purpose and scope

This **Test Strategy** establishes the **principles**, **risk orientation**, **tooling philosophy**, and **quality bar** for validating the QAMVP mock trading SUT. It bridges business intent (BRD) and operational test planning (Test Plan).

---

## 2. Quality objectives

| Objective | Metric / indicator |
|-----------|-------------------|
| Requirement coverage | RTM completeness |
| Regression safety | @smoke pass rate |
| Maintainability | data-testid adherence (REQ-NFR-002) |
| Transparency | Tracker + published results |

---

## 3. Risk-based testing

### 3.1 Product risks

| Risk | Test focus |
|------|------------|
| Wrong approval state | Queue + dashboard consistency |
| Auth bypass | Route guard + logout |
| Flaky locators | Wildcard XPath policy per locator_strategy.md |

### 3.2 Technical risks

| Risk | Mitigation |
|------|------------|
| Angular DOM drift | Runtime DOM repair pipeline |
| Parallel sessions | Document session assumptions in test plan |

---

## 4. Test types

| Type | Application |
|------|-------------|
| Functional | REQ-FR-* |
| Non-functional (light) | REQ-NFR-* |
| Security (conceptual) | REQ-SEC-* |
| Exploratory | Ad hoc outside scripted paths |

---

## 5. Tooling strategy

| Layer | Tool |
|-------|------|
| Primary execution | Java Selenium engine (repo constraint: do not modify) |
| Script format | JSON test scripts under `test_data/generated_scripts/` |
| Alternative generation | Python orchestrator + Gemini / Claude paths |
| Locator repair | Playwright + optional `--no-browser` |

---

## 6. Environments

| Env | URL | Use |
|-----|-----|-----|
| Local dev | `http://localhost:4200` | Primary |
| CI (future) | TBD | Smoke |

---

## 7. Compliance with documentation pack

All tests SHALL trace to **REQ-** and **BR-** via [06-requirements-traceability-matrix.md](06-requirements-traceability-matrix.md) and [SDLC-Test-Tracker.xlsx](SDLC-Test-Tracker.xlsx).

---

## 8. Governance

Strategy approved by QA lead; changes require version bump and RTM review.

---

## 9. Expanded strategic themes (corporate narrative)

### 9.1 Shift-left alignment

The program encourages **early** mapping of BR IDs to automated cases so that defects in **interpretation** of maker–checker flows surface before full UAT. Static review of FRS acceptance packs (§13) precedes heavy execution.

### 9.2 Automation economics

**Self-healing locators** reduce marginal cost per Angular patch. Investment in `data-testid` (REQ-NFR-002) is strategic, not cosmetic.

### 9.3 Stakeholder communication

**Green/red dashboards** for smoke suites provide sponsor visibility without requiring deep QA literacy.

### 9.4 Knowledge retention

The combination of **Markdown source** and **Word exports** ensures both **Git-native engineers** and **document-centric** stakeholders can consume the same truth.

### 9.5 Continuous improvement loop

| Activity | Output |
|----------|--------|
| Retro | Update strategy §3 risks |
| Defect themes | Update Test Plan priorities |
| Locator churn | Trigger repair playbook |

### 9.6 Assumptions and exclusions

- No formal **volume** test strategy.  
- No **chaos** engineering on mock.  
- **Accessibility** conformance is aspirational unless WCAG criteria added to FRS.

### 9.7 Dependencies on other teams

| Team | Dependency |
|------|------------|
| Dev | Timely fix for P1 defects |
| Infra | None for local PoC |

### 9.8 Tool evaluation criteria (future)

If replacing Selenium runner: JSON compatibility, parallel execution, trace export.

### 9.9 Ethics and responsible AI (PoC)

Generated scripts require **human review** before production reuse; strategy treats AI as **assistive**.

### 9.10 Document control

Controlled copy = Markdown in `test-doc/`; Word = secondary.

---

*Next: [05-test-plan.md](05-test-plan.md)*
