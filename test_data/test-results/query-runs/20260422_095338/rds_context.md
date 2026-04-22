### test-doc/01-business-requirements-document.docx (docx) ord=17
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-1: Happy path — submit and approve**  · similarity≈0.7081

User opens application login.
Maker authenticates.
Maker navigates to New Trade, completes business-meaningful fields, submits.
System acknowledges submission (business expectation: user knows it entered workflow).
Checker authenticates (same or different session per demo).
Checker opens Approval Queue, sees pending row(s).
Checker approves a row.
Stakeholder views Dashboard / Trade List and observes approved representation per REF-2.
Traceability: BR-001 through BR-005, BR-011, BR-012.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=95
**Functional Requirements Specification (FRS) > 22. Gherkin-style illustrations (non-normative)**  · similarity≈0.6694

Feature: Maker submits and checker approves
  Scenario: Happy path
    Given a maker is logged in
    When the maker submits a valid BUY trade
    Then a success toast is shown
    And a checker sees the trade in the approval queue
Feature: Dashboard reporting
  Scenario: Pending hidden
    Given a trade is pending approval
    When a user views the dashboard
    Then the pending trade is not listed in the dashboard table
Normative requirements remain the SHALL statements in §2–§11.

---
### test-doc/01-business-requirements-document.docx (docx) ord=47
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-131 — Trade capture feedback**  · similarity≈0.6509

Summary: Maker receives confirmation on successful submit
Acceptance criteria (business):
1. Maker can complete a trade capture path (side, sector, ticker, account, quantity, TIF).
2. User sees confirmation consistent with REF-2 (toast).
3. Trade enters pending workflow (BR-003).
Traceability: BR-002, BR-003 → REQ-FR-030–034.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=27
**Functional Requirements Specification (FRS) > 7. Route: /queue (Approval Queue) > 7.1 Purpose**  · similarity≈0.6443

Checker reviews and approves pending_approval trades.

---
### test-doc/03-test-design-specification.docx (docx) ord=14
**Test Design Specification (TDS) > 4. Scenario-based test suites > Suite S-1 — Smoke (15 min target)**  · similarity≈0.6005

Login maker (REQ-FR-002)
Open New Trade → submit minimal valid trade (REQ-FR-033, 034)
Logout; login checker (REQ-FR-003)
Open queue; approve one row (REQ-FR-043–045)
Open dashboard; verify approved-only narrative (REQ-FR-020)
Traceability: BR-001–BR-005; FRS §3–§8.

---
### test-doc/01-business-requirements-document.docx (docx) ord=14
**Business Requirements Document (BRD) > Personas > Persona: Maker (e.g. “Front-office trader” trainee)**  · similarity≈0.5848

Goals: Enter trades quickly; see confirmation that submission succeeded; understand that approval is required before trades appear in “approved-only” summaries.
Pain points addressed: Clear feedback (toasts), obvious navigation to new trade screen.
Business permissions (conceptual): Initiate trades; view queues and lists as allowed by mock; cannot “approve” own submission if the mock enforces checker-only approval on queue actions (per FRS).

---
### test-doc/01-business-requirements-document.docx (docx) ord=46
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-120 — Dashboard truth for approved activity**  · similarity≈0.5458

Summary: Dashboard reflects approved trades only
Description:
Supports BR-005 — trainees must not misread pending work as “done” on the summary. Pedagogical intent: mirrors management reporting vs operations queue split.
Acceptance criteria (business):
1. Pending trade is not listed on dashboard until approved.
2. After approval, trade may appear per mock rules.
3. “Total Trades” count matches visible approved rows for the session narrative.
Traceability: BR-005 → REQ-FR-020,021,022,023.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=34
**Functional Requirements Specification (FRS) > 8. Route: /trades (Trade List) > 8.1 Purpose**  · similarity≈0.5194

List approved trades with operational status and matching hints.

---
### test-doc/01-business-requirements-document.docx (docx) ord=48
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-141 — Checker approval loop**  · similarity≈0.5114

