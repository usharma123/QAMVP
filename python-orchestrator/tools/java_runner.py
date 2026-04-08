"""
Bidirectional stdio bridge between the Python orchestrator and the Java execution engine.

Spawns Java via Maven, reads JSON-line IPC messages from stdout, and writes
SOLUTION messages to stdin when the engine requests help.

# TODO: Migrate to REST API for parallel runners and decoupled deployment.
"""

import json
import subprocess
from pathlib import Path
from typing import Callable, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
JAVA_FRAMEWORK_DIR = REPO_ROOT / "java-framework"


def _build_mvn_cmd(*args: str) -> list[str]:
    return [
        "mvn", "exec:java", "-q",
        "-Dexec.mainClass=com.poc.engine.Main",
        f"-Dexec.args={' '.join(args)}",
    ]


def _run_simple_command(*args: str) -> dict:
    """Run a non-interactive Java command (no IPC needed). Returns summary dict."""
    if not JAVA_FRAMEWORK_DIR.is_dir():
        return _error("java-framework directory not found")

    cmd = _build_mvn_cmd(*args)
    try:
        result = subprocess.run(
            cmd, cwd=str(JAVA_FRAMEWORK_DIR),
            capture_output=True, text=True, timeout=300,
        )
        return _result_dict(result)
    except subprocess.TimeoutExpired:
        return _error("Command timed out (300s)")
    except FileNotFoundError:
        return _error("mvn not found on PATH")
    except Exception as e:
        return _error(str(e))


def run_with_ipc(
    command: str,
    path: str,
    help_callback: Optional[Callable[[dict, list[dict]], dict]] = None,
    results_dir: Optional[str] = None,
) -> dict:
    """
    Spawn the Java engine with bidirectional stdio IPC.

    Maintains an execution_trace (list of STEP_RESULT dicts) that is passed
    to the help_callback alongside the HELP_REQUEST so the LLM gets full
    context about what happened before the failure.

    Args:
        command: 'run-json' or 'run-xlsx'
        path: path to the script file
        help_callback: function(msg, execution_trace) -> SOLUTION dict.
                       If None, failures are not recoverable.
        results_dir: optional override for the evidence/results folder.

    Returns:
        Dict with keys: success, messages, execution_trace, help_exchanges, summary.
    """
    if not JAVA_FRAMEWORK_DIR.is_dir():
        return _error("java-framework directory not found")

    mvn_args = [command, path]
    if results_dir:
        mvn_args.append(results_dir)
    cmd = _build_mvn_cmd(*mvn_args)
    messages: list[dict] = []
    execution_trace: list[dict] = []
    help_exchanges: list[dict] = []

    try:
        proc = subprocess.Popen(
            cmd, cwd=str(JAVA_FRAMEWORK_DIR),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True,
        )

        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue

            messages.append(msg)
            msg_type = msg.get("type", "")

            if msg_type == "STEP_RESULT":
                execution_trace.append(msg)

            elif msg_type == "HELP_REQUEST":
                help_exchanges.append(msg)
                if help_callback is not None:
                    solution = help_callback(msg, execution_trace)
                else:
                    solution = {"type": "SOLUTION", "action": "SKIP", "params": {}}
                help_exchanges.append(solution)
                proc.stdin.write(json.dumps(solution) + "\n")
                proc.stdin.flush()

        proc.wait(timeout=60)
        stderr_output = proc.stderr.read()

        run_complete = next((m for m in messages if m.get("type") == "RUN_COMPLETE"), None)
        if run_complete:
            total = run_complete.get("totalSteps", 0)
            passed = run_complete.get("passed", 0)
            failed = run_complete.get("failed", 0)
            success = failed == 0
            summary = f"Run complete: {passed}/{total} passed, {failed} failed."
        else:
            success = proc.returncode == 0
            summary = f"Process exited with code {proc.returncode}."

        if stderr_output:
            summary += f"\nStderr:\n{stderr_output}"

        return {
            "success": success,
            "returncode": proc.returncode,
            "messages": messages,
            "execution_trace": execution_trace,
            "help_exchanges": help_exchanges,
            "summary": summary.strip(),
        }

    except subprocess.TimeoutExpired:
        proc.kill()
        return _error("Java process timed out")
    except FileNotFoundError:
        return _error("mvn not found on PATH")
    except Exception as e:
        return _error(str(e))


# --- Public tool functions ---

def run_json(json_path: str, help_callback=None, results_dir: str | None = None) -> dict:
    """Execute a JSON test script with IPC support."""
    return run_with_ipc("run-json", json_path, help_callback, results_dir)


def run_xlsx(xlsx_path: str, help_callback=None, results_dir: str | None = None) -> dict:
    """Execute an XLSX test script with IPC support."""
    return run_with_ipc("run-xlsx", xlsx_path, help_callback, results_dir)


def compile_json(json_path: str, output_xlsx_path: str = "") -> dict:
    """Compile a JSON script to XLSX for persistence."""
    args = ["compile", json_path]
    if output_xlsx_path:
        args.append(output_xlsx_path)
    return _run_simple_command(*args)


def create_advanced_action(json_payload: str) -> dict:
    """
    Create a new advanced action sheet in AdvancedActions.xlsx.
    json_payload: '{"name":"Login","steps":[{"action":"TYPE","locator":"$login-username","test_input":"{{username}}","output":""}]}'
    """
    return _run_simple_command("create-action", json_payload)


def update_locator(element_name: str, new_xpath: str) -> dict:
    """Update a locator in locators.xlsx."""
    return _run_simple_command("update-locator", element_name, new_xpath)


# --- Helpers ---

def _result_dict(result: subprocess.CompletedProcess) -> dict:
    success = result.returncode == 0
    summary = "Command completed successfully." if success else f"Command failed (exit {result.returncode})."
    if result.stdout:
        summary += f"\nStdout:\n{result.stdout}"
    if result.stderr:
        summary += f"\nStderr:\n{result.stderr}"
    return {
        "success": success,
        "returncode": result.returncode,
        "stdout": result.stdout or "",
        "stderr": result.stderr or "",
        "summary": summary.strip(),
    }


def _error(message: str) -> dict:
    return {
        "success": False,
        "returncode": -1,
        "stdout": "",
        "stderr": message,
        "summary": f"Error: {message}",
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python java_runner.py <run-json|run-xlsx|compile|create-action|update-locator> <args...>", file=sys.stderr)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "run-json":
        result = run_json(sys.argv[2])
    elif cmd == "run-xlsx":
        result = run_xlsx(sys.argv[2])
    elif cmd == "compile":
        result = compile_json(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
    elif cmd == "create-action":
        result = create_advanced_action(sys.argv[2])
    elif cmd == "update-locator":
        result = update_locator(sys.argv[2], sys.argv[3])
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)

    print(result["summary"])
    sys.exit(0 if result["success"] else 1)
