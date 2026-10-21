---
name: generate-use-case
description: Write a feature's use cases (one per user goal), their scenarios (one per rule or outcome, on every channel users reach it - UI, MCP, API, job) and the spec's acceptance criteria to one use-cases.js file. Scenarios are traced in the code, each with file:line evidence; where the spec and the code disagree, the code wins and the gap is listed. Use when the user says "use cases for spec 127", "list the use cases", or "verify the use cases" after a merge or refactor. Data only; design-feature, generate-mock-ui, play-scenarios and e2e-test read the file.
argument-hint: [verify] <spec-folder | plan-folder | use-cases.js | feature description> [output-folder]
---

# Use Case Generator

Turn a spec into one `use-cases.js` file: what a user can do with the feature, on every channel they use (the UI and, more and more, an AI agent over MCP), and what the real code shows them. The spec says which goals to cover and what was intended; the code says what happens. It is the one source for use cases and scenarios. Every skill that plays or tests the feature reads it directly, never another skill's output, and shows the same tree:

```
spec + code ─► generate-use-case ─► <plan>/use-cases.js          UC1 Read things
                                        │                          ├─ read-list        ui
                                        │                          └─ mcp-list         mcp
                                        │                         UC2 Create a thing
                                        │                          └─ ...
                                        ├─► design-feature      Acceptance criteria section + each use case's Scenarios view
                                        ├─► generate-mock-ui    ui scenarios as mock screens; others show "No mock"
                                        ├─► play-scenarios      every scenario on the running app (ui by hand, mcp / api / job by an AI agent)
                                        └─► e2e-test            every scenario as an automated test, one report in the same tree
```

The words, used the same way in every skill:

| Word | Meaning | Named as | Example |
|------|---------|----------|---------|
| Feature | what the spec delivers | a noun | Legacy new version |
| Use case | one goal a user wants to reach, with every path to it | verb + object | Cut a new version |
| Scenario | one rule or outcome of a use case, on one channel; other values, clicks or views of the same rule are its examples, not more scenarios | the condition or the result | Merge request already released |
| Kind | how a scenario ends: `basic` (the main path to the goal, one per use case and channel), `alternate` (another path that still reaches the goal), `exception` (the goal is not reached: refusal, error, timeout) | the `kind` value | exception |
| Core | a scenario to play first: every `basic`, plus the main alternates and the errors users hit most | `"core": true` | Core |
| Channel | where a user reaches it: `ui` (a screen), `mcp` (an AI agent calling MCP tools), `api` (REST / gRPC called directly), `job` (a script or scheduled job) | the `surface` value | mcp |
| Acceptance criterion | one Given / When / Then from the spec | `US<n> · AC<m>` | US1 · AC3 |
| Evidence | where a scenario lives in the code: its entry point, the gate that lets the actor in or stops them, and the code behind each `expect` line, as repo-relative `path:line` | `evidence` | `apps/web/lib/config/routes.ts:452` |
| Mismatch | one place where the spec and the code disagree. The scenario follows the code; the mismatch says which side to fix | `MISMATCHES` entry | M1 |
| Flow diagram | the steps of a use case, drawn as its flowchart and sequence diagram (not a "flow" in the basic / alternate flow sense: that is a scenario) | a diagram, not a list item | the flowchart of Cut a new version |

The file holds real example values but no mock wiring and no selectors, so it works for features with no UI too.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `[verify] <spec-folder | plan-folder | use-cases.js | feature description> [output-folder]`

- Starts with `verify`, or the user asks to re-check the use cases after a merge or refactor → **verify mode** (end of this file). It changes nothing until the user agrees.

Where the file goes (`<plan>`):

| Input | `<plan>` |
|-------|----------|
| output folder given | that folder |
| plan folder (has `overview.html`, from design-feature) | the plan folder |
| spec folder or spec number (`specs/<n>-*`) | `<spec-folder>/plan/` (where design-feature writes its plan) |
| feature description | `plans/<feature-slug>/` at the project root |

