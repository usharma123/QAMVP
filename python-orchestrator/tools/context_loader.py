"""
Stage-specific context builders for the AI orchestrator.

Each lifecycle stage gets exactly the context it needs — no more, no less.
Static content lives in .md template files with {{PLACEHOLDER}} markers.
Dynamic data (locators, traces, URLs) is injected at runtime.

Stages:
    1. Generation  — NL → JSON test script
    2. (Execution)  — Java only, no LLM
    3. Healing      — mid-execution self-healing
    4. Analysis     — post-execution review
    5. Action creation — new advanced action via LLM
    6. Locator repair — bulk fix after Angular upgrade
"""

import json
import subprocess
from pathlib import Path
from typing import Optional

from tools.action_relevance import get_relevant_actions_for_text
from tools.locator_store import load_all_locators, load_locators_for_page, load_locators_for_pages
from tools.runtime_dom_snapshots import capture_runtime_dom_snapshots, capture_testids_per_page
from tools.test_data_defaults import load_test_data_defaults, format_test_data_defaults_for_prompt

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
ACTIONS_DIR = REPO_ROOT / "test_data" / "generated_scripts"
MOCK_APP_DIR = REPO_ROOT / "mock-trading-app" / "src" / "app"

KNOWN_STATIC_ACTIONS = {
    "Login", "LoginAsMaker", "LoginAsChecker", "Logout",
    "CreateTrade", "CreateBuyTrade", "CreateSellTrade", "CreateAndMatchTrade",
    "ApproveTrade", "VerifyDashboardCount",
}


# ---------------------------------------------------------------------------
# Raw loaders — read files without assembling them into a prompt
# ---------------------------------------------------------------------------

def _read_template(name: str) -> str:
    path = PROMPTS_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def load_locator_strategy() -> str:
    return _read_template("locator_strategy.md")


def _load_composition_rules() -> str:
    """Shared macro-vs-primitive guidance for generation, step, and refinement prompts."""
    return _read_template("composition_rules.md")


