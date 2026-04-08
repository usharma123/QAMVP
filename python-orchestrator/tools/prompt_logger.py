"""
Log prompts used at each LLM invocation for clarity and post-mortem inspection.

Writes full prompts to test_data/test-results/<run_subfolder>/debug/ and prints
a short summary to console.
"""

from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
# Results root mirrors run_logger.py
_RESULTS_ROOT = REPO_ROOT / "test_data" / "test-results"


def _debug_dir(run_subfolder: str | None) -> Path:
    """Return the debug directory for a given run subfolder."""
    if run_subfolder:
        safe = _tc_folder_name(run_subfolder)
        return _RESULTS_ROOT / safe / "debug"
    return _RESULTS_ROOT / "logs" / "debug"


def _thinking_dir(run_subfolder: str | None) -> Path:
    """Return the llm-thinking directory for a given run subfolder."""
    if run_subfolder:
        safe = _tc_folder_name(run_subfolder)
        return _RESULTS_ROOT / safe / "llm-thinking"
    return _RESULTS_ROOT / "logs" / "llm-thinking"


def log_prompt(step_name: str, prompt: str, template: str = "", run_subfolder: str | None = None) -> None:
    """Log prompt to console and debug file for clarity.

    If run_subfolder is provided (e.g. script name like TC001_buy_trade_and_verify_count),
    prompts are written to test_data/test-results/{run_subfolder}/debug/ for grouping by run.
    """
    debug_dir = _debug_dir(run_subfolder)
    debug_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = debug_dir / f"prompt_{step_name}_{ts}.md"
    path.write_text(f"# Prompt: {step_name}\n\n```\n{prompt}\n```\n", encoding="utf-8")
    template_str = f" ({template})" if template else ""
    rel_path = path.relative_to(_RESULTS_ROOT) if run_subfolder else path.name
    print(f"  [Prompt] {step_name}{template_str}: {len(prompt)} chars -> {rel_path}")


def log_thought(step_name: str, thought: str, run_subfolder: str | None = None) -> None:
    """Write the LLM's thinking text to a standalone file in llm-thinking/.

    Each call creates a new file so thoughts are never mixed with prompt logs.
    No-ops silently if thought is empty.
    """
    if not thought or not thought.strip():
        return
    thinking_dir = _thinking_dir(run_subfolder)
    thinking_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = thinking_dir / f"thought_{step_name}_{ts}.md"
    path.write_text(f"# LLM Thinking: {step_name}\n\n```\n{thought.strip()}\n```\n", encoding="utf-8")


def _sanitize_subfolder(name: str) -> str:
    """Make a safe directory name from script/test case name."""
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name).strip("._") or "run"


def _tc_folder_name(name: str) -> str:
    """Normalise TC script stems like 'TC001_buy...' or 'TC-001' to 'TC-001' format.

    Falls back to _sanitize_subfolder for names that don't match TC<NNN>* patterns.
    """
    import re
    m = re.match(r'^TC-?(\d+)', name, re.IGNORECASE)
    if m:
        return f"TC-{int(m.group(1)):03d}"
    return _sanitize_subfolder(name)