- `<plan>/use-cases.js` already exists → read it and update it in place. Keep every existing scenario `id` that still matches, so links from the mock, the plan and test files keep working. When the merge pass (step 2b) folds scenarios together, the merged one keeps the first id; list every removed id in the reply.
- No `<plan>/use-cases.js` yet, but an earlier spec changed the same feature (its `specs/*/plan/use-cases.js` has use cases with the same goals) → start from the newest such file. Copy the use cases and scenarios this spec keeps, with their ids, then change, add and drop scenarios as this spec says. Number the use cases from `UC1` again, in this spec's order. Name the file you started from and list every dropped id in the reply. Reason: `e2e-test` finds the existing tests by scenario id and updates them in place; a new id for an unchanged rule makes it add a duplicate test.
- The file is in the old format (`USE_CASE_FLOWS` + `USE_CASES`, grouped by flow `3.N`) → rewrite it in the new one: each flow that is a user goal becomes a use case, each old use case becomes a scenario with the same `id`. Move the scenarios of a flow that is not a goal (step 1).
- A file with no `channels`, no `ACCEPTANCE`, no `kind`, or MCP scenarios marked `surface: "api"` → update it in place: set `mcp`, add `channels`, `ACCEPTANCE` and `kind`, then add the missing twins. Keep every id.
- A file with scenarios but no `evidence` (written before code tracing) → trace each scenario as in step 1b and add its `evidence`, keeping its id. A scenario whose trace shows other behaviour is rewritten to the code's behaviour, and the gap goes in `MISMATCHES`.
- Run by design-feature → it passes `<plan>` and `.parts/brief.md`; read the brief for the goals and the intent. Step 1b still applies: every scenario is traced in the code when the code exists.

## Hard Rules

1. **Strict JSON inside a script.** The file sets four globals, `var USE_CASES = [...]`, `var SCENARIOS = [...]`, `var ACCEPTANCE = [...]` and `var MISMATCHES = [...]`. Each array is strict JSON (double quotes, no trailing commas, no comments inside), so a script can parse it after `var NAME = `, and a page opened from `file://` can load it with `<script src>`.
2. **The code is the source of truth.** The spec picks the goals and says what was intended. What a scenario says happens is what the code does, traced from its entry point (step 1b), on every channel. Specs drift and get written before the code. A scenario copied from spec prose can describe a screen the actor never reaches. Example: the spec says a DEV sees "Changelog not loaded / Forbidden" on the Create ticket form, but the route needs `deployments.tickets.create`, so DEV never sees the form. Never invent behaviour. When the code does not exist yet, see rule 5.
3. **Every scenario carries evidence.** `evidence.entry` is where the actor starts on that channel. `evidence.gate` is the check that lets them in or stops them. `evidence.expect` holds one ref per `expect` line: the code that produces that line. Refs are repo-relative `path:line` or `path:from-to`. `check.js` fails on a missing entry, a missing file or a line out of range.
4. **Quoted text is copied from the code.** In `expect`, double quotes hold only text the code holds: messages, labels, statuses, error reasons. Copy them from the source, never from the spec. Write user input and example values without quotes (name Third thing, version 1.3.0-1). `check.js` searches the repo for each quoted string and fails when it is not there. Values inside a quote may differ from the code's placeholders (`"Version 2.3.3-1 was created."` matches `` `Version ${v} was created.` ``).
5. **Spec and code disagree → keep the code, list the gap.** The scenario describes the code. The gap goes in `MISMATCHES` with the spec ref, both texts, the code evidence and the side to fix. Never resolve it silently, either way. No code yet (design phase) → write the scenario from the spec with `"source": "spec"` and no evidence. `check.js` warns, and verify mode must pass before play-scenarios or e2e-test use it.
6. **Roles and permissions come from data**: seed migrations, role-permission tables and permission constants (`evidence.roles`). Never from spec prose ("only QA can …").
7. **Every scenario carries a concrete, true example** (step 2, "Examples"). A reviewer playing it must be able to tell pass from fail by comparing the screen with the text. Prose alone ("The user is not allowed", "the tooltip explains why") is not enough.
8. **No mock or test details.** No mock state ids, pages, query params or selectors. Example values (versions, counts, ids, names the seed creates) are welcome; mock wiring is not. It belongs to the mock (`scenario-play.js`) and the test file.
9. **Ids are stable.** Use cases are `UC1`, `UC2`, … (numbered per file). Scenarios are kebab-case and unique, and keep their id across specs while the rule is the same. Never reuse an id for another meaning. Other files link to `#sc-<scenario id>`.
10. Every count you report comes from `scripts/check.js`, never an estimate.
11. No absolute local paths in the file.
12. **Every channel is covered.** A use case lists every channel users reach it on (`channels`). Each rule or outcome (acceptance scenario, edge case, refusal) gets one scenario per channel of its use case, citing the same story ref. When a channel truly can't reach an outcome, the scenario says why in `na` instead (e.g. `"na": { "mcp": "ListThings has no status filter." }`). Never drop the MCP side because the UI side exists.
13. **Fewest scenarios that cover every rule.** Each scenario costs a reviewer time to play and a test to keep up. One scenario per rule or outcome, never one per click, view or value (step 2, "Split and merge").
14. **One scenario = one screen = one result.** A scenario plays as one start state on one screen. Never split it into parts. A path that needs another screen, seed or data setup is its own scenario.
15. **Core is the only priority.** Mark the scenarios to play first with `"core": true`. No other priority field (no frequency, impact, priority or P0 / P1 / P2).
16. **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

