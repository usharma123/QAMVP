# Business Requirements Document (BRD)

## Mock Trading & Approval Front-End (QAMVP System Under Test)

**Document ID:** QAMVP-BRD-001  
**Version:** 0.1  
**Status:** Draft  
**Date:** 2026-04-22  

**Related documents:** [FRS](02-functional-requirements-specification.md) · [TDS](03-test-design-specification.md) · [README](README.md)

**Authoritative SUT behavior reference (repository):** `python-orchestrator/prompts/app_layout.md`

---

## Document control

### Purpose

This Business Requirements Document (BRD) defines the **business context**, **stakeholder outcomes**, **scope**, and **high-level capabilities** for the mock trading web application used as the **System Under Test (SUT)** in the QAMVP (Quality Assurance MVP) automation proof-of-concept. It intentionally avoids field-level user interface specification; those details appear in the companion [Functional Requirements Specification](02-functional-requirements-specification.md) (FRS).

### Audience

- Product and program stakeholders framing PoC scope  
- Business analysts aligning automation scenarios to intent  
- Quality engineering defining strategy, risk, and traceability  
- Compliance-oriented reviewers assessing **maker–checker** (four-eyes) themes at a conceptual level  

### Revision history

| Ver | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-04-22 | Program | Initial BRD for mock trading SUT |

### References

| ID | Title / location |
|----|------------------|
| REF-1 | QAMVP repository `CLAUDE.md` — project overview |
| REF-2 | `python-orchestrator/prompts/app_layout.md` — page layout and roles |
| REF-3 | `python-orchestrator/prompts/locator_strategy.md` — testability conventions |
| REF-4 | `python-orchestrator/LOCATOR_REPAIR.md` — runtime DOM capture for repair |

---

## Executive summary

The organization requires a **controlled, browser-based mock** that simulates a simplified **trade capture and approval** workflow suitable for **training**, **demonstration**, and **automated UI regression**. The mock must reflect industry-recognizable patterns: **order entry** by a **maker**, **pending** state until **independent approval** by a **checker**, and **read-only reporting** views that reflect **post-approval** truth for dashboard aggregates while preserving operational queues for pending work.

The PoC does **not** replace a production order management system. It **does** provide a realistic surface for validating **AI-assisted test generation**, **locator self-healing**, and **traceability** from business intent through functional requirements to executable tests and SDLC tracking.

---

## Business objectives

### BO-1: Demonstrate end-to-end trade lifecycle (business view)

The business must be able to narrate a complete story: **authenticate** → **submit** a trade intent → observe **pending** state in an approval queue → **approve** → see **approved** trades in summary and list views with **matching** concepts surfaced where applicable.

**Maps to BR:** BR-003, BR-004, BR-005.

### BO-2: Enforce separation of duties at a pedagogical level

The mock must make **maker** and **checker** roles **visually and functionally distinct** so that training audiences and auditors can discuss **segregation of duties** without implying full production-grade entitlement management.

**Maps to BR:** BR-006, BR-007.

### BO-3: Support quality engineering and automation innovation

The business outcome for engineering is a **stable, local** SUT that supports **repeatable** automated UI execution, **deterministic** enough for CI-style runs, and **documented** sufficiently for traceability matrices and corporate test artifacts.

**Maps to BR:** BR-008, BR-009.

### BO-4: Minimize operational risk of the PoC

The mock must run **offline** or on **local developer machines**, use **non-production** credentials documented in controlled test packs, and avoid external market data dependencies beyond what the mock itself simulates.

**Maps to BR:** BR-010.

---

## Stakeholders and governance

### Stakeholder register

| Role | Interest | BRD engagement |
|------|----------|----------------|
| Program sponsor | PoC success, timeline, demo readiness | Approves scope §4 |
| Product owner (proxy) | Feature narrative for mock | Validates journeys §7 |
| QA lead | Test strategy, traceability, release gates | Consumes BR IDs → RTM |
| Automation engineer | Stable locators, runnable scripts | Indirect via REF-3 |
| Compliance advisor (optional) | Four-eyes narrative | Reviews §8 |
| Developer maintainer | Angular SUT upkeep | Implements FRS |

### Governance model (PoC)

- **Decision rights:** Program sponsor for scope changes; QA lead for quality gates.  
- **Requirements baselining:** BRD § + FRS § versioned in Git; Word exports are **non-authoritative**.  
- **Review cadence:** Ad hoc during PoC; formal sign-off template lives in [08-quality-risk-defect-governance.md](08-quality-risk-defect-governance.md).

---

## Scope

### In scope

1. **Web UI** for login, trade entry, approval queue, trade list, dashboard, and placeholder admin users page.  
2. **Role-based** behaviors consistent with **maker** and **checker** personas as described in REF-2.  
3. **Client-side** feedback: loading indicators, toast notifications, form-driven conditional disclosure (e.g. time-in-force behaviors at business level).  
4. **Local** execution defaulting to developer workstation (`http://localhost:4200` per project documentation).  
5. **Traceability** from business requirements (this document) to functional requirements and tests.

### Out of scope

