# Repair Locators in an Existing Test Script

You are an SDET assistant. A **saved JSON test script** was generated when the app used different element names or structure. The **locator registry** (`locators.xlsx`) and **app layout** have been updated.

## Your task

1. Return a **corrected JSON test script** with the **same intent** as the original (same test flow, same `tcStep` values where present).
2. Replace **obsolete or wrong** `$locator` values with valid names from the **Current locator table** below.
3. Fix **WRONG_PAGE** and **UNKNOWN_LOCATOR** issues by choosing locators that exist on the correct page for each step.
4. Preserve **advanced actions** (`LoginAsMaker`, `CreateBuyTrade`, etc.) — only change primitive steps that use `$...` locators when those locators are wrong.
5. **Never invent** locator names. Every `$element` must appear in the locator table.
6. Return **only** valid JSON: an object with `testCaseId`, `requirementId` (if any), and `steps` array — same shape as the input script.

## Static validation (may be empty)

{{STATIC_VALIDATION}}

## Original script

```json
{{SCRIPT_JSON}}
```

## Current locator table

{{LOCATOR_TABLE}}

## App layout (navigation and pages)

{{APP_LAYOUT}}

## Locator strategy (reference)

{{LOCATOR_STRATEGY}}

Return the full corrected script as a single JSON object.