Summary: Approve pending trades from queue
Acceptance criteria (business):
1. Queue lists only pending_approval items.
2. Checker can approve a row and sees confirmation.
3. Item leaves pending set; downstream approved views can reflect it (BR-005).
Traceability: BR-003, BR-004, BR-005 → REQ-FR-040–045.

---
### test-doc/01-business-requirements-document.docx (docx) ord=3
**Business Requirements Document (BRD) > Executive summary**  · similarity≈0.5027

The organization requires a controlled, browser-based mock that simulates a simplified trade capture and approval workflow suitable for training, demonstration, and automated UI regression. The mock must reflect industry-recognizable patterns: order entry by a maker, pending state until independent approval by a checker, and read-only reporting views that reflect post-approval truth for dashboard aggregates while preserving operational queues for pending work.
The PoC does not replace a production order management system. It does provide a realistic surface for validating AI-assisted test generation, locator self-healing, and traceability from business intent through functional requirements to executable tests and SDLC tracking.

---
### test-doc/01-business-requirements-document.docx (docx) ord=16
**Business Requirements Document (BRD) > Personas > Persona: QA Automation**  · similarity≈n/a

Goals: Stable locators, deterministic flows, documented credentials.
Not a business persona in BRD sense but acknowledged as a key consumer of BR-008/BR-009.

---
### test-doc/01-business-requirements-document.docx (docx) ord=18
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-2: Operational read — dashboard without pending noise**  · similarity≈n/a

Business intent: Executives and trainees see approved-only summary on dashboard for clarity, while pending remains in the queue.
Traceability: BR-005.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=94
**Functional Requirements Specification (FRS) > 21. Detailed requirement narratives (reference compendium) > 21.37 REQ-SEC-003 — Limitation notice (expanded)**  · similarity≈n/a

Anti-misinformation: Pedagogical separation ≠ bank-grade preventive controls.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=96
**Functional Requirements Specification (FRS) > 23. Field-level interface specification (consolidated table)**  · similarity≈n/a

Derived from REF-2. If implementation diverges, FRS errata shall be filed.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=26
**Functional Requirements Specification (FRS) > 6. Route: /trade (New Trade) > REQ-FR-035 — Validation (generic)**  · similarity≈n/a

Statement: The SUT shall enforce reasonable validation on required fields (exact rules implementation-specific; absence of validation is a defect if submission corrupts state).
Parent BR: BR-002
Priority: Should

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=28
**Functional Requirements Specification (FRS) > 7. Route: /queue (Approval Queue) > REQ-FR-040 — Pending filter**  · similarity≈n/a

Statement: The queue table shall list trades whose status is pending_approval.
Parent BR: BR-003, BR-004
Priority: Must

---
### test-doc/03-test-design-specification.docx (docx) ord=13
**Test Design Specification (TDS) > 3. Test design by requirement > TD-REQ-FR-060 — Admin placeholder**  · similarity≈n/a

Priority | P3
Tags | @regression

---
### test-doc/03-test-design-specification.docx (docx) ord=15
**Test Design Specification (TDS) > 4. Scenario-based test suites > Suite S-2 — Navigation regression**  · similarity≈n/a

Iterate all navbar targets (REQ-FR-012, REQ-FR-013).

---
### test-doc/01-business-requirements-document.docx (docx) ord=13
**Business Requirements Document (BRD) > Business requirements (BR catalog)**  · similarity≈n/a

The following BR-xxx identifiers are the stable keys for traceability to the FRS, TDS, RTM, and SDLC tracker.

---
### test-doc/01-business-requirements-document.docx (docx) ord=15
**Business Requirements Document (BRD) > Personas > Persona: Checker (e.g. “Middle-office / control” trainee)**  · similarity≈n/a

Goals: Review pending submissions; approve valid rows; observe updated pending counts.
Pain points addressed: Single queue view; per-row approve action; pending tally.
Business permissions (conceptual): Approve from queue; view dashboard and lists for oversight.

