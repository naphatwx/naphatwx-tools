# Changelog

## 1.9.163

**design-feature: use cases move into each flow**

- Each flow has a 4th view after Rules: `Use cases (N)`, with the flow's use cases and their `Play ↗` links. Key `4` opens it.
- Section 07 "Use cases" and the "Try in the mock" line are gone. Open questions is now 07. "Open the mock ↗" moves to the Flows heading.
- `use-cases-section.js` is now `use-cases-panels.js`. Re-running it on an old plan moves the use cases into the flows.

## 1.9.157

**generate-mock-ui, design-feature: use cases in a side list next to the frame**

- Each flow's use cases are now a sticky numbered list on the left of the frame. Titles show in full and wrap; nothing is cut. Each row shows its `surface` tag (`UI`, `API`, `JOB`).
- The picked use case has a solid accent fill.
- The row (list + frame) breaks out of the text column, up to 1880px, so the mock screen scales larger on wide screens. Under 900px the list stacks above the frame.

## 1.9.156

**design-feature: floating tools always bottom right**

- `Open all`, `Zoom`, `Present` and `?` now sit at the bottom right of the page, even with the index rail open. They no longer move to the foot of the rail. Phones keep them top right.

## 1.9.155

**generate-use-case: new skill; use cases shared by the plan, the mock and the tests**

- New `generate-use-case`: writes `<plan>/use-cases.js` (one use case per acceptance scenario, edge case and refusal, grouped by flow, with `surface`, `given`, `when`, `expect`) and `scripts/check.js` to check it. Features with no UI get use cases too.
- design-feature runs it as a section agent; section 07 lists the use cases with or without a mock.
- generate-mock-ui no longer writes use cases. It adds `mock/shared/use-case-play.js` (scenario, page, steps, or `skip` with why), keyed by use case id. Old plans with `mock/shared/use-cases.js` still work with `use-cases-section.js`.
- generate-test-scenario makes one test case per use case of its target, with the same id and flow, then the extra cases.
- e2e-test tags each test with its flow and use case; the report groups tests by flow and shows each use case id.

## 1.9.142

**All skills: rewritten descriptions**

- Every skill `description` is rewritten as one plain line: what it does (starting with a verb), "Use when" with real trigger phrases, then what it does not do. Total length went from 5,002 to 4,561 characters, so the shared skill-list budget drops fewer descriptions.
- Overlapping skills now name each other so a request matches only one: generate-test-scenario / e2e-test / smoke-test, review-code / get-mr-diffs, generate-changelog / update-merge-request, design-feature / generate-mock-ui / generate-diagram, html-document / html-presentation / user-guide.
- commit and update-merge-request are written for the `/` menu; update-merge-request says it saves to the MR with no confirm step. get-mr-diffs starts with "Helper:" and names its callers.
- multi-column-sort's `>-` block is now a single line. No skill body or other frontmatter key changed.

## 1.9.141

**smoke-test, e2e-test: shorter descriptions; plugin.json lists get-mr-diffs**

- Shorter `description` for smoke-test and e2e-test, so the skill list has room to show them and requests trigger the right skill.
- `get-mr-diffs` added to the `skills` list in the Claude `plugin.json` (it was the only skill missing).

## 1.9.140

**smoke-test, e2e-test: new skills; generate-test-scenario: UI target**

- New `smoke-test`: `setup` maps the repo, explores each picked flow with one read-only sub-agent per flow in parallel, then builds a simulation probe (one entry RPC, a smoke marker on every transport, no real side effects, hops reported to a shared store with a TTL) plus `scripts/smoke/` in the target repo (`run.mjs`, `report-template.html`, `envs.json`, `flows/<flow>.json` with the commit it was mapped at). `run <env>` runs every flow in parallel, checks each hop in order and the env vars each service used (secrets as `sha256:<8 hex>`), marks hops after a break "not reached", and writes one HTML report.
- New `e2e-test`: scenarios from generate-test-scenario `--target ui`, a one-time Playwright harness (shared login, `step()` helper with a JPEG screenshot per step, a reporter that writes one self-contained HTML file), one writer sub-agent per scenario group in parallel, then a run and the report.
- generate-test-scenario: new `--target ui` (`references/ui-target.md`: routes, a Selectors table, exact on-screen copy, sign-in role, viewport, keyboard and focus cases, one action per step) and a feature description as input instead of a spec folder.

## 1.9.139

**design-feature, generate-mock-ui: mock review and control rule**

- New mandatory mock review (`generate-mock-ui/references/mock-review.md`, design-feature step 6b): two fresh review-only agents in parallel (UI fidelity, functional), conflicts settled against the spec then the real code, one fresh fix agent, then the Use cases section is regenerated and Verify re-runs.
- Control rule: a control the user has no permission for is hidden when the real app hides it; it is shown unavailable with a reason only where the spec says so.

## 1.9.138

**design-feature, generate-mock-ui: use cases become first-class**

- generate-mock-ui writes `mock/shared/use-cases.js`: `USE_CASE_FLOWS` and `USE_CASES`, strict-JSON arrays derived from every acceptance scenario, edge case and refusal row in the spec, grouped by plan flow.
- Mock index: one block per flow, a chip row of use cases, and a card that shows "How to play" / "What you should see" and plays the screen in a scaled 1600×940 iframe. `#uc-<id>` deep links, Restart, clean state per use case, thin theme-aware scrollbars.
- Screen pages: `?embed=1` hides the floating panel; `?uc=<id>` shows that use case's steps.
- New `page/console.html`: an MCP client panel for API / MCP use cases.
- New `generate-mock-ui/scripts/check-use-cases.js`: syntax-checks every script, checks ids / flows / scenarios, and runs every console use case against the fake API.
- Overview section 07 is now "Use cases" (was "Mock UI"), generated with each flow's "Try in the mock" line by the new `design-feature/scripts/use-cases-section.js`.
- New optional step: publish the plan as a claude.ai Artifact from a copy (`design-feature/scripts/publish-copy.js` strips `target="_blank"` and points `overview.html` links at `index.html`).
