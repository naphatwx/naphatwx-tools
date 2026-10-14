---
name: e2e-test
description: Write and run automated tests for every scenario in a feature's use-cases.js, on every surface (ui in the browser with a screenshot per step, api calls with request and response, mcp and job scenarios played by an AI tester), then a fresh reviewer checks every step and one HTML report shows it all. Use when the user says "e2e test spec 127" or "test this end to end". Playing by hand is play-scenarios; service checks after a deploy are smoke-test.
argument-hint: "<plan folder | spec folder | spec number> [--env <name>] [--base-url <url>]"
---

# E2E Test

```text
1 read      <plan>/use-cases.js ─► UC1 → its scenarios, UC2 → … (every surface; surface only picks the runner)
2 harness   once per repo: Playwright config + login + step.ts + run-data reporter + build-report.mjs
3 write     1 writer agent per use case, in parallel ─► <uc>.e2e.spec.ts (ui + api) and <uc>.ai-tests.json (mcp + job)
4 run       Playwright runs ui + api ─► run-data.json + shots/
            1 AI tester per use case runs mcp + job ─► ai-results-<UC>.json        (all in one run folder, no HTML yet)
5 review    1 FRESH reviewer agent checks every step ─► review.json
            test problem ─► fix the test, re-run those files once, review again · product problem ─► finding
6 report    build-report.mjs ─► one HTML: UC → scenario (surface tag) → steps (screenshot or request / response, review notes)
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- **Source**: a plan folder, a spec folder or a spec number. If none is given, ask once.
- `--env <name>` / `--base-url <url>`: where to run. If neither is given, use the repo's local dev URL and say which one.

## Rules

- **Read the target repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, per-app guides). Their rules for where tests live, how to run tools and who edits app code win over this skill.
- **`use-cases.js` is the one source.** Read it directly; never another skill's output (no mock, no play-scenarios files). Never write your own test cases or scenarios. A missing or wrong scenario is a finding: fix it with the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code), then test again.
- **One test per scenario**, same id, in file order. Every surface is tested: `ui`, `api`, `mcp`, `job`. The surface only picks the runner.
- **Tests only.** Never change application code to make a test pass. A missing selector or a real bug is a finding.
- **Every step leaves proof**: a screenshot (`ui`) or the masked request and response (`api`, `mcp`, `job`). No tokens, cookies or passwords in any file.
- **Own your data.** Each test creates its own data through the app's API, prefixed `__e2e_<uc>_`, deletes it after and checks it is gone. Never touch records you did not create. No play-scenarios seeds.
- **One HTML report per run**, built from the run folder. Raw Playwright output is not a substitute.
- Never run against production unless the user named it for this run.

---

## 1. Read

Find `use-cases.js`:

| Source | File |
|---|---|
| plan folder | `<plan>/use-cases.js` |
| spec folder or spec number | `<spec-folder>/plan/use-cases.js` |
| missing | run the `generate-use-case` skill with the source first, then come back |

- Check it: `node <generate-use-case skill dir>/scripts/check.js <plan>/use-cases.js`. Errors → fix them through `generate-use-case` first.
- Read `USE_CASES` and `SCENARIOS`. Keep the order: UC1 → its scenarios in file order, UC2 → …
- Runner per scenario, from its `surface`:

| surface | Runner | Proof per step |
|---|---|---|
| `ui` | Playwright browser test | screenshot (`step()`) |
| `api` | Playwright request test | request + response (`apiStep()`) |
| `mcp` | AI tester agent calling the local MCP tools as the scenario's role | each MCP call, request + response |
| `job` | AI tester agent running the command | the command + its output and exit code |

- An `api` scenario on a pure gRPC service (no HTTP / JSON route) → the AI tester runs it with `grpcurl`, as a `job`-style step. Say so in the reply.

## 2. Harness (once per repo)

Look for an existing Playwright setup: `playwright.config.*`, an `e2e/` folder, a login helper, `@playwright/test` in `package.json`.

| Found | Do |
|---|---|
| Config + login exist | Reuse them. Add only what is missing below. |
| Nothing | Add `@playwright/test` as a dev dependency where the repo keeps web dev dependencies, a config, and a login setup. Follow the repo's run rules (for example "run inside Docker"). |

Copy these from this skill's `template/`, **unchanged**:

- `<e2e-dir>/step.ts`:
    - `step(page, title, body)` wraps `test.step` and attaches a JPEG screenshot (quality 60) of how the step ended, pass or fail.
    - `apiStep(request, title, { method, url, data?, headers? }, check)` sends one request, attaches the masked request and response, then runs `check(res, body)`. It returns the parsed body.
- `<e2e-dir>/reporters/run-data-reporter.ts`: writes the run folder (`run-data.json` + `shots/`), not HTML.
- `<e2e-dir>/reporters/build-report.mjs` and `reporters/e2e-report-template.html`: build the one HTML (step 6). Node only, no dependencies.
- `<e2e-dir>/README.md` from `template/README.md`: how teammates run the tests and read the report. Skip it when the e2e folder already has a README.

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
- `E2E_RUN_DIR=<dir>` makes the reporter write into that folder. A re-run into the same folder replaces only the tests it ran.
- **Login**: sign in once in a global setup and save `storageState`; every test reuses it. A scenario with another role signs in as that role in its own `test.use({ storageState })` or fixture. Use the repo's login helper or dev login. Read credentials from env vars, never from a file.

The report keeps these features; keep them when you touch the template:

- Tree: use cases in `use-cases.js` order, then each scenario in file order with a surface tag, then its steps. Tests with no known scenario go last under "Other tests". A scenario with no result shows as "not run".
- Steps paged like slides: Prev / Next, the numbered step list, ← / →, or click the right or left half of the screenshot (works on scrolling full-page shots too). A `ui` step without a screenshot shows a "No screenshot for this step" image. A full-page shot (taller than 1.5× its width) scrolls inside the viewer.
- `api`, `mcp`, `job` steps show the call target, the request and the response in place of the screenshot.
- A step the reviewer flagged shows ⚑ in the step list and the reviewer's note above the screenshot. Header count and a "Review flags" filter.
- One test open at a time; every test starts closed; re-opening keeps the last step seen. A failed step shows its error.
- Filters (Failed, Flaky, Passed, Skipped, Not run, Review flags) use Playwright's own outcome, so they match its summary. A "Failed first" toggle lifts failures to the top of each use case; the default is file order.
- Retries: the final attempt shows, earlier ones sit under "Earlier attempts", a test that passed on retry is flaky. A skipped test shows its `skip` / `fixme` reason.
- A failed Playwright test has a copyable rerun command, and a `npx playwright show-trace <path>` command when a trace was saved.
- Dark only. Styles come from the synced theme block: don't edit between the `theme:` markers; change `theme/` in this plugin repo and run `node theme/sync.mjs`.
- **Export PDF** button: opens the print dialog; pick "Save as PDF". Keep the `theme:pdf` and `theme:pdf-js` blocks and the `addExportPdf(...)` call.

## 3. Write: one writer agent per use case, in parallel

Spawn one agent per use case **in one message**, with the prompt in `references/writer-agent.md`. Each writes, for its use case only:

- `<e2e-dir>/<uc-slug>.e2e.spec.ts`: one `test()` per `ui` and `api` scenario, in file order. Skip the file when the use case has none.
- `<e2e-dir>/<uc-slug>.ai-tests.json`: the ordered calls or commands for each `mcp` and `job` scenario. Skip it when the use case has none.

`<uc-slug>` is the use case id and title, kebab-case: `uc2-cut-a-new-version`. Writers run nothing.

Agents with no sub-agents write the use cases one after another with the same prompt.

When they are done:
- Every scenario in `use-cases.js` has exactly one test, with the same id, in one of the two files.
- Every spec file imports `step` / `apiStep` and wraps each action in one.
- Collect missing selectors, missing API routes or MCP tools, and code / scenario mismatches.

## 4. Run

Start both runners at the same time, into one run folder `<run>` = `<e2e-dir>/e2e-results/<feature>-<YYYYMMDD-HHMMSS>`:

```bash
E2E_RUN_DIR=<run> PW_BASE_URL=<url> E2E_REPORT_NAME=<feature> npx playwright test <e2e-dir>/<feature spec files>
```

- Run it the way the repo's guide says to run tools (for example in its Docker service). Spec files run on parallel workers; tests inside a file run in order.
- At the same time, spawn one **AI tester** per use case that has a `.ai-tests.json`, **in one message**, with the prompt in `references/ai-tester-agent.md`. Each writes `<run>/ai-results-<UC>.json`. The tester needs the MCP server of the app under test (local, not production) and a shell for `job` steps.
- A failure caused by the environment (server down, cold compile timeout, expired session, MCP server not connected) is not a product failure. Fix the environment and re-run only the failed files or scenarios once, into the same `<run>`.
- A real failure: keep it. Never bend an assertion to pass.
- Check that no `__e2e_` records are left behind.

## 5. Review: a fresh reviewer

Spawn **one new agent** that did not write or run the tests, with the prompt in `references/reviewer-agent.md`. It reads `<run>/run-data.json`, `<run>/shots/`, `<run>/ai-results-*.json` and `use-cases.js`, checks every step, and writes `<run>/review.json`.

Then, per flagged step:

| Flag | Do |
|---|---|
| `test` (shot too early, wrong wait, weak assertion, wrong role) | Fix the test or the `.ai-tests.json`. Re-run only those files or scenarios once, into the same `<run>`. Spawn a fresh reviewer for just those scenarios; it writes `<run>/review-2.json`. |
| `product` | Keep it as a finding. Don't touch the test. |
| `unsure` | List it for the user to check by hand. |

Agents with no sub-agents do the review themselves, step by step, against the same checklist, after the run.

## 6. Report

```bash
node <e2e-dir>/reporters/build-report.mjs <run> --use-cases <plan>/use-cases.js
```

It merges the run folder into `<run>/e2e-report-<run name>.html` (screenshots embedded), prints one line per use case and `E2E report: <path>`. Open the file and check: the tree matches `use-cases.js`, every `ui` step has a screenshot, every other step has a request and response, flagged steps show the note.

Reply with:
- the spec files and `.ai-tests.json` files written
- per use case: passed / total, and the scenario ids failed or not run (from the build output)
- each failure: scenario id, step, and likely cause (product bug, missing selector, wrong scenario, environment)
- review flags: `product` and `unsure` flags with their notes; `test` flags you fixed
- findings for the app owner: missing selectors, routes or tools, code / scenario mismatches, scenarios to fix with `generate-use-case`
- whether cleanup is confirmed
- the **full path** of the HTML report

---

## File formats

All strict JSON. Paths inside are relative to the run folder.

`<run>/run-data.json` (written by the reporter):

```json
{ "name": "legacy-new-version", "stamp": "20261008-110000", "startedAt": "2026-10-08T04:00:00.000Z", "ms": 48200, "baseURL": "http://localhost:3000",
  "tests": [ { "key": "patch-version", "scenario": "patch-version", "useCase": "UC2", "title": "patch-version PATCH from 2.3.2-2",
    "file": "uc2-cut-a-new-version.e2e.spec.ts:18", "project": "chromium", "status": "failed", "outcome": "unexpected", "ms": 15800, "retry": 0, "error": "…",
    "steps": [ { "title": "Pick PATCH", "status": "passed", "ms": 600, "shot": "shots/<id>-r0-2.jpg" },
               { "title": "POST the version", "status": "passed", "ms": 90, "call": { "target": "POST /api/versions", "request": {}, "response": { "status": 201, "body": {} } } } ],
    "finalShot": "shots/<id>-r0-final.png", "trace": "test-results/…/trace.zip", "annotations": [], "attempts": [] } ] }
