# Knowledge Base Test Case Repository

**Document ID:** KB-TC-REPO-001
**Version:** 2026.05.01.102929
**Status:** Exported from ingestion DB structured test-case inventory.

This document is generated from `test-doc/test-case-repository.json`. It gives the RAG corpus the same row-level test-case detail as the Excel inventory, while the ingestion pipeline also loads the workbook into structured SQL tables.

## Inventory Summary

- Test cases: 16
- Test steps: 102
- Source workbook: `test_data/TestCases.xlsx`

## Catalog

| TestCaseID | Title | Priority | Suite | Requirements |
|------------|-------|----------|-------|--------------|
| TC-001 | Maker submits BUY, checker approves, dashboard reflects one approved trade | P1 | S-1 Smoke | REQ-FR-002, REQ-FR-003, REQ-FR-012, REQ-FR-014, REQ-FR-020, REQ-FR-022, REQ-FR-030, REQ-FR-031, REQ-FR-034, REQ-FR-040, REQ-FR-043, REQ-FR-044, REQ-FR-045 |
| TC-002 | Two pending trades are counted in queue and absent from dashboard until approval | P1 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-020, REQ-FR-022, REQ-FR-033, REQ-FR-041, REQ-FR-042 |
| TC-003 | Approved BUY and matching SELL become Matched in Trade List | P1 | S-1 Smoke | REQ-FR-002, REQ-FR-003, REQ-FR-014, REQ-FR-033, REQ-FR-043, REQ-FR-050, REQ-FR-051 |
| TC-004 | GTC trade requires expiration date and calculates notional total | P1 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-012, REQ-FR-030, REQ-FR-031, REQ-FR-032, REQ-FR-033, REQ-FR-040 |
| TC-005 | Trade list shows unmatched approved trade until compatible opposite trade is approved | P1 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-003, REQ-FR-014, REQ-FR-033, REQ-FR-043, REQ-FR-050, REQ-FR-051 |
| TC-006 | Invalid credentials do not authenticate and show safe error | P1 | S-3 Negative | REQ-FR-001, REQ-FR-004, REQ-FR-005 |
| TC-007 | Unauthenticated deep link is gated and logout clears protected access | P1 | S-3 Negative | REQ-FR-002, REQ-FR-005, REQ-FR-014, REQ-SEC-002 |
| TC-008 | Navigation menus expose all trading and admin destinations | P1 | S-2 Navigation | REQ-FR-002, REQ-FR-010, REQ-FR-012, REQ-FR-013, REQ-FR-014 |
| TC-009 | Trade form prevents submission when required fields are missing | P2 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-012, REQ-FR-033, REQ-FR-035 |
| TC-010 | Dashboard columns and loading state render for approved trades | P1 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-020, REQ-FR-021, REQ-FR-022, REQ-FR-023 |
| TC-011 | Trade List columns and summary bar reflect approved inventory | P2 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-050, REQ-FR-051 |
| TC-012 | Checker approval queue displays empty state and pending count zero | P2 | S-4 Detailed Regression | REQ-FR-003, REQ-FR-040, REQ-FR-041, REQ-FR-042, REQ-NFR-004 |
| TC-013 | Role label distinguishes maker and checker sessions | P1 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-003, REQ-FR-011, REQ-FR-014, REQ-SEC-001 |
| TC-014 | Ticker selection drives price and total recalculation | P1 | S-4 Detailed Regression | REQ-FR-002, REQ-FR-012, REQ-FR-030, REQ-FR-031 |
| TC-015 | Admin Users placeholder is reachable from authenticated shell | P3 | S-2 Navigation | REQ-FR-002, REQ-FR-010, REQ-FR-013, REQ-FR-060 |
| TC-016 | Local operability and automation hooks are verifiable from the browser | P1 | S-5 NFR Evidence | REQ-NFR-001, REQ-NFR-002 |

## TC-001 - Maker submits BUY, checker approves, dashboard reflects one approved trade

