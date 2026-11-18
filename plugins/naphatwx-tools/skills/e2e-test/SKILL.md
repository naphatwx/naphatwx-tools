---
name: e2e-test
description: Write and run automated tests for every scenario in a feature's use-cases.js, on every surface (ui in the browser with a screenshot per step, api calls with request and response, mcp and job scenarios played by an AI tester), then a fresh reviewer checks every step and one HTML report shows it all. The user watches the browsers live in the Playwright dashboard. `--mock` runs the ui scenarios on the generate-mock-ui mock instead of the real app. Use when the user says "e2e test this spec folder", "test this end to end" or "e2e test the mock". Playing by hand is play-scenarios; service checks after a deploy are smoke-test.
argument-hint: "<plan folder | spec folder> [--core] [--mock] [--no-watch] [--env <name>] [--base-url <url>]"
---

# E2E Test

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- **Source**: a plan folder or a spec folder (any folder that holds the spec, from any tool). If none is given, ask once.
- `--env <name>` / `--base-url <url>`: where to run. If neither is given, use the repo's local dev URL and say which one.
- `--core`: run only the core scenarios (`"core": true` in `use-cases.js`: every basic, the main alternates and the errors users hit most). Stop after the core pass of step 4–5.
- `--mock`: test the mock UI (`<plan>/mock/`) instead of the real app. See [Mock target](#mock-target---mock).
- `--no-watch`: run without the live dashboard (step 4, Watch). Watch is on by default.

## Rules

- **Read the target repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, per-app guides). Their rules for where tests live, how to run tools and who edits app code win over this skill. A step needs a fact they don't give (roles, how to create test data, the MCP server) and the code doesn't show it → ask the user. Never guess.
- **Test source is the latest version, by domain; reports are by spec.** Tests live in `<e2e-dir>/<domain>/` and always match the latest code. Each round (a new spec on the same domain) edits them in place: never a spec folder name or a `UC<n>` in a test file name, because `UC<n>` restarts in every `use-cases.js`. The spec's own record is its `use-cases.js` and its report folder, `e2e-results/<spec>/` (one per spec, updated by every run). A repo guide with its own layout wins.
- **`use-cases.js` is the one source.** Read it directly; never another skill's output (no mock, no play-scenarios files). Never write your own test cases or scenarios. A missing or wrong scenario is a finding: fix it with the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code), then test again.
- **One test per scenario**, same id, in file order. Every surface is tested: `ui`, `api`, `mcp`, `job`. The surface only picks the runner.
- **Tests only.** Never change application code to make a test pass. A missing selector or a real bug is a finding.
- **Every step leaves proof**: a screenshot (`ui`) or the masked request and response (`api`, `mcp`, `job`). No tokens, cookies or passwords in any file.
- **Own your data.** Each test works on its own copies of the seed records its scenario names, made by the feature's data helper (step 2b), deletes them after and checks they are gone. Never touch records you did not create. No play-scenarios seeds.
- **One HTML report per spec**, `e2e-results/<spec>/e2e-report.html`, rebuilt from the spec's one run folder after every run. No timestamps: every run of the spec updates the tests it ran and keeps the rest. Raw Playwright output is not a substitute.
- Never run against production unless the user named it for this run.
- **No sub-agents** → do each agent step yourself, in order, with the same prompt (the reviewer after the run).
- **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

---

## 1. Read

Find `use-cases.js`:

| Source | File |
|---|---|
| plan folder | `<plan>/use-cases.js` |
| spec folder | `<spec-folder>/plan/use-cases.js` |
| missing | run the `generate-use-case` skill with the source first, then come back |

- Check it: `node <generate-use-case skill dir>/scripts/check.js <plan>/use-cases.js --strict`. Errors → fix them through `generate-use-case` first. A scenario with `"source": "spec"` was never traced in the code: run `generate-use-case` in verify mode first, so tests don't encode the spec's guess.
- Each scenario's `evidence` points at its code: `entry` (route, RPC, tool, command), `gate` and the line behind each `expect`. Give it to the writer and the AI tester, so they find the page, selectors and calls from the code instead of guessing.
- Read `USE_CASES` and `SCENARIOS`. Keep the order: UC1 → its scenarios in file order, UC2 → …
- `--core` → keep only the scenarios with `"core": true` for steps 3–6. The others are not written, run or listed as not run.
- Runner per scenario, from its `surface`:

| surface | Runner | Proof per step |
|---|---|---|
| `ui` | Playwright browser test | screenshot (`step()`) |
| `api` | Playwright request test | request + response (`apiStep()`) |
| `mcp` | AI tester agent calling the local MCP tools as the scenario's role | each MCP call, request + response |
| `job` | AI tester agent running the command | the command + its output and exit code |

