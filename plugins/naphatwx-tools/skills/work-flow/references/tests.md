# Phase 3: Tests

Starts only after the user clears the checkpoint. Writes tests. Runs none.

1. **Unit tests.** One owner per changed app, `MODE: tests`. Use the same instance that wrote the code when it is still reachable (it has the context); else a fresh owner. Scope: the files that app changed in Phase 2, plus the `[TEST]` tasks for that app.
2. **Integration tests.** If the profile has them, start the integration test owner, `MODE: tests`, for the added or changed behavior. Use the project's test skill or guide if it has one.
3. Start independent apps at once.
4. A test that cannot pass without a code change means a real bug. Report it; fix it in the code in Phase 4, never by weakening the test.
5. Tick the `[TEST]` tasks. Report what was written, per app.

No test runs here. They run in the Phase 6 gate, or when the user asks.
