# Create Advanced Action

Define a new reusable macro (Advanced Action) for the test framework.

## Input

$ARGUMENTS

A natural language description of what the action should do. Example:
- "Login as checker and navigate to the approval queue"
- "Create a sell trade with configurable ticker, quantity, and account type"

## Steps

### 1. Load current context

```bash
python claude-orchestrator/scripts/show-context.py --locators --actions
```

Study the existing advanced actions carefully — follow their naming convention, step ordering, and wait strategies.

### 2. Read the action creation rules

Read `python-orchestrator/prompts/action_creation_prompt.md` for the full output format and rules.

### 3. Design the action

- **Name**: PascalCase, descriptive, unique (check it doesn't already exist)
- **Parameters**: use `{{paramName}}` in `test_input` for caller-supplied values
- **Steps**: only built-in actions (`CLICK`, `TYPE`, `SELECT`, `WAIT_VISIBLE`, etc.)
- Every locator must be a `$element-name` from locators.xlsx
- Add `WAIT_VISIBLE` after navigation (app has ~1.5s latency)
- Add `WAIT_HIDDEN` before interacting with content after a spinner

### 4. Output the action JSON

```json
{
  "name": "ActionName",
  "steps": [
    {
      "action": "BUILT_IN_ACTION",
      "locator": "$element-name",
      "test_input": "value or {{paramName}}",
      "output": ""
    }
  ]
}
```

### 5. Save and register

Save to: `test_data/generated_scripts/action_<ActionName>.json`

Then ask the user: "Register this in AdvancedActions.xlsx? (y/n)"

If yes:
```bash
cd java-framework && mvn exec:java -q -Dexec.mainClass=com.poc.engine.Main \
  -Dexec.args="create-action /absolute/path/to/action_<ActionName>.json"
```

Report whether registration succeeded.
