## Advanced action composition (default)

**Default:** Prefer **advanced actions** (macros from the registry) over **primitive** steps whenever the test intent is fully covered by one or more macros.

- Emit **one JSON step per macro** with the correct `action` name and `test_input` parameter bindings (`key=value` comma-separated).
- **Do not** expand a macro into its internal CLICK / TYPE / WAIT / SELECT sequence unless the test explicitly requires inspecting or manipulating those individual UI elements.
- When a scenario needs **multiple** macros (e.g. login → trade → logout → approve), use the **smallest** set of macro steps that covers the flow—not the longest primitive sequence.

**Use primitives when:**

- No registered advanced action matches the intent.
- The test explicitly targets low-level UI behavior (specific waits, malformed input, focus, etc.).
- You only need a short assertion or navigation **after** a macro completes (e.g. `ASSERT_CONTAINS`, `CLICK` to open a menu the macro does not cover).

**Refinement:** Do not replace a macro that matches the test with a long primitive sequence unless feedback explicitly requires it.