- An `api` scenario on a pure gRPC service (no HTTP / JSON route) → the AI tester runs it with `grpcurl`, as a `job`-style step. Say so in the reply.

## 2. Harness (config and login once per repo; copy the files every run)

Look for an existing Playwright setup: `playwright.config.*`, an `e2e/` folder, a login helper, `@playwright/test` in `package.json`.

| Found | Do |
|---|---|
| Config + login exist | Reuse them. Add only what is missing below. |
| Nothing | Add `@playwright/test` as a dev dependency where the repo keeps web dev dependencies, a config, and a login setup. Follow the repo's run rules (for example "run inside Docker"). |

Copy these files from this skill's `assets/` on **every run**, unchanged, so the repo always runs the plugin's newest version. A copy the repo already has (search `<e2e-dir>` for `step.ts` and `run-data-reporter.ts`, e.g. `support/step.ts`) is overwritten at its own path; never add a second copy. Never reuse an old copy as it is: it may miss fixes and the newest report layout. After copying, run the repo's typecheck, because older specs' tests import `step.ts` too, and list the files the copy changed (`git status`) in the reply:

- `<e2e-dir>/support/step.ts`: `step`, `apiStep` and `reveal` (see the file).
- `<e2e-dir>/reporters/run-data-reporter.ts`: writes the run folder (`run-data.json` + `shots/`), not HTML.
- `<e2e-dir>/reporters/build-report.mjs` and `reporters/e2e-report-template.html`: build the one HTML (step 6). Node only, no dependencies.
- `<e2e-dir>/reporters/use-cases.types.d.ts`: the type of `use-cases.js`, for `build-report.mjs`.
- `<e2e-dir>/README.md` from `assets/README.md`: how teammates run the tests and read the report. Skip it when the e2e folder already has a README.

Wire the config:

```ts
reporter: [
  ['list'],
  ['./reporters/run-data-reporter.ts', { name: '<feature>', outputDir: 'e2e-results' }],
],
use: {
  baseURL: process.env.PW_BASE_URL ?? '<local url>',
  viewport: { width: 1280, height: 800 },   // keeps screenshots small
  screenshot: 'only-on-failure',
  storageState: '<login state file>',
},
fullyParallel: false,   // tests inside one file stay in order; files run on separate workers
workers: <number of spec files, max 4>,
```

- `outputDir` is relative to the folder that holds the Playwright config. Add `e2e-results/` to `.gitignore`.
- `E2E_SPEC=<spec>` → the reporter writes into `<outputDir>/<spec>/`; unset → `<outputDir>/_adhoc/`. Every run reuses that folder; delete it for a clean start.
- `E2E_RUN_DIR=<dir>` is an override for an odd folder. It must be inside `outputDir`, given from the repo root or from the config folder; any other path stops the run before anything is written.
- **Login**: sign in once in a global setup and save `storageState`; every test reuses it. A scenario with another role signs in as that role in its own `test.use({ storageState })` or fixture. Use the repo's login helper or dev login. Read credentials from env vars, never from a file. The sign-in helper closes product tours and "what's new" overlays and marks them seen, so no shot shows them.

The report template is copied unchanged. Its scenario badge order: status → surface → title → kind → core.

## 2b. Data helper (once per feature, before the writers)

Pick `<domain>` first: the folder under `<e2e-dir>` whose tests cover this feature's pages (the repo's guide or README may list them). None fits → a new kebab-case folder named for the domain, never for the spec. Unsure between two → ask once.

The domain already has a helper for this feature (`<e2e-dir>/<domain>/helpers/*.ts`) → reuse it; the agent only adds what the new scenarios need. Otherwise spawn **one** agent with the prompt in `references/data-helper-agent.md`. It writes `<e2e-dir>/<domain>/helpers/<feature>.ts` (seed copies, settle, `sweep`) and one setup / cleanup runner for mcp and job scenarios, proves both with a throwaway spec, and deletes that spec. The writers import the helper; none writes its own data code.

## 2c. Match the domain's existing tests

Each test carries its scenario id: the `scenario` annotation in a `.e2e.spec.ts`, `"scenario"` in a `.ai-tests.json`. Search `<e2e-dir>/<domain>/` for every id in `use-cases.js`:

| Found | Do |
|---|---|
| Same id | The writer updates that test in place to match the scenario as it is now. |
| New id | The writer adds a test, in the file of its use case's goal (step 3). |
| An id the domain's tests hold that this feature's previous `use-cases.js` had and this one dropped | List it. Ask before deleting the test: the behaviour may still exist under another spec. |