---
### test-doc/01-business-requirements-document.docx (docx) ord=45
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-110 — Trading menu completeness**  · similarity≈n/a

Summary: Click-based Trading dropdown reaches all primary routes
Acceptance criteria (business):
1. User can open Trading menu by click (not hover-only).
2. User can reach Dashboard, New Trade, Trade List, Approval Queue.
3. Each destination loads without breaking global shell.
Traceability: BR-011 → REQ-FR-010,012.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=33
**Functional Requirements Specification (FRS) > 7. Route: /queue (Approval Queue) > REQ-FR-045 — Post-approve state**  · similarity≈n/a

Statement: After approval, the trade shall no longer appear as pending_approval in the queue and shall be eligible for approved-only views per REQ-FR-020.
Parent BR: BR-003, BR-005
Priority: Must

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=35
**Functional Requirements Specification (FRS) > 8. Route: /trades (Trade List) > REQ-FR-050 — Approved trade rows**  · similarity≈n/a

Statement: The trade list shall display approved trades with columns per REF-2: TxID, Side, Ticker, Quantity, Price, Total, Status, Matched With.
Parent BR: BR-005, BR-014
Priority: Must

---
### test-doc/01-business-requirements-document.docx (docx) ord=49
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-150 — Trade list & matching narrative**  · similarity≈n/a

Summary: Trade list supports status and “Matched With” discussion
Acceptance criteria (business):
1. List shows columns per REF-2 including Status and Matched With (BR-014).
2. Summary bar shows Total / Matched / Pending counts for class reconciliation drills.
Traceability: BR-005, BR-014 → REQ-FR-050,051.

---
### test-doc/01-business-requirements-document.docx (docx) ord=2
**Business Requirements Document (BRD) > Document control > Audience**  · similarity≈n/a

Product and program stakeholders framing PoC scope
Business analysts aligning automation scenarios to intent
Quality engineering defining strategy, risk, and traceability
Compliance-oriented reviewers assessing maker–checker (four-eyes) themes at a conceptual level

---
### test-doc/01-business-requirements-document.docx (docx) ord=4
**Business Requirements Document (BRD) > Business objectives > BO-1: Demonstrate end-to-end trade lifecycle (business view)**  · similarity≈n/a

The business must be able to narrate a complete story: authenticate → submit a trade intent → observe pending state in an approval queue → approve → see approved trades in summary and list views with matching concepts surfaced where applicable.
Maps to BR: BR-003, BR-004, BR-005.

### test-doc/01-business-requirements-document.docx (docx) ord=3
**Business Requirements Document (BRD) > Executive summary**  · similarity≈0.5481

The organization requires a controlled, browser-based mock that simulates a simplified trade capture and approval workflow suitable for training, demonstration, and automated UI regression. The mock must reflect industry-recognizable patterns: order entry by a maker, pending state until independent approval by a checker, and read-only reporting views that reflect post-approval truth for dashboard aggregates while preserving operational queues for pending work.
The PoC does not replace a production order management system. It does provide a realistic surface for validating AI-assisted test generation, locator self-healing, and traceability from business intent through functional requirements to executable tests and SDLC tracking.

---
### test-doc/04-test-strategy.docx (docx) ord=2
**Test Strategy > 7. Compliance with documentation pack**  · similarity≈0.5265

All tests SHALL trace to REQ- and BR- via 06-requirements-traceability-matrix.md and SDLC-Test-Tracker.xlsx.

---
### test-doc/01-business-requirements-document.docx (docx) ord=47
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-131 — Trade capture feedback**  · similarity≈0.5049

Summary: Maker receives confirmation on successful submit
Acceptance criteria (business):
1. Maker can complete a trade capture path (side, sector, ticker, account, quantity, TIF).
2. User sees confirmation consistent with REF-2 (toast).
3. Trade enters pending workflow (BR-003).
Traceability: BR-002, BR-003 → REQ-FR-030–034.

---
### test-doc/01-business-requirements-document.docx (docx) ord=2
**Business Requirements Document (BRD) > Document control > Audience**  · similarity≈0.5032

