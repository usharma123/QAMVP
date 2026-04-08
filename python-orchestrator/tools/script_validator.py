"""
Static script validator — deterministic, no LLM.

Walks a generated JSON script step-by-step, tracks current page via a
simple state machine, and checks each step for structural errors:

  1. UNKNOWN_LOCATOR  — locator not in locators.xlsx
  2. WRONG_PAGE       — locator belongs to a different page than current
  3. MISSING_WAIT     — navigation without a subsequent WAIT_VISIBLE

The page model is derived at runtime from locators.xlsx (sheet = page)
and the action_*.json end-page metadata. No hand-maintained config.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from tools.locator_store import load_locator_page_map, load_page_elements

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ACTIONS_DIR = REPO_ROOT / "test_data" / "generated_scripts"

# Actions where the locator field is intentionally empty
NO_LOCATOR_ACTIONS = {
    "OPEN_URL", "SCREENSHOT", "ASSERT_VARIABLE", "ASSERT_CONTAINS",
}


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ValidationError:
    step_index: int
    action: str
    locator: str
    error_type: str        # UNKNOWN_LOCATOR, WRONG_PAGE, MISSING_WAIT
    message: str           # Human-readable, fed back to LLM

    def __str__(self) -> str:
        return f"Step {self.step_index} ({self.action} on {self.locator}): {self.error_type} — {self.message}"


@dataclass
class ValidationResult:
    errors: list[ValidationError] = field(default_factory=list)

    @property
    def is_clean(self) -> bool:
        return len(self.errors) == 0

    def format_for_llm(self) -> str:
        if self.is_clean:
            return ""
        lines = []
        for e in self.errors:
            lines.append(f"- **Step {e.step_index}** (`{e.action}` on `{e.locator}`): "
                         f"{e.error_type} — {e.message}")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Page model — derived from locators.xlsx and action JSONs at runtime
# ---------------------------------------------------------------------------

def _load_locator_page_map() -> dict[str, str]:
    """Return {element_name: page} from locators.xlsx."""
    return load_locator_page_map()


def _load_page_elements() -> dict[str, set[str]]:
    """Return {page: set of element names} from locators.xlsx."""
    return load_page_elements()


def _load_action_end_pages() -> dict[str, str]:
    """Derive end page for each advanced action from its last step's locator."""
    if not ACTIONS_DIR.exists():
        return {}

    loc_map = _load_locator_page_map()
    end_pages: dict[str, str] = {}

    for f in ACTIONS_DIR.glob("action_*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        name = data.get("name", "")
        steps = data.get("steps", [])
        if not name or not steps:
            continue

        last_step = steps[-1]
        last_locator = last_step.get("locator", "").lstrip("$")
        if last_locator and last_locator in loc_map:
            end_pages[name] = loc_map[last_locator]

    return end_pages


# URL path → page mapping
_URL_PAGE_MAP = {
    "login": "login",
    "dashboard": "dashboard",
    "trade": "trade",
    "trades": "trade-list",
    "queue": "queue",
    "admin/users": "user-list",
}


def _page_from_url(url: str) -> str | None:
    """Infer page from a URL string."""
    if not url:
        return None
    url = url.rstrip("/")
    for suffix, page in _URL_PAGE_MAP.items():
        if url.endswith("/" + suffix) or url.endswith(suffix):
            return page
    return None


# Navbar clicks that trigger navigation
_NAV_CLICK_PAGE = {
    "nav-dashboard": "dashboard",
    "nav-new-trade": "trade",
    "nav-trade-list": "trade-list",
    "nav-queue": "queue",
    "nav-user-list": "user-list",
    "navbar-logout": "login",
}


# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------

def validate(script: dict) -> ValidationResult:
    """Validate a generated JSON script for structural correctness.

    Returns a ValidationResult with any errors found. The caller decides
    whether to feed errors back to the LLM or proceed.
    """
    steps = script.get("steps", [])
    if not steps:
        return ValidationResult()

    loc_map = _load_locator_page_map()
    page_elements = _load_page_elements()
    action_end_pages = _load_action_end_pages()
    all_known_locators = set(loc_map.keys())
    global_elements = page_elements.get("navbar", set())

    result = ValidationResult()
    current_page: str | None = None

    for i, step in enumerate(steps, 1):
        action = step.get("action", "").upper()
        raw_locator = step.get("locator", "")
        locator = raw_locator.lstrip("$")
        test_input = step.get("test_input", "")

        # --- Advanced action: jump to end page ---
        if action not in NO_LOCATOR_ACTIONS and not _is_builtin(action):
            action_name = step.get("action", "")
            if action_name in action_end_pages:
                current_page = action_end_pages[action_name]
            continue

        # --- OPEN_URL: infer page from URL ---
        if action == "OPEN_URL":
            current_page = _page_from_url(test_input)
            continue

        # --- CLICK on navbar link: update page ---
        if action == "CLICK" and locator in _NAV_CLICK_PAGE:
            current_page = _NAV_CLICK_PAGE[locator]

        # --- Skip steps with no locator ---
        if not locator:
            continue

        # --- Check 1: locator exists ---
        if locator not in all_known_locators:
            result.errors.append(ValidationError(
                step_index=i,
                action=step.get("action", ""),
                locator=raw_locator,
                error_type="UNKNOWN_LOCATOR",
                message=f"`{raw_locator}` is not in locators.xlsx. Use only known $element-name locators.",
            ))
            continue

        # --- Check 2: locator belongs to current page ---
        if current_page is not None:
            locator_page = loc_map.get(locator, "")
            if locator_page and locator_page != current_page and locator not in global_elements:
                result.errors.append(ValidationError(
                    step_index=i,
                    action=step.get("action", ""),
                    locator=raw_locator,
                    error_type="WRONG_PAGE",
                    message=(
                        f"`{raw_locator}` belongs to page `{locator_page}`, "
                        f"but current page is `{current_page}`. "
                        f"Remove this step or navigate to `{locator_page}` first."
                    ),
                ))

    return result


def _is_builtin(action: str) -> bool:
    return action.upper() in {
        "OPEN_URL", "CLICK", "TYPE", "SELECT",
        "READ_TEXT", "READ_ATTRIBUTE",
        "WAIT_VISIBLE", "WAIT_HIDDEN",
        "SCREENSHOT", "ASSERT_TEXT", "ASSERT_VISIBLE",
        "ASSERT_VARIABLE", "ASSERT_CONTAINS",
    }


# ---------------------------------------------------------------------------
# CLI dry-run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python script_validator.py <script.json>")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        script_data = json.load(f)
    result = validate(script_data)
    if result.is_clean:
        print("CLEAN — no validation errors")
    else:
        print(f"ERRORS ({len(result.errors)}):")
        for e in result.errors:
            print(f"  {e}")
    sys.exit(0 if result.is_clean else 1)
