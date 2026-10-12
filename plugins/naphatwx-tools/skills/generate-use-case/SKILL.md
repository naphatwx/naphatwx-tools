---
name: generate-use-case
description: Write a feature's use cases (one per user goal) and their scenarios (one per acceptance scenario, edge case and refusal) to one use-cases.js file, from a spec or idea. Use when the user says "use cases for spec 127" or "list the use cases". Data only; design-feature, generate-mock-ui, play-scenarios and generate-test-cases read the file.
argument-hint: <spec-folder | plan-folder | feature description> [output-folder]
---

# Use Case Generator

Turn a spec into one `use-cases.js` file: what a user can do with the feature and what they should see. It is the one source for use cases and scenarios. Other skills read it and never write their own:

```
spec ─► generate-use-case ─► <plan>/use-cases.js
                                 ├─► design-feature          each use case's "Scenarios" view
                                 ├─► generate-mock-ui        adds how to play each scenario (mock/shared/scenario-play.js)
                                 ├─► play-scenarios          plays each scenario on the running app (live/live.js)
                                 └─► generate-test-cases  one test case per scenario, same id ─► e2e-test report
```

The words, used the same way in every skill:

| Word | Meaning | Named as | Example |
|------|---------|----------|---------|
| Feature | what the spec delivers | a noun | Legacy new version |
| Use case | one goal a user wants to reach, with every path to it | verb + object | Cut a new version |
| Scenario | one path through a use case, with one result | the condition or the result | Merge request already released |
| Flow | the steps of a use case, drawn as its flowchart and sequence diagram | a diagram, not a list item | the flowchart of Cut a new version |

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

- `<plan>/use-cases.js` already exists → read it and update it in place. Keep every existing scenario `id` that still matches, so links from the mock, the plan and test files keep working.
- The file is in the old format (`USE_CASE_FLOWS` + `USE_CASES`, grouped by flow `3.N`) → rewrite it in the new one: each flow that is a user goal becomes a use case, each old use case becomes a scenario with the same `id`. Move the scenarios of a flow that is not a goal (step 1).
- Run by design-feature → it passes `<plan>` and `.parts/brief.md`; read the brief instead of the spec. Step 1b still applies to any message, permission or example value the brief lacks.

## Hard Rules

1. **Strict JSON inside a script.** The file sets two globals, `var USE_CASES = [...]` and `var SCENARIOS = [...]`. Each array is strict JSON (double quotes, no trailing commas, no comments inside), so a script can parse it after `var NAME = `, and a page opened from `file://` can load it with `<script src>`.
2. **Behaviour from the spec, words and values from the code.** Every scenario comes from an acceptance scenario, edge case, refusal row or functional requirement in the source. Never invent behaviour. The messages, permission strings and values in it are read from the code and seed when they exist (step 1b), because the spec drifts. Unknown copy → `TBD`.
3. **Every scenario carries a concrete, true example** (step 2, "Examples"). A reviewer playing it must be able to tell pass from fail by comparing the screen with the text. Prose alone ("The user is not allowed", "the tooltip explains why") is not enough.
4. **No mock or test details.** No mock state ids, pages, query params or selectors. Example values (versions, counts, ids, names the seed creates) are welcome; mock wiring is not. It belongs to the mock (`scenario-play.js`) and the test file.
5. **Ids are stable.** Use cases are `UC1`, `UC2`, … Scenarios are kebab-case and unique. Never reuse an id for another meaning. Other files link to `#sc-<scenario id>`.
6. Every count you report comes from `scripts/check.js`, never an estimate.
7. No absolute local paths in the file.

## Workflow

### 1. Read the source

- Spec folder → every markdown file directly under it (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, …). Skip `PRIVATE/` unless a file there is clearly part of the requirement.
- Plan folder → `overview.html` for the use case numbers and names, plus the spec it names.
- Feature description → it is the requirement. Mark every unknown as `TBD`.
- List:
    - **Use cases**: each goal a user wants to reach. Number them `UC1`, `UC2`, … in the order a reader meets them. They are section 3 of a design-feature plan, so a plan made later uses the same numbers. A plan already exists → use its numbers and names exactly.
        - A step shared by several goals ("Open the form") is not a use case. Its scenarios go under the goal they belong to.
        - Refusals and timeouts are not a use case. Each one is a scenario of the goal it blocks.
    - **Acceptance scenarios**, **edge cases**, **refusal rows** and testable **functional requirements**, each with its id (`US1 · AC2`, `FR-003`, a decision id) and the exact user-facing message.

### 1b. Read the code and seed for the examples

The spec says what should happen; the code says what the user really sees. Delegate this to a read-only sub-agent when the agent can, and ask for values with `file:line`:

- **Messages**: every user-facing text a scenario shows (toast, refusal box, empty state, error code + message, inline note), copied verbatim from the code. Search for the spec's wording, then read the code that answers it. Never paraphrase.
- **Roles and permissions**: which roles hold each permission the feature checks, from the seed or permission map (`DEV: has repositories.versions.read, not repositories.versions.create`). Note any upstream rule too (`legacy group BA, page 7 not writable`).
- **Example data**: what the dev seed or fixtures really create (project names, versions, merge request titles, row counts, ids), and what a real request returns.
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
| `none` | only for a use case with no scenario: one sentence saying why |

- `SCENARIOS`: one entry per acceptance scenario, edge case and refusal row, grouped by use case, in use case order. A requirement no scenario covers gets its own scenario.

| Field | What |
|-------|------|
| `id` | kebab-case, unique (`create-archived-owner`) |
| `useCase` | a `USE_CASES` id |
| `title` | short, the path or its result ("From a merged merge request", "Merge request already released"); never the use case title again |
| `story` | user story + acceptance ids (`"US1 · AC2–4"`), or the FR / decision id |
| `surface` | where the user meets it: `"ui"` (a screen), `"api"` (an API, RPC or MCP call), `"job"` (a scheduled job, script or event) |
| `given` | optional: the start state with an example ("The owner is archived (e.g. pluto, owner 1204).") |
| `when` | the user's action or trigger with its example input ("The user cuts a version: PATCH from 2.3.2-1.") |
| `expect` | what the user should see, one line each, with the exact messages from the code in quotes and the real values. The first line is the key outcome with its example: the plan shows it |

- Write `given`, `when` and `expect` in plain words a reviewer who never read the spec can follow. Name what the user sees, not how the code works.

**Examples.** Each scenario carries at least one concrete, true example, written as `e.g. …` or as the value itself:

| Kind | Put in the scenario |
|------|---------------------|
| any | real values: versions ("PATCH from 2.3.2-1 → 2.3.3-1"), counts ("32 rows, 2 pages at 20 a page"), statuses, ids, names the seed creates |
| any | user-facing messages in quotes, verbatim from the code ("Your legacy-platform account is not allowed to cut versions.") |
| role or permission | the role **and** the exact permission strings, in `given`: "DEV: has repositories.versions.read, not repositories.versions.create". Add any upstream rule ("legacy group BA, page 7 not writable") |
| `api` | a short request → answer: "GetRepositoryVersions {repositoryId 1204, page 1, limit 20} → 20 entities, total 32, each source THANOS_LEGACY" |
| `job` | the command and the script's real output line: "summary: LINKED=1 ALREADY_LINKED=0 CONFLICT=0" |

Before and after, from a real plan:

| Field | Prose only | With an example |
|-------|-----------|-----------------|
| `given` | The user is not allowed. | The user is DEV: has repositories.versions.read but not repositories.versions.create (only INFRA and QA hold it). |
| `expect` | New Revision is disabled; its tooltip says why. | The New Revision card is disabled; under its title, in amber: "This repository has no released line yet. Cut a new version first." |
| `expect` | The version is created. | Toast: "Version 2.3.3-1 was created."; 2.3.3-1 tops the list as PENDING. |

- One scenario = one outcome. A spec scenario with two different outcomes is two scenarios.
- A title with "and" or "or" usually covers two paths. Split it ("No changelog", "No previous version").

### 3. Check

- `node <this skill dir>/scripts/check.js <plan>/use-cases.js`. It checks strict JSON, `UC<n>` use case ids, required fields, unique kebab-case scenario ids, every `useCase` in `USE_CASES`, a known `surface`, no scenario titled like its use case, no mock fields in a scenario (`state`, `page`, `steps`, …), and that every use case has a scenario or a `none` sentence. It prints the scenario count per use case.
- It also warns (exit code stays 0) when a scenario's `expect` has no quoted message, number or identifier, and when a scenario that talks about a role, a permission or "not allowed" names no permission string. Fix each warning by adding the example from step 1b; leave one only when the scenario truly has no value to show, and say why in the reply.
- Fix every error and re-run until it exits 0.
- Every acceptance scenario, edge case and refusal row in the source has a scenario. List any you left out, with why.

### 4. Confirm

- Output: `✅ Use cases written at: {path}`.
- The totals and the scenario count per use case, copied from `check.js` output, and any warning left with its reason.
- **Spec vs code**: each scenario where the spec's text differs from the code's, with both texts and the code's `file:line`. Say "none found" when there are none, or "no code yet: messages from the spec".
- Next steps, one line each: design-feature shows the scenarios in each use case's Scenarios view, generate-mock-ui makes them playable, play-scenarios plays them on the running app, generate-test-cases turns them into test cases.
