---
name: generate-use-case
description: Write a feature's use cases (one per user goal), their scenarios (one per rule or outcome, not per click or value, on every channel users reach it: UI, MCP, API, job) and the spec's acceptance criteria to one use-cases.js file, from a spec or idea. Use when the user says "use cases for spec 127" or "list the use cases". Data only; design-feature, generate-mock-ui, play-scenarios and e2e-test read the file.
argument-hint: <spec-folder | plan-folder | feature description> [output-folder]
---

# Use Case Generator

Turn a spec into one `use-cases.js` file: what a user can do with the feature, on every channel they use (the UI and, more and more, an AI agent over MCP), and what they should see. It is the one source for use cases and scenarios. Every skill that plays or tests the feature reads it directly, never another skill's output, and shows the same tree:

```
spec ─► generate-use-case ─► <plan>/use-cases.js          UC1 Read things
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
| Channel | where a user reaches it: `ui` (a screen), `mcp` (an AI agent calling MCP tools), `api` (REST / gRPC called directly), `job` (a script or scheduled job) | the `surface` value | mcp |
| Acceptance criterion | one Given / When / Then from the spec | `US<n> · AC<m>` | US1 · AC3 |
| Flow diagram | the steps of a use case, drawn as its flowchart and sequence diagram (not a "flow" in the basic / alternate flow sense: that is a scenario) | a diagram, not a list item | the flowchart of Cut a new version |

The file holds real example values but no mock wiring and no selectors, so it works for features with no UI too.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<spec-folder | plan-folder | feature description> [output-folder]`

Where the file goes (`<plan>`):

| Input | `<plan>` |
|-------|----------|
| output folder given | that folder |
| plan folder (has `overview.html`, from design-feature) | the plan folder |
| spec folder or spec number (`specs/<n>-*`) | `<spec-folder>/plan/` (where design-feature writes its plan) |
| feature description | `plans/<feature-slug>/` at the project root |

- `<plan>/use-cases.js` already exists → read it and update it in place. Keep every existing scenario `id` that still matches, so links from the mock, the plan and test files keep working. When the merge pass (step 2b) folds scenarios together, the merged one keeps the first id; list every removed id in the reply.
- The file is in the old format (`USE_CASE_FLOWS` + `USE_CASES`, grouped by flow `3.N`) → rewrite it in the new one: each flow that is a user goal becomes a use case, each old use case becomes a scenario with the same `id`. Move the scenarios of a flow that is not a goal (step 1).
- A file with no `channels`, no `ACCEPTANCE`, no `kind`, or MCP scenarios marked `surface: "api"` → update it in place: set `mcp`, add `channels`, `ACCEPTANCE` and `kind`, then add the missing twins. Keep every id.
- Run by design-feature → it passes `<plan>` and `.parts/brief.md`; read the brief instead of the spec. Step 1b still applies to any message, permission or example value the brief lacks.

## Hard Rules

1. **Strict JSON inside a script.** The file sets three globals, `var USE_CASES = [...]`, `var SCENARIOS = [...]` and `var ACCEPTANCE = [...]`. Each array is strict JSON (double quotes, no trailing commas, no comments inside), so a script can parse it after `var NAME = `, and a page opened from `file://` can load it with `<script src>`.
2. **Behaviour from the spec, words and values from the code.** Every scenario comes from an acceptance scenario, edge case, refusal row or functional requirement in the source. Never invent behaviour. The messages, permission strings and values in it are read from the code and seed when they exist (step 1b), because the spec drifts. Unknown copy → `TBD`.
3. **Every scenario carries a concrete, true example** (step 2, "Examples"). A reviewer playing it must be able to tell pass from fail by comparing the screen with the text. Prose alone ("The user is not allowed", "the tooltip explains why") is not enough.
4. **No mock or test details.** No mock state ids, pages, query params or selectors. Example values (versions, counts, ids, names the seed creates) are welcome; mock wiring is not. It belongs to the mock (`scenario-play.js`) and the test file.
5. **Ids are stable.** Use cases are `UC1`, `UC2`, … Scenarios are kebab-case and unique. Never reuse an id for another meaning. Other files link to `#sc-<scenario id>`.
6. Every count you report comes from `scripts/check.js`, never an estimate.
7. No absolute local paths in the file.
8. **Every channel is covered.** A use case lists every channel users reach it on (`channels`). Each rule or outcome (acceptance scenario, edge case, refusal) gets one scenario per channel of its use case, citing the same story ref. When a channel truly can't reach an outcome, the scenario says why in `na` instead (e.g. `"na": { "mcp": "ListThings has no status filter." }`). Never drop the MCP side because the UI side exists.
9. **Fewest scenarios that cover every rule.** Each scenario costs a reviewer time to play and a test to keep up. One scenario per rule or outcome, never one per click, view or value (step 2, "Split and merge").

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