**Objective:** Validate the core maker-checker happy path from login through approval and approved-only dashboard count.
**Priority:** P1
**Suite:** S-1 Smoke
**Tags:** @smoke, @maker, @checker, @approval, @dashboard

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker using documented credentials. | Dashboard page loads and navbar shows admin (maker). | username=admin,password=admin |
| 2 | REQ-FR-012 | Open Trading menu and navigate to New Trade. | New Trade form is visible. | target=nav-new-trade |
| 3 | REQ-FR-030 | Select BUY, Technology, AAPL, Cash, quantity 100, Day Order. | All required trade form fields are populated. | side=BUY,sector=Technology,ticker=AAPL,accountType=Cash,quantity=100,timeInForce=Day Order |
| 4 | REQ-FR-031 | Wait for ticker price and total value to calculate. | Current Price is 178.50 and Total Value is 17850.00. | ticker=AAPL,expectedPrice=178.50,expectedTotal=17850.00 |
| 5 | REQ-FR-034 | Submit the order. | Success toast confirms Order TX-1001 and workflow moves toward approval queue. | expectedTxId=TX-1001 |
| 6 | REQ-FR-040 | Open Approval Queue as maker before approval. | Queue shows Pending: 1 and includes BUY AAPL quantity 100. | expectedPending=1,ticker=AAPL,side=BUY,quantity=100 |
| 7 | REQ-FR-014 | Logout maker. | Login page is visible and maker session is cleared. |  |
| 8 | REQ-FR-003 | Login as checker. | Dashboard page loads and navbar shows checker (checker). | username=checker,password=chscker@123 |
| 9 | REQ-FR-043 | Open Approval Queue and approve the AAPL BUY row. | Approve action completes for TX-1001. | ticker=AAPL,side=BUY |
| 10 | REQ-FR-044 | Observe approval feedback. | Toast displays Trade TX-1001 approved. | expectedToast=Trade TX-1001 approved |
| 11 | REQ-FR-045 | Refresh or revisit Approval Queue. | Queue shows Pending: 0 and the approved row is removed. | expectedPending=0 |
| 12 | REQ-FR-020 | Navigate to Dashboard. | Dashboard includes the approved AAPL trade and excludes pending-only rows. | ticker=AAPL |
| 13 | REQ-FR-022 | Verify Dashboard total count. | Total Trades: 1 is displayed. | expectedCount=1 |

## TC-002 - Two pending trades are counted in queue and absent from dashboard until approval

**Objective:** Prove pending trades are isolated to the approval queue and do not inflate approved dashboard totals.
**Priority:** P1
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @maker, @queue, @dashboard

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Navbar shows admin (maker). | username=admin,password=admin |
| 2 | REQ-FR-033 | Create BUY AAPL 100 Cash Day Order. | First trade is submitted and routed to pending approval. | side=BUY,sector=Technology,ticker=AAPL,accountType=Cash,quantity=100,timeInForce=Day Order |
| 3 | REQ-FR-033 | Create SELL AAPL 100 Cash Day Order. | Second trade is submitted and routed to pending approval. | side=SELL,sector=Technology,ticker=AAPL,accountType=Cash,quantity=100,timeInForce=Day Order |
| 4 | REQ-FR-042 | Navigate to Approval Queue. | Pending: 2 is displayed. | expectedPending=2 |
| 5 | REQ-FR-041 | Inspect queue columns and row values. | TX-ID, Side, Ticker, Qty, Price, Total, Action columns are visible with both AAPL rows. | expectedColumns=TX-ID\|Side\|Ticker\|Qty\|Price\|Total\|Action |
| 6 | REQ-FR-020 | Navigate to Dashboard without approving either trade. | Dashboard does not show the pending AAPL trades. | ticker=AAPL |
| 7 | REQ-FR-022 | Verify dashboard approved count remains zero. | Total Trades: 0 is displayed. | expectedCount=0 |

## TC-003 - Approved BUY and matching SELL become Matched in Trade List

**Objective:** Validate the matched-pair lifecycle after checker approval of opposite-side trades with the same ticker and quantity.
**Priority:** P1
**Suite:** S-1 Smoke
**Tags:** @smoke, @maker, @checker, @matching, @trade-list

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Maker session is established. | username=admin,password=admin |
| 2 | REQ-FR-033 | Create BUY JPM 50 Margin Day Order. | BUY JPM is submitted as pending approval. | side=BUY,sector=Financials,ticker=JPM,accountType=Margin,quantity=50,timeInForce=Day Order |
| 3 | REQ-FR-014 | Logout maker. | Login page is visible. |  |
| 4 | REQ-FR-003 | Login as checker. | Checker session is established. | username=checker,password=chscker@123 |
| 5 | REQ-FR-043 | Approve the pending BUY JPM row. | BUY JPM row is approved and leaves queue. | ticker=JPM,side=BUY |
| 6 | REQ-FR-014 | Logout checker. | Login page is visible. |  |
| 7 | REQ-FR-002 | Login as maker again. | Maker session is established. | username=admin,password=admin |
| 8 | REQ-FR-033 | Create SELL JPM 50 Margin Day Order. | SELL JPM is submitted as pending approval. | side=SELL,sector=Financials,ticker=JPM,accountType=Margin,quantity=50,timeInForce=Day Order |
| 9 | REQ-FR-014 | Logout maker. | Login page is visible. |  |
| 10 | REQ-FR-003 | Login as checker again. | Checker session is established. | username=checker,password=chscker@123 |
| 11 | REQ-FR-043 | Approve the pending SELL JPM row. | SELL JPM is approved and matching logic runs. | ticker=JPM,side=SELL |
| 12 | REQ-FR-050 | Navigate to Trade List. | Trade List displays both approved JPM rows with Status column populated. | ticker=JPM |
| 13 | REQ-FR-051 | Verify summary counts. | Total: 2, Matched: 2, Pending: 0 are displayed. | expectedTotal=2,expectedMatched=2,expectedPending=0 |
| 14 | REQ-FR-050 | Verify Matched With values. | Each JPM row references the opposite TX-ID in Matched With. | expectedStatus=Matched |

