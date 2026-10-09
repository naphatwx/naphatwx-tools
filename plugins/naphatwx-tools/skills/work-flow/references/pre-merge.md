# Phase 6: Pre-merge, and Gates

Run right before the branch leaves draft or merges. Two parts: fix numbers, then the gate.

## Target branch

- Read it from the open MR/PR for the working branch (GitLab or GitHub tools, or `gh` / `glab`). Never assume `main`, `master` or `dev`.
- No open MR/PR → ask the user which branch it will target.

## Number check

Only when the profile lists numbered folders (migrations, specs). Numbers taken on
parallel branches can collide by merge time.

1. `git fetch origin <target>` then `git merge origin/<target>`. A conflict in app code goes to that app's owner.
2. If the project has a branch that gets hotfixes first (ask once, or the profile says so), fetch it and **read it only, never merge it**: `git ls-tree --name-only origin/<hotfix-branch> <numbered-folder>/`.
3. Check against the merged tree plus that branch:
   - No number appears twice.
   - Our numbers run in order right after the highest one, with no gap (migrations).
4. **Renumber only our own files**, in their original order. Migrations go to the app's owner (headers and comments too). The spec folder is the main agent's. Update every reference in the same change: spec, docs, test data, MR/PR text.
5. Report old → new numbers. Commit only if the user asks, as `chore(<area>): renumber …`.

## The gate

1. List the changed apps: `git diff --name-only origin/<target>...HEAD`, mapped to the profile's folders.
2. In **one message**, start:
   - one **gate runner** per changed app, `FULL`, `TARGET: origin/<target>`;
   - the integration test owner, `MODE: run-tests`, for the added or changed tests only (skip if none changed);
   - any app step the profile lists for pre-merge (like running migrations on the local stack).
3. On a low-memory machine, run heavy builds one after the other.

## Fail loop

1. Send each app's NEW FAILURES, unshortened, to its owner, `MODE: fix`. Prefer the same instance that wrote the code.
2. Re-gate **only that app**.
3. Repeat until every app is `PASS` or `ENV` and every test run is green.
4. A failing test that shows a real bug → fix the code, never weaken the test.
5. PRE-EXISTING failures → report, open a separate task, do not fix.

Report per app and per test run. Set `flow.md` to `Phase: done`.

If the target branch moves after this → redo the number check. Re-gate only the apps the new merge changed.

## A gate the user asks for (any phase)

- "run the gate", "gate web", "run the tests" → gate runners for the apps named, or every changed app if none are named. `FULL` unless they say quick.
- Integration tests asked for → the integration test owner, `MODE: run-tests`.
- No `TARGET` unless known; every failure is then reported as-is.
- Report and stop. Fix only if the user asks.
