# Business Requirements Document (BRD)

## Digital Trade Capture and Approval Console

**Document ID:** QAMVP-BRD-TESTDRIVE-001  
**Version:** 1.0  
**Status:** Test Drive Source  
**Related documents:** [FRS](02-functional-requirements-specification.md) · [HLD](03-high-level-design.md) · [LLD](04-low-level-design.md)

---

## BRD §1. Purpose

This BRD defines the business goals for a controlled banking QA test drive. The product is a digital trade capture and approval console used to validate document ingestion, requirement mapping, derived RTM construction, and TestCases.xlsx generation before browser execution handoff.

The system supports a maker-checker workflow for equity-style trade instructions. It is intentionally scoped to deterministic local testing with realistic banking controls.

---

## BRD §2. Business Outcomes

### BR-001 — Controlled user authentication

The business shall require authenticated access before any trade, approval, dashboard, or admin function is available.

**Mapped FRS:** REQ-FR-001, REQ-FR-002, REQ-SEC-001  
**Mapped design:** HLD-REQ-001, LLD-REQ-001  
**Business owner:** Operations Control

### BR-002 — Maker trade capture

The business shall allow a maker user to submit a new trade instruction with symbol, side, quantity, price, account, and settlement date.

**Mapped FRS:** REQ-FR-003, REQ-FR-004  
**Mapped design:** HLD-REQ-002, LLD-REQ-002  
**Business owner:** Front Office Operations

### BR-003 — Independent checker approval

The business shall require a checker user to approve or reject pending trades independently from the maker who submitted them.

**Mapped FRS:** REQ-FR-005, REQ-FR-006, REQ-SEC-002  
**Mapped design:** HLD-REQ-003, LLD-REQ-003  
**Business owner:** Middle Office Control

### BR-004 — Dashboard and trade status visibility

The business shall provide dashboard visibility for pending, approved, rejected, and total notional trade values.

**Mapped FRS:** REQ-FR-007, REQ-FR-008  
**Mapped design:** HLD-REQ-004, LLD-REQ-004  
**Business owner:** Operations Reporting

### BR-005 — Auditability and evidence retention

The business shall retain an audit trail for authentication, trade submission, approval, rejection, and status changes.

**Mapped FRS:** REQ-FR-009, REQ-NFR-001, REQ-SEC-003  
**Mapped design:** HLD-REQ-005, LLD-REQ-005  
**Business owner:** Compliance Technology

---

## BRD §3. Scope

### BRD §3.1 In scope

- Login and logout for maker and checker personas.
- Maker trade creation.
- Checker approval and rejection.
- Dashboard status counts and notional totals.
- Audit trail capture for control evidence.
- Local Postgres-backed test data for QA generation.

### BRD §3.2 Out of scope

- Real market data integration.
- Production identity provider integration.
- Settlement processing.
- Real-money order routing.

---

## BRD §4. Business Rules

### BR-006 — Segregation of duties

A maker shall not approve a trade they submitted. The checker action shall be available only to users with the checker role.

**Mapped FRS:** REQ-SEC-002  
**Mapped design:** HLD-REQ-003, LLD-REQ-003

### BR-007 — Required trade fields

A trade shall not be accepted unless symbol, side, quantity, price, account, and settlement date are present and valid.

**Mapped FRS:** REQ-FR-004  
**Mapped design:** HLD-REQ-002, LLD-REQ-002

### BR-008 — Traceable quality gate

Generated test cases shall cite BRD, FRS, HLD, or LLD source references and shall be auditable against a derived RTM before execution.

**Mapped FRS:** REQ-NFR-002  
**Mapped design:** HLD-REQ-006, LLD-REQ-006