Product and program stakeholders framing PoC scope
Business analysts aligning automation scenarios to intent
Quality engineering defining strategy, risk, and traceability
Compliance-oriented reviewers assessing maker–checker (four-eyes) themes at a conceptual level

---
### test-doc/01-business-requirements-document.docx (docx) ord=21
**Business Requirements Document (BRD) > Business rules and controls > Control C-1: Maker–checker (four-eyes) narrative**  · similarity≈0.4912

Business rule: Trade requests that require independent approval must be modeled such that approval is a distinct action from submission, carried out in a checker context in the PoC narrative.
Evidence in mock: Presence of Approval Queue with Approve actions; separate credentials for checker in REF-2.
Limitation: This PoC does not certify regulatory compliance; it illustrates control design for learning.

---
### test-doc/01-business-requirements-document.docx (docx) ord=1
**Business Requirements Document (BRD) > Document control > Purpose**  · similarity≈0.4899

This Business Requirements Document (BRD) defines the business context, stakeholder outcomes, scope, and high-level capabilities for the mock trading web application used as the System Under Test (SUT) in the QAMVP (Quality Assurance MVP) automation proof-of-concept. It intentionally avoids field-level user interface specification; those details appear in the companion Functional Requirements Specification (FRS).

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=95
**Functional Requirements Specification (FRS) > 22. Gherkin-style illustrations (non-normative)**  · similarity≈0.4860

Feature: Maker submits and checker approves
  Scenario: Happy path
    Given a maker is logged in
    When the maker submits a valid BUY trade
    Then a success toast is shown
    And a checker sees the trade in the approval queue
Feature: Dashboard reporting
  Scenario: Pending hidden
    Given a trade is pending approval
    When a user views the dashboard
    Then the pending trade is not listed in the dashboard table
Normative requirements remain the SHALL statements in §2–§11.

---
### test-doc/01-business-requirements-document.docx (docx) ord=17
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-1: Happy path — submit and approve**  · similarity≈0.4846

User opens application login.
Maker authenticates.
Maker navigates to New Trade, completes business-meaningful fields, submits.
System acknowledges submission (business expectation: user knows it entered workflow).
Checker authenticates (same or different session per demo).
Checker opens Approval Queue, sees pending row(s).
Checker approves a row.
Stakeholder views Dashboard / Trade List and observes approved representation per REF-2.
Traceability: BR-001 through BR-005, BR-011, BR-012.

---
### test-doc/01-business-requirements-document.docx (docx) ord=4
**Business Requirements Document (BRD) > Business objectives > BO-1: Demonstrate end-to-end trade lifecycle (business view)**  · similarity≈n/a

The business must be able to narrate a complete story: authenticate → submit a trade intent → observe pending state in an approval queue → approve → see approved trades in summary and list views with matching concepts surfaced where applicable.
Maps to BR: BR-003, BR-004, BR-005.

---
### test-doc/04-test-strategy.docx (docx) ord=1
**Test Strategy > 1. Purpose and scope**  · similarity≈n/a

This Test Strategy establishes the principles, risk orientation, tooling philosophy, and quality bar for validating the QAMVP mock trading SUT. It bridges business intent (BRD) and operational test planning (Test Plan).

---
### test-doc/04-test-strategy.docx (docx) ord=3
**Test Strategy > 8. Governance**  · similarity≈n/a

Strategy approved by QA lead; changes require version bump and RTM review.

---
### test-doc/01-business-requirements-document.docx (docx) ord=46
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-120 — Dashboard truth for approved activity**  · similarity≈n/a

Summary: Dashboard reflects approved trades only
Description:
Supports BR-005 — trainees must not misread pending work as “done” on the summary. Pedagogical intent: mirrors management reporting vs operations queue split.
Acceptance criteria (business):
1. Pending trade is not listed on dashboard until approved.
2. After approval, trade may appear per mock rules.
3. “Total Trades” count matches visible approved rows for the session narrative.
Traceability: BR-005 → REQ-FR-020,021,022,023.

