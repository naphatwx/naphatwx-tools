# Phase 6: Pre-merge, and Gates

Run right before the branch leaves draft or merges. Two parts: fix numbers, then the gate.

## Target branch

- Read it from the open MR/PR for the working branch (GitLab or GitHub tools, or `gh` / `glab`). Never assume `main`, `master` or `dev`.
- No open MR/PR → ask the user which branch it will target.

## Number check

Only when the profile lists numbered folders, or the task has a number. Numbers taken on parallel branches, or in
another checkout, can collide by merge time.

1. `git fetch origin <target>` then `git merge origin/<target>`. A conflict in app code goes to the owner of its scope.
2. If the project has a branch that gets hotfixes first (the profile's `Hotfix branch`, else ask once), fetch it and **read it only, never merge it**: `git ls-tree --name-only origin/<hotfix-branch> <numbered-folder>/`.
3. Check against the merged tree plus that branch:
   - No number appears twice.
   - Our numbers run in order right after the highest one, with no gap (migrations).
   - Our task number: no other folder in `tasks/` with a different slug uses it, in this repo, its worktrees or the profile's `Other checkouts`.
4. **Renumber only our own files**, in their original order. Migrations go to the owner of their scope (headers and comments too). The task folder is the main agent's: move it to the next free number and update the title line of `plan.md`. Update every reference in the same change: the task files (`contracts.md`, `research.md`, `tasks.md`, `plan.md` Release & rollback), spec, docs, test data, MR/PR text.
5. Report old → new numbers. Commit only if the user asks, as `chore(<area>): renumber …`.

## The gate

1. List the changed scopes: `git diff --name-only origin/<target>...HEAD`, mapped to the profile's folders and `Agent split`.
2. In **one message**, start:
   - one **gate runner** per changed scope, `FULL`, `TARGET: origin/<target>`, running the profile's gate commands of the apps in it;
   - the integration test owner, `MODE: run-tests`: the full suite when the profile says `At pre-merge: full`, else only the added or changed tests (skip if none changed);
   - the profile's `Pre-merge app steps`.
3. On a low-memory machine, run heavy builds one after the other.

## Fail loop

1. Send each scope's NEW FAILURES, unshortened, to its owner, `MODE: fix`. Prefer the same instance that wrote the code.
2. Re-gate **only that scope**.
3. Repeat until every scope is `PASS` or `ENV` and every test run is green.
4. A failing test that shows a real bug → fix the code, never weaken the test.
5. PRE-EXISTING failures → report, open a separate task, do not fix.

Report per scope and per test run. Set the `plan.md` status line to `Phase: done`.

If the target branch moves after this → redo the number check. Re-gate only the scopes the new merge changed.

## A gate the user asks for (any phase)

- "run the gate", "gate <app>", "run the tests" → gate runners for the scopes named, or every changed scope if none are named. `FULL` unless they say quick. Unit tests use the profile's `Unit tests on request` command, unless the user asks for the full suite.
- Integration tests asked for → the integration test owner, `MODE: run-tests`.
- No `TARGET` unless known; every failure is then reported as-is.
- Report and stop. Fix only if the user asks.