1. **Real** exchange connectivity, clearing, settlement, or regulatory reporting.  
2. **Production** authentication (SSO, MFA, HSM-backed secrets).  
3. **Full** entitlement matrix, delegated admin, or break-glass procedures.  
4. **Mobile-native** applications; responsive behavior may exist but is not a business driver for PoC.  
5. **Performance testing at scale** (load, soak, chaos)—covered only at qualitative NFR level in FRS.

### Assumptions

- Stakeholders accept **mock** data and **simplified** pricing rules.  
- **Checker** password as documented in REF-2 is **test-only** and not rotated like production secrets.  
- The Angular application source may be **cursor-ignored** in some workspaces; behavioral truth for documentation is **REF-2** unless superseded by signed FRS errata.

### Dependencies

| Dependency | Impact |
|------------|--------|
| Node.js / npm / Angular CLI | Build and serve SUT |
| Java Selenium engine (QAMVP) | Execute generated JSON scripts |
| Python orchestrator (optional path) | Alternative generation/repair pipeline |
| Playwright (optional) | Runtime DOM snapshots for locator repair |

---

## Business capability map

Capabilities are **business-language** groupings. Detailed **shall** statements appear in the FRS.

| Capability ID | Name | Description | Primary BR |
|---------------|------|-------------|------------|
| CAP-A | Authenticate session | Users sign in with role-determining credentials | BR-001 |
| CAP-B | Capture trade intent | Maker defines side, instrument context, quantity, instructions | BR-002 |
| CAP-C | Pending approval | Submissions enter a controlled queue | BR-003 |
| CAP-D | Approve trade | Checker confirms pending items | BR-004 |
| CAP-E | Operational visibility | Dashboard and lists show counts and rows appropriate to state | BR-005 |
| CAP-F | Navigate workspace | Structured menus after login | BR-011 |
| CAP-G | End session | Logout returns to login | BR-012 |
| CAP-H | Admin placeholder | Future user admin | BR-013 |

---

## Business requirements (BR catalog)

The following **BR-xxx** identifiers are the stable keys for traceability to the FRS, TDS, RTM, and SDLC tracker.

| ID | Statement | Priority |
|----|-----------|----------|
| BR-001 | The organization shall allow authorized users to access the mock trading workspace only after successful authentication. | Must |
| BR-002 | The organization shall allow a **maker** to submit trade requests that represent buy or sell intent with quantity and instrument context. | Must |
| BR-003 | The organization shall route newly submitted trade requests to a **pending approval** state visible in an operational queue. | Must |
| BR-004 | The organization shall allow a **checker** to **approve** individual pending trade requests from that queue. | Must |
| BR-005 | The organization shall provide **read-only** operational views that summarize **approved** activity separately from **pending** work, in line with training clarity. | Must |
| BR-006 | The organization shall present **maker** and **checker** as distinct roles for pedagogical segregation-of-duties discussions. | Must |
| BR-007 | The organization shall not imply production-grade **preventive** entitlement enforcement beyond what the mock implements (documented in FRS). | Should |
| BR-008 | The organization shall support **repeatable** demonstration of the full trade journey for QA and stakeholder demos. | Must |
| BR-009 | The organization shall align the mock with **test automation** practices documented in the QAMVP repo (e.g. `data-testid` strategy). | Should |
| BR-010 | The organization shall keep PoC deployment **local** or **non-production** by default. | Must |
| BR-011 | The organization shall provide **structured navigation** among primary trading views after login. | Must |
| BR-012 | The organization shall allow users to **terminate** the session (logout) and return to login. | Must |
| BR-013 | The organization shall reserve an **admin** area for future user management; placeholder acceptable for PoC. | Could |
| BR-014 | The organization shall surface **matching** concepts in trade lists where applicable to support paired-trade narratives in training. | Should |

---

## Personas

### Persona: Maker (e.g. “Front-office trader” trainee)

**Goals:** Enter trades quickly; see confirmation that submission succeeded; understand that approval is required before trades appear in “approved-only” summaries.

**Pain points addressed:** Clear feedback (toasts), obvious navigation to new trade screen.

**Business permissions (conceptual):** Initiate trades; view queues and lists as allowed by mock; cannot “approve” own submission if the mock enforces checker-only approval on queue actions (per FRS).

### Persona: Checker (e.g. “Middle-office / control” trainee)

**Goals:** Review pending submissions; approve valid rows; observe updated pending counts.

**Pain points addressed:** Single queue view; per-row approve action; pending tally.

**Business permissions (conceptual):** Approve from queue; view dashboard and lists for oversight.

### Persona: QA Automation

**Goals:** Stable locators, deterministic flows, documented credentials.

**Not a business persona in BRD sense** but acknowledged as a **key consumer** of BR-008/BR-009.

---

## Business processes and journeys

### Journey J-1: Happy path — submit and approve