## TC-004 - GTC trade requires expiration date and calculates notional total

**Objective:** Cover conditional GTC field behavior and price-total calculation for a Technology ticker.
**Priority:** P1
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @maker, @trade-form, @gtc

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Maker dashboard loads. | username=admin,password=admin |
| 2 | REQ-FR-012 | Navigate to New Trade. | New Trade form is visible. | target=nav-new-trade |
| 3 | REQ-FR-032 | Change Time in Force to GTC. | Expiration Date field appears and is required. | timeInForce=GTC |
| 4 | REQ-FR-030 | Populate SELL MSFT 20 Margin GTC with expiration date. | All required fields including expiration date are populated. | side=SELL,sector=Technology,ticker=MSFT,accountType=Margin,quantity=20,timeInForce=GTC,expirationDate=2026-12-31 |
| 5 | REQ-FR-031 | Wait for MSFT price and total value. | Current Price is 415.20 and Total Value is 8304.00. | ticker=MSFT,expectedPrice=415.20,expectedTotal=8304.00 |
| 6 | REQ-FR-033 | Submit the GTC order. | Order confirmation toast appears and trade is pending approval. | expectedStatus=pending_approval |
| 7 | REQ-FR-040 | Open Approval Queue. | Pending row shows SELL MSFT quantity 20. | ticker=MSFT,side=SELL,quantity=20 |

## TC-005 - Trade list shows unmatched approved trade until compatible opposite trade is approved

**Objective:** Validate that an approved standalone trade remains Pending in Trade List until a compatible opposite-side match exists.
**Priority:** P1
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @checker, @trade-list, @matching

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Maker session is established. | username=admin,password=admin |
| 2 | REQ-FR-033 | Create BUY NVDA 10 Cash Day Order. | BUY NVDA is pending approval. | side=BUY,sector=Technology,ticker=NVDA,accountType=Cash,quantity=10,timeInForce=Day Order |
| 3 | REQ-FR-014 | Logout maker. | Login page is visible. |  |
| 4 | REQ-FR-003 | Login as checker. | Checker session is established. | username=checker,password=chscker@123 |
| 5 | REQ-FR-043 | Approve BUY NVDA. | BUY NVDA is approved. | ticker=NVDA,side=BUY |
| 6 | REQ-FR-050 | Navigate to Trade List. | Trade List displays the NVDA row with Status Pending and blank Matched With. | ticker=NVDA,expectedStatus=Pending |
| 7 | REQ-FR-051 | Verify summary after unmatched approval. | Total: 1, Matched: 0, Pending: 1 are displayed. | expectedTotal=1,expectedMatched=0,expectedPending=1 |

## TC-006 - Invalid credentials do not authenticate and show safe error

**Objective:** Validate negative authentication behavior for bad credentials.
**Priority:** P1
**Suite:** S-3 Negative
**Tags:** @negative, @auth

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-001 | Open login page. | Username, password, and Sign in controls are visible. |  |
| 2 | REQ-FR-004 | Enter invalid credentials and submit. | User remains on login page. | username=admin,password=wrong-password |
| 3 | REQ-FR-004 | Inspect login error message. | Invalid username or password is visible. | expectedError=Invalid username or password |
| 4 | REQ-FR-005 | Verify Trading menu is unavailable after failed login. | Authenticated navbar and trading links are not visible. |  |

## TC-007 - Unauthenticated deep link is gated and logout clears protected access

