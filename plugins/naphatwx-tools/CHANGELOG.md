# Changelog

## 1.9.290

**Copies always come from the newest plugin**

- e2e-test, smoke-test, design-feature, generate-diagram, generate-use-case and play-scenarios copy their files from `assets/` on every run, overwriting the old copy at the same path. Filled outputs (plans, `live.js`, results) are kept.
- Pages made earlier are rebuilt from the newest template on a rerun, with only their content moved over, so they never keep an old design:
    - generate-mock-ui: `mock/index.html` and `README.md` are copied again, then the header and `screenUrl()` edits are redone.
    - design-feature: `overview.html` (section content moved over, scripts re-run) and `api/contracts.html` (its `API` data moved over).
    - generate-diagram (a redraw), html-document, html-presentation and deploy-plan (an update; same plan `id`, so the ticks stay).
    - html-document: old content the template has no part for gets the nearest part, or theme-token CSS that fits the template's width; no emoji icons.
- generate-mock-ui: a scenario with no screen shows a short "No mock" frame (240px) instead of an empty 16:9 box; the scenario list keeps its height.
- e2e-test no longer reuses the repo's old `step.ts`, reporter or report builder, so the report always has the newest layout and fixes.
- e2e-test `step.ts`: every `if` body in braces (passes ESLint `curly`); `attachCall` is exported, for proof that is not an HTTP call.
- e2e-test `run-data-reporter.ts`: entries keyed by scenario id, else file without line + title (old keys are recomputed on merge); a non-scenario entry whose test file is gone is dropped; `E2E_SPEC` refuses only `/`, `\` and `..`; records the config's `baseURL`; a bad setup stops the run in `onBegin`. Each entry keeps its own `startedAt`.

## 1.9.289

**Skill folders: scripts, references, assets**

- Every skill uses the Agent Skills folder names: `scripts/` (code the agent runs), `references/` (docs loaded when needed), `assets/` (files that go into the output or the repo).
- `template/` → `assets/` in deploy-plan, design-feature, e2e-test, generate-diagram, generate-mock-ui, generate-use-case, html-document, html-presentation, play-scenarios and smoke-test.
- multi-column-sort: `reference/` → `assets/`.
- copy-reports: `copy-reports.sh` → `scripts/copy-reports.sh`.
- work-flow: `plan-template.md` and `plan-template-fix.md` → `assets/`.
- No change in behaviour.

## 1.9.288

**work-flow plan: section order**

- Open questions and Rules check move up, right after Status: what waits on a person comes first.
- Risks move up, right after Decisions: a choice and its cost are read together.

## 1.9.287

**work-flow plan: sized to the task, no repeats**

- New `references/plan-template-fix.md`: a small plan for a bug fix with one cause.
- Full plan: only header, Goal, Status, Accept, Decisions and Tasks are required; other sections only when they have content. No `- None.`
- Removed `## Order` (each task's `after:` is the order) and `## Dependencies & assumptions` (facts go to Context, preconditions to Release & rollback).
- Rules check keeps only rules not yet settled by a decision.
- Data / API links `plan/api/` and `plan/database/` files and keeps only what they lack.
- Accept lines are tagged `(new)`, `(changed)` or `(removed)`; a changed line says what the app did before.
- Owner agents get their tasks plus the cited A#, D#, E# lines, not the whole plan.

## 1.9.286

**work-flow plan template**