---
### test-doc/01-business-requirements-document.docx (docx) ord=48
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-141 — Checker approval loop**  · similarity≈n/a

Summary: Approve pending trades from queue
Acceptance criteria (business):
1. Queue lists only pending_approval items.
2. Checker can approve a row and sees confirmation.
3. Item leaves pending set; downstream approved views can reflect it (BR-005).
Traceability: BR-003, BR-004, BR-005 → REQ-FR-040–045.

---
### test-doc/01-business-requirements-document.docx (docx) ord=20
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-4: Invalid access attempt (business)**  · similarity≈n/a

User cannot proceed to trading workspace without valid credentials; business expects safe denial with clear messaging (detail in FRS).
Traceability: BR-001.

---
### test-doc/01-business-requirements-document.docx (docx) ord=22
**Business Requirements Document (BRD) > Business rules and controls > Control C-2: State discipline**  · similarity≈n/a

Business rule: Trades have recognizable lifecycle states including pending approval and approved; reporting views must not misrepresent pending as approved in dashboard context per REF-2.

---
### test-doc/01-business-requirements-document.docx (docx) ord=0
**Business Requirements Document (BRD) > Mock Trading & Approval Front-End (QAMVP System Under Test)**  · similarity≈n/a

Document ID: QAMVP-BRD-001
Version: 0.1
Status: Draft
Date: 2026-04-22
Related documents: FRS · TDS · README
Authoritative SUT behavior reference (repository): python-orchestrator/prompts/app_layout.md

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=94
**Functional Requirements Specification (FRS) > 21. Detailed requirement narratives (reference compendium) > 21.37 REQ-SEC-003 — Limitation notice (expanded)**  · similarity≈n/a

Anti-misinformation: Pedagogical separation ≠ bank-grade preventive controls.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=96
**Functional Requirements Specification (FRS) > 23. Field-level interface specification (consolidated table)**  · similarity≈n/a

Derived from REF-2. If implementation diverges, FRS errata shall be filed.

---
### test-doc/01-business-requirements-document.docx (docx) ord=16
**Business Requirements Document (BRD) > Personas > Persona: QA Automation**  · similarity≈n/a

Goals: Stable locators, deterministic flows, documented credentials.
Not a business persona in BRD sense but acknowledged as a key consumer of BR-008/BR-009.

---
### test-doc/01-business-requirements-document.docx (docx) ord=18
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-2: Operational read — dashboard without pending noise**  · similarity≈n/a

Business intent: Executives and trainees see approved-only summary on dashboard for clarity, while pending remains in the queue.
Traceability: BR-005.

### test-doc/02-functional-requirements-specification.docx (docx) ord=95
**Functional Requirements Specification (FRS) > 22. Gherkin-style illustrations (non-normative)**  · similarity≈0.5992

Feature: Maker submits and checker approves
  Scenario: Happy path
    Given a maker is logged in
    When the maker submits a valid BUY trade
    Then a success toast is shown
    And a checker sees the trade in the approval queue
Feature: Dashboard reporting
  Scenario: Pending hidden
    Given a trade is pending approval
    When a user views the dashboard
    Then the pending trade is not listed in the dashboard table
Normative requirements remain the SHALL statements in §2–§11.

---
### test-doc/01-business-requirements-document.docx (docx) ord=17
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-1: Happy path — submit and approve**  · similarity≈0.5905

User opens application login.
Maker authenticates.
Maker navigates to New Trade, completes business-meaningful fields, submits.
System acknowledges submission (business expectation: user knows it entered workflow).
Checker authenticates (same or different session per demo).
Checker opens Approval Queue, sees pending row(s).
Checker approves a row.
Stakeholder views Dashboard / Trade List and observes approved representation per REF-2.
Traceability: BR-001 through BR-005, BR-011, BR-012.

---
### test-doc/01-business-requirements-document.docx (docx) ord=3
**Business Requirements Document (BRD) > Executive summary**  · similarity≈0.5605