1. User opens application login.  
2. **Maker** authenticates.  
3. **Maker** navigates to **New Trade**, completes business-meaningful fields, submits.  
4. System acknowledges submission (business expectation: user knows it entered workflow).  
5. **Checker** authenticates (same or different session per demo).  
6. **Checker** opens **Approval Queue**, sees pending row(s).  
7. **Checker** approves a row.  
8. **Stakeholder** views **Dashboard** / **Trade List** and observes **approved** representation per REF-2.

**Traceability:** BR-001 through BR-005, BR-011, BR-012.

### Journey J-2: Operational read — dashboard without pending noise

**Business intent:** Executives and trainees see **approved-only** summary on dashboard for clarity, while **pending** remains in the queue.

**Traceability:** BR-005.

### Journey J-3: Session end

User logs out; must re-authenticate. **Traceability:** BR-012.

### Journey J-4: Invalid access attempt (business)

User cannot proceed to trading workspace without valid credentials; business expects **safe** denial with **clear** messaging (detail in FRS).

**Traceability:** BR-001.

---

## Business rules and controls

### Control C-1: Maker–checker (four-eyes) narrative

**Business rule:** Trade requests that require independent approval must be **modeled** such that **approval** is a **distinct** action from **submission**, carried out in a **checker** context in the PoC narrative.

**Evidence in mock:** Presence of **Approval Queue** with **Approve** actions; separate credentials for checker in REF-2.

**Limitation:** This PoC does **not** certify regulatory compliance; it **illustrates** control design for learning.

### Control C-2: State discipline

**Business rule:** Trades have recognizable lifecycle states including **pending approval** and **approved**; reporting views must not **misrepresent** pending as approved in dashboard context per REF-2.

### Control C-3: Audit and transparency (conceptual)

**Business expectation:** Rows display identifiers (e.g. transaction ID) suitable for **walk-through** audits in training. Immutable audit log is **out of scope** unless added in a future phase.

---

## Success measures and KPIs (PoC-appropriate)

| Measure | Target | How evaluated |
|---------|--------|----------------|
| Demo completeness | J-1 runnable in under 10 minutes | Scripted demo |
| Role clarity | Trainee identifies maker vs checker steps | Feedback form |
| Automation stability | Core journey passes in CI-style run | Test results |
| Traceability | 100% of BR IDs mapped in RTM | [06-requirements-traceability-matrix.md](06-requirements-traceability-matrix.md) |
| Document usability | BRD+FRS+TDS linked from README | Peer review |

---

## Business risks (summary)

| Risk | Impact | Mitigation (business level) |
|------|--------|------------------------------|
| Confusing PoC with production | Mis-stated compliance claims | Label all docs “mock / PoC”; scope §4 |
| Weak role separation | Invalid training | Emphasize FRS limits; checker-only approve |
| Flaky automation | PoC credibility loss | Locator strategy REF-3; repair pipeline REF-4 |
| Credential leakage in docs | Security hygiene | Use documented test passwords only; rotate in real programs |

Detailed risk treatment appears in [08-quality-risk-defect-governance.md](08-quality-risk-defect-governance.md).

---

## Compliance and ethics (non-binding notice)

This BRD describes a **training and engineering** mock. **No** warranty of fitness for regulated production use is expressed or implied. Any mapping to regulations (e.g. MiFID II, SEC rules) is **illustrative** for classroom discussion only.

---

## Glossary

| Term | Definition |
|------|------------|
| BRD | Business Requirements Document |
| FRS | Functional Requirements Specification |
| SUT | System Under Test |
| Maker | Role that initiates trade requests in the mock |
| Checker | Role that approves pending requests in the mock |
| Pending approval | Business state awaiting checker action |
| Approved | Business state eligible for approved-only summaries per REF-2 |
| PoC | Proof of concept |
| QAMVP | Quality Assurance MVP project |

---

## Appendices

### Appendix A — Business requirement to document section index

| BR ID | Primary section |
|-------|-----------------|
| BR-001 | §7 Journey J-1, J-4; §6 CAP-A |
| BR-002 | §6 CAP-B; §7 J-1 |
| BR-003 | §6 CAP-C |
| BR-004 | §6 CAP-D |
| BR-005 | §6 CAP-E; §7 J-2 |
| BR-006–BR-007 | §8 C-1 |
| BR-008–BR-009 | §3 BO-3 |
| BR-010 | §4 Dependencies |
| BR-011 | §6 CAP-F |
| BR-012 | §6 CAP-G; §7 J-3 |
| BR-013 | §6 CAP-H |
| BR-014 | §6 (matching narrative); FRS detail |

### Appendix B — Future business extensions (backlog ideas)

- Reject / return with reason workflow  
- Multi-level approval  
- Role admin beyond placeholder  
- Export of trade blotter to CSV for audit class  

---

## Extended business context (training narrative)

### Industry alignment (illustrative)

Front-office and middle-office functions in capital markets often separate **trade initiation** from **trade verification** to reduce operational risk and conflicts of interest. The mock abstracts this pattern into two credentials and two primary responsibilities. Training facilitators may reference this section when explaining why **dashboard totals** intentionally differ in composition from **queue** contents: trainees learn that **reporting cutoffs** and **approval state** change what appears in a summary tile versus an operational workbench.

