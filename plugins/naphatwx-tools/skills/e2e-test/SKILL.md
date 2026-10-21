---
name: e2e-test
description: Write and run automated tests for every scenario in a feature's use-cases.js, on every surface (ui in the browser with a screenshot per step, api calls with request and response, mcp and job scenarios played by an AI tester), then a fresh reviewer checks every step and one HTML report shows it all. Use when the user says "e2e test spec 127" or "test this end to end". Playing by hand is play-scenarios; service checks after a deploy are smoke-test.
argument-hint: "<plan folder | spec folder | spec number> [--core] [--env <name>] [--base-url <url>]"
---

# E2E Test

```text
1 read      <plan>/use-cases.js ─► UC1 → its scenarios, UC2 → … (every surface; surface only picks the runner)
2 harness   once per repo: Playwright config + login + step.ts + run-data reporter + build-report.mjs
  helper    1 agent writes <domain>/helpers/<feature>.ts (seed copies, sweep) and proves it
  match     find the domain's existing tests by scenario id ─► update / add / ask before removing
3 write     1 writer agent per use case, in parallel ─► <domain>/<goal>.e2e.spec.ts (ui + api) and <goal>.ai-tests.json (mcp + job)
4 run       only this source's scenario ids, --core first: Playwright runs ui + api ─► e2e-results/<spec>/ (one folder per spec)
            then 1 AI tester per use case, one after another, runs mcp + job ─► ai-results-<UC>.json   (same folder)
            fix test-side failures, re-run
5 review    1 FRESH reviewer agent checks every step ─► review.json
            test problem ─► fix the test, re-run those files once, review again · product problem ─► finding
            then the full run into the same folder, and a review of the rest
6 report    build-report.mjs ─► one HTML: UC → scenario (surface + kind tags) → steps (screenshot or request / response, review notes)
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- **Source**: a plan folder, a spec folder or a spec number. If none is given, ask once.
- `--env <name>` / `--base-url <url>`: where to run. If neither is given, use the repo's local dev URL and say which one.
- `--core`: run only the core scenarios (`"core": true` in `use-cases.js`: every basic, the main alternates and the errors users hit most). Stop after the core pass of step 4–5.

## Rules

- **Read the target repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, per-app guides). Their rules for where tests live, how to run tools and who edits app code win over this skill.
- **Test source is the latest version, by domain; reports are by spec.** Tests live in `<e2e-dir>/<domain>/` and always match the latest code. Each round (a new spec on the same domain) edits them in place: never a spec folder, a spec number or a `UC<n>` in a test file name, because `UC<n>` restarts in every `use-cases.js`. The spec's own record is its `use-cases.js` and its report folder, `e2e-results/<spec>/` (one per spec, updated by every run). A repo guide with its own layout wins.
- **`use-cases.js` is the one source.** Read it directly; never another skill's output (no mock, no play-scenarios files). Never write your own test cases or scenarios. A missing or wrong scenario is a finding: fix it with the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code), then test again.
- **One test per scenario**, same id, in file order. Every surface is tested: `ui`, `api`, `mcp`, `job`. The surface only picks the runner.
- **Tests only.** Never change application code to make a test pass. A missing selector or a real bug is a finding.
- **Every step leaves proof**: a screenshot (`ui`) or the masked request and response (`api`, `mcp`, `job`). No tokens, cookies or passwords in any file.
- **Own your data.** Each test works on its own copies of the seed records its scenario names, made by the feature's data helper (step 2b), deletes them after and checks they are gone. Never touch records you did not create. No play-scenarios seeds.
- **One HTML report per spec**, `e2e-results/<spec>/e2e-report.html`, rebuilt from the spec's one run folder after every run. No timestamps: every run of the spec updates the tests it ran and keeps the rest. Raw Playwright output is not a substitute.
- Never run against production unless the user named it for this run.
- **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

---

## 1. Read

Find `use-cases.js`:

| Source | File |
|---|---|
| plan folder | `<plan>/use-cases.js` |
| spec folder or spec number | `<spec-folder>/plan/use-cases.js` |
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

## 2. Harness (once per repo)

Look for an existing Playwright setup: `playwright.config.*`, an `e2e/` folder, a login helper, `@playwright/test` in `package.json`.

| Found | Do |
|---|---|
| Config + login exist | Reuse them. Add only what is missing below. |
| Nothing | Add `@playwright/test` as a dev dependency where the repo keeps web dev dependencies, a config, and a login setup. Follow the repo's run rules (for example "run inside Docker"). |

Reuse the repo's own copies of these files wherever they already are (search `<e2e-dir>` for `step.ts` and `run-data-reporter.ts`, e.g. `support/step.ts`); never add a second copy. Copy only what is missing from this skill's `template/`, **unchanged**:

- `<e2e-dir>/support/step.ts`:
    - `step(page, title, body)` wraps `test.step` and attaches a JPEG screenshot (quality 60) of how the step ended, pass or fail.
    - `apiStep(request, title, { method, url, data?, headers? }, check)` sends one request, attaches the masked request and response, then runs `check(response, body)`. It returns the parsed body.
    - `reveal(locator)` scrolls the element into view below any sticky header or footer, in the page's own scroll container too.
- `<e2e-dir>/reporters/run-data-reporter.ts`: writes the run folder (`run-data.json` + `shots/`), not HTML.
- `<e2e-dir>/reporters/build-report.mjs` and `reporters/e2e-report-template.html`: build the one HTML (step 6). Node only, no dependencies.
- `<e2e-dir>/reporters/use-cases.types.d.ts`: the type of `use-cases.js`, for `build-report.mjs`. Replace it with this skill's copy on every run, so it matches the plan's file.
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
- `E2E_SPEC=<NNN-slug>` (the spec folder name) makes the reporter write into `<outputDir>/<NNN-slug>/`; unset → `<outputDir>/_adhoc/`. A value that is not `<NNN>-<slug>` stops the run.
- That folder is reused by every run: a run replaces the tests it ran (each entry keeps its own `startedAt`), keeps the rest, and deletes screenshots nothing points to. Delete the folder for a clean start.
- `E2E_RUN_DIR=<dir>` is an override for an odd folder. It must be inside `outputDir`, given from the repo root or from the config folder; any other path stops the run before anything is written.
- **Login**: sign in once in a global setup and save `storageState`; every test reuses it. A scenario with another role signs in as that role in its own `test.use({ storageState })` or fixture. Use the repo's login helper or dev login. Read credentials from env vars, never from a file. The sign-in helper closes product tours and "what's new" overlays and marks them seen, so no shot shows them.

The report keeps these features; keep them when you touch the template:

- Tree: use cases in `use-cases.js` order, then each scenario with a surface tag, its kind (`basic`, `alternate`, `exception`) and a Core pill on core scenarios, then its steps. Badge order: status → surface → title → kind → core. Core scenarios come first in each use case, then the rest, each group in file order. The header shows "Core: N/M passed". Tests with no known scenario go last under "Other tests". A scenario with no result shows as "not run".
- Steps paged like slides: Prev / Next, the numbered step list, ← / →, or click the right or left half of the screenshot (works on scrolling full-page shots too). A `ui` step without a screenshot shows a "No screenshot for this step" image. A full-page shot (taller than 1.5× its width) scrolls inside the viewer.
- `api`, `mcp`, `job` steps show the call target, the request and the response in place of the screenshot.
- A step the reviewer flagged shows ⚑ in the step list and the reviewer's note above the screenshot. Header count and a "Has review flags" filter.
- One test open at a time; every test starts closed; re-opening keeps the last step seen. A failed step shows its error.
- One sticky search bar under the header, the same one the mock and play pages use: a search field (type to match scenario titles; `/` jumps in; matches are marked) and a live "n of N" count. Focus opens the groups as pills with live counts: Status (Failed, Flaky, Passed, Skipped, Not run), Type (ui / api / mcp / job), Kind (basic / alternate / exception), Review (has review flags), Core only. A group shows only the values the page has, and hides when it has one value. Values in one group combine with OR; groups combine with AND. Picked values show as chips in the field (click to remove; Backspace removes the last); Clear resets. The open panel floats over the rows; a click outside or Escape closes it. Status uses Playwright's own outcome, so it matches its summary. A use case with no test left hides its heading. The choice is kept in `localStorage`. A "Failed first" toggle in the bar lifts failures to the top of each use case; the default is file order.
- Retries: the final attempt shows, earlier ones sit under "Earlier attempts", a test that passed on retry is flaky. A skipped test shows its `skip` / `fixme` reason.
- A failed Playwright test has a copyable rerun command, and a `npx playwright show-trace <path>` command when a trace was saved.
- Dark only. Styles come from the synced theme block: don't edit between the `theme:` markers; change `theme/` in this plugin repo and run `node theme/sync.mjs`.
- **Export PDF** button: opens the print dialog; pick "Save as PDF". Keep the `theme:pdf` and `theme:pdf-js` blocks and the `addExportPdf(...)` call.

## 2b. Data helper (once per feature, before the writers)

Pick `<domain>` first: the folder under `<e2e-dir>` whose tests cover this feature's pages (the repo's guide or README may list them). None fits → a new kebab-case folder named for the domain, never for the spec. Unsure between two → ask once.

The domain already has a helper for this feature (`<e2e-dir>/<domain>/helpers/*.ts`) → reuse it; the agent only adds what the new scenarios need. Otherwise spawn **one** agent with the prompt in `references/data-helper-agent.md`. It writes `<e2e-dir>/<domain>/helpers/<feature>.ts` (seed copies, settle, `sweep`) and one setup / cleanup runner for mcp and job scenarios, proves both with a throwaway spec, and deletes that spec. The writers import the helper; none writes its own data code.

Agents with no sub-agents write it themselves with the same prompt, before step 3.

## 2c. Match the domain's existing tests

Each test carries its scenario id: the `scenario` annotation in a `.e2e.spec.ts`, `"scenario"` in a `.ai-tests.json`. Search `<e2e-dir>/<domain>/` for every id in `use-cases.js`:

| Found | Do |
|---|---|
| Same id | The writer updates that test in place to match the scenario as it is now. |
| New id | The writer adds a test, in the file of its use case's goal (step 3). |
| An id the domain's tests hold that this feature's previous `use-cases.js` had and this one dropped | List it. Ask before deleting the test: the behaviour may still exist under another spec. |

Tests whose ids appear in no `use-cases.js` of this feature are someone else's: never touch them. The previous `use-cases.js` is the newest other `specs/*/plan/use-cases.js` whose scenario ids overlap these tests; say which one you used.

## 3. Write: one writer agent per use case, in parallel

Spawn one agent per use case **in one message**, with the prompt in `references/writer-agent.md` (with `--core`, list only its core scenarios) and its step 2c rows. Each writes, for its use case only:

- `<e2e-dir>/<domain>/<goal>.e2e.spec.ts`: one `test()` per `ui` and `api` scenario, in file order. Skip the file when the use case has none.
- `<e2e-dir>/<domain>/<goal>.ai-tests.json`: the ordered calls or commands for each `mcp` and `job` scenario, plus its `runner` block and the one setup / cleanup command it names. Skip both when the use case has none.

`<goal>` is the use case title, kebab-case, with no `UC<n>`: `cut-a-new-version`. The file exists → the writer edits it: it updates and adds its scenarios' tests and leaves every other test in the file as it is. A matched test that sits in another file is updated there. Writers run nothing.

Agents with no sub-agents write the use cases one after another with the same prompt.

When they are done:
- Every scenario in `use-cases.js` has exactly one test, with the same id, in one of the two files.
- Every spec file imports `step` / `apiStep` and wraps each action in one, and calls the helper's `sweep` once in `beforeAll`.
- Collect missing selectors, missing API routes or MCP tools, and code / scenario mismatches.

## 4. Run

Order, always: **core pass** (`--core` run → fix test-side failures → re-run → review, step 5), then the **full run** into the same `<run>` and a review of the scenarios not yet reviewed. With `--core`, stop after the core pass. The run folder keeps the latest attempt of each test; the reviewer reviews that.

The run folder `<run>` = `e2e-results/<spec>/`. `<spec>` is the spec folder name (`185-remove-announcement-dismiss`); a source with no spec folder (plan folder, feature description) has none, so the run goes to `_adhoc/`. Every run of the spec, first or re-run, this round or a later one, uses the same command and folder.

```bash
E2E_SPEC=<spec> PW_BASE_URL=<url> npx playwright test <e2e-dir>/<domain>/ --grep " (<id>|<id>|…) "
```

- A new round of the spec (a later task changed the use cases): delete `<run>/review*.json` first, so the reviewer starts fresh. Test results need no reset; the run replaces the ones it touches.

- `--grep` lists only this source's scenario ids, because the domain folder also holds other specs' tests. The title is `<id> <scenario title>`, so the spaces around the group stop one id from matching a longer one.
- From the repo root, add `--config <path to the Playwright config>`.
- Core pass → list only the core ids (writers also tag every core test `@core`), and give each AI tester only its core scenarios.
- Run it the way the repo's guide says to run tools (for example in its Docker service). Spec files run on parallel workers; tests inside a file run in order.
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

Agents with no sub-agents do the review themselves, step by step, against the same checklist, after the run.

When the code's message, status or list differs from a scenario's `expect` and the code is right (e.g. 200 vs 201, an RBAC refusal string), list it for `generate-use-case` to update the scenario (its verify mode re-checks the evidence); don't flag it `product`. A scenario listed in a `MISMATCHES` entry with `"fix": "code"` follows today's code: the gap is known, not a new finding.

## 6. Report

```bash
node <e2e-dir>/reporters/build-report.mjs <run> --use-cases <plan>/use-cases.js [--core]
```

- `--core` → the report keeps only the core scenarios; a core one with no result shows as "not run".

It merges the run folder into `<run>/e2e-report.html` (screenshots embedded; the same file every run), prints one line per use case and `E2E report: <path>`. Open the file and check: the tree matches `use-cases.js`, every `ui` step has a screenshot, every other step has a request and response, flagged steps show the note.

Reply with:
- the domain folder, and the spec files and `.ai-tests.json` files written
- per file: the tests updated, added and (after the user agreed) removed, by scenario id, and the previous `use-cases.js` used in step 2c
- per use case: passed / total, core passed / core total, and the scenario ids failed or not run (from the build output); say when it was a `--core` run
- each failure: scenario id, step, and likely cause (product bug, missing selector, wrong scenario, environment)
- review flags: `product` and `unsure` flags with their notes; `test` flags you fixed
- findings for the app owner: missing selectors, routes or tools, code / scenario mismatches, scenarios to fix with `generate-use-case`
- the open `MISMATCHES` from `use-cases.js`, one line each (`M1 FR-017 (fix the code): …`), so the spec-vs-code decisions stay in view
- whether cleanup is confirmed
- the **full path** of the HTML report

---

## File formats

All strict JSON. Paths inside are relative to the run folder.

`<run>/run-data.json` (written by the reporter; the top-level `stamp` / `startedAt` / `ms` describe the newest run, each test's `startedAt` the run that produced it):

```json
{ "name": "legacy-new-version", "stamp": "20261008-110000", "startedAt": "2026-10-08T04:00:00.000Z", "ms": 48200, "baseURL": "http://localhost:3000",
  "tests": [ { "key": "patch-version", "scenario": "patch-version", "useCase": "UC2", "title": "patch-version PATCH from 2.3.2-2",
    "file": "legacy-versions/cut-a-new-version.e2e.spec.ts:18", "project": "chromium", "status": "failed", "outcome": "unexpected", "ms": 15800, "retry": 0, "error": "…", "startedAt": "2026-10-08T04:00:00.000Z",
    "steps": [ { "title": "Pick PATCH", "status": "passed", "ms": 600, "shot": "shots/<id>-r0-2.jpg" },
               { "title": "POST the version", "status": "passed", "ms": 90, "call": { "target": "POST /api/versions", "request": {}, "response": { "status": 201, "body": {} } } } ],
    "finalShot": "shots/<id>-r0-final.png", "trace": "test-results/…/trace.zip", "annotations": [], "attempts": [] } ] }
```

`<e2e-dir>/<domain>/<goal>.ai-tests.json` (written by the writer, read by the AI tester):

```json
{ "useCase": "UC2",
  "runner": { "setup": "npx tsx e2e/legacy-versions/cut-a-new-version.data.mts setup", "cleanup": "npx tsx e2e/legacy-versions/cut-a-new-version.data.mts cleanup",
              "prints": "JSON map of seed name → copy, e.g. { \"delta-super\": { \"name\": \"delta-super-e2e2-k7q2\", \"id\": 9001 } }" },
  "tests": [
  { "scenario": "mcp-create-version", "surface": "mcp", "role": "MANAGER_DEV",
    "steps": [ { "title": "Copy delta-super", "setup": true, "command": "npx tsx e2e/legacy-versions/cut-a-new-version.data.mts setup delta-super" },
               { "title": "Cut a PATCH version of delta-super", "call": "RepositoryVersionService · CreateRepositoryVersion", "params": { "repositoryId": "<from step 1: delta-super.id>", "bump": "PATCH" }, "expect": "version 2.3.3-1, status PENDING" },
               { "title": "Delete the delta-super copy", "cleanup": true, "command": "npx tsx e2e/legacy-versions/cut-a-new-version.data.mts cleanup" } ] },
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