The organization requires a controlled, browser-based mock that simulates a simplified trade capture and approval workflow suitable for training, demonstration, and automated UI regression. The mock must reflect industry-recognizable patterns: order entry by a maker, pending state until independent approval by a checker, and read-only reporting views that reflect post-approval truth for dashboard aggregates while preserving operational queues for pending work.
The PoC does not replace a production order management system. It does provide a realistic surface for validating AI-assisted test generation, locator self-healing, and traceability from business intent through functional requirements to executable tests and SDLC tracking.

---
### test-doc/01-business-requirements-document.docx (docx) ord=46
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-120 — Dashboard truth for approved activity**  · similarity≈0.5528

Summary: Dashboard reflects approved trades only
Description:
Supports BR-005 — trainees must not misread pending work as “done” on the summary. Pedagogical intent: mirrors management reporting vs operations queue split.
Acceptance criteria (business):
1. Pending trade is not listed on dashboard until approved.
2. After approval, trade may appear per mock rules.
3. “Total Trades” count matches visible approved rows for the session narrative.
Traceability: BR-005 → REQ-FR-020,021,022,023.

---
### test-doc/01-business-requirements-document.docx (docx) ord=14
**Business Requirements Document (BRD) > Personas > Persona: Maker (e.g. “Front-office trader” trainee)**  · similarity≈0.5384

Goals: Enter trades quickly; see confirmation that submission succeeded; understand that approval is required before trades appear in “approved-only” summaries.
Pain points addressed: Clear feedback (toasts), obvious navigation to new trade screen.
Business permissions (conceptual): Initiate trades; view queues and lists as allowed by mock; cannot “approve” own submission if the mock enforces checker-only approval on queue actions (per FRS).

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=27
**Functional Requirements Specification (FRS) > 7. Route: /queue (Approval Queue) > 7.1 Purpose**  · similarity≈0.5275

Checker reviews and approves pending_approval trades.

---
### test-doc/01-business-requirements-document.docx (docx) ord=47
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-131 — Trade capture feedback**  · similarity≈0.5274

Summary: Maker receives confirmation on successful submit
Acceptance criteria (business):
1. Maker can complete a trade capture path (side, sector, ticker, account, quantity, TIF).
2. User sees confirmation consistent with REF-2 (toast).
3. Trade enters pending workflow (BR-003).
Traceability: BR-002, BR-003 → REQ-FR-030–034.

---
### test-doc/06-requirements-traceability-matrix.docx (docx) ord=6
**Requirements Traceability Matrix (RTM) > 8. Expanded narrative traceability (audit-friendly) > 8.3 BR-005 chain**  · similarity≈0.4966

Business ask: Approved-only dashboard clarity. Decomposes to REQ-FR-020–023 vs queue REQ-FR-040. Conflict test: Pending trade must not appear on dashboard until approved.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=94
**Functional Requirements Specification (FRS) > 21. Detailed requirement narratives (reference compendium) > 21.37 REQ-SEC-003 — Limitation notice (expanded)**  · similarity≈n/a

Anti-misinformation: Pedagogical separation ≠ bank-grade preventive controls.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=96
**Functional Requirements Specification (FRS) > 23. Field-level interface specification (consolidated table)**  · similarity≈n/a

Derived from REF-2. If implementation diverges, FRS errata shall be filed.

---
### test-doc/01-business-requirements-document.docx (docx) ord=16
**Business Requirements Document (BRD) > Personas > Persona: QA Automation**  · similarity≈n/a

Goals: Stable locators, deterministic flows, documented credentials.
Not a business persona in BRD sense but acknowledged as a key consumer of BR-008/BR-009.

---
### test-doc/01-business-requirements-document.docx (docx) ord=18
**Business Requirements Document (BRD) > Business processes and journeys > Journey J-2: Operational read — dashboard without pending noise**  · similarity≈n/a

Business intent: Executives and trainees see approved-only summary on dashboard for clarity, while pending remains in the queue.
Traceability: BR-005.

---
### test-doc/01-business-requirements-document.docx (docx) ord=2
**Business Requirements Document (BRD) > Document control > Audience**  · similarity≈n/a

