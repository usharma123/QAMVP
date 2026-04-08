# Test script composition: macros vs primitives

## Default (orchestrator behavior)

Generation uses **[`composition_rules.md`](../python-orchestrator/prompts/composition_rules.md)** (injected into system, step, and refinement prompts):

- **Prefer** registered **advanced actions** when they cover the test intent.
- **Avoid** expanding macros into primitive steps unless no macro fits or the test explicitly targets low-level UI.

This is the **default** for all NL / `.md` / spreadsheet-driven tests—no flag required.

## Macro planning pre-call (generation)

Before JSON is produced, the orchestrator can run a dedicated LLM call (`macro_plan_prompt.md`) over the **full** test text. It returns an ordered list of macro names plus short notes. That plan is injected into the system and step prompts as **Planned macros**, and merged with keyword-based action filtering so turn-by-turn steps still see macros chosen for the whole flow.

- **Enable/disable:** `ENABLE_MACRO_PLANNING` (default: enabled). Set to `0`, `false`, `no`, or `off` to skip the pre-call.

## Optional overrides (test author)

Use these when you need **explicit** control:

### Markdown test scripts (`.md`)

Add a short **YAML frontmatter** block at the top (optional). The orchestrator does not parse YAML today; it passes the full file to the LLM. For **human + LLM** clarity, you can still document intent:

```yaml
---
composition: prefer-advanced-actions   # default; omit or use this for clarity
# composition: step-by-step-ui         # future: hint to favor primitives (not enforced by engine yet)
---
```

**Note:** Until the loader strips frontmatter, keep frontmatter minimal or remove it if you see the model echoing it—**or** put hints only in a `## Generation hints` section (recommended today).

### Spreadsheet test cases (`TestCases.xlsx`)

There is no extra column yet. Document macro preference in **StepDescription** (e.g. “Use `CreateBuyTrade` macro”) or rely on default composition rules.

## Runtime

Advanced actions must exist in the Java registry (`AdvancedActions.xlsx` / engine resolver). Macros that are only in JSON files must be registered for execution.
