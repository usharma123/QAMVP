# Functional Requirements Specification (FRS)

## Digital Trade Capture and Approval Console

**Document ID:** QAMVP-FRS-TESTDRIVE-001  
**Version:** 1.0  
**Status:** Test Drive Source  
**Related documents:** [BRD](01-business-requirements-document.md) · [HLD](03-high-level-design.md) · [LLD](04-low-level-design.md)

---

## FRS §1. Purpose

This FRS translates the business requirements in BRD §2 and BRD §4 into functional and control requirements. Each requirement is intended to be mapped into the derived RTM and used by the Cursor SDK harness to generate TestCases.xlsx.

---

## FRS §2. Actors and Roles

| Role | Description | Related BR |
|---|---|---|
| Maker | Creates trade instructions and views submitted trades. | BR-002, BR-007 |
| Checker | Reviews pending trades and approves or rejects them. | BR-003, BR-006 |
| Auditor | Reviews dashboard and audit evidence. | BR-004, BR-005 |

---

## FRS §3. Authentication Requirements

### REQ-FR-001 — Login form

The system shall display username, password, and submit controls on the login page.

**Parent BR:** BR-001  
**Design mapping:** HLD-REQ-001, LLD-REQ-001  
**Acceptance:** Login controls are visible and enabled when unauthenticated users open the application.

### REQ-FR-002 — Authenticated session routing

The system shall establish an authenticated session for valid maker and checker credentials and route the user to the appropriate workspace.

**Parent BR:** BR-001  
**Design mapping:** HLD-REQ-001, LLD-REQ-001  
**Acceptance:** Maker users land on trade capture; checker users land on approval queue.

### REQ-SEC-001 — Route protection

The system shall prevent unauthenticated users from accessing trade capture, approval queue, dashboard, or audit pages.

**Parent BR:** BR-001  
**Design mapping:** HLD-REQ-001, LLD-REQ-001

---

## FRS §4. Trade Capture Requirements

### REQ-FR-003 — Trade entry form

The system shall provide a maker trade entry form with symbol, side, quantity, price, account, and settlement date fields.

**Parent BR:** BR-002  
**Design mapping:** HLD-REQ-002, LLD-REQ-002  
**Acceptance:** Maker can enter all required fields from a single form.

### REQ-FR-004 — Trade validation

The system shall reject incomplete or invalid trade submissions and display field-level validation messages.

**Parent BR:** BR-002, BR-007  
**Design mapping:** HLD-REQ-002, LLD-REQ-002  
**Acceptance:** Missing quantity or invalid price prevents submission.

---

## FRS §5. Approval Requirements

### REQ-FR-005 — Pending approval queue

The system shall place submitted maker trades into a pending approval queue visible to checker users.

**Parent BR:** BR-003  
**Design mapping:** HLD-REQ-003, LLD-REQ-003  
**Acceptance:** Submitted trades are not shown as approved until checker action is complete.

### REQ-FR-006 — Approval and rejection actions

The system shall allow checker users to approve or reject pending trades and record the decision with timestamp and actor.

**Parent BR:** BR-003, BR-006  
**Design mapping:** HLD-REQ-003, LLD-REQ-003  
**Acceptance:** Approved trades move to approved status; rejected trades move to rejected status.

### REQ-SEC-002 — Maker-checker separation

The system shall block a maker from approving or rejecting their own submitted trade.

**Parent BR:** BR-006  
**Design mapping:** HLD-REQ-003, LLD-REQ-003

---

## FRS §6. Dashboard Requirements

### REQ-FR-007 — Status summary cards

The system shall display dashboard counts for pending, approved, rejected, and total trades.

**Parent BR:** BR-004  
**Design mapping:** HLD-REQ-004, LLD-REQ-004

### REQ-FR-008 — Notional calculation

The system shall calculate trade notional as quantity multiplied by price and aggregate approved notional on the dashboard.

**Parent BR:** BR-004  
**Design mapping:** HLD-REQ-004, LLD-REQ-004

---

## FRS §7. Audit and Quality Requirements

### REQ-FR-009 — Audit event capture

The system shall create audit events for login, logout, trade submission, approval, rejection, and status changes.

**Parent BR:** BR-005  
**Design mapping:** HLD-REQ-005, LLD-REQ-005

### REQ-NFR-001 — Evidence retention

The system shall retain audit events and generated QA artifacts long enough for local test drive review.

**Parent BR:** BR-005  
**Design mapping:** HLD-REQ-005, LLD-REQ-005

### REQ-NFR-002 — Source aligned QA generation

The QA harness shall generate test cases only from the ingested BRD, FRS, HLD, LLD, and derived RTM knowledge base.

**Parent BR:** BR-008  
**Design mapping:** HLD-REQ-006, LLD-REQ-006

