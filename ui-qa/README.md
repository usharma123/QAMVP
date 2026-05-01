# ui-qa

Local Cursor SDK QA agent product surface for QAMVP.

## Run

```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP/ui-qa
bun install
bun run dev
```

Open `http://127.0.0.1:5175`.

The API listens on `http://127.0.0.1:4175`.

## What It Owns

- Source document upload and classification.
- Local Postgres + pgvector ingestion workflow adapted from `ingestion/`.
- Entity map and generated-test evidence artifacts.
- Cursor SDK chat and visible tool calls.
- Generated test-case confidence audit.
- Structured DB reseed and repository artifact export.
- Playwright execution control and artifact verification.
- Human checkpoints, stop/redirect controls, and durable run records.

Run records are stored under `test_data/test-results/ui-runs/<runId>/run.json`.

## Environment

- `CURSOR_API_KEY`: enables Cursor SDK agent calls. Without it, the app still runs deterministic local workflow steps and records a warning event.
- `CURSOR_AGENT_MODEL`: defaults to `composer-2`.
- `QAMVP_ROOT`: defaults to the parent repository root.
- `DATABASE_URL`: defaults to `postgresql://ingestion:ingestion@localhost:5433/ingestion`.
- `UI_QA_API_PORT`: defaults to `4175`.