## Workflow

### 1. Read the source

- Spec folder → every markdown file directly under it (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, …). Skip `PRIVATE/` unless a file there is clearly part of the requirement.
- Plan folder → `overview.html` for the use case numbers and names, plus the spec it names.
- Feature description → it is the requirement. Mark every unknown as `TBD`.
- List:
    - **Use cases**: each goal a user wants to reach. Number them `UC1`, `UC2`, … in the order a reader meets them. They are section 4 of a design-feature plan, so a plan made later uses the same numbers. A plan already exists → use its numbers and names exactly.
        - A step shared by several goals ("Open the form") is not a use case. Its scenarios go under the goal they belong to.
        - Refusals and timeouts are not a use case. Each one is a scenario of the goal it blocks.
    - **Acceptance scenarios**, **edge cases**, **refusal rows** and testable **functional requirements**, each with its id (`US1 · AC2`, `FR-003`, a decision id) and the exact user-facing message.
    - **Channels**: for each use case, every way a user reaches it: a screen (`ui`), an MCP tool (`mcp`), a REST / gRPC call made directly (`api`), a script or job (`job`). Read them from the spec and confirm them in the code (step 1b): a page route, an MCP tool name, an RPC.
- This list is what to cover and what was intended. The scenarios themselves come from the trace (step 1b).

### 1b. Trace the code

For each use case and channel, find the entry point and follow it to every outcome. Delegate each channel (or each use case on a big feature) to a read-only sub-agent when the agent can, and ask for `path:line` on every fact. Tell it the spec is only a list of goals.