Tests whose ids appear in no `use-cases.js` of this feature are someone else's: never touch them. The previous `use-cases.js` is the newest other `<spec-folder>/plan/use-cases.js` (spec folders next to this one) whose scenario ids overlap these tests; say which one you used.

## 3. Write: one writer agent per use case, in parallel

Spawn one agent per use case **in one message**, with the prompt in `references/writer-agent.md` (with `--core`, list only its core scenarios) and its step 2c rows. Each writes, for its use case only:

- `<e2e-dir>/<domain>/<goal>.e2e.spec.ts`: one `test()` per `ui` and `api` scenario, in file order. Skip the file when the use case has none.
- `<e2e-dir>/<domain>/<goal>.ai-tests.json`: the ordered calls or commands for each `mcp` and `job` scenario, plus its `runner` block and the one setup / cleanup command it names. Skip both when the use case has none.

`<goal>` is the use case title, kebab-case, with no `UC<n>`: `create-a-thing`. The file exists → the writer edits it: it updates and adds its scenarios' tests and leaves every other test in the file as it is. A matched test that sits in another file is updated there. Writers run nothing.

When they are done:
- Every scenario in `use-cases.js` has exactly one test, with the same id, in one of the two files.
- Every spec file imports `step` / `apiStep` and wraps each action in one, and calls the helper's `sweep` once in `beforeAll`.
- Collect missing selectors, missing API routes or MCP tools, and code / scenario mismatches.

## 4. Run

Order, always: **core pass** (`--core` run → fix test-side failures → re-run → review, step 5), then the **full run** into the same `<run>` and a review of the scenarios not yet reviewed. With `--core`, stop after the core pass. The run folder keeps the latest attempt of each test; the reviewer reviews that.

The run folder `<run>` = `e2e-results/<spec>/`. `<spec>` is the spec folder name (`add-thing-archive`); a source with no spec folder (plan folder, feature description) has none, so the run goes to `_adhoc/`. Every run of the spec, first or re-run, this round or a later one, uses the same command and folder.

```bash
PLAYWRIGHT_DASHBOARD=1 E2E_SPEC=<spec> PW_BASE_URL=<url> npx playwright test <e2e-dir>/<domain>/ --grep " (<id>|<id>|…) "
```

**Watch** (on unless `--no-watch`): the user watches every browser of the run live.

- Needs `@playwright/test` 1.59 or newer (`npx playwright --version`). Older → ask once to upgrade it. No → run without watch and say so.
- Before the first run, start the dashboard in the background: `npx -y @playwright/cli show`. It opens a window on the user's screen; `npx -y @playwright/cli show --kill` closes it. Start it once; later runs show in the same window. `show` reuses a dashboard that is already running, even one started with `--port`, so no window opens: `--kill` it first, then `show` again.
- `PLAYWRIGHT_DASHBOARD=1` makes each worker's browser show there as `worker-<n>`, headless or not. The user can click one to watch it, take over, or open DevTools.
- Tests run inside Docker → start the dashboard in the same container with `show --port <port> --host 0.0.0.0` and give the user the published URL. The port is not published → run without watch and say so.
- Tell the user before the run starts: "Watch it live in the Playwright dashboard window." `--no-watch` → drop `PLAYWRIGHT_DASHBOARD=1`.
- `mcp` and `job` scenarios have no browser. Their AI tester runs show only in the report.

- A new round of the spec (a later task changed the use cases): delete `<run>/review*.json` first, so the reviewer starts fresh. Test results need no reset; the run replaces the ones it touches.

- `--grep` lists only this source's scenario ids, because the domain folder also holds other specs' tests. The title is `<id> <scenario title>`, so the spaces around the group stop one id from matching a longer one.
- From the repo root, add `--config <path to the Playwright config>`.
- Core pass → list only the core ids (writers also tag every core test `@core`), and give each AI tester only its core scenarios.
- Run it the way the repo's guide says to run tools (for example in its Docker service).
- After Playwright, spawn one **AI tester** per use case that has a `.ai-tests.json`, with the prompt in `references/ai-tester-agent.md`, **one after another, never in parallel**: they share one stack, and parallel testers time out on setup and mix up each other's results. Each writes `<run>/ai-results-<UC>.json`. The tester needs the MCP server of the app under test (local, not production) and a shell for `job` steps.
- A failure caused by the environment (server down, cold compile timeout, expired session, MCP server not connected) is not a product failure. Fix the environment and re-run only the failed files or scenarios once, into the same `<run>`.
- A real failure: keep it. Never bend an assertion to pass.
- Check that no records with a `-e2e<N>-` marker are left behind.

## 5. Review: a fresh reviewer

