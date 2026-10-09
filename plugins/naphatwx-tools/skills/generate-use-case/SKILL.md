---
name: generate-use-case
description: Write a feature's use cases (one per user goal) and their scenarios (one per acceptance scenario, edge case and refusal) to one use-cases.js file, from a spec or idea. Use when the user says "use cases for spec 127" or "list the use cases". Data only; design-feature, generate-mock-ui and generate-test-scenario read the file.
argument-hint: <spec-folder | plan-folder | feature description> [output-folder]
---

# Use Case Generator

Turn a spec into one `use-cases.js` file: what a user can do with the feature and what they should see. It is the one source for use cases and scenarios. Other skills read it and never write their own:

```
spec ─► generate-use-case ─► <plan>/use-cases.js
                                 ├─► design-feature          each use case's "Scenarios" view
                                 ├─► generate-mock-ui        adds how to play each scenario (mock/shared/scenario-play.js)
                                 └─► generate-test-scenario  one test case per scenario, same id ─► e2e-test report
```

The words, used the same way in every skill:

| Word | Meaning | Named as | Example |
|------|---------|----------|---------|
| Feature | what the spec delivers | a noun | Legacy new version |
| Use case | one goal a user wants to reach, with every path to it | verb + object | Cut a new version |
| Scenario | one path through a use case, with one result | the condition or the result | Merge request already released |
| Flow | the steps of a use case, drawn as its flowchart and sequence diagram | a diagram, not a list item | the flowchart of Cut a new version |

The file holds no mock data and no selectors, so it works for features with no UI too.

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
- Run by design-feature → it passes `<plan>` and `.parts/brief.md`; read the brief instead of the spec.

## Hard Rules

1. **Strict JSON inside a script.** The file sets two globals, `var USE_CASES = [...]` and `var SCENARIOS = [...]`. Each array is strict JSON (double quotes, no trailing commas, no comments inside), so a script can parse it after `var NAME = `, and a page opened from `file://` can load it with `<script src>`.
2. **From the spec only.** Every scenario comes from an acceptance scenario, edge case, refusal row or functional requirement in the source. Never invent behaviour. Unknown copy → `TBD`.
3. **No mock or test details.** No mock state ids, pages, query params, selectors or mock data values. Those belong to the mock (`scenario-play.js`) and the test file.
4. **Ids are stable.** Use cases are `UC1`, `UC2`, … Scenarios are kebab-case and unique. Never reuse an id for another meaning. Other files link to `#sc-<scenario id>`.
5. Every count you report comes from `scripts/check.js`, never an estimate.
6. No absolute local paths in the file.

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
| `given` | optional: the start state in one line ("The owner is archived.") |
| `when` | the user's action or trigger in one line ("The user creates a thing.") |
| `expect` | what the user should see, one line each, with the exact messages from the spec in quotes. The first line is the key outcome: the plan shows it |

- Write `given`, `when` and `expect` in plain words a reviewer who never read the spec can follow. Name what the user sees, not how the code works.
- One scenario = one outcome. A spec scenario with two different outcomes is two scenarios.
- A title with "and" or "or" usually covers two paths. Split it ("No changelog", "No previous version").

### 3. Check

- `node <this skill dir>/scripts/check.js <plan>/use-cases.js`. It checks strict JSON, `UC<n>` use case ids, required fields, unique kebab-case scenario ids, every `useCase` in `USE_CASES`, a known `surface`, no scenario titled like its use case, no mock fields in a scenario (`state`, `page`, `steps`, …), and that every use case has a scenario or a `none` sentence. It prints the scenario count per use case.
- Fix every error and re-run until it exits 0.
- Every acceptance scenario, edge case and refusal row in the source has a scenario. List any you left out, with why.

### 4. Confirm

- Output: `✅ Use cases written at: {path}`.
- The totals and the scenario count per use case, copied from `check.js` output.
- Next steps, one line each: design-feature shows the scenarios in each use case's Scenarios view, generate-mock-ui makes them playable, generate-test-scenario turns them into test cases.
