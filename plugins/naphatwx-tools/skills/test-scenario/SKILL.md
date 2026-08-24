---
name: test-scenario
description: Generate an AI-runnable test scenario file from a spec folder, targeting MCP tools or backend APIs. Use when the user gives a spec number or spec folder path and asks for test scenarios, test cases, or a test plan. Generates only — it never executes the tests.
---

# Test Scenario Generator

Read a spec and its related code, then write a test scenario file that an AI
agent can execute later through MCP tools or backend API calls.

**This skill only writes the file. Never run any test case here.** The user
runs it in a separate request.

**Never read git changes.** No `git diff`, no branch comparison, no merge
request. The spec plus the code it points to is the only source.

## User Input

```text
$ARGUMENTS
```

**Expected format:** a spec folder path, or a spec number.

Examples:

```text
/test-scenario <repo>/specs/127-app-env-deploy-status
/test-scenario 127
```

---

## Workflow

### 1. Resolve the Spec Folder

- **Full path given** → use it as `<spec-path>`.
- **Number only** (e.g. `127`) → Glob `specs/<number>-*` from the current
  working directory. One match → use it. Several matches → list them and ask
  which one, then stop until answered.
- **Nothing found** → say so and stop. Do not guess another spec.

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
3. Use those exact field names in the scenario. Do NOT guess payloads.

Prefer the `local` MCP server for scenarios that write data; note the choice
in the header. If no MCP server matches, write plain HTTP calls
(`METHOD /path` + JSON body) instead.

### 5. Choose Coverage

Include a case for each row that applies. Skip what the feature does not have
— do not pad the file.

| Group | Cover |
| ----- | ----- |
| Happy path | The main flow, verified with a read-back call |
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

## Coverage

| Requirement | Test cases |
| ----------- | ---------- |
| {FR-01 short text} | TC-01, TC-04 |

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

### 8. Save the File

Always save inside the spec folder:

```text
<spec-path>/PRIVATE/test/test-scenario-<n>.md
```

- Create `PRIVATE/test/` if it does not exist.
- `<n>` is a running number starting at `1`. Read the folder, find the highest
  existing `test-scenario-<n>.md`, and use the next number.
- **Never overwrite an existing file.**

Confirm with: `✅ Test scenario created at: {path} ({n} test cases)`

Then print a one-line list of the case titles and remind the user that nothing
was executed — they can ask to run it separately.
