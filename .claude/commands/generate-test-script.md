# Generate Test Script

Given a natural language test description, generate a valid JSON test script and save it to `test_data/generated_scripts/`.

## Steps

1. **Load current context** — run this to get available locators and actions:
   ```bash
   python claude-orchestrator/scripts/show-context.py
   ```

2. **Read the generation rules** from `python-orchestrator/prompts/system_prompt.md` — pay special attention to:
   - The built-in actions table
   - Composition rules (macro-first)
   - Few-shot examples at the bottom
   - The maker-checker workflow section

3. **Generate the JSON script** following these rules:
   - Use advanced actions (macros) wherever possible — one step per macro
   - NEVER duplicate what a macro already does internally
   - All locators must start with `$` and exist in the locator table
   - Add `WAIT_VISIBLE` after any navigation that loads a new page
   - `tcStep` must match the original numbered step from the input
   - Use `ASSERT_VARIABLE`/`ASSERT_CONTAINS` for captured variables, NOT `ASSERT_TEXT`
   - Only assert on steps with a non-empty ExpectedOutput

4. **Save the script** to a temporary path first:
   ```
   test_data/generated_scripts/script_<IDENTIFIER>_<YYYYMMDD_HHMMSS>.json
   ```
   Use the test case ID or a short slug as `<IDENTIFIER>`.

5. **Run the deterministic validator** (hard gate — must pass before done):
   ```bash
   python claude-orchestrator/scripts/validate-script.py test_data/generated_scripts/script_<IDENTIFIER>_<YYYYMMDD_HHMMSS>.json
   ```
   - If it exits 0 (VALID): the script is good — proceed to step 6
   - If it exits 1 (ERRORS): read the error output, fix every reported issue in the JSON file, and re-run the validator
   - Maximum 3 fix-and-revalidate attempts. If still failing after 3: report the remaining errors to the user

6. **Print a summary** of the generated steps (action + locator + input).

## Input

$ARGUMENTS

If no arguments: ask the user for the test description.
If the argument looks like a TC-ID (e.g. `TC-001`), first run:
```bash
python claude-orchestrator/scripts/show-context.py --tcs
```
to load the full test case definition, then generate from that.
