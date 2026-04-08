"""
Persistent run logger — writes a structured Markdown report to an evidence
folder after each test run.

Evidence folder layout:
  test_results/REQ-001_TC-001/          (when test case metadata is available)
  test_results/logs/                     (fallback for ad-hoc runs)

Captures everything needed for post-mortem debugging and audit:
  - Test case metadata (requirement ID, test case ID)
  - Test description and generated script
  - Requirement traceability (grouped by test case step)
  - Full execution trace (every step result)
  - Self-healing exchanges (HELP_REQUEST + SOLUTION pairs)
  - Java engine stderr
  - Run outcome
  - LLM analysis verdict and recommendations
"""

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

# Results live under test_data/test-results/, parallel to test_data/test_scripts/
RESULTS_ROOT = Path(__file__).resolve().parent.parent.parent / "test_data" / "test-results"


class RunLogger:
    """Accumulates run data and writes a Markdown report + result XLSX on save()."""

    def __init__(self, script_name: str, user_input: str,
                 test_case: Optional[dict] = None,
                 source_name: Optional[str] = None):
        self.script_name = script_name
        self.source_name = source_name
        self.user_input = user_input
        self.test_case = test_case
        self.timestamp = datetime.now()
        self.generated_script: Optional[dict] = None
        self.run_result: Optional[dict] = None
        self.analysis: Optional[dict] = None
        self.script_was_corrected: bool = False

    def set_script(self, script: dict) -> None:
        self.generated_script = script

    def set_script_corrected(self, corrected: bool = True) -> None:
        self.script_was_corrected = corrected

    def set_run_result(self, result: dict) -> None:
        self.run_result = result

    def set_analysis(self, analysis: dict) -> None:
        self.analysis = analysis

    @property
    def evidence_dir(self) -> Path:
        """Evidence folder: test-results/<TCID>/ or test-results/<source_stem>/ or test-results/logs/."""
        if self.test_case:
            tc = self.test_case.get("testCaseId", "TC-000")
            return RESULTS_ROOT / tc
        if self.source_name:
            return RESULTS_ROOT / _tc_folder_name(self.source_name)
        return RESULTS_ROOT / "logs"

    @property
    def debug_dir(self) -> Path:
        """Debug folder lives inside the evidence folder."""
        return self.evidence_dir / "debug"

    def save(self) -> Path:
        from tools.result_writer import write_result_xlsx
        from tools.report_writer import write_both_reports

        out_dir = self.evidence_dir
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = self.timestamp.strftime("%Y%m%d_%H%M%S")
        path = out_dir / f"run_{ts}.md"

        # Write legacy summary XLSX (backward compat)
        xlsx_path = out_dir / f"run_{ts}.xlsx"
        try:
            write_result_xlsx(self, xlsx_path)
        except Exception as exc:
            print(f"  Warning: could not write result XLSX: {exc}")

        # Write detail + summary reports
        if self.run_result:
            try:
                write_both_reports(
                    self.run_result,
                    self.test_case,
                    self.generated_script,
                    out_dir,
                    ts,
                )
            except Exception as exc:
                print(f"  Warning: could not write Excel reports: {exc}")

        lines: list[str] = []
        self._header(lines)
        self._section_description(lines)
        self._section_traceability(lines)
        self._section_script(lines)
        self._section_execution(lines)
        self._section_healing(lines)
        self._section_engine_logs(lines)
        self._section_run_summary(lines)
        self._section_analysis(lines)

        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return path

    # ------------------------------------------------------------------
    # Report sections
    # ------------------------------------------------------------------

    def _header(self, lines: list[str]) -> None:
        ts = self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        lines.append("# Test Run Report")
        lines.append("")
        lines.append("| Field | Value |")
        lines.append("|-------|-------|")
        lines.append(f"| Timestamp | {ts} |")
        lines.append(f"| Script | `{self.script_name}` |")
        if self.test_case:
            lines.append(f"| Requirement | {self.test_case.get('requirementId', '')} |")
            lines.append(f"| Test Case | {self.test_case.get('testCaseId', '')} |")
        lines.append(f"| Verdict | {self._verdict()} |")
        if self.script_was_corrected:
            lines.append("| **Script corrected** | YES — QA should review |")
        lines.append("")

    def _section_description(self, lines: list[str]) -> None:
        lines.append("## Test Description")
        lines.append("")
        lines.append(self.user_input or "(none)")
        lines.append("")

    def _section_traceability(self, lines: list[str]) -> None:
        """Group execution results by tcStep for audit-ready traceability."""
        if not self.run_result or not self.test_case:
            return

        trace = self.run_result.get("execution_trace", [])
        if not trace:
            return

        tc_steps = {s["stepNumber"]: s for s in self.test_case.get("steps", [])}

        # Group trace entries by tcStep
        groups: dict[int, list[dict]] = defaultdict(list)
        ungrouped: list[dict] = []
        for sr in trace:
            tc = sr.get("tcStep")
            if tc is not None:
                groups[tc].append(sr)
            else:
                ungrouped.append(sr)

        req_id = self.test_case.get("requirementId", "")
        tc_id = self.test_case.get("testCaseId", "")

        lines.append("## Requirement Traceability")
        lines.append("")
        lines.append("| Req ID | TC ID | TC Step | Description | Action | Sub-steps | Status |")
        lines.append("|--------|-------|---------|-------------|--------|-----------|--------|")

        for step_num in sorted(groups.keys()):
            entries = groups[step_num]
            tc_step_meta = tc_steps.get(step_num, {})
            desc = _escape_pipe(tc_step_meta.get("stepDescription", ""))
            parent = entries[0].get("parentAction", "")
            action_label = parent if parent else entries[0].get("action", "?")

            passed = sum(1 for e in entries if e.get("status") == "PASS")
            failed = sum(1 for e in entries if e.get("status") == "FAIL")
            skipped = sum(1 for e in entries if e.get("status") == "SKIPPED")
            total = len(entries)

            parts = []
            if passed:
                parts.append(f"{passed} passed")
            if failed:
                parts.append(f"{failed} failed")
            if skipped:
                parts.append(f"{skipped} skipped")
            sub_summary = f"{', '.join(parts)} / {total}"

            if failed > 0:
                status = "FAIL"
            elif skipped > 0:
                status = "PARTIAL"
            else:
                status = "PASS"

            lines.append(
                f"| {req_id} | {tc_id} | {step_num} | {desc} | "
                f"{action_label} | {sub_summary} | {status} |"
            )

        if ungrouped:
            lines.append(
                f"| {req_id} | {tc_id} | — | (unmapped steps) | "
                f"— | {len(ungrouped)} | — |"
            )

        lines.append("")

    def _section_script(self, lines: list[str]) -> None:
        if not self.generated_script:
            return
        lines.append("## Generated Script")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(self.generated_script, indent=2))
        lines.append("```")
        lines.append("")

    def _section_execution(self, lines: list[str]) -> None:
        if not self.run_result:
            return
        trace = self.run_result.get("execution_trace", [])
        lines.append(f"## Execution Trace ({len(trace)} steps)")
        lines.append("")
        lines.append("| Step | TC Step | Parent Action | Sub-step | Action | Status | Detail |")
        lines.append("|------|---------|---------------|----------|--------|--------|--------|")
        for sr in trace:
            step = sr.get("step", "?")
            tc_step = sr.get("tcStep", "")
            parent = sr.get("parentAction", "")
            sub_label = sr.get("subStepLabel", "")
            action = sr.get("action", "?")
            status = sr.get("status", "?")
            detail = _escape_pipe(sr.get("detail", ""))
            lines.append(
                f"| {step} | {tc_step or ''} | {parent} | {sub_label} | "
                f"{action} | {status} | {detail} |"
            )
        lines.append("")

    def _section_healing(self, lines: list[str]) -> None:
        if not self.run_result:
            return
        exchanges = self.run_result.get("help_exchanges", [])
        if not exchanges:
            return
        count = len(exchanges) // 2
        lines.append(f"## Self-Healing Exchanges ({count})")
        lines.append("")
        for i in range(0, len(exchanges), 2):
            req = exchanges[i] if i < len(exchanges) else {}
            sol = exchanges[i + 1] if i + 1 < len(exchanges) else {}
            lines.append(f"### Exchange {i // 2 + 1}")
            lines.append("")
            lines.append(f"- **Step**: {req.get('step', '?')}")
            lines.append(f"- **Action**: `{req.get('action', '?')}` on `{req.get('locator', '?')}`")
            lines.append(f"- **Error**: {req.get('error', '?')}")
            lines.append(f"- **URL**: {req.get('currentUrl', '?')}")
            lines.append(f"- **Solution**: `{sol.get('action', '?')}` {json.dumps(sol.get('params', {}))}")
            lines.append("")

    def _section_engine_logs(self, lines: list[str]) -> None:
        if not self.run_result:
            return
        summary = self.run_result.get("summary", "")
        stderr_idx = summary.find("Stderr:")
        if stderr_idx < 0:
            return
        stderr = summary[stderr_idx + len("Stderr:"):].strip()
        if not stderr:
            return
        lines.append("## Engine Logs (stderr)")
        lines.append("")
        lines.append("```")
        lines.append(stderr)
        lines.append("```")
        lines.append("")

    def _section_run_summary(self, lines: list[str]) -> None:
        if not self.run_result:
            return
        summary = self.run_result.get("summary", "")
        summary_line = summary.split("\n")[0] if summary else "(none)"

        trace = self.run_result.get("execution_trace", [])
        passed = sum(1 for s in trace if s.get("status") == "PASS")
        failed = sum(1 for s in trace if s.get("status") == "FAIL")
        skipped = sum(1 for s in trace if s.get("status") == "SKIPPED")

        lines.append("## Run Summary")
        lines.append("")
        lines.append(f"- **Success**: {'YES' if self.run_result.get('success') else 'NO'}")
        lines.append(f"- **Exit code**: {self.run_result.get('returncode', '?')}")
        lines.append(f"- **Steps**: {passed} passed, {failed} failed, {skipped} skipped")
        lines.append(f"- **Result**: {summary_line}")
        lines.append("")
        lines.append("Prompts used during this run are logged to `debug/prompt_*.md` (inside this run folder).")
        lines.append("")

    def _section_analysis(self, lines: list[str]) -> None:
        if not self.analysis:
            return
        lines.append("## LLM Analysis")
        lines.append("")
        lines.append(f"- **Verdict**: {self.analysis.get('verdict', '?')}")
        lines.append(f"- **Summary**: {self.analysis.get('summary', '?')}")
        lines.append("")

        failures = self.analysis.get("failures", [])
        if failures:
            lines.append(f"### Failures ({len(failures)})")
            lines.append("")
            for f in failures:
                lines.append(f"- **Step {f.get('step', '?')}**: {f.get('root_cause', '?')}")
                sug = f.get("suggestion", "")
                if sug:
                    lines.append(f"  - Suggestion: {sug}")
            lines.append("")

        healing = self.analysis.get("healing_effectiveness", "")
        if healing:
            lines.append("### Healing Effectiveness")
            lines.append("")
            lines.append(healing)
            lines.append("")

        recs = self.analysis.get("recommendations", [])
        if recs:
            lines.append("### Recommendations")
            lines.append("")
            for r in recs:
                lines.append(f"- {r}")
            lines.append("")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _verdict(self) -> str:
        if self.analysis:
            return self.analysis.get("verdict", "N/A")
        if self.run_result:
            return "PASS" if self.run_result.get("success") else "FAIL"
        return "N/A"


def _escape_pipe(text: str) -> str:
    """Escape pipe characters so they don't break Markdown tables."""
    return text.replace("|", "\\|") if text else ""


def _sanitize_folder_name(name: str) -> str:
    """Make a safe directory name from a script stem or test case ID."""
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name).strip("._") or "run"


def _tc_folder_name(name: str) -> str:
    """Normalise TC script stems like 'TC001_buy...' or 'TC-001' to 'TC-001' format.

    Falls back to _sanitize_folder_name for names that don't match TC<NNN>* patterns.
    """
    import re
    m = re.match(r'^TC-?(\d+)', name, re.IGNORECASE)
    if m:
        return f"TC-{int(m.group(1)):03d}"
    return _sanitize_folder_name(name)
