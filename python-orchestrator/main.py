"""
AI-Driven UI Automation Orchestrator — Entry Point

Interactive REPL or one-shot CLI with stage-specific context injection:

  Stage 1  (Generation):   NL → JSON test script (turn-by-turn or monolithic)
  Stage 1b (Validation):   Static validator + optional LLM judge
  Stage 1c (Refinement):   Feedback loop → corrected script
  Stage 2  (Execution):    Java runs the script (no LLM)
  Stage 3  (Healing):      mid-execution HELP_REQUEST → LLM → SOLUTION
  Stage 4  (Analysis):     post-execution results → LLM → verdict + recommendations
  Stage 5  (Action):       NL → new advanced action definition
  Stage 6  (Repair):       Angular upgrade → bulk locator reconciliation
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "test_data" / "generated_scripts"
GENERATED_SCRIPTS_DIR = REPO_ROOT / "test_data" / "generated-scripts"
TEST_SCRIPTS_DIR = REPO_ROOT / "test_data" / "test_scripts"

import tools.context_loader as ctx_loader
from tools.context_loader import (
    build_action_creation_context,
    build_analysis_context,
    build_generation_context,
    build_judge_context,
    build_locator_repair_context,
    build_locator_repair_context_for_page,
    build_refinement_context,
    build_script_locator_repair_context,
    build_step_context,
    get_action_end_page,
    load_advanced_actions_summary,
    load_locators_table,
)
from tools.locator_store import load_locator_page_map
from tools.runtime_dom_snapshots import capture_testids_per_page
from tools.help_handler import handle_help_request
from tools.java_runner import create_advanced_action as java_create_action
from tools.java_runner import run_json
from tools.llm_client import analyze_execution
from tools.llm_client import create_advanced_action as llm_create_action
from tools.llm_client import generate_app_layout as llm_generate_app_layout
from tools.llm_client import generate_single_step
from tools.llm_client import generate_test_script
from tools.llm_client import plan_macros
from tools.llm_client import judge_script as llm_judge_script
from tools.llm_client import refine_script as llm_refine_script
from tools.llm_client import repair_locators
from tools.prompt_logger import log_prompt
from tools.run_logger import RunLogger
from tools.script_cache import cache_script, get_cached  # reserved for future use
from tools.script_validator import validate as static_validate
from tools.tc_loader import format_for_llm, list_test_cases, load_test_case

MAX_GEN_ATTEMPTS = 3
MAX_EXEC_RETRIES = 2

ENABLE_LLM_JUDGE = os.environ.get("ENABLE_LLM_JUDGE", "").strip().lower() in (
    "1",
    "true",
    "yes",
)

ENABLE_MACRO_PLANNING = os.environ.get("ENABLE_MACRO_PLANNING", "1").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)


# ---------------------------------------------------------------------------
# File input: read a .md test script and extract the content
# ---------------------------------------------------------------------------


def resolve_test_file(path_str: str) -> Path | None:
    """Resolve a test script path — supports absolute, relative, or just a filename."""
    p = Path(path_str)
    if p.is_file():
        return p
    candidate = TEST_SCRIPTS_DIR / path_str
    if candidate.is_file():
        return candidate
    candidate = TEST_SCRIPTS_DIR / (path_str + ".md")
    if candidate.is_file():
        return candidate
    return None


def load_test_file(path: Path) -> str:
    """Read a .md test script and return its contents as the LLM input."""
    content = path.read_text(encoding="utf-8")
    print(f"  Loaded test script: {path.name} ({len(content.splitlines())} lines)")
    return content


def resolve_generated_script(path_str: str) -> Path | None:
    """Resolve a generated JSON script path (cwd, absolute, or test_data/generated_scripts/)."""
    p = Path(path_str)
    if p.is_file() and p.suffix.lower() == ".json":
        return p
    candidate = SCRIPTS_DIR / path_str
    if candidate.is_file():
        return candidate
    candidate = SCRIPTS_DIR / (path_str + ".json")
    if candidate.is_file():
        return candidate
    return None


# ---------------------------------------------------------------------------
# Turn-by-turn: parse numbered NL steps
# ---------------------------------------------------------------------------

_NL_STEP_RE = re.compile(r"^\s*(\d+)\.\s*(.*)$")


def _parse_nl_steps(user_input: str) -> list[tuple[int, str]]:
    """Extract (step_number, text) from numbered lines; skip empty step text."""
    out: list[tuple[int, str]] = []
    for line in user_input.splitlines():
        m = _NL_STEP_RE.match(line)
        if not m:
            continue
        num = int(m.group(1))
        text = (m.group(2) or "").strip()
        if not text:
            continue
        out.append((num, text))
    return out


def _run_macro_plan(user_input: str, source_name: str | None = None) -> dict | None:
    """LLM pre-call: ordered macro names for the full test. Returns None if disabled or on error."""
    if not ENABLE_MACRO_PLANNING:
        return None
    if not user_input or not user_input.strip():
        return None
    try:
        prompt = ctx_loader.build_macro_planning_context()
        full_for_log = f"{prompt}\n\n# Full test description\n{user_input}"
        log_prompt(
            "macro_plan",
            full_for_log,
            "macro_plan_prompt.md",
            run_subfolder=source_name,
        )
        plan = plan_macros(prompt, user_input, run_subfolder=source_name)
        macros = plan.get("macros") or []
        notes = (plan.get("notes") or "").strip()
        print(
            f"  Macro plan ({len(macros)} macro(s)): "
            f"{', '.join(macros) if macros else '(none)'}"
        )
        if notes:
            tail = "…" if len(notes) > 200 else ""
            print(f"    Notes: {notes[:200]}{tail}")
        return plan
    except Exception as e:
        print(f"  Macro planning failed (continuing without plan): {e}")
        return None


def _generate_turn_by_turn(
    user_input: str,
    test_case: dict | None = None,
    source_name: str | None = None,
    macro_plan: dict | None = None,
) -> dict | None:
    """Generate script one NL step at a time with page-aware context."""
    nl_steps = _parse_nl_steps(user_input)
    if not nl_steps:
        return None

    current_page = "login"
    generated_steps: list[dict] = []
    subfolder = source_name or None

    for step_num, step_text in nl_steps:
        print(f'\n  Step {step_num}: "{step_text}" (page: {current_page})')

        prompt = build_step_context(
            step_number=step_num,
            step_text=step_text,
            current_page=current_page,
            generated_so_far=generated_steps,
            test_case=test_case,
            macro_plan=macro_plan,
        )
        log_prompt(
            f"step_{step_num}",
            prompt,
            "step_prompt.md",
            run_subfolder=subfolder,
        )

        try:
            step_objects = generate_single_step(prompt, run_subfolder=subfolder)
        except Exception as e:
            print(f"  Error from LLM (step {step_num}): {e}")
            return None

        generated_steps.extend(step_objects)

        for obj in step_objects:
            action = obj.get("action", "")
            new_page = get_action_end_page(action)
            if new_page:
                print(f"    {action} -> page {new_page}")
                current_page = new_page
            elif action == "OPEN_URL":
                ui = str(obj.get("test_input", "") or "")
                p = ctx_loader._page_from_url(ui.strip())
                if p:
                    current_page = p

    return {
        "testCaseId": test_case.get("testCaseId", "") if test_case else "",
        "requirementId": test_case.get("requirementId", "") if test_case else "",
        "steps": generated_steps,
    }


def _generate_initial(
    user_input: str,
    previous_script: dict | None = None,
    test_case: dict | None = None,
    macro_plan: dict | None = None,
    source_name: str | None = None,
) -> dict | None:
    """Call the LLM to produce the first-attempt script (monolithic)."""
    prompt = build_generation_context(
        user_input=user_input,
        previous_script=previous_script,
        test_case=test_case,
        macro_plan=macro_plan,
    )
    try:
        return generate_test_script(user_input, prompt, run_subfolder=source_name)
    except Exception as e:
        print(f"  Error from LLM: {e}")
        return None


def _validate_and_judge(
    user_input: str,
    script: dict,
) -> tuple[bool, str]:
    """Run static validation + optional LLM judge. Returns (is_clean, feedback_text)."""
    feedback_parts: list[str] = []

    v_result = static_validate(script)
    if not v_result.is_clean:
        print(f"  Static validation: {len(v_result.errors)} error(s)")
        for e in v_result.errors:
            print(f"    {e}")
        feedback_parts.append("## Static Validation Errors\n\n" + v_result.format_for_llm())
    else:
        print("  Static validation: CLEAN")

    # --- LLM judge (optional) ---
    if not ENABLE_LLM_JUDGE:
        print("  LLM judge: skipped (set ENABLE_LLM_JUDGE=1 to enable)")
        is_clean = v_result.is_clean
        return is_clean, "\n\n".join(feedback_parts)

    validation_text = v_result.format_for_llm() if not v_result.is_clean else ""
    judge_prompt = build_judge_context(user_input, script, validation_text)

    try:
        judge_result = llm_judge_script(judge_prompt)
    except Exception as e:
        print(f"  Judge error (skipping): {e}")
        judge_result = {"verdict": "APPROVE", "issues": [], "rationale": "Judge unavailable"}

    judge_verdict = judge_result.get("verdict", "APPROVE").upper()
    judge_issues = judge_result.get("issues", [])
    high_medium = [i for i in judge_issues if i.get("severity", "").upper() in ("HIGH", "MEDIUM")]

    print(f"  LLM judge: {judge_verdict} — {judge_result.get('rationale', '')}")
    if judge_issues:
        for issue in judge_issues:
            sev = issue.get("severity", "?")
            print(f"    [{sev}] Step {issue.get('step', '?')}: {issue.get('issue', '?')}")

    if high_medium:
        lines = []
        for i in high_medium:
            lines.append(
                f"- **Step {i.get('step', '?')}** [{i.get('severity', '?')}]: "
                f"{i.get('issue', '')} — Suggestion: {i.get('suggestion', '')}"
            )
        feedback_parts.append("## LLM Judge Issues\n\n" + "\n".join(lines))

    is_clean = v_result.is_clean and judge_verdict == "APPROVE"
    return is_clean, "\n\n".join(feedback_parts)


def _refine(
    user_input: str,
    script: dict,
    feedback: str,
    attempt: int,
) -> dict | None:
    """Ask the LLM to fix the script based on feedback."""
    prompt = build_refinement_context(
        user_input=user_input,
        previous_script=script,
        feedback=feedback,
        attempt_number=attempt,
    )
    try:
        return llm_refine_script(prompt)
    except Exception as e:
        print(f"  Refinement error: {e}")
        return None


def _sanitize_source_name(name: str) -> str:
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name).strip("._") or "script"


def _save_script_md(
    out_path: Path,
    user_input: str,
    script: dict,
    source_name: str | None,
) -> None:
    """Write a companion .md summary next to the JSON script."""
    stem = out_path.stem
    md_path = out_path.with_suffix(".md")
    lines = [
        f"# Generated script: {stem}",
        "",
        "## Description",
        "",
        user_input,
        "",
        "## Steps",
        "",
    ]
    for i, step in enumerate(script.get("steps", []), 1):
        tc = step.get("tcStep", "")
        tc_prefix = f"[tc{tc}] " if tc else ""
        lines.append(
            f"{i}. {tc_prefix}{step.get('action', '?')} {step.get('locator', '')}"
        )
    if source_name:
        lines.append("")
        lines.append(f"_Source: {source_name}_")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  Companion MD: {md_path}")


def generate_and_save(
    user_input: str,
    previous_script: dict | None = None,
    test_case: dict | None = None,
    source_name: str | None = None,
) -> Path | None:
    """Iterative generation: turn-by-turn if numbered steps exist, else monolithic."""
    print(f"\n  Generating test script (max {MAX_GEN_ATTEMPTS} attempts)...")

    macro_plan = _run_macro_plan(user_input, source_name=source_name)

    # Prefer turn-by-turn when input has numbered steps
    script = _generate_turn_by_turn(
        user_input, test_case, source_name=source_name, macro_plan=macro_plan
    )
    if script is None:
        script = _generate_initial(user_input, previous_script, test_case, macro_plan=macro_plan, source_name=source_name)
    elif not script.get("steps"):
        print("  Warning: turn-by-turn produced no steps — falling back to monolithic generation.")
        script = _generate_initial(user_input, previous_script, test_case, macro_plan=macro_plan, source_name=source_name)

    if script is None:
        return None

    for attempt in range(1, MAX_GEN_ATTEMPTS + 1):
        _print_script(script, attempt)

        is_clean, feedback = _validate_and_judge(user_input, script)
        if is_clean:
            print(f"  Attempt {attempt}: APPROVED")
            break

        if attempt == MAX_GEN_ATTEMPTS:
            print(f"  Attempt {attempt}: issues remain after {MAX_GEN_ATTEMPTS} attempts — proceeding anyway")
            break

        print(f"  Attempt {attempt}: REJECTED — refining...")
        refined = _refine(user_input, script, feedback, attempt + 1)
        if refined is None:
            print("  Refinement failed — using last version")
            break
        script = refined

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = _sanitize_source_name(source_name) if source_name else None
    if safe:
        filename = f"script_{safe}_{timestamp}.json"
    else:
        filename = f"script_{timestamp}.json"
    SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SCRIPTS_DIR / filename

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(script, f, indent=2)
    print(f"  Saved to: {out_path}")

    if source_name:
        _save_script_md(out_path, user_input, script, source_name)

    return out_path


def _print_script(script: dict, attempt: int) -> None:
    steps = script.get("steps", [])
    print(f"\n  --- Attempt {attempt}: {len(steps)} steps ---")
    for i, step in enumerate(steps, 1):
        action = step.get("action", "?")
        locator = step.get("locator", "")
        test_input = step.get("test_input", "")
        tc_step = step.get("tcStep", "")
        tc_prefix = f"[tc{tc_step}] " if tc_step else ""
        loc_str = f" on {locator}" if locator else ""
        inp_str = f" <- {test_input}" if test_input else ""
        print(f"    {i:>2}. {tc_prefix}{action}{loc_str}{inp_str}")


# ---------------------------------------------------------------------------
# Stage 2+3: Execute with mid-execution healing
# ---------------------------------------------------------------------------


def execute_script(
    script_path: Path,
    user_input: str = "",
    results_dir: str | None = None,
) -> dict | None:
    """Execute a JSON test script and return the full result for analysis."""
    print(f"\n  Executing: {script_path.name}")
    result = run_json(
        str(script_path),
        help_callback=handle_help_request,
        results_dir=results_dir,
    )

    print("\n  --- Result ---")
    print(f"  {result['summary']}")

    step_results = result.get("execution_trace", [])
    for sr in step_results:
        status = sr.get("status", "?")
        marker = "PASS" if status == "PASS" else ("SKIP" if status == "SKIPPED" else "FAIL")
        tc = sr.get("tcStep", "")
        parent = sr.get("parentAction", "")
        sub = sr.get("subStepLabel", "")
        prefix = ""
        if tc:
            prefix += f"[tc{tc}]"
        if parent:
            prefix += f"[{parent} {sub}]" if sub else f"[{parent}]"
        if prefix:
            prefix += " "
        print(f"    Step {sr.get('step', '?'):>2}: [{marker}] {prefix}{sr.get('action', '?')}")

    return result


# ---------------------------------------------------------------------------
# Stage 4: Post-Execution Analysis
# ---------------------------------------------------------------------------


def analyze_results(user_input: str, script_path: Path, run_result: dict) -> dict | None:
    """Run LLM analysis and return the analysis dict (or None on error)."""
    print("\n  Analyzing results with LLM...")

    with open(script_path, encoding="utf-8") as f:
        test_script = json.load(f)

    step_results = run_result.get("execution_trace", [])
    help_exchanges = run_result.get("help_exchanges", [])

    prompt = build_analysis_context(
        user_input=user_input,
        test_script=test_script,
        step_results=step_results,
        help_exchanges=help_exchanges,
        run_success=run_result.get("success", False),
        run_summary=run_result.get("summary", ""),
    )

    try:
        analysis = analyze_execution(prompt)
    except Exception as e:
        print(f"  Analysis error: {e}")
        return None

    print("\n  --- Analysis ---")
    print(f"  Verdict: {analysis.get('verdict', '?')}")
    print(f"  Summary: {analysis.get('summary', '?')}")

    failures = analysis.get("failures", [])
    if failures:
        print(f"\n  Failures ({len(failures)}):")
        for fail in failures:
            print(f"    Step {fail.get('step', '?')}: {fail.get('root_cause', '?')}")
            print(f"      → {fail.get('suggestion', '')}")

    healing = analysis.get("healing_effectiveness", "")
    if healing:
        print(f"\n  Healing: {healing}")

    recs = analysis.get("recommendations", [])
    if recs:
        print("\n  Recommendations:")
        for rec in recs:
            print(f"    - {rec}")

    return analysis


# ---------------------------------------------------------------------------
# Stage 5: Advanced Action Creation
# ---------------------------------------------------------------------------


def create_action(user_input: str) -> None:
    print("\n  Generating advanced action definition...")
    prompt = build_action_creation_context(user_input)

    try:
        action_def = llm_create_action(prompt)
    except Exception as e:
        print(f"  Error from LLM: {e}")
        return

    name = action_def.get("name", "Unnamed")
    steps = action_def.get("steps", [])
    print(f"  Created: {name} ({len(steps)} steps)")
    for i, step in enumerate(steps, 1):
        print(f"    {i:>2}. {step.get('action', '?')} {step.get('locator', '')}")

    SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = SCRIPTS_DIR / f"action_{name}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(action_def, f, indent=2)
    print(f"  Saved to: {json_path}")

    register = input("\n  Register in AdvancedActions.xlsx? (y/n): ").strip().lower()
    if register in ("y", "yes"):
        result = java_create_action(str(json_path))
        print(f"  {result['summary']}")


# ---------------------------------------------------------------------------
# Stage 6: Locator Repair
# ---------------------------------------------------------------------------


def generate_locators_flow() -> None:
    """Crawl the live app and write a fresh locators_generated.xlsx."""
    from tools.locator_crawler import crawl_and_generate_locators
    from tools.locator_writer import write_locators_xlsx

    print("\n  Generating locators by crawling the live app...")
    print("  (App must be running at MOCK_APP_BASE_URL, default http://localhost:4200)")

    totals: dict[str, dict] = {}

    def progress(route: str, sheet: str, elements: list) -> None:
        t1 = sum(1 for e in elements if e.get("tier") == 1)
        t2 = sum(1 for e in elements if e.get("tier") == 2)
        t3 = sum(1 for e in elements if e.get("tier") == 3)
        parts = []
        if t1:
            parts.append(f"{t1} tier-1")
        if t2:
            parts.append(f"{t2} tier-2")
        if t3:
            parts.append(f"{t3} tier-3(structural)")
        detail = ", ".join(parts) or "0 elements"
        print(f"  Crawling {route}... {len(elements)} elements ({detail})")
        totals[sheet] = {"count": len(elements), "t1": t1, "t2": t2, "t3": t3}

    try:
        locators = crawl_and_generate_locators(progress_callback=progress)
    except RuntimeError as e:
        print(f"  Error: {e}")
        return

    out_path = REPO_ROOT / "test_data" / "locators_generated.xlsx"
    write_locators_xlsx(locators, out_path)

    total_elements = sum(v["count"] for v in totals.values())
    total_sheets = len(locators)
    print(f"\n  Written: {out_path.relative_to(REPO_ROOT)} ({total_sheets} sheets, {total_elements} elements total)")
    if any(v["t3"] for v in totals.values()):
        print("  Note: tier-3 (structural) locators are fragile — consider adding data-testid to those elements.")


def _merge_reports(combined: dict, partial: dict) -> None:
    """Merge a per-page partial report into the combined report dict in-place."""
    for key in ("renamed", "removed", "added", "flagged"):
        combined.setdefault(key, []).extend(partial.get(key, []))
    combined.setdefault("unchanged", []).extend(
        partial.get("unchanged", []) if isinstance(partial.get("unchanged"), list) else []
    )
    summaries = combined.setdefault("_summaries", [])
    if partial.get("summary"):
        summaries.append(partial["summary"])


def repair_locators_flow(use_runtime_dom: bool = True) -> None:
    if use_runtime_dom:
        print("\n  Locator repair — per-page mode (templates + locators + runtime testid lists)...")
        print("  (Use `repair locators --no-browser` to skip Playwright/browser capture.)")
    else:
        print("\n  Locator repair — per-page mode (templates + locators only; no browser)...")

    # Collect live testid lists for all routes in one Playwright session (compact — no full HTML)
    testids_by_route: dict[str, list[str]] = {}
    if use_runtime_dom:
        print("  Capturing live testid lists per route...")
        testids_by_route = capture_testids_per_page()
        if testids_by_route:
            print(f"  Captured {len(testids_by_route)} route(s): {', '.join(testids_by_route)}")
        else:
            print("  Warning: browser capture returned no data — falling back to templates only.")

    # Discover all pages/sheets from locators.xlsx
    page_map = load_locator_page_map()
    pages = sorted({v for v in page_map.values() if v and v != "unknown"})
    if not pages:
        print("  No locator sheets found in locators.xlsx — nothing to repair.")
        return

    print(f"  Checking {len(pages)} page(s): {', '.join(pages)}")

    combined: dict = {
        "renamed": [], "removed": [], "added": [], "flagged": [], "unchanged": [], "_summaries": []
    }

    for page in pages:
        page_locators = [k for k, v in page_map.items() if v == page]
        print(f"  [{page}] Asking LLM ({len(page_locators)} locators)...", end="", flush=True)
        try:
            prompt = build_locator_repair_context_for_page(page, testids_by_route)
            partial = repair_locators(prompt)
            _merge_reports(combined, partial)
            counts = (
                f"unchanged={len(partial.get('unchanged', []))}, "
                f"renamed={len(partial.get('renamed', []))}, "
                f"added={len(partial.get('added', []))}, "
                f"flagged={len(partial.get('flagged', []))}"
            )
            print(f" {counts}")
        except Exception as e:
            print(f" ERROR: {e}")

    # Build unified report from combined
    report = combined
    report["summary"] = " | ".join(combined.pop("_summaries", [])) or "Per-page repair complete."

    print("\n  --- Locator Repair Report ---")
    print(f"  Summary: {report.get('summary', '?')}")

    unchanged = report.get("unchanged", [])
    renamed = report.get("renamed", [])
    removed = report.get("removed", [])
    added = report.get("added", [])
    flagged = report.get("flagged", [])

    print(
        f"  Unchanged: {len(unchanged)} | Renamed: {len(renamed)} | "
        f"Removed: {len(removed)} | Added: {len(added)} | Flagged: {len(flagged)}"
    )

    if renamed:
        true_r = [r for r in renamed if r.get("old_name", "").lstrip("$") != r.get("new_name", "").lstrip("$")]
        xpath_r = [r for r in renamed if r.get("old_name", "").lstrip("$") == r.get("new_name", "").lstrip("$")]
        if true_r:
            print("\n  Renamed:")
            for r in true_r:
                print(f"    {r['old_name']} → {r['new_name']}")
        if xpath_r:
            print("\n  XPath updated (same name, new xpath):")
            for r in xpath_r:
                print(f"    {r['old_name']} → {r.get('new_xpath', '?')}")

    if removed:
        print("\n  Removed:")
        for r in removed:
            print(f"    {r['element_name']} ({r.get('page', '')}): {r.get('reason', '')}")

    if flagged:
        print("\n  Flagged (need developer action):")
        for fl in flagged:
            print(f"    {fl['element_name']}: {fl.get('issue', '')}")

    if added:
        print("\n  Added:")
        for a in added:
            print(f"    {a['element_name']} ({a.get('page', '?')}) → {a.get('xpath', '?')}")

    actionable = renamed or added
    if not actionable:
        print("\n  Nothing to apply (no renames or additions).")
        if removed or flagged:
            print("  Removed / flagged entries above require manual review.")
        _audit_prompt_files()
        return

    # Pre-split for accurate confirmation message
    _true_renames_preview = [r for r in renamed if r.get("old_name", "").lstrip("$") != r.get("new_name", "").lstrip("$")]
    _xpath_updates_preview = [r for r in renamed if r.get("old_name", "").lstrip("$") == r.get("new_name", "").lstrip("$")]

    answer = input(
        f"\n  Apply {len(_true_renames_preview)} rename(s), "
        f"{len(_xpath_updates_preview)} xpath-update(s), "
        f"{len(added)} addition(s) to locators.xlsx? (y/n): "
    ).strip().lower()
    if answer not in ("y", "yes"):
        print("  Skipped — report only.")
        _audit_prompt_files()
        return

    from tools.locator_store import rename_locator, add_locator, deduplicate_locators, update_locator

    # Split into true renames (name changed) vs XPath-only updates (same name, new xpath)
    true_renames = [r for r in renamed if r.get("old_name", "").lstrip("$") != r.get("new_name", "").lstrip("$")]
    xpath_updates = [r for r in renamed if r.get("old_name", "").lstrip("$") == r.get("new_name", "").lstrip("$")]

    applied_renames = 0
    for r in true_renames:
        old = r.get("old_name", "").lstrip("$")
        new = r.get("new_name", "").lstrip("$")
        xpath = r.get("new_xpath", "")
        if old and new and xpath:
            if rename_locator(old, new, xpath):
                applied_renames += 1
            else:
                print(f"    Warning: '{old}' not found in locators.xlsx — skipping rename")

    applied_xpath_updates = 0
    for r in xpath_updates:
        name = r.get("old_name", "").lstrip("$")
        xpath = r.get("new_xpath", "")
        if name and xpath:
            update_locator(name, xpath)
            applied_xpath_updates += 1

    applied_adds = 0
    for a in added:
        name = a.get("element_name", "")
        xpath = a.get("xpath", "")
        page = a.get("page", "unknown")
        if name and xpath:
            add_locator(name, xpath, page)
            applied_adds += 1

    removed_dupes = deduplicate_locators()
    if removed_dupes:
        print(f"  Removed {removed_dupes} duplicate locator(s) from locators.xlsx.")

    print(
        f"  Applied {applied_renames} rename(s), "
        f"{applied_xpath_updates} xpath-update(s), "
        f"{applied_adds} addition(s) to locators.xlsx."
    )

    if true_renames:
        patched = _patch_advanced_actions_locators(true_renames)
        if patched:
            print(f"  Patched AdvancedActions.xlsx: {', '.join(patched)}")
        else:
            print("  AdvancedActions.xlsx: no locator references needed updating.")

        patched_md = _patch_prompt_files(true_renames)
        if patched_md:
            print(f"  Patched prompt files: {', '.join(patched_md)}")
        else:
            print("  Prompt files: no locator references needed updating.")

    if removed or flagged:
        print("  Removed / flagged entries still require manual review.")

    _audit_prompt_files()


def _patch_advanced_actions_locators(renamed: list[dict]) -> list[str]:
    """Update $old_name → $new_name in AdvancedActions.xlsx locator cells. Returns patched sheet names."""
    adv_path = REPO_ROOT / "test_data" / "generated_scripts" / "AdvancedActions.xlsx"
    if not adv_path.exists():
        return []

    import openpyxl

    rename_map = {}
    for r in renamed:
        old = r.get("old_name", "").strip().lstrip("$")
        new = r.get("new_name", "").strip().lstrip("$")
        if old and new:
            rename_map[f"${old}"] = f"${new}"
    if not rename_map:
        return []

    wb = openpyxl.load_workbook(adv_path)
    patched_sheets: list[str] = []
    for ws in wb.worksheets:
        sheet_changed = False
        for row in ws.iter_rows(min_row=2):
            for cell in row:
                val = str(cell.value or "").strip()
                if val in rename_map:
                    cell.value = rename_map[val]
                    sheet_changed = True
        if sheet_changed:
            patched_sheets.append(ws.title)
    if patched_sheets:
        wb.save(adv_path)
    wb.close()
    return patched_sheets


def _patch_prompt_files(renamed: list[dict]) -> list[str]:
    """Replace $old_name → $new_name in app_layout.md (the live reference doc). Returns patched file names."""
    prompts_dir = REPO_ROOT / "python-orchestrator" / "prompts"
    # Only patch the app layout doc — other prompt files use locator names as examples, not live refs
    TARGET_FILES = {"app_layout.md"}
    if not prompts_dir.exists():
        return []

    rename_map: dict[str, str] = {}
    for r in renamed:
        old = r.get("old_name", "").strip().lstrip("$")
        new = r.get("new_name", "").strip().lstrip("$")
        if old and new:
            rename_map[f"${old}"] = f"${new}"
    if not rename_map:
        return []

    patched: list[str] = []
    for md_file in prompts_dir.glob("*.md"):
        if md_file.name not in TARGET_FILES:
            continue
        text = md_file.read_text(encoding="utf-8")
        new_text = text
        for old_ref, new_ref in rename_map.items():
            new_text = new_text.replace(old_ref, new_ref)
        if new_text != text:
            md_file.write_text(new_text, encoding="utf-8")
            patched.append(md_file.name)
    return patched


def _audit_prompt_files() -> None:
    """Scan app_layout.md for $name references that are not in locators.xlsx and warn."""
    import re
    from tools.locator_store import load_locator_page_map

    prompts_dir = REPO_ROOT / "python-orchestrator" / "prompts"
    # Only audit the app layout doc — other prompt files use locator names as examples, not live refs
    TARGET_FILES = {"app_layout.md"}
    if not prompts_dir.exists():
        return

    known = set(load_locator_page_map().keys())
    stale: list[tuple[str, str]] = []

    for md_file in sorted(prompts_dir.glob("*.md")):
        if md_file.name not in TARGET_FILES:
            continue
        text = md_file.read_text(encoding="utf-8")
        refs = re.findall(r'\$([a-zA-Z0-9_-]+)', text)
        for ref in refs:
            if ref not in known:
                stale.append((md_file.name, ref))

    if not stale:
        print("  Prompt audit: all $locator references in app_layout.md are valid.")
        return

    by_file: dict[str, list[str]] = {}
    for fname, ref in stale:
        by_file.setdefault(fname, []).append(ref)

    print("\n  Prompt audit — stale $locator references (not in locators.xlsx):")
    for fname, refs in by_file.items():
        unique = sorted(set(refs))
        print(f"    {fname}: {', '.join('$' + r for r in unique)}")
    print("  Update app_layout.md manually or re-run 'repair locators' after fixing the app.")


def repair_generated_script_file(script_path: Path) -> None:
    """Re-write one JSON script so locators match the current registry (LLM + static validator)."""
    print(f"\n  Repair script locators: {script_path}")
    try:
        data = json.loads(script_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"  Could not read JSON: {e}")
        return
    if not isinstance(data, dict) or "steps" not in data:
        print("  File must be a JSON object with a 'steps' array.")
        return

    v_result = static_validate(data)
    if not v_result.is_clean:
        print(f"  Static validation: {len(v_result.errors)} issue(s) before repair")
        for e in v_result.errors:
            print(f"    {e}")
        feedback = v_result.format_for_llm()
    else:
        print("  Static validation: CLEAN (refreshing locators against current table)")
        feedback = ""

    prompt = build_script_locator_repair_context(data, feedback)
    log_prompt("script_locator_repair", prompt, "script_locator_repair_prompt.md")

    print("\n  Asking LLM to update locators in this script...")
    try:
        repaired = llm_refine_script(prompt)
    except Exception as e:
        print(f"  Error from LLM: {e}")
        return

    if not isinstance(repaired, dict) or "steps" not in repaired:
        print("  LLM did not return a valid script object with 'steps'.")
        return

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = script_path.parent / f"{script_path.stem}_repaired_{ts}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(repaired, f, indent=2)
    print(f"  Saved repaired script: {out_path}")

    v2 = static_validate(repaired)
    if v2.is_clean:
        print("  Static validation after repair: CLEAN")
    else:
        print(f"  Static validation after repair: {len(v2.errors)} issue(s) remain")
        for e in v2.errors[:8]:
            print(f"    {e}")


# ---------------------------------------------------------------------------
# Full run cycle (execute → analyze → log → optional refinement retry)
# ---------------------------------------------------------------------------


def _full_run_cycle(
    user_input: str,
    script_path: Path,
    script_data: dict,
    test_case: Optional[dict] = None,
    source_name: Optional[str] = None,
) -> None:
    """Execute, analyze, and save a run log. On failure, refine with execution feedback.

    When a refined script passes, overwrite the original JSON and write
    `{source_name}_corrected.md` for QA.
    """
    original_script_path = script_path
    base_name = source_name or original_script_path.stem
    last_feedback: Optional[str] = None

    for retry in range(MAX_EXEC_RETRIES + 1):
        if retry > 0:
            print(f"\n  --- Execution retry {retry}/{MAX_EXEC_RETRIES} ---")

        logger = RunLogger(script_path.name, user_input, test_case=test_case, source_name=base_name)
        logger.set_script(script_data)

        evidence_dir = str(logger.evidence_dir)
        run_result = execute_script(script_path, user_input, results_dir=evidence_dir)

        if not run_result:
            log_path = logger.save()
            print(f"\n  Run log saved: {log_path}")
            return

        logger.set_run_result(run_result)
        analysis = analyze_results(user_input, script_path, run_result)
        if analysis:
            logger.set_analysis(analysis)

        verdict = (analysis or {}).get("verdict", "FAIL")
        run_success = run_result.get("success", False)

        if run_success and verdict == "PASS" and script_path != original_script_path:
            logger.set_script_corrected(True)

        log_path = logger.save()
        print(f"\n  Run log saved: {log_path}")

        if run_success and verdict == "PASS":
            if script_path != original_script_path:
                with open(original_script_path, "w", encoding="utf-8") as f:
                    json.dump(script_data, f, indent=2)
                print(f"  Updated original script: {original_script_path.name}")
                print("  *** QA: Script was auto-corrected during this run. Review the changes.")

                corrected_md = TEST_SCRIPTS_DIR / f"{base_name}_corrected.md"
                corrected_md.parent.mkdir(parents=True, exist_ok=True)
                lines = [
                    f"# {base_name} — Auto-Corrected Script",
                    "",
                    "This script was auto-corrected during execution. QA should review.",
                    "",
                    "## Original Issues",
                    "",
                    last_feedback or "(No feedback captured)",
                    "",
                    "## Corrected Script",
                    "",
                    "```json",
                    json.dumps(script_data, indent=2),
                    "```",
                ]
                corrected_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
                print(f"  Created: {corrected_md}")
            return

        if retry >= MAX_EXEC_RETRIES:
            print(f"\n  Exhausted {MAX_EXEC_RETRIES} execution retries.")
            return

        feedback_parts = ["## Execution Failure\n"]
        feedback_parts.append(f"Run success: {run_success}")
        feedback_parts.append(f"Summary: {run_result.get('summary', '')}\n")

        trace = run_result.get("execution_trace", [])
        failed_steps = [s for s in trace if s.get("status") == "FAIL"]
        if failed_steps:
            feedback_parts.append("### Failed Steps\n")
            for fs in failed_steps:
                feedback_parts.append(
                    f"- Step {fs.get('step', '?')} ({fs.get('action', '?')} on "
                    f"{fs.get('locator', '')}): {fs.get('detail', '')}"
                )

        if analysis:
            failures = analysis.get("failures", [])
            if failures:
                feedback_parts.append("\n### LLM Analysis\n")
                for f in failures:
                    feedback_parts.append(
                        f"- Step {f.get('step', '?')}: {f.get('root_cause', '')} "
                        f"— Suggestion: {f.get('suggestion', '')}"
                    )

        feedback = "\n".join(feedback_parts)
        last_feedback = feedback
        print("\n  Regenerating script with execution feedback...")

        refined = _refine(user_input, script_data, feedback, retry + 2)
        if refined is None:
            print("  Refinement failed — stopping retries.")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"script_{timestamp}_retry{retry + 1}.json"
        SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
        script_path = SCRIPTS_DIR / filename
        with open(script_path, "w", encoding="utf-8") as f:
            json.dump(refined, f, indent=2)
        print(f"  Saved retry script: {script_path}")
        script_data = refined


def _tc_folder_name(name: str) -> str:
    """Normalise TC stems like 'TC001_...' or 'TC-001' to 'TC-001' format."""
    import re
    m = re.match(r'^TC-?(\d+)', name, re.IGNORECASE)
    if m:
        return f"TC-{int(m.group(1)):03d}"
    return re.sub(r'[^a-zA-Z0-9._-]', '_', name).strip("._") or "TC"


def _save_tc_script(tc_id: str, script: dict, user_input: str) -> None:
    """Save a run-tc script to generated-scripts/<TC-ID>/ on explicit tester request."""
    folder_name = _tc_folder_name(tc_id)
    dest_dir = GENERATED_SCRIPTS_DIR / folder_name
    dest_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = dest_dir / f"{folder_name}_{ts}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(script, f, indent=2)
    _save_script_md(json_path, user_input, script, tc_id)
    print(f"  Saved: {json_path.relative_to(REPO_ROOT)}")


def generate_app_layout_flow() -> None:
    """Crawl the live app and regenerate prompts/app_layout.md via LLM."""
    from tools.locator_crawler import crawl_and_generate_locators

    print("\n  Generating app layout by crawling the live app...")
    print("  (App must be running at MOCK_APP_BASE_URL, default http://localhost:4200)")

    try:
        locators = crawl_and_generate_locators()
    except RuntimeError as e:
        print(f"  Error during crawl: {e}")
        return

    # Build a compact text representation — element names only, no XPaths
    # (XPaths in table cells cause the LLM to pad columns to thousands of chars)
    crawl_parts: list[str] = []
    for sheet_name, elements in locators.items():
        crawl_parts.append(f"### Page: {sheet_name}")
        for el in elements:
            tier = el.get("tier", "?")
            name = el.get("element_name", "")
            crawl_parts.append(f"  - {name} (tier-{tier})")
        crawl_parts.append("")
    crawl_summary = "\n".join(crawl_parts)

    prompt_file = REPO_ROOT / "python-orchestrator" / "prompts" / "generate_app_layout_prompt.md"
    if not prompt_file.exists():
        print(f"  Prompt template not found: {prompt_file}")
        return
    prompt_template = prompt_file.read_text(encoding="utf-8")
    prompt = prompt_template.replace("{{CRAWL_DATA}}", crawl_summary)

    log_prompt("generate_app_layout", prompt, "generate_app_layout_prompt.md")

    print("  Calling LLM to generate layout document...")
    try:
        layout_text = llm_generate_app_layout(prompt)
    except Exception as e:
        print(f"  LLM error: {e}")
        return

    layout_file = REPO_ROOT / "python-orchestrator" / "prompts" / "app_layout_generated.md"
    layout_file.write_text(layout_text.strip() + "\n", encoding="utf-8")
    print(f"  Written: {layout_file.relative_to(REPO_ROOT)}")
    print("  Review app_layout_generated.md and manually update app_layout.md if satisfied.")


# ---------------------------------------------------------------------------
# REPL
# ---------------------------------------------------------------------------

HELP_TEXT = """  Commands:
    <test description>                   — generate + optionally run (free-form NL)
    create advanced action <desc>        — (alias: create action) NL → advanced action JSON + optional register
    exit / quit                          — exit the REPL
    generate app layout                  — crawl the live app and write app_layout_generated.md via LLM
    generate locators                    — crawl live app and write locators_generated.xlsx (tiered strategy)
    list actions                         — advanced actions
    list locators                        — locator table
    list scripts                         — list .md tests and generated .json scripts
    list tcs                             — test cases from TestCases.xlsx
    repair locators                      — bulk reconcile locators.xlsx after UI upgrade (whole registry)
    repair locators --no-browser         — same without Playwright/runtime DOM
    repair script <file.json>            — fix locators in one saved JSON script vs current locators.xlsx
    run <file.md>                        — run a Markdown test script (generate JSON + execute + analyze)
    run tc <TC-ID>                       — load from TestCases.xlsx, generate + run with traceability"""


def _print_repl_footer() -> None:
    """Show available commands after each REPL command for usability."""
    print("\n  " + "—" * 56)
    print("  Available commands (type help for full detail):")
    print(HELP_TEXT)
    print("  " + "—" * 56)


def repl() -> None:
    print("=" * 60)
    print("  AI-Driven UI Automation Orchestrator")
    print("  Model: Gemini 2.5 Flash")
    print("  Context: Stage-specific injection")
    print(f"  Generation loop: up to {MAX_GEN_ATTEMPTS} attempts (validate + judge)")
    print(f"  Execution retry: up to {MAX_EXEC_RETRIES} retries with feedback")
    print(HELP_TEXT)
    print("=" * 60)

    last_script: dict | None = None

    while True:
        try:
            user_input = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if not user_input:
            continue

        lower = user_input.lower()
        if lower in ("exit", "quit"):
            print("Exiting.")
            break

        show_repl_footer = True
        try:
            if lower == "help":
                print(HELP_TEXT)
                show_repl_footer = False
                continue

            if lower == "list actions":
                print(load_advanced_actions_summary())
                continue


            if lower == "list locators":
                print(load_locators_table())
                continue

            if lower == "list tcs":
                try:
                    tcs = list_test_cases()
                    if tcs:
                        print("\n  Available test cases (TestCases.xlsx):")
                        for tc in tcs:
                            tc_id = tc["testCaseId"]
                            print(f"    {tc_id} — {tc['requirementId']}")
                    else:
                        print("  No test cases found.")
                except FileNotFoundError as e:
                    print(f"  {e}")
                continue

            if lower == "list scripts":
                print("\n  Natural-language test specs (.md):")
                if TEST_SCRIPTS_DIR.exists():
                    md_files = sorted(TEST_SCRIPTS_DIR.glob("*.md"))
                    if md_files:
                        for f in md_files:
                            print(f"    - {f.name}")
                    else:
                        print("    (none)")
                else:
                    print(f"    (missing {TEST_SCRIPTS_DIR})")
                print("\n  Generated JSON scripts:")
                if SCRIPTS_DIR.exists():
                    json_files = sorted(SCRIPTS_DIR.glob("*.json"))
                    # hide huge noise: show action_*.json and script_*.json prominently
                    for f in json_files:
                        print(f"    - {f.name}")
                    if not json_files:
                        print("    (none)")
                else:
                    print(f"    (missing {SCRIPTS_DIR})")
                continue

            if lower.startswith("repair script "):
                raw = user_input[len("repair script ") :].strip().strip('"').strip("'")
                sp = resolve_generated_script(raw)
                if sp is None:
                    print(f"  Script not found: {raw}")
                    print(f"  Try a path or a filename under {SCRIPTS_DIR}/")
                    continue
                repair_generated_script_file(sp)
                continue

            if lower == "repair locators --no-browser":
                repair_locators_flow(use_runtime_dom=False)
                continue

            if lower == "repair locators":
                repair_locators_flow(use_runtime_dom=True)
                continue

            if lower == "generate locators":
                generate_locators_flow()
                continue

            if lower == "generate app layout":
                generate_app_layout_flow()
                continue

            if lower.startswith("create advanced action"):
                desc = user_input[len("create advanced action") :].strip()
                if not desc:
                    desc = input("  Describe the advanced action: ").strip()
                create_action(desc)
                continue

            if lower.startswith("advanced action"):
                desc = user_input[len("advanced action") :].strip()
                if not desc:
                    desc = input("  Describe the advanced action: ").strip()
                create_action(desc)
                continue

            if lower.startswith("create action"):
                desc = user_input[len("create action") :].strip()
                if not desc:
                    desc = input("  Describe the action: ").strip()
                create_action(desc)
                continue

            if lower.startswith("run tc "):
                tc_id = user_input[7:].strip()
                try:
                    tc = load_test_case(tc_id)
                except FileNotFoundError as e:
                    print(f"  {e}")
                    continue
                if tc is None:
                    print(f"  Test case not found: {tc_id}")
                    continue
                llm_input = format_for_llm(tc)
                print(
                    f"  Loaded {tc['testCaseId']} ({tc['requirementId']}): "
                    f"{len(tc['steps'])} steps"
                )

                script_path = generate_and_save(
                    llm_input,
                    previous_script=last_script,
                    test_case=tc,
                    source_name=tc_id,
                )
                if script_path is None:
                    continue
                with open(script_path, encoding="utf-8") as f:
                    last_script = json.load(f)

                _full_run_cycle(
                    llm_input,
                    script_path,
                    last_script,
                    test_case=tc,
                    source_name=tc_id,
                )

                save_it = input("\n  Save script to generated-scripts? (y/n): ").strip().lower()
                if save_it in ("y", "yes"):
                    _save_tc_script(tc_id, last_script, llm_input)
                else:
                    print("  Script discarded.")
                continue

            auto_run = False
            run_file_stem: Optional[str] = None
            if lower.startswith("run md "):
                file_arg = user_input[len("run md ") :].strip().strip('"').strip("'")
                if not file_arg:
                    print("  Usage: run md <file.md>")
                    continue
                test_file = resolve_test_file(file_arg)
                if test_file is None:
                    print(f"  File not found: {file_arg}")
                    print(f"  Looked in: current dir, {TEST_SCRIPTS_DIR}/")
                    continue
                run_file_stem = test_file.stem
                user_input = load_test_file(test_file)
                auto_run = True
            elif lower.startswith("run test "):
                file_arg = user_input[len("run test ") :].strip().strip('"').strip("'")
                if not file_arg:
                    print("  Usage: run test <file.md>")
                    continue
                test_file = resolve_test_file(file_arg)
                if test_file is None:
                    print(f"  File not found: {file_arg}")
                    print(f"  Looked in: current dir, {TEST_SCRIPTS_DIR}/")
                    continue
                run_file_stem = test_file.stem
                user_input = load_test_file(test_file)
                auto_run = True
            elif lower.startswith("run "):
                file_arg = user_input[4:].strip().strip('"').strip("'")
                if not file_arg:
                    print("  Usage: run md <file.md>  |  run test <file.md>  |  run <file.md>")
                    continue
                test_file = resolve_test_file(file_arg)
                if test_file is None:
                    print(f"  File not found: {file_arg}")
                    print(f"  Looked in: current dir, {TEST_SCRIPTS_DIR}/")
                    continue
                run_file_stem = test_file.stem
                user_input = load_test_file(test_file)
                auto_run = True

            script_path = generate_and_save(
                user_input,
                previous_script=last_script,
                test_case=None,
                source_name=run_file_stem,
            )
            if script_path is None:
                continue

            with open(script_path, encoding="utf-8") as f:
                last_script = json.load(f)

            if auto_run:
                _full_run_cycle(
                    user_input,
                    script_path,
                    last_script,
                    test_case=None,
                    source_name=run_file_stem,
                )
            else:
                execute_now = input("\n  Execute now? (y/n): ").strip().lower()
                if execute_now in ("y", "yes"):
                    logger = RunLogger(script_path.name, user_input, source_name=run_file_stem)
                    logger.set_script(last_script)
                    evidence_dir = str(logger.evidence_dir)
                    run_result = execute_script(script_path, user_input, results_dir=evidence_dir)

                    if run_result:
                        logger.set_run_result(run_result)
                        analyze_now = input("\n  Analyze results with AI? (y/n): ").strip().lower()
                        if analyze_now in ("y", "yes"):
                            analysis = analyze_results(user_input, script_path, run_result)
                            if analysis:
                                logger.set_analysis(analysis)
                    log_path = logger.save()
                    print(f"\n  Run log saved: {log_path}")
                else:
                    print("  Skipped execution. Script saved for later.")
        finally:
            if show_repl_footer:
                _print_repl_footer()


def main() -> None:
    parser = argparse.ArgumentParser(description="AI-Driven UI Automation Orchestrator")
    parser.add_argument(
        "-f",
        "--file",
        "--md",
        dest="file",
        help="Path to a .md test script (run directly: generate + execute + analyze)",
    )
    parser.add_argument("--tc", help="Test case ID from TestCases.xlsx (e.g. TC-001)")
    parser.add_argument("description", nargs="*", help="Inline test description")
    args = parser.parse_args()

    user_input: str | None = None
    test_case = None
    source_name: str | None = None

    if args.tc:
        try:
            tc = load_test_case(args.tc)
        except FileNotFoundError as e:
            print(f"  {e}")
            sys.exit(1)
        if tc is None:
            print(f"  Test case not found: {args.tc}")
            sys.exit(1)
        test_case = tc
        user_input = format_for_llm(tc)
        source_name = tc.get("testCaseId")
        print(
            f"  Loaded {tc['testCaseId']} ({tc['requirementId']}): "
            f"{len(tc['steps'])} steps"
        )
    elif args.file:
        test_file = resolve_test_file(args.file)
        if test_file is None:
            print(f"  File not found: {args.file}")
            sys.exit(1)
        user_input = load_test_file(test_file)
        source_name = test_file.stem
    elif args.description:
        user_input = " ".join(args.description)

    if user_input:
        script_path = generate_and_save(
            user_input,
            test_case=test_case,
            source_name=source_name,
        )
        if script_path is None:
            sys.exit(1)

        with open(script_path, encoding="utf-8") as f:
            script_data = json.load(f)

        if args.tc or args.file:
            _full_run_cycle(
                user_input,
                script_path,
                script_data,
                test_case=test_case,
                source_name=source_name,
            )
        else:
            execute_now = input("\n  Execute now? (y/n): ").strip().lower()
            if execute_now in ("y", "yes"):
                logger = RunLogger(script_path.name, user_input, source_name=source_name)
                logger.set_script(script_data)
                evidence_dir = str(logger.evidence_dir)
                run_result = execute_script(script_path, user_input, results_dir=evidence_dir)
                if run_result:
                    logger.set_run_result(run_result)
                    analyze_now = input("\n  Analyze results with AI? (y/n): ").strip().lower()
                    if analyze_now in ("y", "yes"):
                        analysis = analyze_results(user_input, script_path, run_result)
                        if analysis:
                            logger.set_analysis(analysis)
                log_path = logger.save()
                print(f"\n  Run log saved: {log_path}")
    else:
        repl()


if __name__ == "__main__":
    main()
