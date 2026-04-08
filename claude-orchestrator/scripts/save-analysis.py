#!/usr/bin/env python3
"""
Save Claude's analysis output to the QA audit trail.

Usage:
    python claude-orchestrator/scripts/save-analysis.py <name> <analysis-text>
    echo "analysis text" | python claude-orchestrator/scripts/save-analysis.py <name> --stdin

Output:
    test_data/test-results/<name>_analysis_<YYYYMMDD_HHMMSS>.md
"""
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RESULTS_DIR = REPO_ROOT / "test_data" / "test-results"


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python claude-orchestrator/scripts/save-analysis.py <name> <analysis-text>")
        print("       echo 'text' | python claude-orchestrator/scripts/save-analysis.py <name> --stdin")
        sys.exit(2)

    name = sys.argv[1]

    if len(sys.argv) >= 3 and sys.argv[2] == "--stdin":
        analysis_text = sys.stdin.read()
    elif len(sys.argv) >= 3:
        analysis_text = " ".join(sys.argv[2:])
    else:
        print("Error: provide analysis text as argument or use --stdin")
        sys.exit(2)

    if not analysis_text.strip():
        print("Error: analysis text is empty")
        sys.exit(1)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in name).strip("._") or "analysis"
    out_path = RESULTS_DIR / f"{safe_name}_analysis_{timestamp}.md"

    content = f"# Analysis: {name}\n\n"
    content += f"_Generated: {datetime.now().isoformat()}_\n\n"
    content += analysis_text.strip() + "\n"

    out_path.write_text(content, encoding="utf-8")
    print(f"Saved: {out_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