### Workshop scenarios enabled by this BRD

**Scenario W-1 — New hire orientation:** Walk through J-1 with a cohort; pause at pending state and discuss what would happen in production (STP, exceptions desk, trade breaks).

**Scenario W-2 — Control discussion:** Use BR-006/BR-007 to contrast **pedagogical** separation with **production** preventive controls (dual custody, maker–checker system configuration, surveillance).

**Scenario W-3 — Automation literacy:** Map BR-008 to live demo of JSON-driven UI tests; relate to corporate digital transformation narratives without over-claiming AI autonomy.

### Business data concepts (non-technical)

| Concept | Business meaning |
|---------|------------------|
| TxID | Identifier for a trade instance in conversation and support |
| Ticker | Symbol representing an instrument for the mock |
| Side | Buy or sell intent |
| Time in force | How long an instruction remains active in real markets; mock uses simplified disclosure |
| Matched With | Training hint that a trade may relate to a contra side in the list view |

### Communication plan (PoC)

| Audience | Message | Channel |
|----------|---------|---------|
| Sponsors | Scope bounded to local mock | Steering note |
| Trainers | Journeys J-1–J-4 | Facilitator guide (derived) |
| Engineering | BR IDs stable for RTM | README + tracker |

### Business decision log (informal)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-22 | Approve BR catalog as baseline | Unblocks FRS + TDS |
| 2026-04-22 | Dashboard shows approved only | REF-2 fidelity for training clarity |

### Expanded stakeholder concerns

**Finance training lead:** Needs exercises that do not require market hours or live feeds. **Addressed by** BO-4 and local mock assumption.

**IT security (advisory):** Worried about credential echo in documentation. **Addressed by** labeling passwords as test-only and recommending secret management for any fork used beyond lab.

**Vendor management (N/A for PoC):** Placeholder row for corporate template completeness.

### Business benefits register (qualitative)

| Benefit | Description |
|---------|-------------|
| Faster onboarding | Repeatable J-1 reduces live-system training slots |
| Safer storytelling | BR-007 avoids compliance over-claim |
| Measurable QA maturity | Traceability per success measure table |

### Alignment to corporate stage gates (generic)

| Gate | BRD artifact consumed |
|------|----------------------|
| Intake | Scope §4 |
| Design approval | Capability map §6 + journeys §7 |
| UAT readiness | Success measures §9 |
| Closure | KPI evaluation + backlog Appendix B |

---

## Facilitator appendix — workshop runbook (extended)

### Module M-1 — Opening (20 minutes)

**Learning objective:** Participants articulate why trading systems separate capture from approval. **Activities:** Lecturette on operational risk; table discussion “what could go wrong if one person does both?” **Materials:** Projector showing BRD §8 Control C-1. **Assessment:** Two-minute exit ticket.

### Module M-2 — Live walkthrough (30 minutes)

**Learning objective:** Execute Journey J-1 without instructor narration first, then debrief. **Roles:** Volunteer maker, volunteer checker. **Debrief prompts:** Where did pending appear? Why not on dashboard? What would change in production?

### Module M-3 — Automation lab (45 minutes)

**Learning objective:** Connect BR-008/BR-009 to visible `data-testid` in DevTools. **Prerequisite:** Repo cloned, app running. **Safety:** No production URLs.

### Module M-4 — Controls deep dive (40 minutes)

**Reading:** BRD §8 in small groups; each group lists one production control not modeled. **Plenary:** Map to backlog Appendix B.

### FAQ — business audience

**Q: Is this compliant with SOX/MiFID?** A: No certification; illustrative only. **Q: Can we connect to Bloomberg?** A: Out of scope §4. **Q: Why typo in checker password?** A: Preserved to match `app_layout.md` REF-2; change only with FRS errata.

### FAQ — engineering audience

**Q: Where is Angular source?** A: `mock-trading-app/`; may be tooling-ignored in some workspaces. **Q: Single source of truth?** A: Markdown in `test-doc/` for this pack; REF-2 for UI behavior baseline.

### Stakeholder interview protocol (template)

| Question | Rationale |
|----------|-----------|
| What decision does the dashboard support? | Validates BR-005 |
| Who may approve? | Validates BR-004 |
| What is “matched with” in your desk language? | Validates BR-014 |

### Business scenario library (textual)

**Scenario B-101 — Morning batch:** Maker enters three trades; checker approves two; one left pending for afternoon session. **Scenario B-102 — Error recovery:** Invalid login attempted twice; discuss lockout policies not in mock. **Scenario B-103 — New hire:** Shadow mode; narrator explains each click.

### Dependencies on enterprise functions (placeholder)

| Function | PoC need |
|----------|----------|
| Legal | Disclaimer § compliance notice |
| InfoSec | Lab credential policy |
| Training | LMS upload of Word exports |

### Communication templates

**Email — kickoff:** Subject “QAMVP mock trading BRD v0.1 available”; body links `test-doc/README.md`. **Slack — blocker:** Format `BLOCKER | S1 | REQ-FR-0xx | owner`.

### Success story skeleton (post-demo)

