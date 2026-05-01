# QAMVP Business QA Loop UI

Local business-presentable cockpit for the governed QAMVP QA loop.

## Run

```bash
cd /Users/utsavsharma/Documents/GitHub/QAMVP/qa-loop-ui
bun install
bun run dev
```

Open `http://127.0.0.1:5174`.

The backend listens on `http://127.0.0.1:4174`. Production mode serves the built frontend from the same backend:

```bash
bun run build
bun run start
```

## Behavior

- Business users see curated phases, decisions, risk, evidence, and outcomes.
- Raw shell commands, Claude SDK payloads, stdout/stderr, and exit codes are only shown in expandable technical details.
- Run records are persisted under `test_data/test-results/ui-runs/<runId>/run.json`.
- The v1 orchestrator runs deterministic local checks directly and invokes Claude Agent SDK for governed slash-command phases.

## Environment

Optional variables:

- `QAMVP_ROOT`: defaults to the parent repo root.
- `QA_LOOP_API_PORT`: defaults to `4174`.
- `QA_LOOP_DRY_RUN=1`: emits business events without executing shell/SDK commands.
- `ANTHROPIC_API_KEY`: required by Claude Agent SDK if your local Claude auth is not already configured.