| Channel | Trace |
|---------|-------|
| `ui` | route definition → route guard (how the app picks the guard for this path, not only the route's own entry) → page → each control's gate (render condition, `disabled`, permission hook) → the call it makes → each answer's rendering |
| `api` | HTTP / gRPC route → permission map entry → handler → validation → service branches → each error code and message |
| `mcp` | tool → operation → the handler it calls (usually the same as `api`) → the same branches; note any MCP-only wrapper text |
| `job` | command or schedule → entry function → branches → output lines and exit code |

- **Branches → scenarios.** Every reachable branch with a distinct outcome (another result, error code, message or screen) is a scenario candidate. Then merge by the rules in step 2.
- **Reachability first.** Before you write a scenario, prove the actor reaches its first step on that channel: route permission, nav visibility, button permission, API / MCP permission map, and the role seed. Can't reach it → the scenario is the refusal the actor really gets there (e.g. the Forbidden page, 403 `PERMISSION_DENIED` "…"), with that gate as `evidence.gate`, or an `na` reason that cites the gate: `"na": { "ui": "DEV cannot open Create ticket: the route needs deployments.tickets.create (apps/web/lib/config/routes.ts:452)." }`. A spec outcome behind a gate the actor can't pass is never their scenario.
- **Roles from data.** Which roles hold each permission: read the seed migrations, role-permission tables and permission constants (`evidence.roles`). `DEV: has repositories.versions.read, not repositories.versions.create`. Note any upstream rule too (`legacy group BA, page 7 not writable`).
- **Strings.** Copy every message, label, status, error reason and HTTP code the scenario quotes from the code at its `evidence.expect` line. For text built at run time (`fmt.Sprintf`, template strings), copy what the user sees with the example values filled in.
- **Example data**: what the dev seed or fixtures really create (project names, versions, row counts, ids), and what a real request returns.
- **Controls**: read each control as the component renders it now. A tooltip replaced by inline text is inline text; never write "tooltip" or "hover" without seeing it in the component.
- **Mismatches.** Every place the spec's intent or text differs from the code's (behaviour, gate, message, status, field): one `MISMATCHES` entry (step 2). Suggest `fix: "spec"` when the code looks deliberate (newer, tested, consistent with the rest), `fix: "code"` when the code looks like a bug or an unbuilt requirement.
- **e2e run vs scenario**: when an e2e-test run shows the code's message, status or list differs from a scenario (e.g. 200 vs 201, an RBAC refusal string), update the scenario to the code's text and its evidence.
- **No code yet** (planning before the build) → write each scenario from the spec's own examples, contracts and data model with `"source": "spec"` and no `evidence`. Code for some channels only → trace those; mark the rest `"source": "spec"`.

### 2. Write `<plan>/use-cases.js`

Start from `template/use-cases.js`. Copy `template/use-cases.types.d.ts` next to it, unchanged: it is the type of every field below. Write `MISMATCHES` too, empty (`[]`) when there are none.

- Keep the `// @ts-check` line and the `/** @type {import("./use-cases.types").…[]} */` line above each list. An editor then flags a wrong field or value.
- Never add a field the type does not have. `check.js` rejects it.

- `USE_CASES`: one entry per use case, in order.

| Field | What |
|-------|------|
| `id` | `"UC1"`, `"UC2"`, … |
| `title` | verb + object ("Cut a new version"), the same everywhere (plan rail, use case heading, mock) |
| `refs` | user story + requirement ids, joined by ` · ` |
| `channels` | every channel users reach it on: `["ui", "mcp"]`, `["job"]`, … |
| `none` | only for a use case with no scenario: one sentence saying why |

- `SCENARIOS`: one entry per rule or outcome (an acceptance scenario, edge case or refusal row) **on each channel of its use case**, grouped by use case, in use case order. A requirement no scenario covers gets its own scenario. Inside a use case, keep a channel's twins next to each other or keep all ui first, then mcp; every skill shows them in this order.

| Field | What |
|-------|------|
| `id` | kebab-case, unique (`create-archived-owner`) |
| `useCase` | a `USE_CASES` id |
| `title` | short, the path or its result ("From a merged merge request", "Merge request already released"); never the use case title again |
| `kind` | `"basic"`, `"alternate"` or `"exception"` (see below). Twins on other channels share it |
| `core` | optional: `true` marks a scenario to play first (see below). Leave it out for the rest |
| `story` | user story + acceptance ids (`"US1 · AC2–4"`), or the FR / decision id. Twins on other channels cite the same ref |
| `surface` | the channel: `"ui"` (a screen), `"mcp"` (an AI agent calling an MCP tool), `"api"` (REST / gRPC called directly), `"job"` (a scheduled job, script or event). Must be in its use case's `channels` |
| `na` | optional: `{ "<channel>": "<why>" }` for each channel of the use case that has no twin of this scenario |
| `given` | optional: the start state with an example ("The owner is archived (e.g. pluto, owner 1204).") |
| `when` | the user's action or trigger with its example input ("The user cuts a version: PATCH from 2.3.2-1.") |
| `expect` | what the user should see, one line each, with the exact messages from the code in quotes and the real values. The first line is the key outcome with its example: the plan shows it |
| `source` | optional: `"spec"` only when the code does not exist yet (rule 5). Left out = `"code"` |
| `evidence` | `{ "entry": "<path:line>", "gate": "<path:line>", "roles": "<path:line>", "expect": ["<path:line>", …] }`: the entry point on this channel, the gate that lets the actor in or stops them, the seed or role row behind the actor's permission (when the scenario names one), and one ref per `expect` line, in order. Required unless `source` is `"spec"` |

- Write `given`, `when` and `expect` in plain words a reviewer who never read the spec can follow. Name what the user sees, not how the code works.
- An `mcp` scenario's `when` names the tool and operation with its arguments (`CreateThing {ownerId 1204, name "Third thing"}`), and its `expect` the answer or the error code and message the caller gets. Prefix its id with `mcp-` (`mcp-create-archived`), so it reads as the twin of `create-archived`.

- `ACCEPTANCE`: one entry per acceptance scenario in the spec, in spec order. design-feature shows them in its Acceptance criteria section, each with the scenarios that cite it. No spec (a feature description) → `var ACCEPTANCE = [];`.

| Field | What |
|-------|------|
| `id` | `"US1 · AC3"` |
| `given`, `when`, `then` | the spec's Given / When / Then, in plain words (`when` may be empty) |
| `channels` | the channels it applies to. Each must have at least one scenario of that surface citing this id |
| `na` | optional: `{ "<channel>": "<why>" }` for a channel of its use case it does not apply to |

- `MISMATCHES`: one entry per gap between spec and code, in spec order.

| Field | What |
|-------|------|
| `id` | `"M1"`, `"M2"`, … |
| `spec` | the spec's ref: `"FR-017"`, `"US1 · AC3"` |
| `differs` | both sides, quoted: `spec says DEV sees "Changelog not loaded" with the Forbidden error on Create ticket; the code shows DEV the Forbidden page (the route needs deployments.tickets.create).` |
| `evidence` | the code that shows it: `["apps/web/lib/config/routes.ts:452"]` |
| `fix` | `"spec"` (change the spec to match the code) or `"code"` (change the code to match the spec) |
| `scenarios` | optional: the scenario ids that follow the code here |

**Examples.** Each scenario carries at least one concrete, true example, written as `e.g. …` or as the value itself:

| Kind | Put in the scenario |
|------|---------------------|
| any | real values: versions ("PATCH from 2.3.2-1 → 2.3.3-1"), counts ("32 rows, 2 pages at 20 a page"), statuses, ids, names the seed creates |
| any | user-facing messages in quotes, verbatim from the code ("Your legacy-platform account is not allowed to cut versions."). Only code text goes in quotes |
| role or permission | the role **and** the exact permission strings, in `given`: "DEV: has repositories.versions.read, not repositories.versions.create". Add any upstream rule ("legacy group BA, page 7 not writable") |
| `mcp` / `api` | a short request → answer: "GetRepositoryVersions {repositoryId 1204, page 1, limit 20} → 20 entities, total 32, each source THANOS_LEGACY" |
| `job` | the command and the script's real output line: "summary: LINKED=1 ALREADY_LINKED=0 CONFLICT=0" |

Before and after, from a real plan:

| Field | Prose only | With an example |
|-------|-----------|-----------------|
| `given` | The user is not allowed. | The user is DEV: has repositories.versions.read but not repositories.versions.create (only INFRA and QA hold it). |
| `expect` | New Revision is disabled; its tooltip says why. | The New Revision card is disabled; under its title, in amber: "This repository has no released line yet. Cut a new version first." |
| `expect` | The version is created. | Toast: "Version 2.3.3-1 was created."; 2.3.3-1 tops the list as PENDING. |

- **Kind.** Ask: did the user reach the goal?
    - On the main path, with nothing special → `basic`. Exactly one per use case and channel.
    - Another way: another option, a filter, empty data, a retry that works → `alternate`.
    - No: a refusal, a validation error, an unreachable service → `exception`.

- **Core.** Set `"core": true` on the scenarios a reviewer plays first:
    - every `basic` scenario (`check.js` errors when one lacks it)
    - the main alternates: the other paths most users take (e.g. the empty state, the most used filter)
    - the errors users hit most (e.g. a missing permission, the most common validation error), not rare outages
    - Aim for about 15–25% of all scenarios. Twins on other channels usually share it.

**Split and merge.** One scenario = one outcome = one screen. A scenario is one rule or outcome, not one interaction, and it plays as one start state on one screen. Other values of the same rule are examples inside it, like the rows of a Gherkin examples table.

- Merge into one scenario only when the variations share the same screen and the same data, and differ by a click or a value on that screen. List each variation with its example in `expect`:
    - the same rule with other values (another version, another count, another refused role with the same message)
    - another click, view, tab or sort from the same start state, with the same kind of result (e.g. open tab A or tab B of one form)
    - exceptions with the same error code and message from the same start state: name each trigger in `when` ("e.g. an empty name, or one over 64 characters")
- Keep apart when one of these changes:
    - the rule (another AC, FR or decision)
    - the kind (`basic`, `alternate`, `exception`)
    - the error code or the user-facing message
    - the screen, the seed or the data setup (`given`): a path that needs any of them is its own scenario, with its own id, title, `given`, `when` and `expect`
- Never write parts. An `expect` line never starts with "Part 1", "Part 2", …; `check.js` warns when one does. Split it into scenarios instead.
- A spec scenario with two different outcomes is two scenarios. A title with "and" or "or" that joins two rules is two scenarios ("No changelog", "No previous version"); one that joins two values of one rule is fine.
- Each channel merges by these rules on its own. MCP may keep apart two refusals the screen shows with one message, or the other way round.

### 2b. Merge pass

- Group each use case's scenarios by channel, kind and story ref; for exceptions, also by error code and message.
- A group with more than one scenario becomes one only when its scenarios share one screen and one data setup: keep the first id, name the rule in `title`, and list each variation with its example in `when` and `expect`. Keep the union of `story`. A group whose `given` differs stays apart.
- More than 12 scenarios on one channel of a use case means missed merges or too many rules for one goal. Merge again; if it stays above 12, say so in the reply and suggest splitting the use case.

### 3. Check

- `node <this skill dir>/scripts/check.js <plan>/use-cases.js`. It checks strict JSON, `UC<n>` use case ids, required fields, no field outside `use-cases.types.d.ts`, unique kebab-case scenario ids, every `useCase` in `USE_CASES`, a known `kind` with at most one `basic` per use case and channel, every `basic` marked `"core": true`, a known `surface` that is in its use case's `channels`, every channel with at least one scenario, every acceptance criterion covered on each of its `channels`, no scenario titled like its use case, no mock fields in a scenario (`state`, `page`, `parts`, `steps`, …), and that every use case has a scenario or a `none` sentence. It prints the scenario count per use case and channel, the count per kind, the core count per use case and channel, and the acceptance coverage.
- It warns when more than 30% of the scenarios are core. Keep core for every basic, the main alternates and the errors users hit most.
- It warns when an `expect` line starts with "Part 1", "Part 2", …. Split each part into its own scenario.
- It warns when a scenario has no `kind`, or a channel of a use case has no `basic` scenario. Add the kind.
- It warns when two scenarios share use case, channel, kind and story ref (and, for exceptions, the first quoted message), and when a use case has more than 12 scenarios on one channel. Merge them (step 2b), or say in the reply why they stay apart.
- It warns when a scenario has no twin (same story ref) on another channel of its use case and no `na` reason, when an `api` scenario talks about MCP, and when an acceptance criterion skips a channel of its use case with no `na`. Add the twin, or the reason.
- It fails on a code scenario with no `evidence`, an evidence or `na` ref whose file is missing or whose line is out of range, an absolute path, and `evidence.expect` not holding one ref per `expect` line. Fix the ref, or trace again: a moved line is drift.
- It fails when a quoted string in a code scenario's `expect` is not in the code (outside `specs/`, `docs/`, tests and the plan folder). Copy the code's text; put the spec's text in `MISMATCHES`; take user input and example values out of the quotes.
- It checks `MISMATCHES` fields, refs and scenario ids, and prints each entry.
- It warns on every `"source": "spec"` scenario (`--strict` makes it an error; play-scenarios and e2e-test run it so), and on a scenario that names a permission with no `evidence.roles`.
- It finds the repo root by walking up from the file to `.git`. Pass `--root <repo>` when the file is outside the repo.
- It also warns (exit code stays 0) when a scenario's `expect` has no quoted message, number or identifier, and when a scenario that talks about a role, a permission or "not allowed" names no permission string. Fix each warning by adding the example from step 1b; leave one only when the scenario truly has no value to show, and say why in the reply.
- Fix every error and re-run until it exits 0.
- Every acceptance scenario, edge case and refusal row in the source has a scenario. List any you left out, with why.

### 4. Confirm

- Output: `✅ Use cases written at: {path}`.
- The totals, the scenario count per use case and channel, the core count, and the acceptance coverage, copied from `check.js` output, and any warning left with its reason.
- **Core**: each core scenario, one line each (`UC1 · read-list (ui, basic)`), so the user can add or drop one.
- **Merged**: each removed scenario id and the id it merged into, when an existing file was updated. Mock and test files that linked to a removed id need its new id.
- **Channel gaps**: every `na` reason, one line each, so the user can disagree.
- **Mismatches**: every `MISMATCHES` entry, one line each: `M1 · FR-017 · fix the spec: <differs> (<evidence>)`. They need a decision, so put them last before next steps. Say "none found" when there are none, or "no code yet: N scenarios from the spec" when `source: "spec"` was used.
- **Evidence**: the evidence line from `check.js` (`evidence: N of M scenarios; …`).
- "Scenarios name seed records; e2e-test runs them on copies named `<seed name>-e2e<N>-<tag>`.
- Next steps, one line each: design-feature shows the acceptance criteria and each use case's scenarios, generate-mock-ui mocks the `ui` scenarios, play-scenarios plays every scenario on the running app, e2e-test runs every scenario as an automated test.

## Verify mode

Re-check an existing `use-cases.js` against the current code, after a merge, a refactor or the build of a design-phase feature. It reports first and changes the file only when the user agrees.

1. Find the file: a `use-cases.js` path, or `<plan>/use-cases.js` by the table under User Input.
2. Run `check.js` on it. Every missing file, out-of-range line and quoted string not found is drift.
3. Re-trace each scenario from its `evidence.entry` (step 1b), one sub-agent per use case when the agent can. For each, check:
    - **entry**: the route, RPC, tool or command still exists and still leads to this behaviour.
    - **gate**: the actor still reaches (or is still refused) the first step: route guard, permission map, button gate, role seed.
    - **expect**: each line still holds. Every quoted string is still shown at that point; codes and statuses are the same.
    - **moved**: the same code at another line → new ref only.
    - `"source": "spec"`: the code now exists → trace it, write its evidence and drop `source`; behaviour that differs from the spec goes in `MISMATCHES`.
    - New branches the code gained with no scenario → candidates.
    - Each `MISMATCHES` entry: still true, fixed (drop it), or changed.
4. Report, one line per changed scenario, grouped: **Drifted** (behaviour, gate or string changed: what changed, the new evidence, the proposed `given` / `when` / `expect`), **Moved** (refs only), **Now traced** (was `source: "spec"`), **New candidates**, **Mismatches** (added, dropped, changed). End with the count of scenarios still OK.
5. Ask to apply (use AskUserQuestion when the agent has it: apply all, refs only, or none). Apply → edit the file, keep every id, run `check.js` until it exits 0, and give step 4's reply. Ids a test or the mock links to stay; a scenario whose rule is gone is listed for removal, not removed silently.