**Objective:** Validate route guard behavior before and after logout.
**Priority:** P1
**Suite:** S-3 Negative
**Tags:** @negative, @auth, @logout

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-005 | Open /trade directly while logged out. | Application redirects to login or blocks access to New Trade. | targetRoute=/trade |
| 2 | REQ-FR-002 | Login as maker. | Dashboard page loads. | username=admin,password=admin |
| 3 | REQ-FR-014 | Click Logout. | Login page is visible and session is cleared. |  |
| 4 | REQ-SEC-002 | Open /dashboard directly after logout. | Application requires login again or blocks protected content. | targetRoute=/dashboard |

## TC-008 - Navigation menus expose all trading and admin destinations

**Objective:** Validate stable click-based navigation and route reachability for automation.
**Priority:** P1
**Suite:** S-2 Navigation
**Tags:** @regression, @nav

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Authenticated navbar is visible. | username=admin,password=admin |
| 2 | REQ-FR-010 | Verify navbar persists on Dashboard. | Navbar remains visible on Dashboard. |  |
| 3 | REQ-FR-012 | Open Trading dropdown. | Dashboard, New Trade, Trade List, and Approval Queue links are visible. | trigger=trading-menu-trigger |
| 4 | REQ-FR-012 | Click New Trade. | New Trade page loads. | target=nav-new-trade |
| 5 | REQ-FR-012 | Open Trading dropdown and click Approval Queue. | Approval Queue page loads. | target=nav-queue |
| 6 | REQ-FR-012 | Open Trading dropdown and click Trade List. | Trade List page loads. | target=nav-trade-list |
| 7 | REQ-FR-013 | Open Admin dropdown and click Users. | Users placeholder page loads without breaking the shell. | target=nav-user-list |
| 8 | REQ-FR-014 | Logout. | Login page is visible. |  |

## TC-009 - Trade form prevents submission when required fields are missing

**Objective:** Validate front-end required-field guardrails before creating workflow state.
**Priority:** P2
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @negative, @trade-form

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Maker dashboard loads. | username=admin,password=admin |
| 2 | REQ-FR-012 | Navigate to New Trade. | New Trade form is visible. |  |
| 3 | REQ-FR-035 | Leave Market Sector and Quantity blank. | Submit Order remains disabled or submission is blocked. | missingFields=marketSector,quantity |
| 4 | REQ-FR-035 | Select Technology and leave Ticker blank. | Submit Order remains disabled or submission is blocked. | sector=Technology,missingFields=ticker,quantity |
| 5 | REQ-FR-035 | Enter quantity 0. | Quantity validation prevents valid submission. | quantity=0 |
| 6 | REQ-FR-033 | Verify no queue row was created. | Approval Queue still shows Pending: 0. | expectedPending=0 |

## TC-010 - Dashboard columns and loading state render for approved trades

**Objective:** Validate dashboard UX details, columns, loading state, and approved row presentation.
**Priority:** P1
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @dashboard

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Dashboard route starts loading. | username=admin,password=admin |
| 2 | REQ-FR-023 | Observe Dashboard immediately after navigation. | Loading trades indicator is visible before data resolves. |  |
| 3 | REQ-FR-021 | Inspect Dashboard table headers after loading. | TX-ID, Ticker, Quantity, and Total Value headers are visible. | expectedColumns=TX-ID\|Ticker\|Quantity\|Total Value |
| 4 | REQ-FR-022 | Inspect Dashboard summary. | Total Trades: N is displayed and matches approved row count. | expectedLabel=Total Trades: |
| 5 | REQ-FR-020 | Compare Dashboard rows to Approval Queue pending rows. | No pending_approval row appears on Dashboard. |  |

## TC-011 - Trade List columns and summary bar reflect approved inventory

**Objective:** Validate operational reporting on the approved trade list.
**Priority:** P2
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @trade-list

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Authenticated shell is visible. | username=admin,password=admin |
| 2 | REQ-FR-050 | Navigate to Trade List. | Trade List page loads. | target=nav-trade-list |
| 3 | REQ-FR-050 | Inspect Trade List headers. | TX-ID, Side, Ticker, Qty, Price, Total, Status, Matched With headers are visible. | expectedColumns=TX-ID\|Side\|Ticker\|Qty\|Price\|Total\|Status\|Matched With |
| 4 | REQ-FR-051 | Inspect summary bar. | Total, Matched, and Pending badges are visible. | expectedLabels=Total\|Matched\|Pending |
| 5 | REQ-FR-050 | Verify Trade List table structure — column headers for Side, Ticker, Qty, Price, Total, Status, and Matched With are present in the table definition (empty-state is acceptable for this isolation run; per-row content is verified by TC-003 steps 12-14). | Trade List column headers are visible in the table structure; zero data rows is acceptable for this structural check. | note=row-content-delegated-to-TC-003 |

