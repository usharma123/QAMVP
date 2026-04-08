#!/usr/bin/env python3
"""
Smoke-test Stage 5: advanced action generation (LLM → JSON).

Usage (from repo root or python-orchestrator):
  cd python-orchestrator && python scripts/test_advanced_action_generation.py
  python scripts/test_advanced_action_generation.py "Open Trade List from navbar"

Requires GOOGLE_API_KEY in .env or environment.
"""

import json
import os
import sys

from dotenv import load_dotenv

# Allow running from python-orchestrator/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from tools.context_loader import build_action_creation_context
from tools.llm_client import create_advanced_action


def main() -> None:
    desc = (
        " ".join(sys.argv[1:]).strip()
        or "Navigate to the Trade List page using only navbar clicks (Trading menu, then Trade List)."
    )
    print("Building action_creation context (locators + existing actions)...")
    prompt = build_action_creation_context(desc)
    print(f"User task: {desc}\n")
    print("Calling Gemini (create_advanced_action)...")
    action_def = create_advanced_action(prompt)
    name = action_def.get("name", "Unnamed")
    steps = action_def.get("steps", [])
    print(f"\nOK — name={name!r}, steps={len(steps)}")
    print(json.dumps(action_def, indent=2))


if __name__ == "__main__":
    main()
