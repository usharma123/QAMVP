# Locator Repair — Single Page

You are a locator maintenance agent. The Angular application may have been upgraded and some locators for the **{{PAGE_NAME}}** page may have changed, been renamed, or removed. Reconcile the old locator inventory for this page against the current HTML template and live DOM.

## Locator Strategy

{{LOCATOR_STRATEGY}}

## Current Locator Inventory for "{{PAGE_NAME}}"

The `element_name` column is an internal key (no `$` prefix). The `current_xpath` column is the XPath the test framework currently uses to find the element.

{{LOCATOR_TABLE}}

## Current HTML Template

{{HTML_TEMPLATE}}

## Live DOM — `data-testid` values on this page (runtime)

{{TESTID_LIST}}

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
      "page": "{{PAGE_NAME}}",
      "reason": "Component was removed in the upgrade"
    }
  ],
  "added": [
    {
      "element_name": "new-element",
      "xpath": "//*[@data-testid='new-element']",
      "page": "{{PAGE_NAME}}"
    }
  ],
  "flagged": [
    {
      "element_name": "problematic-element",
      "issue": "data-testid missing — need developer to add it back",
      "suggested_testid": "suggested-name"
    }
  ],
  "summary": "Plain-English summary of what changed on this page"
}
```

### Guidelines

- The `element_name` values in the inventory are plain keys — they do NOT have a `$` prefix. Do NOT rename them just to remove a `$`.
- **ONLY report a change if the locator is broken** — i.e. the element no longer exists at its `current_xpath`, or the `data-testid`/`id`/structure it references has changed in the template.
- Do NOT "upgrade" a working structural XPath to a `data-testid` XPath. If `current_xpath` still correctly locates the element in the template/DOM, list it as `unchanged`.
- `renamed`: The element still exists in the DOM but its locator is **broken** — the `data-testid` value, `id`, or structure it references has genuinely changed. Use the `element_name` exactly as it appears in the inventory as `old_name`. Provide the corrected XPath as `new_xpath`. Use the same locator style (structural vs. data-testid) as the original.
- `unchanged`: The element exists and its `current_xpath` still correctly locates it. List its `element_name` here.
- `removed`: The element no longer exists in the template. Note why.
- `added`: New elements in the template that are not in the locator inventory.
- `flagged`: Elements that need developer attention (missing stable attribute, ambiguous locator).
- If the live testid list is "(browser skipped)", rely on the HTML template only.

Return ONLY the JSON object. No explanation, no markdown.
