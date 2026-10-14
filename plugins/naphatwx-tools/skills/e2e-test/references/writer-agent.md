# Writer agent prompt (one agent per use case)

Spawn one agent per use case, **all in one message** so they run in parallel. Each writes the tests for its own use case and runs nothing.

If the target repo routes code in its e2e folder to a specialist agent (read its guide files), spawn that agent type. Otherwise use a general-purpose agent.

```text
Write the e2e tests for ONE use case. Do not run them. Do not edit any other file, and never app code.

Repo: <repo-root>   Guide files to follow: <paths>
Use cases file: <plan>/use-cases.js   Your use case: <UC id> <title>
Your scenarios, in file order: <id (surface), id (surface), …>
E2E folder: <e2e-dir>
  - ui + api scenarios  → <e2e-dir>/<uc-slug>.e2e.spec.ts      (skip when there are none)
  - mcp + job scenarios → <e2e-dir>/<uc-slug>.ai-tests.json    (skip when there are none)
Shared helpers (already written, import them, never copy them):
  - import { step, apiStep } from '<relative path to step.ts>'
  - login: <storageState path / fixture name, and how to sign in as another role>
Base URL comes from the Playwright config. Never hardcode a host or port.

The scenarios are the spec. Read each one's given / when / expect. Never add, drop, merge or rename a
scenario. A scenario you cannot test as written is a finding: say why, do not write a different test.

All scenarios
1. One test per scenario, same id, in file order. Title: "<scenario id> <scenario title>".
2. Test data: create what `given` needs through the app's API (REST, or the MCP tool for mcp scenarios),
   with names prefixed `__e2e_<uc>_` (e.g. `__e2e_uc2_repo`). Delete it after and check it is gone.
   Never change data you did not create. Never rely on seed records being in a given state, except
   read-only reference data the scenario names.
3. Sign in as the role in `given` (e.g. DEV, MANAGER_DEV). Never test a refusal with an admin account.
4. Assert exactly what `expect` says: quoted messages verbatim, numbers, statuses, ids, what is absent.

ui scenarios (Playwright browser test)
5. Read the real page code for every control you touch. Selectors, in this order:
   data-testid → getByRole with accessible name → getByLabel → getByText with the exact copy from the code.
   Never invent a selector. A control with no stable selector is a finding.
6. test('<id> <title>', { annotation: [{ type: 'use case', description: '<UC id>' },
     { type: 'scenario', description: '<id>' }] }, async ({ page }) => { ... })
7. EVERY user action or check is its own `await step(page, '<plain sentence>', async () => { ... })`,
   so each gets a screenshot. Name steps as the user sees them: "Open the Versions tab",
   "Click Save as draft", "The draft shows under My drafts".
8. Before a step ends, wait for the state its title promises (the heading, the toast, the row), so the
   screenshot shows it, not a spinner or skeleton. Wait on state, never on time: expect(...).toBeVisible(),
   waitForResponse. No waitForTimeout unless the scenario is about time; then say so in a 1-line comment.
9. For a write, also read it back through the API (page.request shares the session) inside a step.

api scenarios (Playwright request test)
10. Same annotations. Use the `request` fixture signed in as the scenario's role.
11. Every call is its own `await apiStep(request, '<plain sentence>', { method, url, data }, (res, body) => { expect... })`.
    It records the masked request and response. Never put a token in `data` or a step title.
12. Read the route and its request / response shape from the code (handler, proto, OpenAPI). A route that
    does not exist is a finding. A pure gRPC service with no HTTP / JSON route: put the scenario in the
    .ai-tests.json as a job step with `grpcurl`, and say so.

Shared rules for the spec file
13. Tests in the file must not depend on each other. Data setup and cleanup live in each test or its hooks.
14. Import order, style and folder follow the repo's guide.

mcp and job scenarios (.ai-tests.json, played later by an AI tester agent)
15. Strict JSON:
    { "useCase": "<UC id>", "tests": [ { "scenario": "<id>", "surface": "mcp" | "job", "role": "<role>",
        "steps": [ { "title": "<plain sentence>", "setup"?: true, "cleanup"?: true,
                     "call": "<Service> · <Operation>", "params": { ... },     ← mcp
                     "command": "<shell command>",                             ← job
                     "expect": "<what this step must show, from the scenario>" } ] } ] }
16. mcp: read the MCP tool list and each operation's request shape from the code (tool registry, proto).
    One step per tool call, in order: who-am-I check first when the server has one, then setup, the
    scenario's `when`, the checks of `expect`, then cleanup. A value from an earlier step is
    written "<from step N: field>".
17. job: the exact command from the repo (package script, Makefile, scripts/), run from the repo root,
    with flags that limit it to your `__e2e_` data. Never a command that touches shared or production data.
    `expect` names the output line or exit code the scenario expects.
18. Put the scenario's expect text in the last checking step's `expect`, word for word.

Return:
- the files written
- per scenario: its id, surface, number of steps, and the selectors, routes, tools or commands used
- every missing selector, route, tool or command, and every place where the code and the scenario disagree
```
