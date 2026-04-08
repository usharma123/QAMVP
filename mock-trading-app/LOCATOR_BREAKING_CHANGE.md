# Intentional `data-testid` rename (option 1)

These DOM attributes were renamed to simulate an Angular refactor. **`test_data/locators.xlsx` and `test_data/generated_scripts/action_*.json` were not updated**, so existing scripts will fail at runtime until locators and actions are repaired.

| Old `data-testid` | New `data-testid` | File |
|-------------------|-------------------|------|
| `login-username` | `auth-username-field` | `login.component.html` |
| `login-submit` | `auth-sign-in-btn` | `login.component.html` |
| `nav-trading-trigger` | `trading-menu-trigger` | `navbar.component.html` |
| `queue-approve-btn` | `queue-action-approve` | `queue.component.html` |
| `dashboard-trade-count` | `dashboard-total-trades-label` | `dashboard.component.html` |

The dashboard rename targets **post-load** summary text (after `dashboard-loading` hides). Runtime DOM snapshots on `/dashboard` after login show `dashboard-total-trades-label`; `VerifyDashboardCount` still references `$dashboard-trade-count` until repaired.

**To recover:** update `locators.xlsx` (element names + xpaths), action JSONs, and prompts that reference the old `$…` names, then regenerate scripts as needed.
