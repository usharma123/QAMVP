# Quick tests

## Stage 5 — Advanced action generation

Requires `GOOGLE_API_KEY` in `.env` (or environment).

```bash
cd python-orchestrator
python scripts/test_advanced_action_generation.py
# or with a custom task:
python scripts/test_advanced_action_generation.py "Open Trade List from navbar"
```

This builds `build_action_creation_context()` (full locator table + existing `action_*.json`) and calls `create_advanced_action()` — same path as REPL `create action <desc>` without saving or registering in Excel.

## REPL (interactive)

```text
create action Open Trade List from navbar
```

Then save path is printed and you can register in `AdvancedActions.xlsx` (y/n).
