## Application Layout

### User Roles

| Role | Username | Password | Can do |
|---|---|---|---|
| Admin | (unknown) | (unknown) | Dashboard, Trade, Queue, Trade List, User List |
| Standard User | (unknown) | (unknown) | Dashboard, Trade, Queue, Trade List |

### Pages

| Route | Page | Key Elements |
|---|---|---|
| login | login | `login-page`, `login-form`, `auth-username-field`, `login-password`, `auth-sign-in-btn` |
| navbar | navbar | `navbar`, `nav-trading`, `nav-dashboard`, `nav-new-trade`, `nav-trade-list`, `nav-queue`, `nav-admin`, `navbar-logout` |
| dashboard | dashboard | `dashboard-page`, `dashboard-title` |
| trade | trade | `trade-page`, `trade-title`, `trade-form`, `trade-submit` |
| queue | queue | `queue-page`, `queue-title`, `queue-table` |
| trade-list | trade-list | `trade-list-page`, `trade-list-title`, `trade-list-table` |
| user-list | user-list | `user-list-page`, `user-list-title` |

### Navigation

- `trading-menu-trigger` opens `nav-trading-menu`.
- `nav-dashboard` links to Dashboard page.
- `nav-new-trade` links to Trade page.
- `nav-trade-list` links to Trade List page.
- `nav-queue` links to Queue page.
- `nav-admin-trigger` opens `nav-admin-menu`.
- `nav-user-list` links to User List page (under Admin menu).
- `navbar-logout` logs out the user.
