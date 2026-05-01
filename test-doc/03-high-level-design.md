# High Level Design (HLD)

## Digital Trade Capture and Approval Console

**Document ID:** QAMVP-HLD-TESTDRIVE-001  
**Version:** 1.0  
**Status:** Test Drive Source  
**Related documents:** [BRD](01-business-requirements-document.md) · [FRS](02-functional-requirements-specification.md) · [LLD](04-low-level-design.md)

---

## HLD §1. Architecture Overview

The system is a browser-based single-page application backed by local service APIs and a local Postgres data store for test-drive persistence. The design is optimized for traceable QA generation and deterministic workflow execution.

### HLD-REQ-001 — Identity and access boundary

The architecture shall include an authentication boundary that protects application routes and exposes role context to the UI.

**Maps to:** BR-001, REQ-FR-001, REQ-FR-002, REQ-SEC-001  
**Components:** HLD-COMP-001 Identity Shell, HLD-COMP-002 Route Guard  
**LLD mapping:** LLD-REQ-001

---

## HLD §2. Component Model

| Component ID | Component | Responsibility | Related Requirements |
|---|---|---|---|
| HLD-COMP-001 | Identity Shell | Login, logout, session state, role context. | HLD-REQ-001 |
| HLD-COMP-002 | Route Guard | Protects trade, approval, dashboard, audit routes. | HLD-REQ-001 |
| HLD-COMP-003 | Trade Capture Module | Captures maker trade instructions and validation errors. | HLD-REQ-002 |
| HLD-COMP-004 | Approval Queue Module | Presents pending trades and checker decisions. | HLD-REQ-003 |
| HLD-COMP-005 | Dashboard Module | Aggregates trade status counts and notional totals. | HLD-REQ-004 |
| HLD-COMP-006 | Audit Service | Records immutable business events. | HLD-REQ-005 |
| HLD-COMP-007 | QA Traceability Service | Supports RTM-backed testcase generation and confidence audit. | HLD-REQ-006 |

---

## HLD §3. Functional Design

### HLD-REQ-002 — Trade capture design

The architecture shall route maker users to HLD-COMP-003, validate submitted trade fields, and persist valid trades with pending status.

**Maps to:** BR-002, BR-007, REQ-FR-003, REQ-FR-004  
**Data objects:** DATA-TRADE-001 TradeInstruction  
**LLD mapping:** LLD-REQ-002

### HLD-REQ-003 — Approval queue design

The architecture shall route checker users to HLD-COMP-004, load pending trade instructions, and execute approve or reject commands while enforcing maker-checker separation.

**Maps to:** BR-003, BR-006, REQ-FR-005, REQ-FR-006, REQ-SEC-002  
**APIs:** API-APPROVAL-001  
**LLD mapping:** LLD-REQ-003

### HLD-REQ-004 — Dashboard design

The architecture shall expose read models for status counts and approved notional totals through HLD-COMP-005.

**Maps to:** BR-004, REQ-FR-007, REQ-FR-008  
**Data objects:** DATA-DASHBOARD-001 DashboardSummary  
**LLD mapping:** LLD-REQ-004

### HLD-REQ-005 — Audit design

The architecture shall emit audit events for authentication, trade creation, approval, rejection, and status transitions through HLD-COMP-006.

**Maps to:** BR-005, REQ-FR-009, REQ-NFR-001, REQ-SEC-003  
**Controls:** CTRL-AUDIT-001  
**LLD mapping:** LLD-REQ-005

### HLD-REQ-006 — QA traceability design

The architecture shall expose ingested requirements, source chunks, derived RTM rows, and confidence evidence to the Cursor SDK QA harness through read-only tools.

**Maps to:** BR-008, REQ-NFR-002  
**Components:** HLD-COMP-007 QA Traceability Service  
**LLD mapping:** LLD-REQ-006

---

## HLD §4. Data Flow

1. User authenticates through HLD-COMP-001 and HLD-COMP-002.
2. Maker submits DATA-TRADE-001 through HLD-COMP-003.
3. Checker reviews DATA-TRADE-001 through HLD-COMP-004.
4. HLD-COMP-005 updates DATA-DASHBOARD-001 from trade status.
5. HLD-COMP-006 records CTRL-AUDIT-001 evidence for all controlled actions.
6. HLD-COMP-007 maps BRD §2, FRS §3-§7, HLD §3, and LLD §3 into the derived RTM.