Situation → Complication → Question → Answer → **How BRD helped** → Next steps.

### Anti-patterns in demos

- Claiming production compliance.  
- Using real client names in ticker fields.  
- Skipping checker step (undermines BR-003/BR-004 narrative).

### Extended glossary addendum

| Term | Note |
|------|------|
| Blotter | Synonym for trade list in some desks |
| STP | Straight-through processing; not simulated |
| Four-eyes | Informal for dual control |

### Revision roadmap

| Future ver | Theme |
|------------|-------|
| 0.2 | Add reject workflow BR |
| 0.3 | Production IAM integration (if ever) |

### Cross-reference index (BR → workshop module)

| BR | Module |
|----|--------|
| BR-001 | M-2 |
| BR-005 | M-2 debrief |
| BR-006 | M-1, M-4 |

---

## Annex C — JIRA-ready epic/story text (business-facing)

*Paste into your tracker tool; **Summary** = title, **Description** = body. IDs align with [06-requirements-traceability-matrix.md](06-requirements-traceability-matrix.md) and `SDLC-Test-Tracker.xlsx`.*

### Epic E-QAMVP-AUTH — Authentication & session

**Summary:** [Epic] Mock trading — authentication & session hygiene  

**Description:**  
As a program stakeholder, I need all trainees to pass through a single, well-understood login gate so that maker/checker narratives always start from an authenticated session. This epic covers business outcomes **BR-001** and **BR-012** (login + logout). Out of scope: enterprise SSO.

**Business acceptance:**  
- Valid maker and checker can complete login journeys (J-1, J-3).  
- Invalid credentials are rejected with visible feedback (J-4).  
- Logout returns users to a state requiring re-authentication.

**Links:** BRD §6 BR catalog; FRS §3; TKT-QAMVP-101, TKT-QAMVP-102, TKT-QAMVP-112.

---

### Story TKT-QAMVP-101 — Happy-path authentication (maker & checker)

**Summary:** Login success for maker and checker roles  

**Description:**  
**As a** trainee **I want** to log in as either maker or checker **so that** I can perform role-appropriate actions in the mock.

**Business rules:** Credentials match REF-2 (`app_layout.md`). Roles must be distinguishable after login (BR-006).

**Acceptance criteria (business):**  
1. Given the login page, when maker enters `admin` / `admin`, then trading workspace is available.  
2. Given the login page, when checker enters `checker` / `chscker@123`, then trading workspace is available.  
3. Navbar communicates which role is active (conceptual alignment with FRS REQ-FR-011).

**Traceability:** BR-001, BR-006 → REQ-FR-001,002,003.

---

### Story TKT-QAMVP-102 — Authentication failure paths

**Summary:** Reject invalid credentials and guard deep links  

**Description:**  
**As a** control-minded user **I want** failed login and unauthenticated access to be handled safely **so that** we do not imply insecure defaults in class.

**Acceptance criteria (business):**  
1. Wrong password shows error on login page.  
2. Trading routes do not present authenticated shell without login (BR-001).

**Traceability:** BR-001 → REQ-FR-004,005.

---

### Epic E-QAMVP-NAV — Workspace navigation

**Summary:** [Epic] Structured navigation after login  

**Description:** Covers **BR-011**, **BR-013** — Trading menu, Admin menu, Users placeholder. Ensures demos do not rely on ad-hoc URL typing.

**Stories:** TKT-QAMVP-110 (Trading), TKT-QAMVP-111 (Admin), grouped under RTM.

---

### Story TKT-QAMVP-110 — Trading menu completeness

**Summary:** Click-based Trading dropdown reaches all primary routes  

**Acceptance criteria (business):**  
1. User can open Trading menu by click (not hover-only).  
2. User can reach Dashboard, New Trade, Trade List, Approval Queue.  
3. Each destination loads without breaking global shell.

**Traceability:** BR-011 → REQ-FR-010,012.

---

### Story TKT-QAMVP-120 — Dashboard truth for approved activity

**Summary:** Dashboard reflects approved trades only  

**Description:**  
Supports **BR-005** — trainees must not misread pending work as “done” on the summary. **Pedagogical intent:** mirrors management reporting vs operations queue split.

**Acceptance criteria (business):**  
1. Pending trade is not listed on dashboard until approved.  
2. After approval, trade may appear per mock rules.  
3. “Total Trades” count matches visible approved rows for the session narrative.

**Traceability:** BR-005 → REQ-FR-020,021,022,023.

---

### Story TKT-QAMVP-131 — Trade capture feedback

**Summary:** Maker receives confirmation on successful submit  

**Acceptance criteria (business):**  
1. Maker can complete a trade capture path (side, sector, ticker, account, quantity, TIF).  
2. User sees confirmation consistent with REF-2 (toast).  
3. Trade enters pending workflow (BR-003).

**Traceability:** BR-002, BR-003 → REQ-FR-030–034.

---

### Story TKT-QAMVP-141 — Checker approval loop

**Summary:** Approve pending trades from queue  