Spawn **one new agent** that did not write or run the tests, with the prompt in `references/reviewer-agent.md`. It reads `<run>/run-data.json`, `<run>/shots/`, `<run>/ai-results-*.json` and `use-cases.js`, checks every step, and writes `<run>/review.json`.

Then, per flagged step:

| Flag | Do |
|---|---|
| `test` (shot too early, wrong wait, weak assertion, wrong role) | Fix the test or the `.ai-tests.json`. Re-run only those files or scenarios once, into the same `<run>`. Spawn a fresh reviewer for just those scenarios; it writes `<run>/review-2.json`. |
| `product` | Keep it as a finding. Don't touch the test. |
| `unsure` | List it for the user to check by hand. |

When the code's message, status or list differs from a scenario's `expect` and the code is right (e.g. 200 vs 201, an RBAC refusal string), list it for `generate-use-case` to update the scenario (its verify mode re-checks the evidence); don't flag it `product`. A scenario listed in a `MISMATCHES` entry with `"fix": "code"` follows today's code: the gap is known, not a new finding.

## 6. Report

```bash
node <e2e-dir>/reporters/build-report.mjs <run> --use-cases <plan>/use-cases.js [--core] [--mock]
```

- `--core` → the report keeps only the core scenarios; a core one with no result shows as "not run".
- `--mock` → the report lists only `ui` scenarios.

It merges the run folder into `<run>/e2e-report.html` (screenshots embedded; the same file every run), prints one line per use case and `E2E report: <path>`. Open the file and check: the tree matches `use-cases.js`, every `ui` step has a screenshot, every other step has a request and response, flagged steps show the note.

Then review the layout of `e2e-report.html` with [references/layout-review.md](references/layout-review.md) (one fresh sub-agent). The report is built from the plugin's template, so it reports problems and doesn't patch the file.

Reply with:
- the domain folder, and the spec files and `.ai-tests.json` files written
- per file: the tests updated, added and (after the user agreed) removed, by scenario id, and the previous `use-cases.js` used in step 2c
- per use case: passed / total, core passed / core total, and the scenario ids failed or not run (from the build output); say when it was a `--core` run
- each failure: scenario id, step, and likely cause (product bug, missing selector, wrong scenario, environment)
- review flags: `product` and `unsure` flags with their notes; `test` flags you fixed
- findings for the app owner: missing selectors, routes or tools, code / scenario mismatches, scenarios to fix with `generate-use-case`
- the open `MISMATCHES` from `use-cases.js`, one line each (`M1 FR-017 (fix the code): …`), so the spec-vs-code decisions stay in view
- whether cleanup is confirmed
- the layout review verdict and each problem found
- the **full path** of the HTML report

---

## Mock target (`--mock`)

Runs the same steps on the mock UI of the `generate-mock-ui` skill (`naphatwx-tools:generate-mock-ui` in Claude Code), opened from disk. It checks that the mock plays every `ui` scenario as `use-cases.js` says. No `<plan>/mock/` → run `generate-mock-ui` first.

| Step | With `--mock` |
|---|---|
| 1 Read | Keep only `ui` scenarios. `"source": "spec"` scenarios are fine here: the mock is built from the spec, so skip the verify run. Each one's entry in `<plan>/mock/shared/scenario-play.js` (`state`, `page`, `params`, `steps`) is how to play it. A `ui` scenario with no entry is a finding for `generate-mock-ui`. |
| 2 Harness | `<e2e-dir>` = `<plan>/mock/e2e/`. Copy the same files from `assets/`. Write `playwright.config.ts` there with the same reporter and viewport, `testDir: '.'`, `baseURL: pathToFileURL(resolve(__dirname, '..') + '/').href`, no `storageState`. `@playwright/test` 1.59+ does not resolve from that folder (`node -e "require.resolve('@playwright/test')"` run there) → add a `package.json` with it as a dev dependency and run `npm install` there. Add `.gitignore` there: `node_modules/`, `e2e-results/`, `test-results/`. |
| 2b Data helper | Skip. Each test gets a fresh browser context, so the mock's `sessionStorage` data starts clean. |
| 2c Match | Search `<plan>/mock/e2e/` only. |
| 3 Write | Files are `<goal>.mock.spec.ts`. Give each writer the mock rows of `references/writer-agent.md`. |
| 4 Run | `cd <plan>/mock/e2e && PLAYWRIGHT_DASHBOARD=1 E2E_SPEC=<spec> npx playwright test --grep " (<id>|…) "`. No AI testers. Watch works the same. |
| 5 Review | Same. A mock that does not do what `expect` says is a finding for `generate-mock-ui` (fix the mock), not `product`. |
| 6 Report | Add `--mock`. The report is `<plan>/mock/e2e/e2e-results/<spec>/e2e-report.html`. |

