# test-doc — QAMVP Mock Trading SUT Documentation Pack

This directory contains **business requirements (BRD)**, **functional requirements (FRS)**, **test design (TDS)**, enterprise-style **test strategy/plan/traceability/quality** artifacts, and an **SDLC test tracker** workbook. All narrative documents are authored in **Markdown** (`.md`); **Microsoft Word** (`.docx`) files are **generated** from Markdown and must not be edited directly.

## Source of truth

| Format | Role |
|--------|------|
| `*.md` | Authoritative text, cross-links, section anchors (`§`), requirement IDs. |
| `*.docx` | Stakeholder distribution; regenerate after any Markdown change. |
| `SDLC-Test-Tracker.xlsx` | Live tracking of gates, requirements, tickets, and test execution. |
| `../test_data/TestCases.xlsx` | Detailed executable test-case repository with one row per step. |

**Primary SUT specification reference (repo):** [`../python-orchestrator/prompts/app_layout.md`](../python-orchestrator/prompts/app_layout.md)

## Document map

| # | Markdown | Word (generated) | Summary |
|---|----------|------------------|---------|
| 01 | [01-business-requirements-document.md](01-business-requirements-document.md) | `01-business-requirements-document.docx` | BRD — business objectives, scope, personas, controls |
| 02 | [02-functional-requirements-specification.md](02-functional-requirements-specification.md) | `02-functional-requirements-specification.docx` | FRS — shall-statements, per-route behavior |
| 03 | [03-test-design-specification.md](03-test-design-specification.md) | optional `.docx` | TDS — scenarios, tags, traceability to FRS § |
| 04 | [04-test-strategy.md](04-test-strategy.md) | optional | Test strategy |
| 05 | [05-test-plan.md](05-test-plan.md) | optional | Test plan |
| 06 | [06-requirements-traceability-matrix.md](06-requirements-traceability-matrix.md) | optional | RTM — BR / REQ / TDS / TKT / TC |
| 07 | [07-test-data-environment-specification.md](07-test-data-environment-specification.md) | optional | Test data & environment |
| 08 | [08-quality-risk-defect-governance.md](08-quality-risk-defect-governance.md) | optional | Quality gates & defect governance |
| 09 | [09-test-case-repository.md](09-test-case-repository.md) | generated from script | Detailed TC repository mirroring `test_data/TestCases.xlsx` |
| — | — | [SDLC-Test-Tracker.xlsx](SDLC-Test-Tracker.xlsx) | SDLC & testing tracker |

## ID conventions

- **BR-xxx** — Business requirement ID (used in BRD and RTM).
- **BRD §x.y.z** — Section reference in [01-business-requirements-document.md](01-business-requirements-document.md).
- **REQ-FR-xxx**, **REQ-NFR-xxx**, **REQ-SEC-xxx** — Functional / non-functional / security requirements in FRS.
- **FRS §x.y.z** — Section reference in [02-functional-requirements-specification.md](02-functional-requirements-specification.md).
- **TKT-QAMVP-xxx** — Work item / ticket identifier.
- **TC-xxx** — Test case identifier (may align with `test_data/` artifacts).

## Export Markdown to Word

**Prerequisite:** [Pandoc](https://pandoc.org/installing.html) installed and on `PATH`.

From repository root:

```bash
./test-doc/scripts/export-docx.sh
```

Or only BRD + FRS:

```bash
./test-doc/scripts/export-docx.sh --core
```

The script writes `.docx` files next to the corresponding `.md` files under `test-doc/`.

## Build / refresh SDLC tracker

Requires Python 3 with `openpyxl`. On macOS/Homebrew Python (PEP 668), use a local venv under `test-doc/.venv` (gitignored):

```bash
cd /path/to/QAMVP
python3 -m venv test-doc/.venv
test-doc/.venv/bin/pip install openpyxl
test-doc/.venv/bin/python test-doc/scripts/build_sdlc_tracker.py
```

Alternatively, use any environment where `pip install openpyxl` works (e.g. `python-orchestrator` tooling). The script overwrites `test-doc/SDLC-Test-Tracker.xlsx` with a baseline aligned to BRD/FRS/RTM IDs.

## Build / refresh detailed test cases

The detailed test-case inventory is generated from one JSON source so Excel, Markdown, and ingestion stay aligned:

```bash
cd /path/to/QAMVP
python3 test-doc/scripts/build_test_case_repository.py
```

Default input: `test-doc/test-case-repository.json`. Schema: `test-doc/test-case-repository.schema.json`.

This overwrites `test_data/TestCases.xlsx` and `test-doc/09-test-case-repository.md`. The ingestion pipeline loads the workbook into structured SQL tables (`test_cases`, `test_case_steps`) and also embeds one chunk per test case for RAG retrieval.

For another documentation pack, provide a different spec and output paths:

```bash
python3 test-doc/scripts/build_test_case_repository.py \
  --spec /path/to/other-docs/test-case-repository.json \
  --workbook-out /path/to/other-test-data/TestCases.xlsx \
  --markdown-out /path/to/other-docs/09-test-case-repository.md
```

To run the full repeatable flow for this repo:

```bash
DATABASE_URL=postgresql://ingestion:ingestion@localhost:5433/ingestion \
  ./ingestion/scripts/reseed_knowledge_base.sh
```

For another docs directory, set `TEST_DOC_DIR`, `TEST_CASE_SPEC`, and `TEST_CASE_XLSX` before running the wrapper.

## Traceability flow

```text
BRD (BR / §) → FRS (REQ / §) → TDS → Test cases & tracker
                    ↓
              06-requirements-traceability-matrix.md
                    ↓
              09-test-case-repository.md / TestCases.xlsx
```

## Approximate size (for print planning)

At ~500 words per US letter page (single-spaced body text), run `wc -w test-doc/01-business-requirements-document.md test-doc/02-functional-requirements-specification.md` — as of v0.2 this is **~6.2k / ~7.2k words** (~12–15 pages each). Double-spaced or large margins in Word will increase page count. Regenerate `.docx` after any Markdown change.

## Revision

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-04-22 | Program | Initial pack for QAMVP mock trading SUT |
| 0.2 | 2026-04-22 | Program | BRD Annexes C–T; FRS §29–47 expansions (pairwise, JIRA text, TC catalog, manual procedure) |
