---
name: generate-test-scenario
description: Generate a test scenario file an AI can run later against MCP tools, APIs or the web UI, from a spec or feature. Use when the user says "test scenarios for spec 127" or "write test cases". Writes only, never runs tests; to run browser tests use e2e-test.
---

# Test Scenario Generator

Read a spec and its related code, then write a test scenario file that an AI
agent can execute later through MCP tools or backend API calls — or, with
`--target ui`, through a browser (see `references/ui-target.md`).

The file holds test cases. Each test case covers one **scenario** from the
`generate-use-case` skill's `use-cases.js` (same id), grouped by its **use case**.
In this skill "test scenario file" always means the output file, never one scenario.

**This skill only writes the file. Never run any test case here.** The user
runs it in a separate request.

**Never read git changes.** No `git diff`, no branch comparison, no merge
request. The spec plus the code it points to is the only source.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** a spec folder path, a spec number, a plan folder (from design-feature), or a feature description — plus an optional `--target api|ui` (default `api`).

Examples:

```text
/generate-test-scenario <repo>/specs/127-app-env-deploy-status
/generate-test-scenario 127
/generate-test-scenario 127 --target ui
/generate-test-scenario "the What's New overlay on the announcements page" --target ui
```

**`--target ui`**: follow every step below, plus the UI additions in
`references/ui-target.md` for steps 3, 4, 5, 6 and 8. It replaces the MCP
surface (step 4) and the case format (step 6).

---

## Workflow

### 1. Resolve the Spec Folder

- **Full path given** → use it as `<spec-path>`.
- **Number only** (e.g. `127`) → Glob `specs/<number>-*` from the current
  working directory. One match → use it. Several matches → list them and ask
  which one, then stop until answered.
- **Nothing found** → say so and stop. Do not guess another spec.
- **Plan folder given** (has `overview.html`) → it is `<plan>`. The spec is
  the folder it sits in (`<spec-path>/plan/`), or the spec its overview names.
- **Feature description given** (no spec) → there is no `<spec-path>`. Skip
  step 2; the description is the requirement. Find the code in step 3 from the
  names in the description, and list in the file's header what you treated as
  the requirements so the user can correct them.

### 1b. Find the Use Cases and Scenarios

Look for `use-cases.js` from the `generate-use-case` skill, first match wins:
`<plan>/use-cases.js`, `<spec-path>/plan/use-cases.js`,
`plans/<feature-slug>/use-cases.js`.

- **Found** → read `USE_CASES` and `SCENARIOS` (strict JSON after
  `var NAME = `). Every scenario whose `surface` matches the target (`ui` for
  `--target ui`, `api` otherwise) becomes one test case in step 5, with the
  same `id` and use case. Never edit the file; a scenario that looks wrong is
  a note in the header. A file in the old format (`USE_CASE_FLOWS`) → say so
  and ask to re-run the `generate-use-case` skill first.
- **Not found** → go on from the spec alone, and say in the confirm step that
  running the `generate-use-case` skill first links test cases to scenarios.

### 2. Read the Spec

Read every markdown file directly under `<spec-path>` — typically `spec.md`,
`plan.md`, `tasks.md`, `data-model.md`, `research.md`, and anything under
`contracts/`.

Skip `<spec-path>/PRIVATE/` unless a file there is clearly part of the
requirement.

Extract:

- **Goal**: what the feature must do, in one line
- **Functional requirements**: each numbered rule that can be tested
- **Acceptance criteria** and user stories
- **Data model**: entities, fields, constraints, status enums
- **Contracts**: service + operation names, request/response shapes
- **Edge cases** the spec calls out explicitly
- **Out of scope**: never write cases for these

### 3. Read the Related Code

Use Glob and Grep to find the implementation named by the spec — service
names, handler names, table names, enum values from step 2.

Read enough to pin down:

- **Entry points**: gRPC service + operation, or HTTP method + route
- **Request fields**: required vs optional, types, formats, limits
- **Validation rules**: every rejection path in the code
- **Error codes**: the exact codes returned
  (`INVALID_ARGUMENT`, `ALREADY_EXISTS`, `NOT_FOUND`, `PERMISSION_DENIED`, ...)
- **Persistence**: tables touched, unique constraints, default values
- **Side effects**: audit log, notification, cache invalidation, upload
- **Permissions**: the role or scope required
- **Related read APIs**: what to call to verify a write actually landed

If the code and the spec disagree, follow the spec and add a
`⚠️ spec/code mismatch` note on that case.

### 4. Resolve the MCP Surface

If the feature is reachable through an MCP server in this session:

1. Pick the matching service tool (e.g. `AppEnvVarService`).
2. Call it with `operation: "GetInputSchema"` to get the real request fields.
3. Use those exact field names in the test cases. Do NOT guess payloads.