**Acceptance criteria (business):**  
1. Queue lists only `pending_approval` items.  
2. Checker can approve a row and sees confirmation.  
3. Item leaves pending set; downstream approved views can reflect it (BR-005).

**Traceability:** BR-003, BR-004, BR-005 → REQ-FR-040–045.

---

### Story TKT-QAMVP-150 — Trade list & matching narrative

**Summary:** Trade list supports status and “Matched With” discussion  

**Acceptance criteria (business):**  
1. List shows columns per REF-2 including Status and Matched With (**BR-014**).  
2. Summary bar shows Total / Matched / Pending counts for class reconciliation drills.

**Traceability:** BR-005, BR-014 → REQ-FR-050,051.

---

## Annex D — Pairwise-style business scenario matrix (training)

*Not statistical DOE; a **curriculum** matrix to avoid reusing only one happy path.*

| Persona | Journey | Expected business outcome | BR emphasis |
|---------|---------|---------------------------|-------------|
| Maker | J-1 full | Pending created | BR-002, BR-003 |
| Maker | J-1 then logout | Session cleared | BR-012 |
| Checker | J-1 approve only | Pending cleared | BR-004 |
| Checker | Open empty queue | Teaches zero-pending ops | BR-003 |
| Maker | Dashboard after submit (before approve) | Pending not on dashboard | BR-005 |
| Maker | Trade list after approve | Row visible with status | BR-005, BR-014 |
| Trainee pair | Role swap mid-demo | Reinforces BR-006 | BR-006 |
| Facilitator | J-4 bad login | Safe failure | BR-001 |

### Expanded scenario catalog (short titles)

| ID | Title | BR |
|----|-------|-----|
| S-201 | Two makers same room, one checker | BR-006 |
| S-202 | Approve oldest pending first | BR-004 |
| S-203 | Discuss “what if reject existed” | Backlog |
| S-204 | Compare dashboard to queue counts | BR-005 |
| S-205 | Use SELL side only session | BR-002 |
| S-206 | GTC discussion only (no submit) | BR-002 |
| S-207 | Admin placeholder tour | BR-013 |
| S-208 | Logout mid-trade-entry | BR-012 |
| S-209 | Re-login same browser | BR-001 |
| S-210 | Narrate four-eyes without approving | BR-006, BR-004 |

---

## Annex E — Business risk register (expanded)

| ID | Risk description | Likelihood | Impact | Mitigation | Owner |
|----|------------------|------------|--------|------------|-------|
| R-B-01 | Audience assumes regulatory certification | M | H | Disclaimer §; kickoff slide | Sponsor |
| R-B-02 | Demo data confuses pending vs approved | M | M | Journey J-2; facilitator script | Training |
| R-B-03 | Credential sharing in classroom | L | M | Per-seat logins policy | Facilitator |
| R-B-04 | Automation flake erodes trust | M | M | Locator strategy; repair run | QA |
| R-B-05 | Scope creep into real OMS | H | M | BRD §4 out-of-scope list | Sponsor |
| R-B-06 | Wrong persona performs approve in story | L | H | Role badges; verbal cue | Facilitator |
| R-B-07 | Network outage mid-demo | L | M | Offline rehearsal | QA |
| R-B-08 | Version skew REF-2 vs build | M | M | Version tag in footer | Dev |

---

## Annex F — Internal audit “questions we can answer” (mock-appropriate)

| Question | Answer with BRD/FRS |
|----------|---------------------|
| Is segregation of duties illustrated? | Yes — maker vs checker journeys; BR-006, BR-004 |
| Is it SOX-compliant? | **No claim** — PoC only |
| Can we trace requirements to tests? | Yes — RTM + tracker |
| What is “approved”? | State post checker action; BR-005 for dashboard split |
| Are passwords production-grade? | **No** — lab credentials in REF-2 |

---

## Annex G — Combinatorial coverage checklist (business dimensions)

Use this to ensure demos rotate **Side** and **role** without exhaustive testing:

| Combo ID | Side | Role starting | Approve? |
|----------|------|---------------|----------|
| CB-01 | BUY | Maker | Y |
| CB-02 | SELL | Maker | Y |
| CB-03 | BUY | Maker | N (leave pending) |
| CB-04 | SELL | Checker only | Y (prior maker session) |

---

## Annex H — Slide outline (30-slide deck suggestion)

1. Title — QAMVP Mock Trading BRD walkthrough  
2. Objectives — BO-1…BO-4  
3. Scope in / out  
4. Personas  
5–8. BR-001…BR-004 one slide each  
9. Maker–checker diagram  
10. Journey J-1 timeline  
11–16. Capability map CAP-A…H  
17. Risks R-B-01…04  
18. Success measures  
19. Demo script  
20. FAQ  
21–24. Workshop modules M-1…M-4  
25. Anti-patterns  
26. Glossary  
27. RTM pointer  
28. Tracker pointer  
29. Next steps / backlog Appendix B  
30. Q&A  

---

## Annex I — Full-day workshop agenda (480 minutes)

