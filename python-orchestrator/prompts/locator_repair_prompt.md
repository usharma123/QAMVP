# Locator Repair Prompt — Post-Upgrade Bulk Fix

You are a locator maintenance agent. The Angular application has been upgraded and some `data-testid` locators may have changed, been renamed, or removed. Your job is to reconcile the old locator inventory with the **new DOM**. Use **both** static templates and runtime snapshots: templates show component source; runtime snapshots show rendered markup (dynamic lists, tables, conditional UI after login).

## Locator Strategy

{{LOCATOR_STRATEGY}}

## Old Locator Inventory (from locators.xlsx)

{{LOCATOR_TABLE}}

## New HTML Templates (current app source)

{{HTML_TEMPLATES}}

## Runtime DOM Snapshots (headless browser — dynamic content)

Captured after navigation and maker login when available. Prefer these for elements that only exist after Angular renders or data loads (`*ngFor`, async tables, post-auth views).

{{RUNTIME_DOM_SNAPSHOTS}}

## Template Diff (what changed in this upgrade)

{{TEMPLATE_DIFF}}

## Your Response

Return EXACTLY one JSON object:

```json
{
  "unchanged": ["element-name-1", "element-name-2"],
  "renamed": [
    {
      "old_name": "trade-submit",
      "new_name": "trade-submit-btn",
      "new_xpath": "//*[@data-testid='trade-submit-btn']"
    }
  ],
  "removed": [
    {
      "element_name": "old-element",
      "page": "trade",
      "reason": "Component was removed in the upgrade"
    }
  ],
  "added": [
    {
      "element_name": "new-element",
      "xpath": "//*[@data-testid='new-element']",
      "page": "trade"
    }
  ],
  "flagged": [
    {
      "element_name": "problematic-element",
      "issue": "data-testid missing — need developer to add it back",
      "suggested_testid": "suggested-name"
    }
  ],
  "summary": "Plain-English summary of what changed and overall health"
}
```

### Guidelines

- Cross-reference every entry in the old locator table against `data-testid` in **templates**, **runtime HTML**, and the per-route **`data-testid` lists** (runtime lists reflect what is actually in the DOM).
- If a testid appears only in runtime snapshots, treat it as present in the live app.
- `renamed`: The element still exists but `data-testid` value changed. Provide the updated XPath.
- `removed`: The element no longer exists in any template. Note which page it was on and why.
- `added`: New `data-testid` attributes in the templates that aren't in the old inventory.
- `flagged`: Elements that lost their `data-testid` but the underlying UI element still exists.
- If the diff is provided, use it to quickly identify renamed/removed/added elements without scanning all templates.

Return ONLY the JSON object. No explanation, no markdown.