Prefer the `local` MCP server for test cases that write data; note the choice
in the header. If no MCP server matches, write plain HTTP calls
(`METHOD /path` + JSON body) instead.

### 5. Choose Coverage

**Scenarios first** (when step 1b found them): one case per scenario of this
target, in use case order, titled with the scenario's title. Its `given` is the
precondition, its `when` the steps, its `expect` the expected result (made
exact in steps 3 and 4). Then add the extra cases below that no scenario
covers; mark each one `extra`.

Include a case for each row that applies. Skip what the feature does not have
— do not pad the file.

| Group | Cover |
| ----- | ----- |
| Happy path | The main success path, verified with a read-back call |
| Requirements | One case per testable requirement in the spec |
| Validation | Empty, wrong type, wrong format, over max length, out of range |
| Uniqueness | Duplicate in the same scope, same value in another scope |
| Not found | Bad parent id, deleted record |
| Permission | A role without the required right |
| State rules | Illegal status transitions, actions on a closed/locked record |
| Idempotency | Same request twice — must not create a duplicate |
| Side effects | Audit log written, secret masked, cache/notification fired |
| Boundary | Exactly at the limit, one over, zero, negative, unicode/emoji |

Order cases so dependencies come first, and state the dependency explicitly.

### 6. Write the File

Use this exact structure.

````markdown
# Test Scenario: {Feature Name}

- **Spec**: `{spec-folder-name}`
- **Feature**: {one line — what it does}
- **Target**: MCP `{server}` → `{Service}` | REST `{base path}`
- **Generated**: {YYYY-MM-DD}

- **Use cases**: `{path to use-cases.js}` | none found

## Coverage

| Requirement | Test cases |
| ----------- | ---------- |
| {FR-01 short text} | TC-01, TC-04 |

| Use case | Scenario | Test case |
| -------- | -------- | --------- |
| UC1 {use case title} | `{scenario-id}` | TC-01 |
| UC1 {use case title} | `{scenario-id}` | — other target (`ui`) |

Leave this second table out when no use cases were found.

## Preconditions

| Item | Value | How to get it |
| ---- | ----- | ------------- |
| {resource} | `{value}` | {which call resolves it} |

**Role required**: `{permission}`

## Test Data

```json
{ "field": "value" }
```

All test records use the prefix `TEST_AI_` so cleanup can find them.

---

## TC-01 — {short title}

**Scenario**: `{scenario-id}` · **Use case**: UC1 {use case title}
**Depends on**: none

**Steps**
1. `{Service}` → `{Operation}` with `{...}`
2. `{Service}` → `{ReadOperation}` to verify

**Expected**
- {exact field values, not "should work"}
- {exact error code when it is a negative case}

**Result**: _(fill in when run)_

---

## TC-02 — {short title}

...

---

## TC-0N — Input validation

**Scenario**: extra · **Use case**: UC1 {use case title}

| # | Field | Input | Expected |
| - | ----- | ----- | -------- |
| a | `{field}` | `""` | `INVALID_ARGUMENT`, no record created |
| b | `{field}` | {over max} | `INVALID_ARGUMENT` |

**Result**: _(fill in per row)_

---

## Cleanup

1. {exact delete calls, in reverse dependency order}
2. Remove every record whose key starts with `TEST_AI_`.

## Summary

| TC | Title | Status | Note |
| -- | ----- | ------ | ---- |
| TC-01 | {title} | | |
````

### 7. Writing Rules

- **Every step names a real operation.** `AppEnvVarService → Create`, not
  "create the env var".
- **Every expectation is checkable.** Exact field value or exact error code.
  Never "should succeed" or "should fail".
- **Every write case has a read-back step.** A response alone does not prove
  the data landed.
- **Negative cases assert no side effect** — the record must not exist after a
  rejected call.
- **Mark destructive cases** with `⚠️ writes data` in the title.
- **No secrets in the file.** Use placeholders for tokens and passwords.
- Keep each case under ~10 steps. Split it if longer.
- **Scenario line**: every case has one. A case from a scenario names its id
  and use case; an extra case says `extra` plus the use case it belongs to, or
  `extra` alone. Never invent a scenario or use case id.

### 8. Save the File

Always save inside the spec folder:

```text
<spec-path>/PRIVATE/test/test-scenario-<n>.md
```

- Create `PRIVATE/test/` if it does not exist.
- `--target ui` → name it `test-scenario-ui-<n>.md` (its own numbering).
- No spec folder (a feature description) → save under
  `test-scenarios/<feature-slug>/` at the repo root instead, and ask once
  whether that folder should be gitignored.
- `<n>` is a running number starting at `1`. Read the folder, find the highest
  existing file of the same kind, and use the next number.
- **Never overwrite an existing file.**

Confirm with: `✅ Test scenario file created at: {path} ({n} test cases, {u} from scenarios)`

Then print a one-line list of the case titles and remind the user that nothing
was executed — they can ask to run it separately.
