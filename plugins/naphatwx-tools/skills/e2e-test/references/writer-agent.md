# Writer agent prompt (one agent per use case)

Spawn one agent per use case, **all in one message** so they run in parallel. Each writes the tests for its own use case and runs nothing.

If the target repo routes code in its e2e folder to a specialist agent (read its guide files), spawn that agent type. Otherwise use a general-purpose agent.

```text
Write the e2e tests for ONE use case. Do not run them. Do not edit any other file, and never app code.

Repo: <repo-root>   Guide files to follow: <paths>
Use cases file: <plan>/use-cases.js   Your use case: <UC id> <title>
Your scenarios, in file order: <id (surface[, core]), id (surface[, core]), …>
E2E folder: <e2e-dir>   Domain folder: <e2e-dir>/<domain>   <goal> = the use case title, kebab-case, no UC number
  - ui + api scenarios  → <e2e-dir>/<domain>/<goal>.e2e.spec.ts      (skip when there are none)
  - mcp + job scenarios → <e2e-dir>/<domain>/<goal>.ai-tests.json    (skip when there are none)
                          + its setup / cleanup command (rule 17), e.g. <e2e-dir>/<domain>/<goal>.data.mts
Existing tests (step 2c): update in place: <id → file, …>   add: <id, …>   (empty when none)
  A file that exists is edited, never rewritten: change only your scenarios' tests and leave every
  other test, import and helper in it as it is. Delete no test.
Shared helpers (already written, import them, never copy them):
  - import { step, apiStep, reveal } from '<relative path to step.ts>'
  - data helper: <e2e-dir>/<domain>/helpers/<feature>.ts   exports: <list from the data helper agent>
  - mcp / job setup + cleanup runner: <the one runner pattern the data helper agent chose>
  - login: <storageState path / fixture name, and how to sign in as another role>
Base URL comes from the Playwright config. Never hardcode a host or port.

The scenarios are the spec. Read each one's given / when / expect. Never add, drop, merge or rename a
scenario. A scenario you cannot test as written is a finding: say why, do not write a different test.

All scenarios
1. One test per scenario, same id, in file order. Title: "<scenario id> <scenario title>".
2. Own your data: make every record `given` needs only through the data helper (copies of the seed
   records the scenario names; it deletes them after). Never change data you did not create. Every
   spec file calls the helper's `sweep(request, '<uc>')` once in `beforeAll`.
   Step titles use the scenario's names (`Open delta-super`), never fixture keys: map each seed name
   to its copy with the helper's one name map (e.g. `fixture.names['delta-super']`).
   Build the data in a fixture with its own `timeout`, or call `test.setTimeout()` after it is built,
   so a slow setup never eats the steps' time.
3. Sign in as the role in `given` (e.g. DEV, MANAGER_DEV). Never test a refusal with an admin account.
4. Assert exactly what `expect` says: quoted messages verbatim, numbers, statuses, ids, what is absent.
5. A test that may skip calls `test.skip(...)` before any `step()` or `apiStep()`, so it records no step.
   Do any lookup that decides the skip in `beforeAll`.

ui scenarios (Playwright browser test)
6. Read the real page code for every control you touch. Selectors, in this order:
   data-testid → getByRole with accessible name → getByLabel → getByText with the exact copy from the code.
   Match exact names (`exact: true`) and visible elements only. Never invent a selector. A control with
   no stable selector is a finding. Read whether a form opens with an empty row or card before clicking "Add".
7. test('<id> <title>', { tag: <'@core' when the scenario has "core": true, else leave tag out>,
     annotation: [{ type: 'use case', description: '<UC id>' },
     { type: 'scenario', description: '<id>' }] }, async ({ page }) => { ... })
8. EVERY user action or check is its own `await step(page, '<plain sentence>', async () => { ... })`,
   so each gets a screenshot. Name steps as the user sees them: "Open the Versions tab",
   "Click Save as draft", "The draft shows under My drafts". A setup step that touches no page uses
   `test.step`, not `step()`, so it records no blank shot. Check one tab per step when the tabs don't fit on screen.
9. Before a step ends, wait for the state its title promises (the heading, the toast, the row), so the
   screenshot shows it, not a spinner or skeleton. Wait on state, never on time: expect(...).toBeVisible(),
   waitForResponse. No waitForTimeout unless the scenario is about time; then say so in a 1-line comment.
   Before the first shot, wait for the signed-in user to show and any loading splash to go. A checking
   step ends with `await reveal(<the checked element>)`, so it sits in view below any sticky header or footer.
10. For a write, also read it back through the API (page.request shares the session) inside a step.

api scenarios (Playwright request test)
11. Same tag and annotations. Use the `request` fixture signed in as the scenario's role.
12. Every call is its own `await apiStep(request, '<plain sentence>', { method, url, data }, (res, body) => { expect... })`.
    It records the masked request and response. Never put a token in `data` or a step title.
13. Read the route and its request / response shape from the code (handler, proto, OpenAPI). A route that
    does not exist is a finding. A pure gRPC service with no HTTP / JSON route: put the scenario in the
    .ai-tests.json as a job step with `grpcurl`, and say so.

Shared rules for the spec file
14. Tests in the file must not depend on each other. Data setup and cleanup live in each test or its hooks.
15. Import order, style and folder follow the repo's guide.

mcp and job scenarios (.ai-tests.json, played later by an AI tester agent)
16. Strict JSON:
    { "useCase": "<UC id>", "runner": { "setup": "<command>", "cleanup": "<command>", "prints": "<what setup prints>" },
      "tests": [ { "scenario": "<id>", "surface": "mcp" | "job", "role": "<role>",
        "steps": [ { "title": "<plain sentence>", "setup"?: true, "cleanup"?: true,
                     "call": "<Service> · <Operation>", "params": { ... },     ← mcp
                     "command": "<shell command>",                             ← job
                     "expect": "<what this step must show, from the scenario>" } ] } ] }
17. Ship one setup / cleanup command for the use case, written in the one runner pattern given above,
    and document it in `runner`. Setup prints the copies it made; cleanup deletes them and sweeps.
18. mcp: read the MCP tool list and each operation's request shape from the code (tool registry, proto).
    One step per tool call, in order: who-am-I check first when the server has one, then the setup
    command, the scenario's `when`, the checks of `expect`, then the cleanup command. A value from an
    earlier step is written "<from step N: field>".
19. job: the exact command from the repo (package script, Makefile, scripts/), run from the repo root,
    with flags that limit it to your copies. Never a command that touches shared or production data.
    `expect` names the output line or exit code the scenario expects.
20. Put the scenario's expect text in the last checking step's `expect`, word for word.

Return:
- the files written
- per scenario: its id, surface, number of steps, and the selectors, routes, tools or commands used
- every missing selector, route, tool or command, and every place where the code and the scenario disagree
```