```

`<e2e-dir>/<uc-slug>.ai-tests.json` (written by the writer, read by the AI tester):

```json
{ "useCase": "UC2", "tests": [
  { "scenario": "mcp-create-version", "surface": "mcp", "role": "MANAGER_DEV",
    "steps": [ { "title": "Create __e2e_uc2_repo", "setup": true, "call": "RepositoryService · CreateRepository", "params": { "name": "__e2e_uc2_repo" } },
               { "title": "Cut a PATCH version", "call": "RepositoryVersionService · CreateRepositoryVersion", "params": { "repositoryId": "<from step 1>", "bump": "PATCH" }, "expect": "version 2.3.3-1, status PENDING" },
               { "title": "Delete __e2e_uc2_repo", "cleanup": true, "call": "RepositoryService · DeleteRepository", "params": { "id": "<from step 1>" } } ] },
  { "scenario": "backfill-rerun", "surface": "job",
    "steps": [ { "title": "Run the backfill twice", "command": "node scripts/backfill.mjs", "expect": "prints \"backfill: updated=0 skipped=3\"" } ] } ] }
```

`<run>/ai-results-<UC>.json` (written by the AI tester):

```json
{ "useCase": "UC2", "tests": [
  { "scenario": "mcp-create-version", "role": "MANAGER_DEV", "status": "passed", "ms": 4100, "error": "only when failed", "reason": "only when skipped",
    "steps": [ { "title": "Cut a PATCH version", "status": "passed", "ms": 2900,
      "call": { "target": "RepositoryVersionService · CreateRepositoryVersion", "request": { "repositoryId": 9001, "bump": "PATCH" }, "response": { "version": "2.3.3-1", "status": "PENDING" } } },
               { "title": "Run the backfill", "status": "passed", "ms": 5200,
      "call": { "target": "$ node scripts/backfill.mjs", "request": "node scripts/backfill.mjs", "response": "exit 0\nbackfill: updated=0 skipped=3" } } ] } ] }
```

- `status`: `passed` | `failed` | `skipped`. A later file replaces an earlier one for the same scenario.

`<run>/review.json` (written by the reviewer; `review-2.json` after a re-run replaces the notes of the scenarios it covers):

```json
{ "reviewer": "fresh agent", "steps": [
  { "scenario": "legacy-unreachable", "step": 2, "flag": "test", "check": "spinner", "note": "Shot shows the loading skeleton, not \"Could not load\"; wait for the message." },
  { "scenario": "newest-first", "step": 1, "flag": "ok", "note": "Versions tab, 20 rows." } ] }
```

- `step` is 1-based, the index in the test's `steps` (the page-at-failure shot is not a step). `flag`: `ok` | `test` | `product` | `unsure`. `check`: the checklist item that failed (short words).