Product and program stakeholders framing PoC scope
Business analysts aligning automation scenarios to intent
Quality engineering defining strategy, risk, and traceability
Compliance-oriented reviewers assessing maker–checker (four-eyes) themes at a conceptual level

---
### test-doc/01-business-requirements-document.docx (docx) ord=4
**Business Requirements Document (BRD) > Business objectives > BO-1: Demonstrate end-to-end trade lifecycle (business view)**  · similarity≈n/a

The business must be able to narrate a complete story: authenticate → submit a trade intent → observe pending state in an approval queue → approve → see approved trades in summary and list views with matching concepts surfaced where applicable.
Maps to BR: BR-003, BR-004, BR-005.

---
### test-doc/01-business-requirements-document.docx (docx) ord=45
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-110 — Trading menu completeness**  · similarity≈n/a

Summary: Click-based Trading dropdown reaches all primary routes
Acceptance criteria (business):
1. User can open Trading menu by click (not hover-only).
2. User can reach Dashboard, New Trade, Trade List, Approval Queue.
3. Each destination loads without breaking global shell.
Traceability: BR-011 → REQ-FR-010,012.

---
### test-doc/01-business-requirements-document.docx (docx) ord=13
**Business Requirements Document (BRD) > Business requirements (BR catalog)**  · similarity≈n/a

The following BR-xxx identifiers are the stable keys for traceability to the FRS, TDS, RTM, and SDLC tracker.

---
### test-doc/01-business-requirements-document.docx (docx) ord=15
**Business Requirements Document (BRD) > Personas > Persona: Checker (e.g. “Middle-office / control” trainee)**  · similarity≈n/a

Goals: Review pending submissions; approve valid rows; observe updated pending counts.
Pain points addressed: Single queue view; per-row approve action; pending tally.
Business permissions (conceptual): Approve from queue; view dashboard and lists for oversight.

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=26
**Functional Requirements Specification (FRS) > 6. Route: /trade (New Trade) > REQ-FR-035 — Validation (generic)**  · similarity≈n/a

Statement: The SUT shall enforce reasonable validation on required fields (exact rules implementation-specific; absence of validation is a defect if submission corrupts state).
Parent BR: BR-002
Priority: Should

---
### test-doc/02-functional-requirements-specification.docx (docx) ord=28
**Functional Requirements Specification (FRS) > 7. Route: /queue (Approval Queue) > REQ-FR-040 — Pending filter**  · similarity≈n/a

Statement: The queue table shall list trades whose status is pending_approval.
Parent BR: BR-003, BR-004
Priority: Must

---
### test-doc/01-business-requirements-document.docx (docx) ord=48
**Business Requirements Document (BRD) > Annex C — JIRA-ready epic/story text (business-facing) > Story TKT-QAMVP-141 — Checker approval loop**  · similarity≈n/a

Summary: Approve pending trades from queue
Acceptance criteria (business):
1. Queue lists only pending_approval items.
2. Checker can approve a row and sees confirmation.
3. Item leaves pending set; downstream approved views can reflect it (BR-005).
Traceability: BR-003, BR-004, BR-005 → REQ-FR-040–045.

---
### test-doc/06-requirements-traceability-matrix.docx (docx) ord=5
**Requirements Traceability Matrix (RTM) > 8. Expanded narrative traceability (audit-friendly) > 8.2 BR-004 chain**  · similarity≈n/a

Business ask: Checker approves pending work. Decomposes to REQ-FR-040–045. Critical path TC-QUEUE-004/006 for approve + state transition.

---
### test-doc/06-requirements-traceability-matrix.docx (docx) ord=7
**Requirements Traceability Matrix (RTM) > 10. Appendices > Appendix A — ID index count**  · similarity≈n/a

BR: 14 (BR-001–BR-014, plus narrative BR-000 only for REQ-FR-000 shell—adjust as needed)
REQ: Functional + NFR + SEC as in FRS
TKT: 16 groups in §5