## TC-012 - Checker approval queue displays empty state and pending count zero

**Objective:** Validate the queue empty state and count when no trades are waiting after the Playwright runner resets local browser storage for test isolation.
**Priority:** P2
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @checker, @queue

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-003 | Login as checker with a clean data store. | Checker dashboard loads. | username=checker,password=chscker@123,precondition=clearLocalStorage |
| 2 | REQ-FR-040 | Navigate to Approval Queue. | Approval Queue page loads. | target=nav-queue |
| 3 | REQ-FR-042 | Inspect pending count. | Pending: 0 is displayed. | expectedPending=0 |
| 4 | REQ-NFR-004 | Inspect empty queue message. | No pending trades. message is visible and page does not crash. | expectedMessage=No pending trades. |
| 5 | REQ-FR-041 | Inspect queue table headers. | Queue column headers remain visible for context. | expectedColumns=TX-ID\|Side\|Ticker\|Qty\|Price\|Total\|Action |

## TC-013 - Role label distinguishes maker and checker sessions

**Objective:** Validate role visibility as a four-eyes control aid.
**Priority:** P1
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @auth, @security

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Navbar identifies admin (maker). | username=admin,password=admin |
| 2 | REQ-FR-011 | Read navbar user display. | Displayed identity includes maker role. | expectedUser=admin (maker) |
| 3 | REQ-FR-014 | Logout maker. | Login page is visible. |  |
| 4 | REQ-FR-003 | Login as checker. | Navbar identifies checker (checker). | username=checker,password=chscker@123 |
| 5 | REQ-SEC-001 | Read navbar user display. | Displayed identity includes checker role. | expectedUser=checker (checker) |

## TC-014 - Ticker selection drives price and total recalculation

**Objective:** Validate async price lookup and recalculation when quantity changes.
**Priority:** P1
**Suite:** S-4 Detailed Regression
**Tags:** @regression, @maker, @pricing

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Maker dashboard loads. | username=admin,password=admin |
| 2 | REQ-FR-012 | Navigate to New Trade. | New Trade form is visible. |  |
| 3 | REQ-FR-030 | Select Financials sector. | Ticker dropdown enables JPM, BAC, and V choices. | sector=Financials,expectedTickers=JPM\|BAC\|V |
| 4 | REQ-FR-031 | Select V and enter quantity 3. | Current Price is 278.90 and Total Value is 836.70. | ticker=V,quantity=3,expectedPrice=278.90,expectedTotal=836.70 |
| 5 | REQ-FR-031 | Change quantity to 4. | Total Value recalculates to 1115.60 without changing price. | quantity=4,expectedTotal=1115.60 |
| 6 | REQ-FR-031 | Change ticker to BAC. | Current Price updates to 35.60 and Total Value recalculates to 142.40. | ticker=BAC,quantity=4,expectedPrice=35.60,expectedTotal=142.40 |

## TC-015 - Admin Users placeholder is reachable from authenticated shell

**Objective:** Validate admin placeholder route remains stable for PoC navigation.
**Priority:** P3
**Suite:** S-2 Navigation
**Tags:** @regression, @nav, @admin

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-FR-002 | Login as maker. | Authenticated shell is visible. | username=admin,password=admin |
| 2 | REQ-FR-013 | Open Admin dropdown. | Users link is visible. | trigger=nav-admin-trigger |
| 3 | REQ-FR-060 | Click Users. | Users placeholder route loads and navbar remains available. | target=nav-user-list |
| 4 | REQ-FR-010 | Navigate back to Dashboard through Trading menu. | Dashboard loads and navbar persists. | target=nav-dashboard |

## TC-016 - Local operability and automation hooks are verifiable from the browser

**Objective:** Validate that the SUT is reachable on the local Playwright base URL and key login controls expose stable data-testid hooks for automation.
**Priority:** P1
**Suite:** S-5 NFR Evidence
**Tags:** @regression, @nfr, @automation-hooks

| Step | RequirementID | StepDescription | ExpectedOutput | TestData |
|------|---------------|-----------------|----------------|----------|
| 1 | REQ-NFR-001 | Open login page at the local Playwright base URL. | Login page and controls render from the local SUT without mandatory cloud services. | targetRoute=/login |
| 2 | REQ-NFR-002 | Verify login page automation hooks expose stable data-testid attributes. | Login page, username, password, and sign-in controls are reachable by data-testid. | expectedTestIds=login-page\|auth-username-field\|login-password\|auth-sign-in-btn |