def discover_advanced_action_names() -> set[str]:
    """All `name` fields from `action_*.json` under the generated_scripts actions directory."""
    names: set[str] = set()
    if not ACTIONS_DIR.exists():
        return names
    for f in ACTIONS_DIR.glob("action_*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        n = data.get("name", f.stem.replace("action_", ""))
        if n:
            names.add(n)
    return names


def _load_action_index_for_planning() -> str:
    """Compact one-line-per-macro list for the macro-planning pre-call."""
    if not ACTIONS_DIR.exists():
        return "(No advanced actions found)"
    lines: list[str] = []
    for f in sorted(ACTIONS_DIR.glob("action_*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        name = data.get("name", f.stem.replace("action_", ""))
        steps = data.get("steps", [])
        params = _extract_params(steps)
        params_str = ", ".join(f"`{p}`" for p in params) if params else "(none)"
        desc = data.get("description", "")
        desc_str = f" — {desc}" if desc else ""
        lines.append(f"- **{name}**{desc_str} | parameters: {params_str}")
    return "\n".join(lines) if lines else "(No advanced actions found)"


def format_macro_plan_block(macro_plan: Optional[dict]) -> str:
    """Injected into generation/step prompts; empty plan uses neutral placeholder."""
    if not macro_plan:
        return (
            "(No macro plan was produced — infer macros from the test description "
            "and the advanced action list below.)"
        )
    macros = macro_plan.get("macros") or []
    notes = (macro_plan.get("notes") or "").strip()
    if not macros and not notes:
        return (
            "(Macro planner returned empty — infer macros from the test description "
            "and the advanced action list below.)"
        )
    out: list[str] = [
        "## Planned macros (prefer this sequence when implementing the script)",
        "",
    ]
    for i, m in enumerate(macros, 1):
        out.append(f"{i}. `{m}`")
    if notes:
        out.extend(["", f"**Planner notes:** {notes}"])
    out.extend(
        [
            "",
            "When generating steps, **prefer** these macros in order; use built-in actions only "
            "for gaps (e.g. navigation not covered by a macro) or explicit low-level assertions.",
        ]
    )
    return "\n".join(out)


def merge_allowed_actions(
    keyword_allowed: set[str] | None,
    plan_macros: list[str] | None,
) -> set[str] | None:
    """
    Union keyword-filtered actions with planner-selected macro names.

    When `keyword_allowed` is None, the prompt shows **all** actions — leave as None.
    When it is a non-empty set, add any valid names from `plan_macros` so turn-by-turn
    steps still see macros selected for the **whole** test.
    """
    if not plan_macros:
        return keyword_allowed
    valid = discover_advanced_action_names()
    extra = {m.strip() for m in plan_macros if m and m.strip() in valid}
    if not extra:
        return keyword_allowed
    if keyword_allowed is None:
        return None
    return keyword_allowed | extra


def _load_locators_raw() -> list[dict[str, str]]:
    return load_all_locators()


def _format_locator_table(rows: list[dict[str, str]]) -> str:
    if not rows:
        return "(No locators defined)"
    lines = ["| element_name | page |", "|---|---|"]
    for r in rows:
        lines.append(f"| ${r['element_name']} | {r.get('page', '')} |")
    return "\n".join(lines)


def _locators_for_page(page: str) -> str:
    filtered = load_locators_for_page(page)
    if not filtered:
        return f"(No locators found for page '{page}')"
    return _format_locator_table(filtered)


def _page_from_url(url: str) -> str:
    """Map a URL path to a locators.xlsx page value."""
    if not url:
        return ""
    path = url.rstrip("/").split("/")[-1] if "/" in url else url
    mapping = {
        "login": "login",
        "dashboard": "dashboard",
        "trade": "trade",
        "new-trade": "trade",
        "trades": "trade-list",
        "users": "user-list",
    }
    return mapping.get(path, "")


def _load_action_signatures() -> str:
    """Load just the name + parameters of dynamically discovered actions
    (excluding ones already hardcoded in the system prompt)."""
    if not ACTIONS_DIR.exists():
        return ""
    action_files = sorted(ACTIONS_DIR.glob("action_*.json"))
    lines: list[str] = []
    for f in action_files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        name = data.get("name", f.stem.replace("action_", ""))
        if name in KNOWN_STATIC_ACTIONS:
            continue
        params = _extract_params(data.get("steps", []))
        lines.append(f"### {name}")
        lines.append(f"Parameters: {', '.join(f'`{p}`' for p in params) if params else '(none)'}")
        lines.append("")
    if not lines:
        return ""
    return "## Additional Advanced Actions\n\n" + "\n".join(lines)


def _load_action_full_definitions() -> str:
    """Load full step-level definitions of all actions (for action creation context)."""
    if not ACTIONS_DIR.exists():
        return "(No advanced actions found)"
    action_files = sorted(ACTIONS_DIR.glob("action_*.json"))
    if not action_files:
        return "(No advanced actions found)"
    lines: list[str] = []
    for f in action_files:
        content = f.read_text(encoding="utf-8")
        lines.append(f"### {f.stem}")
        lines.append(f"```json\n{content.strip()}\n```")
        lines.append("")
    return "\n".join(lines)


# End-state metadata keyed by action name.
# The LLM needs to know where it ends up after each macro completes.
_ACTION_END_STATE: dict[str, dict[str, str]] = {
    "Login": {
        "end_state": "You are on the Dashboard page (`/dashboard`).",
        "end_page": "dashboard",
        "note": "Uses parameterized credentials. Prefer LoginAsMaker or LoginAsChecker for clarity.",
    },
    "LoginAsMaker": {
        "end_state": "You are on the Dashboard page (`/dashboard`) as maker (admin).",
        "end_page": "dashboard",
        "note": "",
    },
    "LoginAsChecker": {
        "end_state": "You are on the Dashboard page (`/dashboard`) as checker.",
        "end_page": "dashboard",
        "note": "",
    },
    "Logout": {
        "end_state": "You are on the Login page (`/login`). User session is cleared.",
        "end_page": "login",
        "note": "",
    },
    "CreateTrade": {
        "end_state": (
            "You are on the Approval Queue page (`/queue`). The toast has already appeared "
            "AND disappeared. Variable `${toastMessage}` contains the toast text. "
            "The trade is in status `pending_approval` — NOT yet on the Dashboard."
        ),
        "end_page": "queue",
        "note": (
            "Do NOT add toast-related steps after this action. "
            "The trade requires checker approval before it appears on Dashboard."
        ),
    },
    "CreateBuyTrade": {
        "end_state": (
            "Same as CreateTrade — you are on the Approval Queue (`/queue`). "
            "Toast is gone. `${toastMessage}` is set. Trade needs approval."
        ),
        "end_page": "queue",
        "note": "Do NOT add toast-related steps after this action.",
    },
    "CreateSellTrade": {
        "end_state": (
            "Same as CreateTrade — you are on the Approval Queue (`/queue`). "
            "Toast is gone. `${toastMessage}` is set. Trade needs approval."
        ),
        "end_page": "queue",
        "note": "Do NOT add toast-related steps after this action.",
    },
    "ApproveTrade": {
        "end_state": (
            "You are on the Approval Queue page (`/queue`). "
            "The approval toast has appeared and disappeared. "
            "Variable `${approveMessage}` contains the toast text. "
            "The approved trade is now visible on Dashboard and participates in matching."
        ),
        "end_page": "queue",
        "note": "Approves the first pending trade in the queue. Call multiple times to approve multiple trades.",
    },
    "VerifyDashboardCount": {
        "end_state": (
            "You are on the Dashboard page. "
            "Variable `${dashboardCount}` contains the count text."
        ),
        "end_page": "dashboard",
        "note": "",
    },
}


def get_action_end_page(action_name: str) -> str | None:
    """Return the machine-readable end page for an action, or None if unknown."""
    meta = _ACTION_END_STATE.get(action_name)
    if meta:
        return meta.get("end_page")
    return None


def _load_action_expanded_for_generation(allowed: set[str] | None = None) -> str:
    """Build a human-readable expansion of every advanced action for the
    generation prompt.  Each action shows parameters, usage example, the
    full internal step sequence, end-state info, and any important caveats.
    When allowed is not None, only those action names are included.
    """
    if not ACTIONS_DIR.exists():
        return "(No advanced actions found)"
    action_files = sorted(ACTIONS_DIR.glob("action_*.json"))
    if not action_files:
        return "(No advanced actions found)"

    sections: list[str] = []
    for f in action_files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        name = data.get("name", f.stem.replace("action_", ""))
        if allowed is not None and name not in allowed:
            continue
        steps = data.get("steps", [])
        params = _extract_params(steps)

        # --- header ---
        sec = [f"### {name}"]
        sec.append(
            f"Parameters: {', '.join(f'`{p}`' for p in params) if params else '(none)'}"
        )

        # --- usage example ---
        if params:
            example_bindings = ",".join(f"{p}=<value>" for p in params)
            sec.append(
                f'Usage: `{{ "action": "{name}", "locator": "", '
                f'"test_input": "{example_bindings}", "output": "" }}`'
            )
        else:
            sec.append(
                f'Usage: `{{ "action": "{name}", "locator": "", '
                f'"test_input": "", "output": "" }}`'
            )

        # --- expanded steps table ---
        sec.append("")
        sec.append("**Expanded steps (what the engine executes internally):**")
        sec.append("")
        sec.append("| # | action | locator | test_input | output |")
        sec.append("|---|--------|---------|------------|--------|")
        for i, step in enumerate(steps, 1):
            act = step.get("action", "")
            loc = step.get("locator", "")
            inp = step.get("test_input", "")
            out = step.get("output", "")
            sec.append(f"| {i} | {act} | {loc} | {inp} | {out} |")
        sec.append("")

        # --- end-state + notes ---
        meta = _ACTION_END_STATE.get(name)
        if meta:
            sec.append(f"**End state**: {meta['end_state']}")
            if meta["note"]:
                sec.append(f"**IMPORTANT**: {meta['note']}")
        else:
            last = steps[-1] if steps else {}
            last_loc = last.get("locator", "")
            sec.append(
                f"**End state**: Last step is `{last.get('action', '?')}` "
                f"on `{last_loc}`."
            )

        sec.append("")
        sections.append("\n".join(sec))

    return "\n".join(sections)


def _extract_params(steps: list[dict]) -> list[str]:
    """Pull {{paramName}} references from action step definitions."""
    import re
    params: list[str] = []
    seen: set[str] = set()
    for step in steps:
        for field in ("test_input", "locator"):
            val = step.get(field, "")
            for match in re.findall(r"\{\{(\w+)}}", val):
                if match not in seen:
                    params.append(match)
                    seen.add(match)
    return params


def _load_html_templates() -> str:
    """Read all Angular component .html files for locator repair context."""
    if not MOCK_APP_DIR.exists():
        return "(mock-trading-app source not found)"
    html_files = sorted(MOCK_APP_DIR.rglob("*.html"))
    if not html_files:
        return "(No HTML templates found)"
    lines: list[str] = []
    for f in html_files:
        rel = f.relative_to(MOCK_APP_DIR)
        content = f.read_text(encoding="utf-8")
        lines.append(f"### {rel}")
        lines.append(f"```html\n{content.strip()}\n```")
        lines.append("")
    return "\n".join(lines)


def _find_html_template_for_page(page: str) -> str:
    """Return the content of the single HTML template for the given sheet/page name.

    Tries an exact directory match first (e.g. 'trade' → components/trade/*.html),
    then falls back to globbing for *{page}*.html anywhere under MOCK_APP_DIR.
    Returns a placeholder string if nothing is found.
    """
    if not MOCK_APP_DIR.exists():
        return "(mock-trading-app source not found)"

    # Exact component directory match
    exact_dir = MOCK_APP_DIR / "components" / page
    if exact_dir.is_dir():
        html_files = sorted(exact_dir.glob("*.html"))
        if html_files:
            return html_files[0].read_text(encoding="utf-8")

    # Fuzzy match — e.g. "trade-list" → trade-list.component.html
    matches = sorted(MOCK_APP_DIR.rglob(f"*{page}*.html"))
    if matches:
        return matches[0].read_text(encoding="utf-8")

    return f"(No HTML template found for page '{page}')"


def _page_testid_list(page: str, testids_by_route: dict[str, list[str]]) -> str:
    """Format the live testid list for a given page from the testids_by_route dict.

    Maps sheet names to route paths (e.g. 'trade' → '/trade', 'login' → '/login').
    Returns a compact comma-separated string, or a note if skipped.
    """
    if not testids_by_route:
        return "(browser skipped)"

    # Build a route key from the page name
    route = f"/{page}"
    ids = testids_by_route.get(route, [])
    if ids:
        return ", ".join(ids)

    # Fallback: check if any route path ends with the page name
    for path, ids in testids_by_route.items():
        if path.endswith(f"/{page}") or path.endswith(f"/{page}s"):
            return ", ".join(ids) if ids else "(no testids found at runtime)"

    return f"(route '{route}' not captured — page may require different auth or path)"


def _format_locator_table_for_repair(rows: list[dict[str, str]]) -> str:
    """Format locator rows for the repair prompt.

    Shows bare element_name (no $ prefix) and the current xpath so the LLM
    can tell whether the locator actually needs updating.
    """
    if not rows:
        return "(No locators defined)"
    lines = ["| element_name | current_xpath |", "|---|---|"]
    for r in rows:
        lines.append(f"| {r['element_name']} | {r.get('xpath', '')} |")
    return "\n".join(lines)


def build_locator_repair_context_for_page(
    page: str,
    testids_by_route: dict[str, list[str]] | None = None,
) -> str:
    """Build a compact repair prompt scoped to a single page/sheet."""
    template = _read_template("locator_repair_prompt_page.md")
    raw_rows = load_locators_for_page(page)
    locator_table = _format_locator_table_for_repair(raw_rows) if raw_rows else f"(No locators found for page '{page}')"
    html_template = _find_html_template_for_page(page)
    testid_list = _page_testid_list(page, testids_by_route or {})

    return _inject(template, {
        "PAGE_NAME": page,
        "LOCATOR_STRATEGY": load_locator_strategy(),
        "LOCATOR_TABLE": locator_table,
        "HTML_TEMPLATE": f"```html\n{html_template.strip()}\n```",
        "TESTID_LIST": testid_list,
    })


def _get_template_diff() -> str:
    """Try to get a git diff of HTML template changes (empty if not a git repo)."""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "--", "mock-trading-app/src/app/**/*.html"],
            capture_output=True, text=True, timeout=10,
            cwd=str(REPO_ROOT),
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return "(No git diff available — compare manually)"


def _load_app_layout() -> str:
    """Read the app layout doc for LLM context."""
    return _read_template("app_layout.md")


def _inject(template: str, replacements: dict[str, str]) -> str:
    """Replace all {{KEY}} placeholders in a template with provided values."""
    result = template
    for key, value in replacements.items():
        result = result.replace("{{" + key + "}}", value)
    return result


# ---------------------------------------------------------------------------
# Stage-specific context builders
# ---------------------------------------------------------------------------

def build_macro_planning_context() -> str:
    """Prompt for the macro-planning pre-call (full test NL → ordered macro names)."""
    template = _read_template("macro_plan_prompt.md")
    return _inject(template, {
        "ADVANCED_ACTIONS_INDEX": _load_action_index_for_planning(),
        "COMPOSITION_RULES": _load_composition_rules(),
    })


def build_generation_context(
    user_input: str = "",
    previous_script: Optional[dict] = None,
    test_case: Optional[dict] = None,
    macro_plan: Optional[dict] = None,
) -> str:
    """Stage 1: Assemble the full prompt for test script generation.

    Args:
        user_input: natural language test description; used to filter relevant actions.
        previous_script: previous JSON script for iterative refinement.
        test_case: structured test case dict from tc_loader (with requirementId,
                   testCaseId, steps) — used to inject numbered steps so the
                   LLM can produce matching tcStep references.
        macro_plan: optional result of the macro-planning pre-call (`macros`, `notes`).
    """
    template = _read_template("system_prompt.md")

    all_locators = _load_locators_raw()
    locator_table = _format_locator_table(all_locators)
    plan_macros = (macro_plan or {}).get("macros") if macro_plan else None
    allowed = merge_allowed_actions(
        get_relevant_actions_for_text(user_input),
        plan_macros if isinstance(plan_macros, list) else None,
    )
    actions_expanded = _load_action_expanded_for_generation(allowed=allowed)
    app_layout = _load_app_layout()
    test_data_defaults = format_test_data_defaults_for_prompt(load_test_data_defaults())

    prev_block = ""
    if previous_script:
        prev_block = (
            "## Previous Script (for reference)\n\n"
            f"```json\n{json.dumps(previous_script, indent=2)}\n```"
        )

    return _inject(template, {
        "LOCATOR_TABLE": locator_table,
        "COMPOSITION_RULES": _load_composition_rules(),
        "MACRO_PLAN": format_macro_plan_block(macro_plan),
        "ADVANCED_ACTIONS_EXPANDED": actions_expanded,
        "APP_LAYOUT": app_layout,
        "TEST_DATA_DEFAULTS": test_data_defaults,
        "PREVIOUS_SCRIPT": prev_block,
    })


def build_step_context(
    step_number: int,
    step_text: str,
    current_page: str,
    generated_so_far: list[dict],
    test_case: Optional[dict] = None,
    macro_plan: Optional[dict] = None,
) -> str:
    """Build a focused, state-aware prompt for a single NL test step."""
    template = _read_template("step_prompt.md")

    pages = [current_page, "navbar"]
    filtered = load_locators_for_pages(pages)
    locator_table = _format_locator_table(filtered)

    plan_macros = (macro_plan or {}).get("macros") if macro_plan else None
    allowed = merge_allowed_actions(
        get_relevant_actions_for_text(step_text),
        plan_macros if isinstance(plan_macros, list) else None,
    )
    actions_expanded = _load_action_expanded_for_generation(allowed=allowed)
    app_layout = _load_app_layout()
    test_data_defaults = format_test_data_defaults_for_prompt(load_test_data_defaults())

    if generated_so_far:
        history = json.dumps(generated_so_far, indent=2)
    else:
        history = "(none — this is the first step)"

    return _inject(template, {
        "STEP_NUMBER": str(step_number),
        "STEP_TEXT": step_text,
        "CURRENT_PAGE": current_page,
        "PAGE_LOCATORS": locator_table,
        "COMPOSITION_RULES": _load_composition_rules(),
        "MACRO_PLAN": format_macro_plan_block(macro_plan),
        "ADVANCED_ACTIONS_EXPANDED": actions_expanded,
        "APP_LAYOUT": app_layout,
        "TEST_DATA_DEFAULTS": test_data_defaults,
        "GENERATED_SO_FAR": history,
    })


def build_healing_context(
    step: int,
    action: str,
    locator: str,
    error: str,
    current_url: str = "",
    execution_trace: Optional[list[dict]] = None,
) -> str:
    """Stage 3: Assemble the prompt for mid-execution self-healing."""
    template = _read_template("healing_prompt.md")

    page = _page_from_url(current_url)
    if page:
        page_locators = _locators_for_page(page)
    else:
        page_locators = _format_locator_table(_load_locators_raw())

    trace_str = "(No prior steps)"
    if execution_trace:
        lines = []
        for t in execution_trace:
            status = t.get("status", "?")
            marker = "PASS" if status == "PASS" else "FAIL"
            lines.append(f"  Step {t.get('step', '?'):>2}: [{marker}] {t.get('action', '?')}")
        trace_str = "\n".join(lines)

    return _inject(template, {
        "LOCATOR_STRATEGY": load_locator_strategy(),
        "STEP_NUMBER": str(step),
        "FAILED_ACTION": action,
        "FAILED_LOCATOR": locator,
        "ERROR_MESSAGE": error,
        "CURRENT_URL": current_url or "(unknown)",
        "EXECUTION_TRACE": trace_str,
        "PAGE_LOCATORS": page_locators,
    })


def build_analysis_context(
    user_input: str,
    test_script: dict,
    step_results: list[dict],
    help_exchanges: list[dict],
    run_success: bool = False,
    run_summary: str = "",
) -> str:
    """Stage 4: Assemble the prompt for post-execution analysis."""
    template = _read_template("analysis_prompt.md")

    script_str = json.dumps(test_script, indent=2)

    result_lines = []
    for sr in step_results:
        status = sr.get("status", "?")
        detail = sr.get("detail", "")
        line = f"  Step {sr.get('step', '?'):>2}: [{status}] {sr.get('action', '?')}"
        if detail:
            line += f" — {detail}"
        result_lines.append(line)
    results_str = "\n".join(result_lines) if result_lines else "(No step results)"

    help_lines = []
    for i in range(0, len(help_exchanges), 2):
        req = help_exchanges[i] if i < len(help_exchanges) else {}
        sol = help_exchanges[i + 1] if i + 1 < len(help_exchanges) else {}
        help_lines.append(
            f"  Request: Step {req.get('step', '?')} — {req.get('error', '?')}\n"
            f"  Solution: {sol.get('action', '?')} {sol.get('params', {})}"
        )
    help_str = "\n\n".join(help_lines) if help_lines else "(No self-healing events)"

    outcome_parts = [f"- **Success**: {'YES' if run_success else 'NO — RUN FAILED'}"]
    if run_summary:
        outcome_parts.append(f"- **Summary**: {run_summary}")
    passed = sum(1 for sr in step_results if sr.get("status") == "PASS")
    failed = sum(1 for sr in step_results if sr.get("status") == "FAIL")
    skipped = sum(1 for sr in step_results if sr.get("status") == "SKIPPED")
    outcome_parts.append(f"- **Steps**: {passed} passed, {failed} failed, {skipped} skipped")
    run_outcome = "\n".join(outcome_parts)

    return _inject(template, {
        "USER_INPUT": user_input,
        "TEST_SCRIPT": script_str,
        "RUN_OUTCOME": run_outcome,
        "STEP_RESULTS": results_str,
        "HELP_EXCHANGES": help_str,
    })


def build_judge_context(
    user_input: str,
    script: dict,
    validation_result: str = "",
) -> str:
    """Stage 1b: Assemble the prompt for LLM-as-judge semantic review."""
    template = _read_template("judge_prompt.md")
    allowed = get_relevant_actions_for_text(user_input)
    actions_expanded = _load_action_expanded_for_generation(allowed=allowed)
    app_layout = _load_app_layout()

    return _inject(template, {
        "USER_INPUT": user_input,
        "GENERATED_SCRIPT": json.dumps(script, indent=2),
        "VALIDATION_RESULT": validation_result or "No static validation errors.",
        "ADVANCED_ACTIONS_SUMMARY": actions_expanded,
        "APP_LAYOUT": app_layout,
    })


def build_refinement_context(
    user_input: str,
    previous_script: dict,
    feedback: str,
    attempt_number: int = 2,
) -> str:
    """Stage 1c: Assemble the prompt for script refinement with feedback."""
    template = _read_template("refinement_prompt.md")
    all_locators = _load_locators_raw()
    locator_table = _format_locator_table(all_locators)
    allowed = get_relevant_actions_for_text(user_input)
    actions_expanded = _load_action_expanded_for_generation(allowed=allowed)
    app_layout = _load_app_layout()

    return _inject(template, {
        "USER_INPUT": user_input,
        "PREVIOUS_SCRIPT": json.dumps(previous_script, indent=2),
        "FEEDBACK": feedback,
        "ATTEMPT_NUMBER": str(attempt_number),
        "COMPOSITION_RULES": _load_composition_rules(),
        "ADVANCED_ACTIONS_EXPANDED": actions_expanded,
        "LOCATOR_TABLE": locator_table,
        "APP_LAYOUT": app_layout,
    })


def build_action_creation_context(user_input: str) -> str:
    """Stage 5: Assemble the prompt for LLM-assisted advanced action creation."""
    template = _read_template("action_creation_prompt.md")

    all_locators = _load_locators_raw()
    locator_table = _format_locator_table(all_locators)
    full_actions = _load_action_full_definitions()

    return _inject(template, {
        "LOCATOR_STRATEGY": load_locator_strategy(),
        "LOCATOR_TABLE": locator_table,
        "ADVANCED_ACTIONS_FULL": full_actions,
        "USER_INPUT": user_input,
    })


def build_locator_repair_context(use_runtime_dom: bool = True) -> str:
    """Stage 6: Assemble the prompt for bulk locator repair after an upgrade.

    When use_runtime_dom is True, captures headless-browser HTML + data-testid
    lists per route (requires Playwright and a running app at MOCK_APP_BASE_URL).
    """
    template = _read_template("locator_repair_prompt.md")

    all_locators = _load_locators_raw()
    locator_table = _format_locator_table(all_locators)
    html_templates = _load_html_templates()
    template_diff = _get_template_diff()

    if use_runtime_dom:
        runtime_dom = capture_runtime_dom_snapshots()
    else:
        runtime_dom = (
            "(Runtime DOM snapshots skipped — templates-only mode. "
            "Run `repair locators` without `--no-browser` to include dynamic DOM.)"
        )

    return _inject(template, {
        "LOCATOR_STRATEGY": load_locator_strategy(),
        "LOCATOR_TABLE": locator_table,
        "HTML_TEMPLATES": html_templates,
        "RUNTIME_DOM_SNAPSHOTS": runtime_dom,
        "TEMPLATE_DIFF": template_diff,
    })


def build_script_locator_repair_context(
    script: dict,
    validation_feedback: str = "",
) -> str:
    """Repair locators in one saved JSON script to match the current locator registry."""
    template = _read_template("script_locator_repair_prompt.md")
    all_locators = _load_locators_raw()
    locator_table = _format_locator_table(all_locators)
    app_layout = _load_app_layout()
    vf = validation_feedback.strip() or (
        "(No static validation errors — align every `$locator` with the current table.)"
    )
    return _inject(template, {
        "SCRIPT_JSON": json.dumps(script, indent=2),
        "LOCATOR_TABLE": locator_table,
        "APP_LAYOUT": app_layout,
        "STATIC_VALIDATION": vf,
        "LOCATOR_STRATEGY": load_locator_strategy(),
    })


# ---------------------------------------------------------------------------
# Legacy compatibility — kept for any callers that haven't migrated yet
# ---------------------------------------------------------------------------

def load_system_prompt() -> str:
    return _read_template("system_prompt.md")


def load_locators_table() -> str:
    return _format_locator_table(_load_locators_raw())


def load_advanced_actions_summary() -> str:
    return _load_action_full_definitions()


def build_full_context() -> str:
    """Legacy: flat dump of all context. Prefer stage-specific builders."""
    return build_generation_context()
