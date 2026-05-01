# Low Level Design (LLD)

## Digital Trade Capture and Approval Console

**Document ID:** QAMVP-LLD-TESTDRIVE-001  
**Version:** 1.0  
**Status:** Test Drive Source  
**Related documents:** [BRD](01-business-requirements-document.md) · [FRS](02-functional-requirements-specification.md) · [HLD](03-high-level-design.md)

---

## LLD §1. Implementation Overview

The low-level implementation decomposes HLD components into route contracts, UI locators, service functions, validation rules, and data persistence structures. These details are source material for generated test steps.

---

## LLD §2. Route and Component Contracts

| Route | Component | Access | Related HLD |
|---|---|---|---|
| `/login` | LoginPage | Public | HLD-REQ-001 |
| `/trade` | TradeCapturePage | Maker | HLD-REQ-002 |
| `/approvals` | ApprovalQueuePage | Checker | HLD-REQ-003 |
| `/dashboard` | DashboardPage | Maker, Checker, Auditor | HLD-REQ-004 |
| `/audit` | AuditTrailPage | Auditor | HLD-REQ-005 |

---

## LLD §3. Detailed Requirements

### LLD-REQ-001 — Login route and session state

The implementation shall render `input[data-testid="username"]`, `input[data-testid="password"]`, and `button[data-testid="login-submit"]` on `/login`. Successful login shall create session state containing `userId`, `role`, and `displayName`.

**Maps to:** HLD-REQ-001, REQ-FR-001, REQ-FR-002, REQ-SEC-001  
**Components:** HLD-COMP-001, HLD-COMP-002  
**Controls:** CTRL-AUTH-001

### LLD-REQ-002 — Trade capture form and validation

The implementation shall render trade fields with stable locators: `trade-symbol`, `trade-side`, `trade-quantity`, `trade-price`, `trade-account`, and `trade-settlement-date`. Validation shall reject missing symbol, non-positive quantity, non-positive price, missing account, and settlement dates earlier than trade date.

**Maps to:** HLD-REQ-002, REQ-FR-003, REQ-FR-004  
**Components:** HLD-COMP-003  
**Data objects:** DATA-TRADE-001

### LLD-REQ-003 — Approval command handling

The implementation shall expose approval queue rows with `data-testid="approval-row-{tradeId}"`, `approve-trade-{tradeId}`, and `reject-trade-{tradeId}` controls. The service shall compare `submittedByUserId` against the checker user before allowing approval.

**Maps to:** HLD-REQ-003, REQ-FR-005, REQ-FR-006, REQ-SEC-002  
**Components:** HLD-COMP-004  
**APIs:** API-APPROVAL-001

### LLD-REQ-004 — Dashboard calculations

The implementation shall calculate dashboard counts from persisted trade status and calculate approved notional as `quantity * price` for approved trades only. Summary cards shall use `dashboard-pending-count`, `dashboard-approved-count`, `dashboard-rejected-count`, and `dashboard-approved-notional` locators.

**Maps to:** HLD-REQ-004, REQ-FR-007, REQ-FR-008  
**Components:** HLD-COMP-005  
**Data objects:** DATA-DASHBOARD-001

### LLD-REQ-005 — Audit event persistence

The implementation shall append audit records with `eventId`, `eventType`, `actorUserId`, `tradeId`, `beforeStatus`, `afterStatus`, `timestamp`, and `metadata`. Audit events shall be written for login, logout, submit, approve, reject, and route-guard denial.

**Maps to:** HLD-REQ-005, REQ-FR-009, REQ-NFR-001  
**Components:** HLD-COMP-006  
**Controls:** CTRL-AUDIT-001

### LLD-REQ-006 — QA traceability persistence

The implementation shall persist requirements, requirement links, RTM rows, generated test case metadata, and confidence scorecards in local Postgres-compatible structures. Source chunks shall remain immutable evidence for testcase generation.

**Maps to:** HLD-REQ-006, REQ-NFR-002  
**Components:** HLD-COMP-007  
**Controls:** CTRL-QA-001

---

## LLD §4. Data Structures

### DATA-TRADE-001 — TradeInstruction

| Field | Type | Rule | Related Req |
|---|---|---|---|
| tradeId | string | Generated unique identifier | LLD-REQ-002 |
| symbol | string | Required, uppercase ticker | LLD-REQ-002 |
| side | enum | BUY or SELL | LLD-REQ-002 |
| quantity | number | Positive integer | LLD-REQ-002 |
| price | number | Positive decimal | LLD-REQ-002 |
| account | string | Required account code | LLD-REQ-002 |
| status | enum | pending, approved, rejected | LLD-REQ-003 |
| submittedByUserId | string | Maker user ID | LLD-REQ-003 |

### DATA-DASHBOARD-001 — DashboardSummary

| Field | Type | Rule | Related Req |
|---|---|---|---|
| pendingCount | number | Count status `pending` | LLD-REQ-004 |
| approvedCount | number | Count status `approved` | LLD-REQ-004 |
| rejectedCount | number | Count status `rejected` | LLD-REQ-004 |
| approvedNotional | number | Sum approved `quantity * price` | LLD-REQ-004 |

---

## LLD §5. API Contracts

### API-APPROVAL-001 — Approval decision command

`POST /api/trades/{tradeId}/decision`

Request body:

```json
{
  "decision": "approve",
  "comment": "Reviewed against maker instruction"
}
```

Validation:

- Caller role must be checker.
- Caller user ID must differ from `submittedByUserId`.
- Trade status must be pending.
- Decision must be approve or reject.

---

## LLD §6. Control Mapping

| Control ID | Description | Related Requirements |
|---|---|---|
| CTRL-AUTH-001 | Route guard denies unauthenticated access. | LLD-REQ-001, REQ-SEC-001 |
| CTRL-AUDIT-001 | Controlled actions produce immutable audit records. | LLD-REQ-005, REQ-FR-009 |
| CTRL-QA-001 | Generated tests must cite source chunks and RTM rows. | LLD-REQ-006, REQ-NFR-002 |
