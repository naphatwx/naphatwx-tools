# Writer agent prompt (one agent per scenario group)

Spawn one agent per scenario group, **all in one message** so they run in parallel. A group is the scenarios that share a page or flow. Each agent writes **one spec file** and runs nothing.

If the target repo routes code in its e2e folder to a specialist agent (read its guide files), spawn that agent type. Otherwise use a general-purpose agent.

```text
Write ONE Playwright spec file. Do not run it, do not edit any other file.

Repo: <repo-root>   Guide files to follow: <paths>
E2E folder: <e2e-dir>   Spec file to write: <e2e-dir>/<group>.e2e.spec.ts
Scenario file: <path>   Your test cases: <TC-ids>
Shared helpers (already written, import them, never copy them):
  - step:  import { step } from '<relative path to step.ts>'
  - login: <how the suite signs in — storageState path / fixture name>
Base URL comes from the Playwright config. Never hardcode a host or port.

For each test case:
1. Read the real page code for every control you touch. Use selectors in this order:
   data-testid → getByRole with accessible name → getByLabel → getByText with the exact copy from the code.
   Never invent a selector. If a control has no stable selector, say so in your report.
2. One `test()` per test case, titled "<TC-id> <title>". Tag it from the case's **Use case** line:
   test('<TC-id> <title>', { annotation: [{ type: 'flow', description: '3.1 <flow title>' },
     { type: 'use case', description: '<use-case-id>' }] }, async ({ page }) => { ... })
   An `extra` case gets only the flow annotation (none when it has no flow). Never invent a use case id.
3. EVERY user action or check is its own `await step(page, '<plain sentence>', async () => { ... })`
   so each one gets a screenshot. Name steps as the user sees them: "Open the Announcements page",
   "Click Save as draft", "The draft shows under My drafts".
4. Assert what the scenario's Expected says: visible text, URL, dialog open or closed, focus, a disabled state.
   For a write, also read it back through the API (page.request shares the session) inside a step.
5. Test data: prefix every created record with `__e2e_<group>_`. Delete it in afterEach/afterAll and assert it is gone.
   Never change data you did not create.
6. Tests in this file must not depend on each other unless the scenario says so. Then use test.describe.serial.
7. Wait on state, never on time: expect(...).toBeVisible(), waitForResponse. No waitForTimeout except
   where the scenario itself is about time (a 5-second auto-hide), and say so in a 1-line comment.

Return:
- the file path
- per test case: the test title, its use case id and flow, the number of steps, and the selectors used
- every selector you could not find a stable hook for, and every place where the code and the scenario disagree
```
