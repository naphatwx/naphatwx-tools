# E2E tests

Automated tests for this feature's scenarios, one test per scenario in the feature's `use-cases.js`. Browser steps take a screenshot; API steps record the request and response. MCP and job scenarios are played by an AI agent. Every run ends in one HTML report.

## How to run it

1. Start the app, or pick the environment to test. Never production unless that is the plan for this run.

2. Run the Playwright tests (ui + api scenarios), from the folder that holds the Playwright config:

    ```bash
    E2E_RUN_DIR=e2e-results/<feature>-<stamp> PW_BASE_URL=http://localhost:3000 E2E_REPORT_NAME=<feature> npx playwright test <e2e-dir>
    ```

    - `E2E_RUN_DIR` is the run folder. Left out → `e2e-results/<name>-<stamp>/`. A re-run into the same folder replaces only the tests it ran.
    - `PW_BASE_URL` is the app to test. Left out → the config's local URL.
    - Add a spec file path to run one use case only.
    - The repo's guide may say to run tools another way (for example inside Docker). Follow it.

3. MCP and job scenarios (`*.ai-tests.json`): ask your AI agent to run the `e2e-test` skill, or to play the file with the skill's AI tester prompt. It writes `ai-results-<UC>.json` into the same run folder. Skip this step when you only need the browser and API tests.

4. Build the report:

    ```bash
    node <e2e-dir>/reporters/build-report.mjs <run folder> --use-cases <plan>/use-cases.js
    ```

    It prints one line per use case and `E2E report: <path>`. Open that file.

## Using it

```mermaid
graph TD
    A[run npx playwright test] --> B[sign in once, every test reuses the session]
    B --> C[each spec file on its own worker, tests in order inside it]
    C --> D["each step: action or call, then a screenshot or the request + response"]
    D --> E[test data prefixed __e2e_, deleted after]
    E --> F["run folder: run-data.json + shots/"]
    F --> G[optional: AI tester adds ai-results, reviewer adds review.json]
    G --> H["build-report.mjs → E2E report: path"]
    H --> I[open the HTML: use cases in use-cases.js order]
    I --> J[open a scenario: steps like slides, Prev / Next or arrow keys]
    J --> K{failed or flagged?}
    K -->|yes| L[read the error or the reviewer note, copy the rerun command]
    L --> M["re-run that file, or npx playwright show-trace path"]
    K -->|no| N[next scenario]
```

- The report is one file with the screenshots inside. Share it as-is, or use Export PDF.
- Use cases and scenarios come in `use-cases.js` order; each scenario shows its id, a surface tag (`ui`, `api`, `mcp`, `job`) its kind (`basic`, `alternate`, `exception`) and a Core pill on core scenarios. Core scenarios come first in each use case. "Failed first" lifts failures to the top.
- A core-only run (`--grep @core`, report built with `--core`) shows only the core scenarios.
- ⚑ marks a step a reviewer flagged: "Test problem" (fix the test), "Product problem" (a bug), "Check by hand".

## Files

| File | What |
|------|------|
| `<uc-slug>.e2e.spec.ts` | ui + api scenarios of one use case; one `test()` per scenario |
| `<uc-slug>.ai-tests.json` | mcp + job scenarios of one use case, as ordered calls or commands for the AI tester |
| `step.ts` | `step()` (screenshot per step) and `apiStep()` (request + response per step) |
| `reporters/run-data-reporter.ts` | Writes the run folder: `run-data.json` + `shots/` |
| `reporters/build-report.mjs` | Merges the run folder into one HTML |
| `reporters/e2e-report-template.html` | The report page; dark theme, Export PDF |
| `e2e-results/` | One folder per run; gitignored |
| `playwright.config.*` | Base URL, viewport, workers, reporters, login state |

## When it fails

| You see | Do this |
|---------|---------|
| `net::ERR_CONNECTION_REFUSED` on every test | The app is not running at `PW_BASE_URL`. Start it, then re-run only the failed files. |
| Tests land on the sign-in page | The saved login state expired. Re-run so the global setup signs in again; check the login env vars. |
| `ENOENT` … `e2e-report-template.html` | `build-report.mjs` looks for the template next to itself. Keep both in `reporters/`, or pass `--template <path>`. |
| `No data in this report.` | You opened `reporters/e2e-report-template.html` itself. Open the file in the run folder instead. |
| Every scenario "not run" | Wrong run folder (use the path printed as `E2E run data: <path>`), `--use-cases` points to another feature's file, or the tests have no `scenario` annotation. |
| `No screenshot for this step` | That step's screenshot failed (the page was closed or crashed). Read the step's error. |
| A test marked flaky | It passed on a retry. Open "Earlier attempts" to see the failed try. |
| A failed step with a real error | Keep it: it is a product bug or a wrong selector. Use the copied rerun command after a fix. |
