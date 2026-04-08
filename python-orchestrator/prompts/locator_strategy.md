# Locator Strategy — Self-Healing XPath Rules

## Purpose

These instructions govern how the AI agent generates, validates, and repairs element locators for the mock trading application. The strategy is designed to survive Angular version upgrades, component library swaps, and DOM restructuring.

## Core Rule: Framework-Agnostic Attribute Selectors

Always use `data-testid` with a wildcard tag:

```
//*[@data-testid='<value>']
```

### What this means

- **Never reference HTML tag names.** Do not use `//input[...]`, `//select[...]`, `//button[...]`. If a `<select>` becomes a `<mat-select>`, a custom `<div role="listbox">`, or any other widget, the locator must still work.
- **Never encode parent-child DOM nesting.** Do not chain locators like `//form[...]//input[...]`. Angular may insert host elements, `<ng-container>`, or wrapper `<div>` elements between versions.
- **Never use CSS classes, Angular component selectors, or generated IDs.** These are unstable across builds and framework upgrades.
- **Only use `data-testid`.** This attribute is explicitly maintained for test automation and is the single source of truth for element identity.

### Why

| Approach | Breaks when... |
|----------|---------------|
| `//input[@data-testid='...']` | Tag changes (e.g. `<input>` to `<textarea>` or custom component) |
| `//form//input[@data-testid='...']` | DOM nesting changes (Angular host elements, layout refactor) |
| `//*[@class='btn-primary']` | CSS class renamed or framework swap |
| `//*[@id='username']` | ID strategy changes or IDs become dynamic |
| `//*[@data-testid='...']` | **Only breaks if `data-testid` is removed** |

## Self-Healing Procedure

When a locator fails at runtime:

1. **Check if `data-testid` still exists** in the current DOM (via `page_source` or DevTools).
2. **If the attribute exists but the XPath fails**, the DOM structure changed. Rewrite the XPath using the wildcard pattern above.
3. **If the attribute is missing**, search the DOM for the closest semantic match (same `role`, `aria-label`, or visible text). Propose a new `data-testid` to add and flag it for a developer to implement.
4. **Never fall back to brittle selectors** (absolute paths, indexes, CSS classes) as a permanent fix. These are acceptable only as temporary overrides while a `data-testid` is added.

## Locator Source of Truth

All locators are stored in `test_data/locators.xlsx` — one sheet per page. Each sheet has two columns:

```
element_name | xpath
```

- **Sheet name** = the page (e.g. `login`, `dashboard`, `trade`, `queue`, `navbar`).
- `element_name`: The `data-testid` value (globally unique across the app).
- `xpath`: The `//*[@data-testid='...']` expression.

When generating or repairing test scripts, always look up locators from this workbook rather than hardcoding XPaths in test logic.

## Locator Repair — Respect Existing Strategy

When **repairing** locators, do NOT change the locator style. If the current XPath uses a structural selector (`//div[@class='...']`, `//input[@id='...']`, etc.), keep that style in the repaired XPath. Only change the XPath if it is actually broken (the element can no longer be found using it).

- A structural XPath like `//div[@class='trade-page']` is fine if that class still exists in the template.
- A `data-testid` XPath like `//*[@data-testid='login-username']` is fine if that attribute still exists.
- Do NOT "upgrade" a working structural XPath to `data-testid` style.
- Do NOT "downgrade" a working `data-testid` XPath to structural.

Only report a locator as changed if it is **broken** in the current template/DOM.
