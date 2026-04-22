# Test Data & Environment Specification

**Document ID:** QAMVP-TDES-001  
**Version:** 0.1  
**Date:** 2026-04-22  

**Related:** [FRS](02-functional-requirements-specification.md) · [RTM](06-requirements-traceability-matrix.md) · [README](README.md)

---

## 1. Purpose

Define **environments**, **credentials**, **routes**, and **data conventions** for testing the mock trading SUT.

---

## 2. Environment matrix

| Env ID | Base URL | Browser | Purpose |
|--------|----------|---------|---------|
| ENV-LOCAL-01 | `http://localhost:4200` | Chromium | Primary PoC |
| ENV-CI-01 | TBD | Headless | Future automation |

---

## 3. Accounts (from REF-2)

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Maker | `admin` | `admin` | Test only |
| Checker | `checker` | `chscker@123` | Typo preserved per app_layout.md |

**Warning:** Do not reuse these outside lab contexts.

---

## 4. Routes

| Route | Page |
|-------|------|
| `/login` | Login |
| `/dashboard` | Dashboard |
| `/trade` | New Trade |
| `/queue` | Approval Queue |
| `/trades` | Trade List |
| `/admin/users` | Users |

---

## 5. Locator data

**Workbook:** `test_data/locators.xlsx` (per repository layout).  
**Strategy:** `data-testid` with `//*[@data-testid='...']` per `locator_strategy.md`.

---

## 6. Default test data conventions

| Field | Suggested value | Notes |
|-------|-----------------|-------|
| Side | BUY or SELL | Alternate in suites |
| Quantity | Small integer | e.g. 10, 100 |
| Ticker | Per SUT seed data | After selection, await price |
| Time in Force | Mix | Include GTC for REQ-FR-032 |

---

## 7. Refresh / reset

Assume **clean state** via app restart or documented reset procedure if implemented; otherwise use unique quantities/tickers to avoid ambiguity.

---

## 8. Dependencies

- Node.js / npm for `ng serve`  
- Java for Selenium runner (if executing JSON scripts)

---

## 9. Expanded environment procedures (corporate)

### 9.1 Workstation baseline

| Step | Action |
|------|--------|
| 1 | Clone QAMVP repository |
| 2 | Install Node LTS |
| 3 | `cd mock-trading-app && npm ci && npm start` |
| 4 | Verify `http://localhost:4200/login` loads |

### 9.2 Network and proxy

Local PoC: **no proxy** expected. Corporate laptops: follow IT exception process if localhost blocked.

### 9.3 Time synchronization

Not material for mock; production programs would require NTP.

### 9.4 Data privacy

No PII in mock; synthetic users only.

### 9.5 Backup / restore

Not applicable; rebuild from source.

### 9.6 Version pinning

Record Angular and Node versions in test report footers when escalating defects.

### 9.7 Access control (lab)

Physical access to lab machines per local policy.

### 9.8 Incident handling

If credentials leak: rotate in **fork** only; upstream PoC may keep static refs for tutorial reproducibility.

### 9.9 Tooling versions

| Tool | Min version (indicative) |
|------|--------------------------|
| Chrome/Chromium | Current stable |
| Java | Per java-framework pom |

### 9.10 Sign-off

Environment ready when login succeeds per REQ-FR-002.

---

*Tracker column **Environment** should cite ENV-LOCAL-01 unless otherwise noted.*
