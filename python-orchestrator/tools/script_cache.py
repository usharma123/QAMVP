"""
Script cache — deterministic reuse of validated & executed scripts.

Cache layout:
  test_data/script_cache/
    TC-001.json          — frozen script
    TC-001.meta.json     — metadata (cache_hash, timestamp, verdict, frozen flag)

Staleness is tracked with a **composite hash** covering:
  - The test case steps themselves (from TestCases.xlsx)
  - locators.xlsx content (new/renamed/removed elements)
  - Advanced action definitions (action_*.json files)
  - App layout document (app_layout.md)

Adding a new test case does NOT invalidate existing caches.
Changing a locator, an action, or the app layout DOES — because the
generated script may reference elements or flows that have changed.

Flow:
  1. Before generation, check if a cached script exists for the TC.
  2. If cached AND not stale (hash matches), skip generation entirely.
  3. After a successful run (PASS verdict), auto-cache the script.
  4. User can manually freeze/unfreeze scripts via REPL commands.
  5. A frozen script is never regenerated even if the hash changes —
     the user must explicitly unfreeze first.
"""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = REPO_ROOT / "test_data" / "script_cache"
LOCATORS_XLSX = REPO_ROOT / "test_data" / "locators.xlsx"
ACTIONS_DIR = REPO_ROOT / "test_data" / "generated_scripts"
APP_LAYOUT = REPO_ROOT / "python-orchestrator" / "prompts" / "app_layout.md"


def _file_hash(path: Path) -> str:
    """SHA-256 of a single file's contents (empty string if missing)."""
    if not path.exists():
        return ""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _context_fingerprint() -> str:
    """Hash the generation-relevant context files.

    Covers locators, advanced action definitions, and app layout.
    A change to ANY of these means cached scripts may be outdated.
    """
    parts: list[str] = []

    parts.append(_file_hash(LOCATORS_XLSX))
    parts.append(_file_hash(APP_LAYOUT))

    if ACTIONS_DIR.exists():
        for f in sorted(ACTIONS_DIR.glob("action_*.json")):
            parts.append(_file_hash(f))

    combined = "|".join(parts)
    return hashlib.sha256(combined.encode()).hexdigest()[:16]


def _cache_hash(test_case: dict) -> str:
    """Composite hash: TC steps + context fingerprint.

    Stale when EITHER the test case changes OR the surrounding context
    (locators, actions, app layout) changes.
    """
    steps_str = json.dumps(test_case.get("steps", []), sort_keys=True)
    tc_part = hashlib.sha256(steps_str.encode()).hexdigest()[:16]
    ctx_part = _context_fingerprint()
    return f"{tc_part}_{ctx_part}"


def _meta_path(tc_id: str) -> Path:
    return CACHE_DIR / f"{tc_id}.meta.json"


def _script_path(tc_id: str) -> Path:
    return CACHE_DIR / f"{tc_id}.json"


def get_cached(tc_id: str, test_case: dict) -> Optional[dict]:
    """Return cached script if it exists and is not stale.

    Returns None if:
      - No cache entry exists
      - Cache is stale (tc_hash mismatch) AND not frozen
    """
    sp = _script_path(tc_id)
    mp = _meta_path(tc_id)
    if not sp.exists() or not mp.exists():
        return None

    meta = json.loads(mp.read_text(encoding="utf-8"))
    current_hash = _cache_hash(test_case)

    if meta.get("frozen"):
        return json.loads(sp.read_text(encoding="utf-8"))

    if meta.get("cache_hash") != current_hash:
        return None

    return json.loads(sp.read_text(encoding="utf-8"))


def cache_script(
    tc_id: str,
    test_case: dict,
    script: dict,
    verdict: str = "PASS",
) -> Path:
    """Save a script to the cache after a successful run."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    sp = _script_path(tc_id)
    mp = _meta_path(tc_id)

    sp.write_text(json.dumps(script, indent=2), encoding="utf-8")

    meta = {
        "tc_id": tc_id,
        "cache_hash": _cache_hash(test_case),
        "verdict": verdict,
        "frozen": False,
        "cached_at": datetime.now().isoformat(),
    }
    mp.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return sp


def freeze_script(tc_id: str) -> bool:
    """Mark a cached script as frozen (never regenerated)."""
    mp = _meta_path(tc_id)
    if not mp.exists():
        return False
    meta = json.loads(mp.read_text(encoding="utf-8"))
    meta["frozen"] = True
    meta["frozen_at"] = datetime.now().isoformat()
    mp.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return True


def unfreeze_script(tc_id: str) -> bool:
    """Remove the frozen flag — allows regeneration on next run."""
    mp = _meta_path(tc_id)
    if not mp.exists():
        return False
    meta = json.loads(mp.read_text(encoding="utf-8"))
    meta["frozen"] = False
    meta.pop("frozen_at", None)
    mp.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return True


def is_frozen(tc_id: str) -> bool:
    mp = _meta_path(tc_id)
    if not mp.exists():
        return False
    meta = json.loads(mp.read_text(encoding="utf-8"))
    return meta.get("frozen", False)


def is_stale(tc_id: str, test_case: dict) -> bool:
    """Check if the cached script is stale (hash mismatch on TC steps or context)."""
    mp = _meta_path(tc_id)
    if not mp.exists():
        return True
    meta = json.loads(mp.read_text(encoding="utf-8"))
    return meta.get("cache_hash") != _cache_hash(test_case)


def list_cached() -> list[dict]:
    """Return metadata for all cached scripts."""
    if not CACHE_DIR.exists():
        return []
    result = []
    for mp in sorted(CACHE_DIR.glob("*.meta.json")):
        try:
            meta = json.loads(mp.read_text(encoding="utf-8"))
            result.append(meta)
        except (json.JSONDecodeError, OSError):
            continue
    return result


def clear_cache(tc_id: str) -> bool:
    """Remove a cached script entirely."""
    sp = _script_path(tc_id)
    mp = _meta_path(tc_id)
    removed = False
    if sp.exists():
        sp.unlink()
        removed = True
    if mp.exists():
        mp.unlink()
        removed = True
    return removed
