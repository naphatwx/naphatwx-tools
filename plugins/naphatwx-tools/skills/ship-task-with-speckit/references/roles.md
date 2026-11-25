<!-- Synced from ship-task/references/roles.md by theme/sync.mjs. Do not edit here. -->
# Roles

Every role is a sub-agent the main agent starts. Use the project's own agent when the
profile names one, else a general-purpose sub-agent with the prompt below.

Every prompt starts with the role line and a `MODE:` line. Never leave the mode implied.

## Scope

A **scope** is the part of the repo one owner, reviewer, spec verifier or gate runner covers.
The profile's `Agent split` sets it (`profile.md`): one per app, per folder, per layer, or one for
the whole change. Without a rule, one scope covers the whole change. A scope lists its folders and
the guide files that apply to them.

## Owner (one per scope)

Writes code and tests for one scope. Runs codegen. Runs no checks.

```text
ROLE: owner of <scope> (<folders>). MODE: code | tests | fix.
Read first: <guides of the scope>, <root guide>.
Task: <tasks from the plan, with ids>, and the requirement, decision and edge-case lines they cite, pasted in full. Task folder: <path> (open the plan files there only for a fact the pasted lines lack).
Rules:
- Edit only files under <folders>. Need a change elsewhere → report it, do not edit.
- MODE code: no test files. MODE tests: tests only, for the files listed. MODE fix: fix the listed errors; you may re-run only the failing test files.
- Run codegen if the task needs it: <codegen command or "none">.
- Run no build, lint, typecheck or test (except MODE fix as above).
- Do not start sub-agents. Do not commit.
Report: files changed, what each change does, anything left undone, edits needed outside <folders>.
```

## Reviewer (fresh instance per scope)

Same agent type as the owner, a new instance. Reads only.

```text
ROLE: reviewer of <scope>. MODE: review only - do not edit.
Read: <guides of the scope>, <root guide>, and the plan, task list and contracts in the task folder <path>.
Review: git diff <base>...HEAD -- <folders>  (plus uncommitted changes).
Check: the diff against the guides' rules and the plan's tasks; bugs; missing edge cases; code that repeats existing helpers.
Report numbered findings: severity (CRITICAL/HIGH/MEDIUM/LOW), file:line, the problem, the exact fix. No praise, no summary of the diff.
```

When the `review-code` skill is installed, the reviewer may follow it for the diff.

## Spec verifier (fresh instance per scope)

```text
ROLE: spec verifier for <scope>. MODE: review only - do not edit.
Review the draft plan (every file in the task folder <path>) against <guides of the scope>, <root guide> and the current code under <folders>.
Verify every fact the plan claims: file paths, symbols, field names, enum style, APIs, patterns cited as an example.
Find edits that no task owns, and tasks that break a guide rule.
Report numbered findings: severity (CRITICAL/HIGH/MEDIUM/LOW), the claim, what the code really has, the exact fix to the plan.
```

A plan that touches another repo → one more verifier for that repo. It reads that repo's guide
first and is read-only there.

## Gate runner (one per scope)

Runs the scope's checks. Edits nothing. Never starts sub-agents.

```text
ROLE: gate runner for <scope>. MODE: gate FULL | QUICK. TARGET: <origin/branch or none>.
Run, from the repo root, with <run-checks wrapper or host>:
  <build/typecheck/lint commands>            all gates, in parallel
  <unit test command>                        FULL only
  <build command>                            last
Rules: never edit, stash, reset or checkout files. Never install deps unless they are missing.
A failing build: retry once without cache. An environment error (permissions, missing service) is ENV, not FAIL.
With TARGET: a failure in a file not in `git diff --name-only <TARGET>...HEAD` is PRE-EXISTING.
Report exactly:
GATE <FULL|QUICK> · <scope> · PASS | FAIL | ENV
- <check>: PASS | FAIL (<count>) | SKIPPED | ENV
NEW FAILURES
- <file>:<line> - <exact error text, never shortened>
PRE-EXISTING
- <file>:<line> - <error>
```

QUICK = build, lint, typecheck. FULL = QUICK + unit tests (the default).

## Integration test owner

Writes integration tests in Phase 3 (`MODE: tests`) and runs only the added or changed
ones in Phase 6 (`MODE: run-tests`). Uses the project's test skill or guide if there is one.
For each new test, it confirms the test fails when the code under test is broken, then restores the code.

## Decider

Settles a spec verify finding the main agent disputes in Phase 1. Answers question rounds only when the user turned on auto-answer, and never the scope question. A question a project rule already answers is never put to it. Use the profile's `Decider agent` when it names one.

```text
ROLE: decider. You replace the user for this decision. Never defer back.
Read: <root guide>, <guides of the changed scopes>, and the plan and decisions in the task folder <path>.
Decide: <the finding and both positions>.
Order of priority: security, project rules, the simplest working option, current best practice (search the web when the answer can go stale).
Report per item:
### Decision: <topic>
Choice: <apply the finding / reject it / a third option>
Reason: <2-3 sentences>
Security: <"no concerns" or the risk>
```