- New `references/plan-template.md`: the full `plan.md` shape.
- New sections: Status, Edge cases, Out of scope, Context (facts checked), Open questions, Rules check, Status flow, Order, Verify locally, Release & rollback.
- IDs on every item (A#, E#, D#, Q#, R#, T#); tasks cite what they cover and say `after:`.
- Decisions grouped by topic; `[ADR]` ones carry `why` and `rejected`, and Phase 5 writes one decision record each.
- Risks end in a mitigation or who accepted them.
- Only the user can defer a grill question; it goes under Open questions.
- Review checks every A# and E# has code and a test. The checkpoint uses Verify locally.
- Profile: optional `Rules check` field.
- An older plan moves to the new shape only after the user says yes.

## 1.9.284

**work-flow setup step**

- New first step in Start: create the work folder (`.work/`, or the profile's) at the repo root when missing.
- Add it to the root `.gitignore` when git does not ignore it yet.

## 1.9.282

**Spec input works with any spec tool**

- Input is a spec folder path, from any tool. No bare spec number, no `specs/NNN-*` rule.
- e2e-test, generate-use-case, design-feature, generate-mock-ui, play-scenarios, deploy-plan, smoke-test: drop the spec number input and examples.
- `E2E_SPEC` and `--spec` / `SMOKE_SPEC` take any plain folder name (letters, digits, `.`, `_`, `-`), not only `<NNN>-<slug>`.
- In-project mocks live at `mock/<spec-slug>/` (the spec folder name, lowercased) instead of `mock/spec<NNN>/`.
- generate-use-case's `check.js` skips the whole spec folder around `<spec-folder>/plan/`, wherever it sits.
- generate-changelog, announce, update-merge-request, review-code find spec folders by content and name, not by `specs/NNN-*`.

## 1.9.281

**work-flow rule check: sources in the round, sub-agent only when needed**

- Each round shows the settled questions at the top, each with its source.
- Questions are checked against the Rules that apply list first; a read-only sub-agent runs only for questions that need a lookup the list does not cover.

## 1.9.280

**work-flow rule check: simpler, with priority**

- A rule or code pattern answers the question → not asked, written as `(rule: <file:line or guide section>)`. Anything else → asked.
- Priority: a written rule (guide, ADR) beats a code pattern. Two sources of the same rank that disagree → asked.
- Drops the 1.9.279 "recommendation cites a rule" line; the rule above covers it.

## 1.9.279

**work-flow rule check: sources required**

- Every rule-settled answer needs a `file:line` or guide section. No source → the question is asked.
- A question whose recommended answer cites a rule or pattern moves to settled, with that source.

## 1.9.278

**work-flow grill: one rule check per round**

- The rule filter and the gap check become one step: before each round, one read-only sub-agent checks every question against the Rules that apply list, the guides, the ADRs and similar code.
- Answered → `(rule: <source>)`, not asked. Rules conflict or the task must break one → asked. The rest → asked.
- No more sorting questions into decisions and conventions.

## 1.9.277

**work-flow grill adds a gap check each round**

- Each round sorts the frontier: decisions ("what should it do?") are asked; conventions ("how do we do it here?") not on the Rules that apply list go to one read-only sub-agent for the whole round.
- Found → added to the list as `(rule: <source>)`, not asked. Not found → asked.
- Decisions are asked while the check runs. No full re-Explore per round.

## 1.9.276

**work-flow stops asking what the project's rules already answer**

- Explore also returns "Rules that apply": guide rules, ADRs and existing code patterns that settle a choice, each with its source.
- The grill gets that list and filters every round: a question a rule answers is not asked. It is written under Decisions as `(rule: <source>)`. Asked only when rules conflict or the task must break one.
- The plan stop lists the rule-settled decisions so the user can overrule one. The decider never gets these questions either.

## 1.9.275

**work-flow merges Routing into Code**

- Phase 1 Routing is gone: Code groups tasks by their `[app]` tag, runs the contract owner first, then starts the owners.
- Phases renumbered, starting at 1: 1 Plan, 2 Code, 3 Tests, 4 Review, 5 Docs, 6 Pre-merge. Update the status line of an open `plan.md` by hand (old `Phase: 0` → 1; old 2–6 stay the same number for Code to Pre-merge, old `Phase: 1` Routing → 2).

## 1.9.274

**work-flow stops after the plan**

- New plan stop at the end of Phase 0: a summary of the plan (path, goal, Accept, changes and tasks per app, decisions the user did not make, top risks). Code starts only on "implement".
- Changes at the plan stop go back to the grill or the draft, re-verify only the touched apps, then stop again.
- Three stops: the grill, the plan stop, the checkpoint. Auto-answer skips only the grill.

## 1.9.273

**work-flow drops plan mode and the approval stop, adds auto-answer**

- Phase 0 writes `.work/NNN-<slug>/plan.md` directly. No plan mode: its exit asks for an approval and then says "start coding".
- Two stops: the grill and the checkpoint after code. The final yes in the grill is the go-ahead.
- Auto-answer: `auto-answer` (or `auto`) in the input or a grill reply. The user still settles scope; the decider answers the rest, marked `(auto)`.
- A spec verify finding that changes scope or a user decision goes back to the grill.
- The checkpoint report names the plan and the decisions the user did not make.
- Step 2 is now Explore: an `Explore` sub-agent maps the code (files, behavior, tests, docs, gaps) before the grill.

## 1.9.272

**work-flow calls grilling, not grill-me**

- `grill-me` in mattpocock-skills is user-only (`disable-model-invocation`); it just calls `grilling`. Phase 0 now calls `grilling` directly.
- The user's yes at the end of the grill only ends the grill; the plan approval stays the one go-ahead.
- Install hint: `/plugin install mattpocock-skills@claude-plugins-official`.

## 1.9.271

**work-flow plans in plan mode, saves one plan.md**

- Phase 0 runs in Claude Code's plan mode: Matt Pocock's `grill-me` asks the questions (no limit), the agent drafts the plan, spec verify fixes it against the project rules, then the user approves with the built-in prompt.
- The approved plan is copied to `.work/NNN-<slug>/plan.md` (profile `Work folder`, default `.work/`). Its second line is the status line; `flow.md` is gone.
- Removed: speckit and the light `spec.md`, the clarify step. `references/spec.md` is now `references/plan.md`.
- Task numbers count `.work/` in this checkout, every worktree and `Other checkouts`.
- Stops: the grill, the plan approval, the checkpoint.

## 1.9.270

**work-flow checks spec numbers across checkouts**

- Before a new spec and in the Phase 6 number check, the flow collects spec numbers from this checkout, every git worktree, the profile's new `Other checkouts` and the tracked folders on the target and hotfix branches. Untracked spec folders no longer hide a number in use.
- Speckit gets the chosen number (its `--number` option), or its folder is renamed.
- Phase 6 moves our spec folder to the next free number when another checkout uses it with a different slug.

## 1.9.269

**work-flow runs on its own, speckit back in Phase 0**

- No mode question and no size question. The flow runs by itself; the user answers only the clarify questions (skipped when there are none) and reviews at the checkpoint.
- Phase 0 uses speckit when its commands are available (specify, clarify, plan, tasks, analyze; checklist only on request), else the light `spec.md`. Specs are numbered `NNN-<slug>` in the profile's spec folder, and `/work-flow 194` resumes one.
- Spec verify checks the plan against the project's rules, not the requirements. The agent applies findings and analyze fixes itself; the decider only settles disputes.
- Removed: Manual mode, the Small path, the "start coding?" question. `flow.md` drops `Mode` and `Size`, gains `Spec`.
- Number check covers tracked numbered folders only; an ignored spec folder never collides.

## 1.9.268

**work-flow gets a Small path and fewer files**

- New size step at start: the agent proposes Small or Full, you confirm. Small = one app, no shared contract, no numbered file, no new permission.
- Small skips spec verify, the decider, Phase 1 routing, the cross-app check and the number check; it writes a short `spec.md` (Goal, Accept, Tasks) and gets one reviewer. Docs only when behavior changed. Checkpoint, tests, review and the Phase 6 gate still run.
- A task that grows past Small stops and switches to Full.
- `references/code.md` and `references/tests.md` are folded into `SKILL.md`; repeated rules removed. `flow.md` gains a `Size` line.

## 1.9.267

**work-flow drops speckit**

- Phase 0 always writes one `spec.md` (Spec, Plan, Tasks), then spec verify. The speckit path is gone.
- New profile fields: `Spec folder` (a gitignored folder keeps the spec out of the repo), `Unit tests on request`, integration `At pre-merge: full | changed`, `Follow-up owners`, `Hotfix branch`, `Pre-merge app steps`, `Cross-app checks`, `Extra review tracks`, `Decider agent`, and a user docs `after edit` command.

## 1.9.266

**html-document uses the design-feature page look**

- The docs page now has the same layout as design-feature's overview: a numbered rail on the left (`01`, `02` … with nested `2.1` items), rail search, the round edge button, and a centered sheet.
- `[` hides the rail and `/` jumps to its search. The rail state is kept in `localStorage` (`naphatwx:docs:rail`).
- Text size and Export PDF move to the floating bar at the bottom right.
- New page parts: kicker, `.facts` list, `.pill`, `details.more`. Callouts are tinted bands with a label; steps use a number column.
- The card grid and the Clerk-style top bar are gone.
- Diagrams use the theme: flowcharts, sequence diagrams and table cards are inline SVG with the `theme:seq`, `theme:diff` and `theme:diagram-labels-js` blocks. The template shows one of each.
- New rule for anything not in the template: reuse a theme class first, else match the closest part with theme tokens. No Mermaid, chart library or web font.

## 1.9.265

**Herdr tab name also runs at session start**

- `hooks/herdr-tab-name.sh` now also runs on `SessionStart`, so a resumed session names its tab right away.
- It still runs on `Stop` after each reply.

## 1.9.264

**Filter chips get their own row**

- Picked filters now show as chips in a row under the search box, not inside it.
- Many chips wrap onto new lines instead of covering the count and Clear button.
- The scenario rows move down as the chips row grows, so the bar never hides the first row.

## 1.9.263

**Herdr tab name hook does less work**

- `hooks/herdr-tab-name.sh` now runs on `Stop` only, not on every prompt.
- It reads the session title from herdr (the pane's terminal title), not from the transcript, and renames the tab only when the title changed.
- No `jq` needed anymore, so it should also work on Windows through Git Bash.
- A `/rename` now shows on the tab after the next reply ends.

## 1.9.262

**New herdr tabs can start Claude on their own**

- New herdr plugin `hooks/herdr-claude-tab/` (`naphatwx.claude-tab`). It runs `claude` in every new herdr tab (`tab.created`). Split panes stay plain shells.
- Off by default. Turn it on with `herdr plugin link <repo>/plugins/naphatwx-tools/hooks/herdr-claude-tab`.

## 1.9.260

**Both hooks are now opt-in**

- Response rules and the herdr tab name hook are off by default.
- Turn each on in `~/.claude/settings.json` under `env`, then start a new session:
    - `NAPHATWX_RESPONSE_RULES=1`
    - `NAPHATWX_HERDR_TAB_NAME=1`
- Breaking: anyone who relied on response rules being on by default must now set `NAPHATWX_RESPONSE_RULES=1`.

## 1.9.259

**Herdr tab follows the Claude session name**

- New Claude Code hook `hooks/herdr-tab-name.sh`, on `UserPromptSubmit` and `Stop`.
    - Inside herdr, it renames the current tab to the session name: the `/rename` title, else Claude's auto title.
    - Outside herdr it does nothing.

## 1.9.252

**Text size picker is back: A / A / A on every page**

- Every HTML page gets three "A" buttons (small / medium / large) next to Export PDF. Medium is the default.
    - Only body, meta and code text change: Small 14 / 12 / 12px, Large 18 / 16 / 16px. Headings stay the same.
    - Large also grows tags to 14px and diagram labels to 16px (sub-lines 14px). Diagram shapes keep their size.
    - The choice is saved in `localStorage` (`naphatwx-font-size`), shared by every page, and followed live by other open pages and embedded diagrams.
    - Diagram pages show the picker only when opened on their own.
- A few spots that used a fixed step now use their role size, so they follow the picker: html-document nav, eyebrow, search and card text, legends, sequence-viewer code, play-scenarios overlay code.
- theme: new `font-size.css` and `font-size.js` (`addFontSize(target)`), synced into `theme:font-size` and `theme:font-size-js` blocks. Sizes per option are in `tokens.css` under `:root[data-fs]`.

## 1.9.234

**Text size picker removed**

- No page has a text size picker any more, html-document included. Export PDF stays.
- theme: `addExportPdf(target, prepare)` takes no options; `base.css` and `pdf.css` drop the picker rules. Diagram text sizes use the `--fs-sm` / `--fs-xs` tokens again.

## 1.9.231

**Text size picker: small and medium only**

- The Large option is gone. A saved "large" falls back to medium.
- Small no longer shrinks the whole page. It sets body text to 14px, and meta text (hints, labels, captions) and code to 12px. Headings and tags stay as medium.

## 1.9.230

**Text size picker on every page**

- Every HTML page gets a small / medium / large text size picker next to Export PDF: 14px, 16px or 18px root size. All text sizes are `rem`, so they scale together.
    - The choice is saved in `localStorage` (`naphatwx-font-size`). It is shared by every page and follows changes made in another open page.
    - html-document's own picker (small / normal / big) is replaced by the shared one.
    - Diagram text stays in px (`--fs-dia` 14px, `--fs-dia-sub` 12px), so labels never outgrow their shapes. Diagram pages and slides have no picker.
- theme: `pdf.js` adds the picker (`addExportPdf(target, prepare, { fontSize })`), `base.css` holds the sizes, `pdf.css` the picker style.

## 1.9.209

**Every diagram: one Export PDF button, centered labels, room under the button**

- Every diagram file has the same Export PDF button (`.float-bar` + `addExportPdf()`). It prints only that diagram, fitted to the page width, without the button.
    - Flowcharts get it too. Manual flowcharts are now `NN-<slug>.html` pages, embedded by an iframe like diagram-design files, not an `.svg` in an `<img>`.
    - diagram-design files (flowchart, sequence, ER) paste one page kit, generate-diagram's `template/embed.html`. It replaces the embed script that SKILL.md held inline.
- Labels center on their line: message labels on the arrow's midpoint, self-call labels on the loop, flowchart exit labels on their segment, ER cardinality labels on their stub.
    - The step number sits left of the label's box and never moves the label.
    - The box behind a label is fitted to the rendered text in the browser, after fonts load, not guessed from a character count.
    - `render.js` draws a call to the same participant as a self-call loop.
- Room under the content: a page with a `.float-bar` gets 76px bottom padding (`--float-space`), so the button never covers the last line or the legend. An embedded diagram posts its height with that padding, so overview.html's iframe ends under the button. Print drops the padding and the button. html-presentation sets it back to 0.
- theme: new `diagram-labels.js` (`fitDiagramLabels`) and `diagram-embed.js` (Export PDF, 1:1 SVGs, embed contract), synced by `theme/sync.mjs` into `theme:diagram-labels-js` and `theme:diagram-embed-js` blocks.

## 1.9.204

**Wider open test in the e2e report**

- e2e-test: an open test grows to `min(96vw, --max-w-7xl)`, centered. The header, filters and closed rows stay at the text width.
- theme: new tokens `--max-w-6xl` (72rem, 1152px, not used yet) and `--max-w-7xl` (80rem, 1280px).

## 1.9.203

**One use-cases.js for every skill that plays or tests a feature**

- Every skill reads `<plan>/use-cases.js` directly and shows the same tree: use case → scenarios, in file order, with a surface tag. A missing file → run generate-use-case first.
- generate-use-case:
  - surface `mcp` (an AI agent calling MCP tools) is now separate from `api` (REST / gRPC).
  - Each use case lists its `channels`. Each outcome needs one scenario per channel, or an `na` reason.
  - The new `ACCEPTANCE` list holds the spec's Given / When / Then.
  - `check.js` errors on an uncovered channel or acceptance criterion, and warns on a scenario with no twin on another channel.
- design-feature: new section 03 **Acceptance criteria**, built by `acceptance-section.js`. Each criterion links to its scenarios by channel and shows gaps. Use cases is now 04, and the sections after it move down by one.
- generate-mock-ui: mocks `ui` scenarios only. `mcp` / `api` / `job` scenarios stay in the tree, greyed, and show "No mock". The console page and fake-API play are removed.
- play-scenarios: knows `mcp`; skipped scenarios stay in the tree with their reason; Results have a Surface column.
- e2e-test tests every surface, not only the UI:
  - ui runs in Playwright with screenshots, and api runs as Playwright requests.
  - An AI tester agent runs mcp and job scenarios and records every call.
  - New review step: a fresh agent checks every screenshot and every recorded call before the report is built. The reporter now writes run data, and `build-report.mjs` builds the one HTML.
- generate-test-cases is removed.

## 1.9.165

**generate-test-scenario is now generate-test-cases**

- The skill writes a test case file, so its name no longer clashes with "scenario" (one path of a use case).
- New files are `test-cases-<n>.md` / `test-cases-ui-<n>.md`, or `test-cases/<feature-slug>/` without a spec folder.
- e2e-test, design-feature and generate-use-case point to the new name.

## 1.9.164

**One standard for every skill: Feature → Use case → Scenario**

- Use case = one user goal (`UC1 Cut a new version`). Scenario = one path with one result (`Merge request already released`). Flow = only the flowchart and sequence diagram of a use case.
- generate-use-case: `use-cases.js` now holds `USE_CASES` (goals, `UC<n>`) and `SCENARIOS` (paths, field `useCase`). A shared step or a refusal is a scenario of its goal, not its own group. `check.js` flags the old format and a scenario titled like its use case.
- design-feature: section 03 is **Use cases**; each one's 4th view is **Scenarios (N)**. `use-cases-panels.js` is now `scenarios-panels.js`. Ids `flow-NN` → `uc-NN`.
- generate-mock-ui: one block per use case, a chip per scenario, links `#sc-<id>`. The mock's data setup is now a **state**: `shared/states.js`, `?state=`, "Mock state". `use-case-play.js` → `scenario-play.js`; `check-use-cases.js` → `check-scenarios.js`.
- generate-test-scenario and e2e-test: one test case per scenario; the report groups by use case and shows the scenario id.
- Plans made before this need a rebuild: re-run generate-use-case, then design-feature. The scripts say so instead of patching them.

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
