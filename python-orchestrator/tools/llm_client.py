"""
Gemini 2.5 Flash wrapper with stage-specific LLM calls.

Uses the google-genai SDK (google.genai) which supports ThinkingConfig.
Thinking is enabled on generation calls (generate_test_script,
generate_single_step, plan_macros) and logged to the debug prompt files.
"""

from __future__ import annotations

import json
import os
from typing import Any

MODEL_NAME = "gemini-2.5-flash"

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY not set. Add it to .env or export it.")
        from google import genai
        _client = genai.Client(api_key=api_key)
    return _client


def _base_config(mime_type: str = "application/json", temperature: float = 0.2):
    from google.genai import types
    return types.GenerateContentConfig(
        response_mime_type=mime_type,
        temperature=temperature,
    )


def _thinking_config(mime_type: str = "application/json"):
    """Config with thinking enabled. Temperature must be 1.0 per Gemini requirement."""
    from google.genai import types
    return types.GenerateContentConfig(
        response_mime_type=mime_type,
        temperature=1.0,
        thinking_config=types.ThinkingConfig(include_thoughts=True),
    )


def _call(prompt: str, config=None) -> Any:
    """Make a generate_content call and return the raw response."""
    client = _get_client()
    if config is None:
        config = _base_config()
    return client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=config,
    )


def _response_text(response) -> str:
    """Extract the non-thought text from the response."""
    try:
        parts = response.candidates[0].content.parts
        for part in parts:
            if not getattr(part, "thought", False):
                return part.text or ""
    except Exception:
        pass
    # Fallback: use response.text if available
    return getattr(response, "text", "") or ""


def _extract_thought(response) -> str:
    """Return the thought text from response parts, or empty string."""
    try:
        for part in response.candidates[0].content.parts:
            if getattr(part, "thought", False):
                return part.text or ""
    except Exception:
        pass
    return ""


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        raise ValueError(f"LLM returned invalid JSON:\n{text[:500]}")


def _log_thought(step_name: str, response, run_subfolder: str | None = None) -> None:
    """Extract and log thought text to the debug file if thinking was enabled."""
    thought = _extract_thought(response)
    if thought:
        try:
            from tools.prompt_logger import log_thought
            log_thought(step_name, thought, run_subfolder=run_subfolder)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Stage 1: Generation (thinking enabled)
# ---------------------------------------------------------------------------

def generate_single_step(assembled_prompt: str, run_subfolder: str | None = None) -> list[dict]:
    """Turn-by-turn generation: translate one NL step into a JSON array of step objects."""
    response = _call(assembled_prompt, _thinking_config())
    _log_thought("step", response, run_subfolder=run_subfolder)
    parsed = _parse_json_response(_response_text(response))
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        if "steps" in parsed:
            return parsed["steps"]
        return [parsed]
    return [parsed]


def plan_macros(assembled_prompt: str, user_input: str, run_subfolder: str | None = None) -> dict:
    """Pre-call: given the full NL test description, return ordered macro names + notes."""
    full_prompt = f"{assembled_prompt}\n\n# Full test description\n{user_input}"
    response = _call(full_prompt, _thinking_config())
    _log_thought("macro_plan", response, run_subfolder=run_subfolder)
    parsed = _parse_json_response(_response_text(response))
    if not isinstance(parsed, dict):
        return {"macros": [], "notes": ""}
    raw = parsed.get("macros")
    if raw is None:
        macros: list[str] = []
    elif isinstance(raw, str):
        macros = [raw.strip()] if raw.strip() else []
    else:
        macros = [str(m).strip() for m in raw if str(m).strip()]
    notes = parsed.get("notes") or ""
    return {"macros": macros, "notes": str(notes).strip()}


def generate_test_script(user_input: str, assembled_prompt: str, run_subfolder: str | None = None) -> dict:
    """Stage 1: Generate a JSON test script from a natural language description."""
    full_prompt = f"{assembled_prompt}\n\n# User Request\n{user_input}"
    response = _call(full_prompt, _thinking_config())
    _log_thought("generation", response, run_subfolder=run_subfolder)
    return _parse_json_response(_response_text(response))


# ---------------------------------------------------------------------------
# Stage 1b–1c: Judge + Refinement (no thinking)
# ---------------------------------------------------------------------------

def judge_script(assembled_prompt: str) -> dict:
    """Stage 1b: LLM-as-judge semantic review of a generated script."""
    response = _call(assembled_prompt)
    return _parse_json_response(_response_text(response))


def refine_script(assembled_prompt: str) -> dict:
    """Stage 1c: Regenerate a corrected script using feedback."""
    response = _call(assembled_prompt)
    return _parse_json_response(_response_text(response))


# ---------------------------------------------------------------------------
# Stage 3: Self-healing (no thinking — latency sensitive)
# ---------------------------------------------------------------------------

def resolve_help_request(assembled_prompt: str) -> dict:
    """Stage 3: Ask Gemini for a corrective action during mid-execution failure."""
    response = _call(assembled_prompt)
    try:
        solution = _parse_json_response(_response_text(response))
    except (json.JSONDecodeError, ValueError):
        return {"type": "SOLUTION", "action": "SKIP", "params": {}}
    if "type" not in solution:
        solution["type"] = "SOLUTION"
    return solution


# ---------------------------------------------------------------------------
# Stage 4: Analysis (no thinking)
# ---------------------------------------------------------------------------

def analyze_execution(assembled_prompt: str) -> dict:
    """Stage 4: Post-execution analysis of test results."""
    response = _call(assembled_prompt)
    return _parse_json_response(_response_text(response))


# ---------------------------------------------------------------------------
# Stage 5: Action creation (no thinking)
# ---------------------------------------------------------------------------

def create_advanced_action(assembled_prompt: str) -> dict:
    """Stage 5: Generate a new advanced action definition from description."""
    response = _call(assembled_prompt)
    return _parse_json_response(_response_text(response))


# ---------------------------------------------------------------------------
# Stage 6: Locator repair (no thinking)
# ---------------------------------------------------------------------------

def repair_locators(assembled_prompt: str) -> dict:
    """Stage 6: Bulk locator repair after Angular upgrade."""
    response = _call(assembled_prompt)
    return _parse_json_response(_response_text(response))


# ---------------------------------------------------------------------------
# App layout generation (plain text, not JSON)
# ---------------------------------------------------------------------------

def generate_app_layout(prompt: str) -> str:
    """Generate an app_layout.md document from live DOM crawl data.

    Returns the raw Markdown text produced by the LLM.
    """
    from google.genai import types
    config = types.GenerateContentConfig(
        response_mime_type="text/plain",
        temperature=0.3,
    )
    response = _call(prompt, config)
    return _response_text(response)