| Time | Duration | Activity | BR / outcome |
|------|----------|----------|--------------|
| 09:00 | 30 | Registration & icebreaker | — |
| 09:30 | 45 | M-1 Opening + BRD §3 objectives | BO-1…4 |
| 10:15 | 15 | Break | — |
| 10:30 | 60 | M-2 Live J-1 dry run | BR-001–005 |
| 11:30 | 30 | Debrief: pending vs approved | BR-005 |
| 12:00 | 60 | Lunch | — |
| 13:00 | 45 | M-3 Automation literacy lab | BR-008–009 |
| 13:45 | 15 | Break | — |
| 14:00 | 60 | M-4 Controls deep dive | BR-006–007 |
| 15:00 | 30 | RTM + tracker tour | Traceability |
| 15:30 | 30 | Open Q&A | — |
| 16:00 | 30 | Action items & survey | — |

**Facilitator notes:** Keep **checker password** on slide footnote “REF-2 only — lab.” Never photograph passwords in audience photos.

---

## Annex J — Stakeholder RASCI (expanded)

| Activity | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| BRD baseline | BA proxy | Sponsor | QA | Dev |
| FRS baseline | BA + Dev | Sponsor | QA | Training |
| Demo dry run | QA | Sponsor | Product | All |
| Defect triage | Dev | QA Lead | — | Sponsor |
| Word export | QA | — | — | Stakeholders |
| UAT sign-off | QA | Sponsor | Compliance* | Dev |

*Optional role.

---

## Annex K — Business rule decision log (cumulative)

| BR-Ref | Decision | Date | Approver |
|--------|----------|------|----------|
| BR-005 | Dashboard approved-only per REF-2 | 2026-04-22 | Program |
| BR-007 | Pedagogical limitation explicit | 2026-04-22 | Program |
| BR-014 | Matched With in scope for training | 2026-04-22 | Program |

---

## Annex L — Expanded risk scenarios (narrative)

**Narrative L-1 — The “instant dashboard” misunderstanding:** A trainee assumes submitted trades appear immediately on the dashboard. **Business response:** Walk BR-005 and Journey J-2; contrast **operational queue** with **management summary**. **Residual risk:** Confusion in first 10 minutes of every cohort; mitigate with slide 11 in Annex H.

**Narrative L-2 — The “I approved my own trade” story:** Someone uses maker account then tries to approve. **Business response:** Discuss BR-006; whether SUT blocks technically is FRS; **business** lesson is independence. **Residual risk:** Technical bypass if SUT allows — document in REQ-SEC-003.

**Narrative L-3 — Credential projection:** Password visible on slide. **Business response:** Use facilitator guide password distribution; Annex I note. **Residual risk:** Photo leak — policy: no photos of credentials.

**Narrative L-4 — Scope argument:** Sponsor asks for real-time market data. **Business response:** BRD §4 out of scope; capture in backlog Appendix B.

**Narrative L-5 — Automation hero narrative:** Stakeholder claims “AI replaces QA.” **Business response:** BR-008/009 frame **assistive** automation; human approves releases.

---

## Annex M — KPI drill-down (qualitative rubric)

| KPI (§9) | Score 1 | Score 3 | Score 5 |
|----------|---------|---------|---------|
| Demo completeness | J-1 broken | J-1 works with help | J-1 flawless |
| Role clarity | Mixed roles | Mostly clear | Every trainee correct |
| Automation stability | Fails often | Passes usually | Passes reliably |
| Traceability | Gaps in RTM | RTM mostly complete | RTM + tracker 100% P1 |

---

## Annex N — Copy-paste: steering committee status (template)

**Subject:** QAMVP Mock Trading — BRD v0.1 / Annex update  

**Body:**  
Steering committee —  

This note confirms the **Business Requirements Document** for the mock trading SUT now includes **Annexes C–N**: JIRA-ready narratives, pairwise-style training matrices, expanded risk register, full-day workshop agenda, and governance templates.  

**Scope** remains limited to local PoC per §4. **Next decision:** whether to fund **reject workflow** (backlog Appendix B).  

**Attachments:** `01-business-requirements-document.docx` (generated from Markdown).  

Regards,  
[Name]

---

## Annex O — BR × capability cross-walk (dense)

| BR | CAP-A | CAP-B | CAP-C | CAP-D | CAP-E | CAP-F | CAP-G | CAP-H |
|----|-------|-------|-------|-------|-------|-------|-------|-------|
| BR-001 | X | | | | | | | |
| BR-002 | | X | | | | | | |
| BR-003 | | | X | | | | | |
| BR-004 | | | | X | | | | |
| BR-005 | | | | | X | | | |
| BR-011 | | | | | | X | | |
| BR-012 | | | | | | | X | |
| BR-013 | | | | | | | | X |

---

## Annex P — Ten-year vision stub (non-binding)

Year 1: PoC stable. Year 2: Optional reject path. Year 3: IAM integration **if** productized. Years 4–10: [Intentionally blank — not a commitment device].

---

## Annex Q — Executive briefing pack (long-form talking points)

