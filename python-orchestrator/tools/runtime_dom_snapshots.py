"""
Runtime DOM snapshots for locator repair.

Uses Playwright to load the mock app, log in as maker, and capture page HTML
plus a deduplicated list of data-testid values per route — covering dynamic
content that static .html templates do not show (*ngFor rows, post-auth views).
"""

from __future__ import annotations

import os

# Max characters of HTML per route in the LLM prompt (avoid huge prompts).
_MAX_HTML_PER_ROUTE = 45_000

# Routes to visit after authentication (login is captured separately).
_POST_AUTH_ROUTES = [
    "/dashboard",
    "/trade",
    "/queue",
    "/trades",
    "/admin/users",
]


def _base_url() -> str:
    return os.environ.get("MOCK_APP_BASE_URL", "http://localhost:4200").rstrip("/")


def _truncate_html(html: str) -> tuple[str, bool]:
    if len(html) <= _MAX_HTML_PER_ROUTE:
        return html, False
    return html[:_MAX_HTML_PER_ROUTE] + "\n\n<!-- … truncated for prompt size … -->", True


def _extract_testids_from_page(page) -> list[str]:
    """Return sorted unique data-testid values in the current document."""
    ids = page.evaluate(
        """() => {
          const set = new Set();
          document.querySelectorAll('[data-testid]').forEach(el => {
            const v = el.getAttribute('data-testid');
            if (v) set.add(v);
          });
          return [...set].sort();
        }"""
    )
    return ids if isinstance(ids, list) else []


def capture_testids_per_page() -> dict[str, list[str]]:
    """Visit every route and return {route_path: [testid, ...]} — compact, no full HTML.

    Used by the per-page repair flow. Returns an empty dict on any failure.
    Keys are route paths (e.g. "/login", "/trade") and "/login" is always included.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {}

    try:
        from tools.test_data_defaults import load_test_data_defaults
        defaults = load_test_data_defaults()
        user = defaults.get("maker_username", "admin")
        password = defaults.get("maker_password", "admin")
    except Exception:
        user, password = "admin", "admin"

    base = _base_url()
    result: dict[str, list[str]] = {}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            page = context.new_page()
            page.set_default_timeout(25_000)

            try:
                page.goto(f"{base}/login", wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                result["/login"] = _extract_testids_from_page(page)
            except Exception:
                browser.close()
                return result

            try:
                page.locator(
                    '[data-testid="auth-username-field"], [data-testid="login-username"]'
                ).first.fill(user)
                page.locator('[data-testid="login-password"]').first.fill(password)
                page.locator(
                    '[data-testid="auth-sign-in-btn"], [data-testid="login-submit"]'
                ).first.click()
                page.wait_for_url("**/dashboard**", timeout=20_000)
                page.wait_for_timeout(1500)
            except Exception:
                browser.close()
                return result

            for path in _POST_AUTH_ROUTES:
                try:
                    page.goto(f"{base}{path}", wait_until="domcontentloaded")
                    page.wait_for_timeout(1500)
                    result[path] = _extract_testids_from_page(page)
                except Exception:
                    result[path] = []

            browser.close()
    except Exception:
        pass

    return result


def capture_runtime_dom_snapshots() -> str:
    """Return markdown for locator repair prompt, or a fallback message.

    Requires: pip install playwright && playwright install chromium
    App must be reachable at MOCK_APP_BASE_URL (default http://localhost:4200).
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return (
            "(Runtime DOM not captured: `playwright` is not installed. "
            "Run: `pip install playwright` then `playwright install chromium`. "
            "Rely on static HTML templates only.)"
        )

    # Lazy import test defaults for credentials
    try:
        from tools.test_data_defaults import load_test_data_defaults

        defaults = load_test_data_defaults()
        user = defaults.get("maker_username", "admin")
        password = defaults.get("maker_password", "admin")
    except Exception:
        user, password = "admin", "admin"

    base = _base_url()
    sections: list[str] = [
        "These snapshots come from a **headless browser** after navigation and login. "
        "They include **dynamic** markup (e.g. tables, lists) that may not appear in source `.html` files.\n",
    ]

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            page = context.new_page()
            page.set_default_timeout(25_000)

            # --- Login page ---
            login_url = f"{base}/login"
            try:
                page.goto(login_url, wait_until="domcontentloaded")
            except Exception as e:
                browser.close()
                return (
                    f"(Runtime DOM not captured: could not reach `{login_url}`: {e}. "
                    "Start the Angular app (`ng serve` in mock-trading-app). "
                    "Set MOCK_APP_BASE_URL if using a different host/port.)"
                )

            page.wait_for_timeout(2000)
            html = page.content()
            body, trunc = _truncate_html(html)
            testids = _extract_testids_from_page(page)
            sections.append(f"### Route: `{login_url}` (unauthenticated)\n")
            sections.append("**`data-testid` values on this page:**\n")
            sections.append("```\n" + ", ".join(testids) + "\n```\n")
            if trunc:
                sections.append(f"_(HTML truncated to {_MAX_HTML_PER_ROUTE} characters.)_\n")
            sections.append("```html\n" + body + "\n```\n")

            # --- Authenticate as maker (tolerate renamed login locators) ---
            try:
                page.locator(
                    '[data-testid="auth-username-field"], [data-testid="login-username"]'
                ).first.fill(user)
                page.locator('[data-testid="login-password"]').first.fill(password)
                page.locator(
                    '[data-testid="auth-sign-in-btn"], [data-testid="login-submit"]'
                ).first.click()
                page.wait_for_url("**/dashboard**", timeout=20_000)
                page.wait_for_timeout(1500)
            except Exception as e:
                sections.append(
                    f"\n### Authentication note\n"
                    f"Could not complete maker login (dynamic routes may be incomplete): `{e}`\n"
                )

            # --- Post-auth routes ---
            for path in _POST_AUTH_ROUTES:
                url = f"{base}{path}"
                try:
                    page.goto(url, wait_until="domcontentloaded")
                    page.wait_for_timeout(2000)
                    html = page.content()
                    body, trunc = _truncate_html(html)
                    testids = _extract_testids_from_page(page)
                    sections.append(f"### Route: `{url}`\n")
                    sections.append("**`data-testid` values on this page:**\n")
                    sections.append("```\n" + ", ".join(testids) + "\n```\n")
                    if trunc:
                        sections.append(
                            f"_(HTML truncated to {_MAX_HTML_PER_ROUTE} characters.)_\n"
                        )
                    sections.append("```html\n" + body + "\n```\n")
                except Exception as e:
                    sections.append(f"### Route: `{url}`\n_(Failed to load: {e})_\n")

            browser.close()
    except Exception as e:
        return (
            f"(Runtime DOM capture failed: {e}. "
            "Ensure Playwright browsers are installed: `playwright install chromium`.)"
        )

    return "\n".join(sections)
