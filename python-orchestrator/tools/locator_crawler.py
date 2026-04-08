"""
Locator crawler — generate a fresh locator inventory by crawling the live app.

Uses Playwright to visit each route, extracts interactable elements using a
tiered strategy (data-testid → id → structural), and returns a dict of
{sheet_name: [{element_name, xpath, tier}, ...]} ready to write to xlsx.

No LLM involved — pure DOM extraction.
"""

from __future__ import annotations

import os
import re

# Route → sheet name mapping (matches locators.xlsx convention)
ROUTE_SHEET_MAP: list[tuple[str, str]] = [
    ("/login", "login"),
    ("/dashboard", "dashboard"),
    ("/trade", "trade"),
    ("/queue", "queue"),
    ("/trades", "trade-list"),
    ("/admin/users", "user-list"),
]

# Navbar is extracted from the dashboard page and written to its own sheet
NAVBAR_SHEET = "navbar"

# JS snippet injected into each page to extract candidate elements
_EXTRACT_JS = """
() => {
  const seen_names = new Set();
  const results = [];

  function slugify(text) {
    return text.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  function record(element_name, xpath, tier) {
    if (!element_name || seen_names.has(element_name)) return;
    seen_names.add(element_name);
    results.push({ element_name, xpath, tier });
  }

  // Tier 1: data-testid
  document.querySelectorAll('[data-testid]').forEach(el => {
    const v = el.getAttribute('data-testid');
    if (v) record(v, `//*[@data-testid='${v}']`, 1);
  });

  // Tier 2: interactable elements with a hand-authored id (skip generated ids)
  const interactable = 'input, select, textarea, button, a[href]';
  document.querySelectorAll(interactable).forEach(el => {
    const id = el.getAttribute('id');
    // Skip Angular-generated ids (e.g. mat-input-0, ng-select-1, cdk-...)
    if (!id || /^(mat-|ng-|cdk-|_ng|mdc-)/.test(id) || /\\d{3,}/.test(id)) return;
    if (!el.hasAttribute('data-testid')) {
      const tag = el.tagName.toLowerCase();
      record(id, `//*[@id='${id}']`, 2);
    }
  });

  // Tier 3: buttons/links without data-testid or id, but with aria-label or visible text
  document.querySelectorAll('button, a[href]').forEach(el => {
    if (el.hasAttribute('data-testid') || el.getAttribute('id')) return;
    const label = el.getAttribute('aria-label') || el.textContent;
    if (!label || !label.trim()) return;
    const slug = slugify(label);
    if (!slug) return;
    const tag = el.tagName.toLowerCase();
    const ariaLabel = el.getAttribute('aria-label');
    const xpath = ariaLabel
      ? `//${tag}[@aria-label='${ariaLabel}']`
      : `//${tag}[normalize-space(text())='${label.trim()}']`;
    record(`${slug}_structural`, xpath, 3);
  });

  return results;
}
"""

# JS snippet for navbar-specific elements (run on post-login page)
_EXTRACT_NAVBAR_JS = """
() => {
  const seen_names = new Set();
  const results = [];

  function record(element_name, xpath, tier) {
    if (!element_name || seen_names.has(element_name)) return;
    seen_names.add(element_name);
    results.push({ element_name, xpath, tier });
  }

  // Navbar: everything inside nav/header with data-testid
  const navRoots = document.querySelectorAll('nav, header, [data-testid="navbar"]');
  const seen_els = new Set();
  navRoots.forEach(root => {
    root.querySelectorAll('[data-testid]').forEach(el => {
      if (seen_els.has(el)) return;
      seen_els.add(el);
      const v = el.getAttribute('data-testid');
      if (v) record(v, `//*[@data-testid='${v}']`, 1);
    });
    // Also the root itself if it has a testid
    if (root.hasAttribute('data-testid')) {
      const v = root.getAttribute('data-testid');
      record(v, `//*[@data-testid='${v}']`, 1);
    }
  });

  return results;
}
"""


def _base_url() -> str:
    return os.environ.get("MOCK_APP_BASE_URL", "http://localhost:4200").rstrip("/")


def _login(page, user: str, password: str) -> bool:
    """Attempt maker login. Returns True if successful."""
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
        return True
    except Exception:
        return False


def crawl_and_generate_locators(
    progress_callback=None,
) -> dict[str, list[dict]]:
    """Crawl all app routes and return {sheet_name: [{element_name, xpath, tier}, ...]}.

    progress_callback(route, sheet, elements) is called after each route if provided.
    Returns an empty dict if Playwright is not available or the app is unreachable.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "Playwright is not installed. Run: pip install playwright && playwright install chromium"
        )

    try:
        from tools.test_data_defaults import load_test_data_defaults
        defaults = load_test_data_defaults()
        user = defaults.get("maker_username", "admin")
        password = defaults.get("maker_password", "admin")
    except Exception:
        user, password = "admin", "admin"

    base = _base_url()
    result: dict[str, list[dict]] = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 720})
        page = ctx.new_page()
        page.set_default_timeout(25_000)

        # --- Login page (unauthenticated) ---
        page.goto(f"{base}/login", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        elements = page.evaluate(_EXTRACT_JS)
        result["login"] = elements
        if progress_callback:
            progress_callback("/login", "login", elements)

        # --- Authenticate ---
        logged_in = _login(page, user, password)
        if not logged_in:
            browser.close()
            raise RuntimeError(
                f"Could not log in to {base}/login — check credentials and that the app is running."
            )

        # --- Navbar (extracted from dashboard after login) ---
        navbar_elements = page.evaluate(_EXTRACT_NAVBAR_JS)
        result[NAVBAR_SHEET] = navbar_elements
        if progress_callback:
            progress_callback("/dashboard (navbar)", NAVBAR_SHEET, navbar_elements)

        # --- Post-auth routes ---
        for route, sheet in ROUTE_SHEET_MAP:
            if sheet == "login":
                continue  # already done
            url = f"{base}{route}"
            try:
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                elements = page.evaluate(_EXTRACT_JS)
                # Exclude navbar elements (already in navbar sheet) to avoid duplication
                nav_names = {e["element_name"] for e in result.get(NAVBAR_SHEET, [])}
                page_elements = [e for e in elements if e["element_name"] not in nav_names]
                result[sheet] = page_elements
                if progress_callback:
                    progress_callback(route, sheet, page_elements)
            except Exception as e:
                result[sheet] = []
                if progress_callback:
                    progress_callback(route, sheet, [])

        browser.close()

    return result
