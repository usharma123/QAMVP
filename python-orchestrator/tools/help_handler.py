"""
Callback for HELP_REQUEST messages from the Java execution engine.

Builds a stage-specific healing context (error + page-filtered locators +
execution trace) and queries the LLM for a corrective action.
"""

from tools.context_loader import build_healing_context
from tools.llm_client import resolve_help_request
from tools.prompt_logger import log_prompt


def handle_help_request(msg: dict, execution_trace: list[dict]) -> dict:
    """
    Called by java_runner when the engine sends a HELP_REQUEST.

    Args:
        msg: The HELP_REQUEST dict from Java
             (keys: step, action, locator, error, currentUrl).
        execution_trace: List of STEP_RESULT dicts collected so far
                         (keys: step, action, status).

    Returns:
        A SOLUTION dict: {"type": "SOLUTION", "action": "...", "params": {...}}
    """
    step = msg.get("step", 0)
    action = msg.get("action", "?")
    locator = msg.get("locator", "?")
    error = msg.get("error", "?")
    current_url = msg.get("currentUrl", "")

    print(f"\n  [HELP] Step {step}: {error}")
    print(f"  [HELP] URL: {current_url or '(unknown)'}")
    print(f"  [HELP] Trace: {len(execution_trace)} prior steps")
    print("  [HELP] Asking LLM for solution...")

    prompt = build_healing_context(
        step=step,
        action=action,
        locator=locator,
        error=error,
        current_url=current_url,
        execution_trace=execution_trace,
    )
    log_prompt("healing", prompt, "healing_prompt.md")

    solution = resolve_help_request(prompt)

    sol_action = solution.get("action", "SKIP")
    print(f"  [HELP] LLM suggests: {sol_action} {solution.get('params', {})}")

    return solution