### 1b. Read the code and seed for the examples

The spec says what should happen; the code says what the user really sees. Delegate this to a read-only sub-agent when the agent can, and ask for values with `file:line`:

- **Messages**: every user-facing text a scenario shows (toast, refusal box, empty state, error code + message, inline note), copied verbatim from the code. Search for the spec's wording, then read the code that answers it. Never paraphrase.
- **Roles and permissions**: which roles hold each permission the feature checks, from the seed or permission map (`DEV: has repositories.versions.read, not repositories.versions.create`). Note any upstream rule too (`legacy group BA, page 7 not writable`).
- **Example data**: what the dev seed or fixtures really create (project names, versions, merge request titles, row counts, ids), and what a real request returns.
- **Channels**: the page and route of each use case, the MCP tool and operation for it (and whether the tool shares the RPC's validation and messages), and any direct REST / gRPC call or job. An MCP refusal often carries a different code and text than the screen: copy both.
- **Controls**: for each control a scenario points at, read the component as it is now. A tooltip replaced by inline text is inline text; never write "tooltip" or "hover" without seeing it in the component.
- **Spec vs code**: every place the spec's text and the code's text differ. Use the code's text in the scenario and list each difference in the reply (step 4).
- No code yet (planning before the build) → take the values from the spec's own examples, contracts and data model, and say in the reply that the messages come from the spec.

### 2. Write `<plan>/use-cases.js`

Start from `template/use-cases.js`.

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
| `story` | user story + acceptance ids (`"US1 · AC2–4"`), or the FR / decision id. Twins on other channels cite the same ref |
| `surface` | the channel: `"ui"` (a screen), `"mcp"` (an AI agent calling an MCP tool), `"api"` (REST / gRPC called directly), `"job"` (a scheduled job, script or event). Must be in its use case's `channels` |
| `na` | optional: `{ "<channel>": "<why>" }` for each channel of the use case that has no twin of this scenario |
| `given` | optional: the start state with an example ("The owner is archived (e.g. pluto, owner 1204).") |
| `when` | the user's action or trigger with its example input ("The user cuts a version: PATCH from 2.3.2-1.") |
| `expect` | what the user should see, one line each, with the exact messages from the code in quotes and the real values. The first line is the key outcome with its example: the plan shows it |

- Write `given`, `when` and `expect` in plain words a reviewer who never read the spec can follow. Name what the user sees, not how the code works.
- An `mcp` scenario's `when` names the tool and operation with its arguments (`CreateThing {ownerId 1204, name "Third thing"}`), and its `expect` the answer or the error code and message the caller gets. Prefix its id with `mcp-` (`mcp-create-archived`), so it reads as the twin of `create-archived`.

- `ACCEPTANCE`: one entry per acceptance scenario in the spec, in spec order. design-feature shows them in its Acceptance criteria section, each with the scenarios that cite it. No spec (a feature description) → `var ACCEPTANCE = [];`.

| Field | What |
|-------|------|
| `id` | `"US1 · AC3"` |
| `given`, `when`, `then` | the spec's Given / When / Then, in plain words (`when` may be empty) |
| `channels` | the channels it applies to. Each must have at least one scenario of that surface citing this id |
| `na` | optional: `{ "<channel>": "<why>" }` for a channel of its use case it does not apply to |

**Examples.** Each scenario carries at least one concrete, true example, written as `e.g. …` or as the value itself:

| Kind | Put in the scenario |
|------|---------------------|
| any | real values: versions ("PATCH from 2.3.2-1 → 2.3.3-1"), counts ("32 rows, 2 pages at 20 a page"), statuses, ids, names the seed creates |
| any | user-facing messages in quotes, verbatim from the code ("Your legacy-platform account is not allowed to cut versions.") |
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
**Split and merge.** A scenario is one rule or outcome, not one interaction. Other values of the same rule are examples inside it, like the rows of a Gherkin examples table.

- Merge into one scenario, listing each variation with its example in `expect`:
    - the same rule with other values (another version, another count, another refused role with the same message)
    - another click, view, tab or sort from the same start state, with the same kind of result
    - exceptions with the same error code and message, whatever the trigger: name each trigger in `when` ("e.g. an empty name, or one over 64 characters")
- Keep apart only when one of these changes:
    - the rule (another AC, FR or decision)
    - the kind (`basic`, `alternate`, `exception`)
    - the error code or the user-facing message
- A spec scenario with two different outcomes is two scenarios. A title with "and" or "or" that joins two rules is two scenarios ("No changelog", "No previous version"); one that joins two values of one rule is fine.
- Each channel merges by these rules on its own. MCP may keep apart two refusals the screen shows with one message, or the other way round.

### 2b. Merge pass

- Group each use case's scenarios by channel, kind and story ref; for exceptions, also by error code and message.
- A group with more than one scenario becomes one: keep the first id, name the rule in `title`, and list each variation with its example in `when` and `expect`. Keep the union of `given` and `story`.
- More than 12 scenarios on one channel of a use case means missed merges or too many rules for one goal. Merge again; if it stays above 12, say so in the reply and suggest splitting the use case.

### 3. Check

- `node <this skill dir>/scripts/check.js <plan>/use-cases.js`. It checks strict JSON, `UC<n>` use case ids, required fields, unique kebab-case scenario ids, every `useCase` in `USE_CASES`, a known `kind` with at most one `basic` per use case and channel, a known `surface` that is in its use case's `channels`, every channel with at least one scenario, every acceptance criterion covered on each of its `channels`, no scenario titled like its use case, no mock fields in a scenario (`state`, `page`, `steps`, …), and that every use case has a scenario or a `none` sentence. It prints the scenario count per use case and channel, the count per kind, and the acceptance coverage.
- It warns when a scenario has no `kind`, or a channel of a use case has no `basic` scenario. Add the kind.
- It warns when two scenarios share use case, channel, kind and story ref (and, for exceptions, the first quoted message), and when a use case has more than 12 scenarios on one channel. Merge them (step 2b), or say in the reply why they stay apart.
- It warns when a scenario has no twin (same story ref) on another channel of its use case and no `na` reason, when an `api` scenario talks about MCP, and when an acceptance criterion skips a channel of its use case with no `na`. Add the twin, or the reason.
- It also warns (exit code stays 0) when a scenario's `expect` has no quoted message, number or identifier, and when a scenario that talks about a role, a permission or "not allowed" names no permission string. Fix each warning by adding the example from step 1b; leave one only when the scenario truly has no value to show, and say why in the reply.
- Fix every error and re-run until it exits 0.
- Every acceptance scenario, edge case and refusal row in the source has a scenario. List any you left out, with why.

### 4. Confirm

- Output: `✅ Use cases written at: {path}`.
- The totals, the scenario count per use case and channel, and the acceptance coverage, copied from `check.js` output, and any warning left with its reason.
- **Merged**: each removed scenario id and the id it merged into, when an existing file was updated. Mock and test files that linked to a removed id need its new id.
- **Channel gaps**: every `na` reason, one line each, so the user can disagree.
- **Spec vs code**: each scenario where the spec's text differs from the code's, with both texts and the code's `file:line`. Say "none found" when there are none, or "no code yet: messages from the spec".
- Next steps, one line each: design-feature shows the acceptance criteria and each use case's scenarios, generate-mock-ui mocks the `ui` scenarios, play-scenarios plays every scenario on the running app, e2e-test runs every scenario as an automated test.
