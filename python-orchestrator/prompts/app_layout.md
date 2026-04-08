## Application Layout

### User Roles

| Role | Username | Password | Can do |
|------|----------|----------|--------|
| Maker | `admin` | `admin` | Submit trades (go to approval queue) |
| Checker | `checker` | `chscker@123` | Approve pending trades |

Both roles can view Dashboard, Trade List, and Approval Queue.

### Pages

| Route | Page | Key Elements |
|-------|------|-------------|
| `/login` | Login | Username field, Password field, Submit button. Error message on bad credentials. Accepts both maker and checker credentials. |
| `/dashboard` | Dashboard | Trades summary table (TxID, Ticker, Quantity, Total), "Total Trades: N" count. Only shows **approved** trades (not pending_approval). Loading spinner while data fetches. |
| `/trade` | New Trade | Trade entry form: Side (BUY/SELL), Sector, Ticker (async price fetch after selection), Account Type, Quantity, Time in Force (conditionally shows Expiration Date for GTC). Current Price and Total Value display. Submit button. Toast notification on success. |
| `/queue` | Approval Queue | Table of trades with status `pending_approval`: TxID, Side, Ticker, Qty, Price, Total. Per-row "Approve" button. "Pending: N" count. Toast on approval. |
| `/trades` | Trade List | Table of all approved trades: TxID, Side, Ticker, Quantity, Price, Total, Status, Matched With. Summary bar: Total count, Matched count, Pending count. |
| `/admin/users` | Users | Placeholder admin page. |

### Navigation

- Global navbar is always visible after login.
- Navbar shows current user and role (e.g. "admin (maker)").
- **Click-based dropdown menus** (not CSS hover).
- "Trading" dropdown (`$trading-menu-trigger`) contains:
  - Dashboard (`$nav-dashboard`)
  - New Trade (`$nav-new-trade`)
  - Trade List (`$nav-trade-list`)
  - Approval Queue (`$nav-queue`)
- "Admin" dropdown (`$nav-admin-trigger`) contains:
  - Users (`$nav-user-list`)
- Logout button (`$navbar-logout`) — clears current user, returns to `/login`.
