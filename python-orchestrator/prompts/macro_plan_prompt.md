# Macro planning — select advanced actions for the whole test

You are choosing which **registered advanced actions (macros)** best cover the **entire** test flow before any step-by-step JSON is written.

## Registry (names only — you must pick from this list)

{{ADVANCED_ACTIONS_INDEX}}

{{COMPOSITION_RULES}}

## Your task

Read the full test description below. Output an **ordered** list of macro **names** you intend the script generator to use, in **execution order**.

- Prefer **one composite macro** when it covers the full flow (e.g. a single macro that creates buy, approves, creates matching sell, approves).
- Include **login/logout** macros when the test switches users (maker vs checker).
- Do **not** list built-in primitives (`CLICK`, `TYPE`, …) here — only advanced action names from the registry.
- If the test is only low-level UI assertions with no suitable macro, return an empty `macros` array and explain in `notes`.

## Output format

Return **only** valid JSON:

```json
{
  "macros": ["LoginAsMaker", "CreateBuyTrade", "Logout"],
  "notes": "One sentence why this ordering fits the test."
}
```
