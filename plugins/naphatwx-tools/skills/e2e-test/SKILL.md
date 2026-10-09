---
name: e2e-test
description: Write and run Playwright browser tests for a feature, with a screenshot per step and one HTML report. Use when the user says "e2e test spec 127" or "test this in the browser". A test case file alone is generate-test-cases; service checks are smoke-test.
argument-hint: "<spec folder | spec number | feature description> [--env <name>] [--base-url <url>]"
---

# E2E Test

```text
1 test cases    generate-test-cases (target ui) ─► test case file (test cases linked to scenarios)
2 harness       Playwright config + login + step helper + one-html reporter (once per repo)
3 write         1 writer agent per test group, in parallel ─► <group>.e2e.spec.ts
4 run           Playwright, parallel workers for independent files
5 report        1 HTML: use case ─► test (scenario id) ─► steps paged like slides ─► screenshot, pass/fail, error
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- **Source**: a spec folder, a spec number, or a feature description. If none is given, ask once.
- `--env <name>` / `--base-url <url>`: where to run. If neither is given, use the repo's local dev URL and say which one.

## Rules

- **Read the target repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, per-app guides). Their rules for where tests live, how to run tools and who edits app code win over this skill.
- **Tests only.** Never change application code to make a test pass. A missing selector or a real bug goes in the report as a finding.
- **A screenshot at every step**, through the `step()` helper. A test with no `step()` calls is incomplete.
- **One HTML report per run.** Raw Playwright output is not a substitute.
- **Own your data.** Create records prefixed `__e2e_`, delete them, and check they are gone. Never touch records you did not create.
- Never run against production unless the user named it for this run.

---

## 1. Test cases

Run the `generate-test-cases` skill (`naphatwx-tools:generate-test-cases` in Claude Code) with **target ui** and the source. It writes a test case file with pages, user actions, selectors, on-screen expectations, the sign-in role and the viewport. When the feature has a `use-cases.js` (from the `generate-use-case` skill), each test case names its scenario id and use case.

- If a test case file for this source already exists, ask whether to reuse it or generate a new one.
- Read the file. Group its test cases by use case (their **Use case** line), else by page. Each group becomes one spec file, so a group should have about 3–8 cases.

## 2. Harness (once per repo)

Look for an existing Playwright setup: `playwright.config.*`, an `e2e/` folder, a login helper, `@playwright/test` in `package.json`.

| Found | Do |
|---|---|
| Config + login exist | Reuse them. Add only what is missing below. |
| Nothing | Add `@playwright/test` as a dev dependency where the repo keeps web dev dependencies, a config, and a login setup. Follow the repo's run rules (for example "run inside Docker"). |

Then add these, next to the e2e folder, **unchanged** from this skill's `template/`:

- `step.ts`: wraps `test.step` and attaches a JPEG screenshot (quality 60) of how the step ended, pass or fail.
- `reporters/one-html-reporter.ts` and `reporters/e2e-report-template.html`: write one self-contained HTML file per run, with screenshots embedded. Each test shows its steps one at a time: use Prev / Next, the numbered step list, ← / →, or click the right or left half of the screenshot (this works on scrolling full-page shots too). A step without a screenshot shows a "No screenshot for this step" image, so every step can be clicked through. Only one test is open at a time: expanding one collapses the others. Expanding a test starts on step 1; collapsing and re-expanding it keeps the last step seen. A failed step shows its error above the screenshot. A failed test has a copyable rerun command, and a copyable `npx playwright show-trace <path>` command when Playwright saved a trace (the path is relative to the config folder). A full-page screenshot (taller than 1.5× its width) scrolls inside the viewer instead of shrinking.
- Tests are grouped under their use case (`UC<n> <title>`, from the `use case` annotation), in use case order; tests with no use case come last under "Other tests". Each test shows its scenario id (`scenario` annotation) next to its file.
- The report has one card per test, keyed by test id. With retries it keeps the final attempt, puts the earlier ones under "Earlier attempts", and marks a test that passed on retry as flaky. Header counts and filters (Failed, Flaky, Passed, Skipped) use Playwright's own outcome, so they match its summary. A skipped test shows its `skip` / `fixme` reason; a `test.fail()` test shows that annotation.
- The report is dark only. Its styles come from the synced theme block: don't edit between the `theme:` markers; change `theme/` in this plugin repo and run `node theme/sync.mjs`.

Wire the config:

```ts
reporter: [
  ['list'],
  ['./reporters/one-html-reporter.ts', { name: '<feature>', outputDir: 'e2e-results', template: 'reporters/e2e-report-template.html' }],
],
use: {
  baseURL: process.env.PW_BASE_URL ?? '<local url>',
  viewport: { width: 1280, height: 800 },   // keeps screenshots small; a test case may set its own
  screenshot: 'only-on-failure',
  storageState: '<login state file>',
},
fullyParallel: false,   // tests inside one file stay in order; files run on separate workers
workers: <number of spec files, max 4>,
```

`template` and `outputDir` are relative to the folder that holds the Playwright config. Add `e2e-results/` to `.gitignore`.

**Login**: sign in once in a global setup and save `storageState`. Every test reuses it. Use the repo's own login helper or dev-login if it has one. Never put a real password in a file: read credentials from env vars.

## 3. Write: one writer agent per group, in parallel

Spawn one agent per group **in one message**, with the prompt in `references/writer-agent.md`. Each writes one `<group>.e2e.spec.ts` and runs nothing.

Agents with no sub-agents write the groups one after another with the same prompt.

When they are done:
- Check every file imports `step` and wraps each action in it.
- Collect the selectors reported missing and the code / test case mismatches.

## 4. Run

```bash
PW_BASE_URL=<url> E2E_REPORT_NAME=<feature> npx playwright test <e2e-dir>/<feature-files>
```

Run it the way the repo's guide says to run tools (for example in its Docker service). Spec files run in parallel workers, and the tests inside a file run in order.

- A failure caused by the environment (server down, a cold compile timeout, an expired session) is not a product failure. Fix the environment and re-run only the failed files once.
- A real failure: keep it. Do not bend the assertion to pass. If the test case itself was wrong (the code is right and the spec says so), fix the test and say so.
- Check that no `__e2e_` records are left behind.

## 5. Report

The reporter prints `E2E report: <path>`. Open the file and check:
- every test is listed, under its use case
- every step has a screenshot
- the failed tests are listed first; every test starts closed, and opening a failed one shows its error

Reply with:
- the test case file path and the spec files written
- failed / flaky / passed / skipped counts
- per use case: passed / total, and the scenario ids of the failed tests
- each failure: its test, its step, and the likely cause (product bug, missing selector, wrong test case, environment)
- missing selectors and code / test case mismatches, as findings for the app owner
- whether cleanup is confirmed
- the **full path** of the HTML report
