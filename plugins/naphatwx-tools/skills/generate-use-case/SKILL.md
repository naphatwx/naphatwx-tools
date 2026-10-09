---
name: generate-use-case
description: Write a feature's use cases (one per acceptance scenario, edge case and refusal, grouped by flow) to one use-cases.js file, from a spec or idea. Use when the user says "use cases for spec 127" or "list the use cases". Data only; design-feature, generate-mock-ui and generate-test-scenario read the file.
argument-hint: <spec-folder | plan-folder | feature description> [output-folder]
---

# Use Case Generator

Turn a spec into one `use-cases.js` file: what a user can do with the feature and what they should see. It is the one source for use cases. Other skills read it and never write their own:

```
spec ─► generate-use-case ─► <plan>/use-cases.js
                                 ├─► design-feature          each flow's "Use cases" view
                                 ├─► generate-mock-ui        adds how to play each one (mock/shared/use-case-play.js)
                                 └─► generate-test-scenario  one test case per use case, same id ─► e2e-test report
```

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

- `<plan>/use-cases.js` already exists → read it and update it in place. Keep every existing `id` that still matches a scenario, so links from the mock, the plan and test files keep working.
- Run by design-feature → it passes `<plan>` and `.parts/brief.md`; read the brief instead of the spec.

## Hard Rules

1. **Strict JSON inside a script.** The file sets two globals, `var USE_CASE_FLOWS = [...]` and `var USE_CASES = [...]`. Each array is strict JSON (double quotes, no trailing commas, no comments inside), so a script can parse it after `var NAME = `, and a page opened from `file://` can load it with `<script src>`.
2. **From the spec only.** Every use case comes from an acceptance scenario, edge case, refusal row or functional requirement in the source. Never invent behaviour. Unknown copy → `TBD`.
3. **No mock or test details.** No scenario ids, pages, query params, selectors or mock data values. Those belong to the mock (`use-case-play.js`) and the test file.
4. **Ids are stable.** kebab-case, unique, never reused for another meaning. Other files link to `#uc-<id>`.
5. Every count you report comes from `scripts/check.js`, never an estimate.
6. No absolute local paths in the file.

## Workflow

### 1. Read the source

- Spec folder → every markdown file directly under it (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, …). Skip `PRIVATE/` unless a file there is clearly part of the requirement.
- Plan folder → `overview.html` for the flow numbers and names, plus the spec it names.
- Feature description → it is the requirement. Mark every unknown as `TBD`.
- List:
    - **Flows**: each user story or use case with its own trigger. Number them `3.1`, `3.2`, … in the order a reader meets them. These are section 3 of a design-feature plan, so a plan made later uses the same numbers. A plan already exists → use its numbers and names exactly.
    - **Acceptance scenarios**, **edge cases**, **refusal rows** and testable **functional requirements**, each with its id (`US1 · AC2`, `FR-003`, a decision id) and the exact user-facing message.

### 2. Write `<plan>/use-cases.js`

Start from `template/use-cases.js`.

- `USE_CASE_FLOWS`: one entry per flow, in order.

| Field | What |
|-------|------|
| `flow` | `"3.N"` |
| `title` | the flow name, the same everywhere (plan rail, flow heading, mock) |
| `refs` | user story + requirement ids, joined by ` · ` |
| `none` | only for a flow with no use case: one sentence saying why |

- `USE_CASES`: one entry per acceptance scenario, edge case and refusal row, grouped by flow, in flow order. A requirement no scenario covers gets its own use case.

| Field | What |
|-------|------|
| `id` | kebab-case, unique (`create-archived-owner`) |
| `flow` | a `USE_CASE_FLOWS` number |
| `title` | short, what happens ("Cut a new version", "Merge request already released") |
| `story` | user story + acceptance ids (`"US1 · AC2–4"`), or the FR / decision id |
| `surface` | where the user meets it: `"ui"` (a screen), `"api"` (an API, RPC or MCP call), `"job"` (a scheduled job, script or event) |
| `given` | optional: the start state in one line ("The owner is archived.") |
| `when` | the user's action or trigger in one line ("The user creates a thing.") |
| `expect` | what the user should see, one line each, with the exact messages from the spec in quotes. The first line is the key outcome: the plan shows it |

- Write `given`, `when` and `expect` in plain words a reviewer who never read the spec can follow. Name what the user sees, not how the code works.
- One use case = one outcome. A scenario with two different outcomes is two use cases.

### 3. Check

- `node <this skill dir>/scripts/check.js <plan>/use-cases.js`. It checks strict JSON, required fields, unique kebab-case ids, every `flow` in `USE_CASE_FLOWS`, a known `surface`, and that every flow has a use case or a `none` sentence. It prints the count per flow.
- Fix every error and re-run until it exits 0.
- Every acceptance scenario, edge case and refusal row in the source has a use case. List any you left out, with why.

### 4. Confirm

- Output: `✅ Use cases written at: {path}`.
- The total and the count per flow, copied from `check.js` output.
- Next steps, one line each: design-feature shows them in each flow's Use cases view, generate-mock-ui makes them playable, generate-test-scenario turns them into test cases.