**EP-01 — Why a mock matters:** Production order-management systems are expensive to repurpose for classroom use. A mock lets facilitators pause, replay, and deliberately inject mistakes without market consequences. The BRD keeps that mock **honest** about what it is not: it is not a certified control environment, but it **is** a faithful enough surface to rehearse language, roles, and reporting splits that appear in real desks.

**EP-02 — Maker–checker in one sentence:** Someone who benefits from a trade getting done should not be the only person who can declare it “done enough to count” in reporting views—our mock dramatizes that separation with two logins, not with bank-grade preventive technology.

**EP-03 — Dashboard philosophy:** Executives rarely want to see every in-flight exception on the same tile they use for “what closed.” We model that by keeping **pending** off the dashboard per REF-2, which is pedagogically loud even if product teams might choose different UX in live tools.

**EP-04 — PoC and compliance:** Compliance officers should treat this BRD as **training scope**, not evidence of control effectiveness. The questions in Annex F exist so audit partners know what we **can** and **cannot** claim without wasting cycles on misunderstandings.

**EP-05 — Automation as a second student:** QA automation is a parallel learner: it needs stable hooks and honest state transitions. BR-008/BR-009 exist so sponsors fund testability alongside features, avoiding brittle demos that break every Angular patch.

**EP-06 — Credential hygiene:** Lab passwords are **public within the lab** on purpose for reproducibility. The business rule is: never reuse, never imply rotation discipline matches production. Annex L narrative L-3 reinforces facilitator discipline.

**EP-07 — Backlog discipline:** Appendix B is where ambitious ideas go so they do not silently expand scope mid-sprint. Sponsors review backlog quarterly in a real program; in PoC, review monthly.

**EP-08 — Persona fairness:** Makers are not “junior” and checkers are not “senior”—they are **different responsibilities**. Language in training should avoid hierarchy bias and focus on **segregation of duties**.

**EP-09 — Metrics modesty:** Our KPIs in §9 are qualitative on purpose. Numeric defect SLAs belong in a production program; here we optimize for **understanding** and **repeatable demo**.

**EP-10 — Cross-functional literacy:** Engineers reading this BRD should skim personas; trainers should skim BO objectives. The Annex C JIRA text bridges both by stating **business acceptance** before technical tasks exist.

**EP-11 — Vendor neutrality:** We do not endorse a specific OMS vendor. Any resemblance to commercial workflows is **archetypal**, not competitive intelligence.

**EP-12 — Diversity of cohorts:** Annex D’s matrix reminds facilitators that one happy path is insufficient for global audiences—some regions emphasize control narratives more than others; rotate scenarios.

**EP-13 — Incident imagination:** Tabletop “what if the queue is wrong?” discussions use BR-005 and BR-003 tension—queue is operational truth for checkers; dashboard is a different lens.

**EP-14 — Sustainability:** If REF-2 drifts from code, business trust collapses. Version alignment is a **business governance** item, not only engineering trivia.

**EP-15 — Ethics of simulation:** We must never simulate client money, real counterparty names, or regulatory filings. Synthetic tickers only.

**EP-16 — Executive time:** Annex I schedules a full day; executives may join only Module M-4—give them Annex Q one-pagers EP-01–EP-05 in advance.

**EP-17 — Student assessments:** Use rubric Annex M for certification-lite programs; do not issue external CE credits without accreditation partner.

**EP-18 — Communication cadence:** Steering template Annex N should ship after every BRD minor version so stakeholders do not discover scope via rumor.

**EP-19 — Internationalization:** English-only is explicit assumption; translations require re-validation of role strings and error messages against BR-001.

**EP-20 — Sunsetting:** When PoC ends, archive Word exports with date stamp; do not leave stale `.docx` on shared drives without README pointer.

---

## Annex R — Synthetic business data catalog (training-safe)

| Symbol | Fake issuer | Sector | Use in class |
|--------|-------------|--------|----------------|
| SYN-A | Synthetic Alpha Inc. | Technology | BUY drills |
| SYN-B | Synthetic Beta LLC | Energy | SELL drills |
| SYN-C | Synthetic Gamma Co. | Healthcare | GTC discussion |
| SYN-D | Synthetic Delta Ltd. | Financials | Matching narrative |
| SYN-E | Synthetic Epsilon AG | Industrials | Quantity edge cases |

*All names are fabricated; no reference to live listings.*

---

## Annex S — Facilitator “difficult questions” script

| Tough question | Short answer | Deep dive pointer |
|----------------|--------------|-------------------|
| “Is this GDPR relevant?” | Lab synthetic data only | Legal |
| “Can we run in prod VPC?” | Out of scope §4 | Sponsor |
| “Does AI write the BRD?” | Human-authored; AI may assist | Program |

---

## Annex T — BR coverage heatmap (by workshop hour)

| Hour | BR touched |
|------|------------|
| 1 | BR-001, BR-006 |
| 2 | BR-002, BR-003 |
| 3 | BR-004, BR-005 |
| 4 | BR-008, BR-009 |
| 5 | BR-011, BR-012 |
| 6 | BR-013, BR-014 |

---

*End of BRD. Functional detail: [02-functional-requirements-specification.md](02-functional-requirements-specification.md).*
