# Phase 4–5: Review and Docs

## Phase 4: Review

1. **Converge.** Write the task folder to `.specify/feature.json`, then run `speckit-converge` with: `Run no build, lint, typecheck or test.` It compares the code with `spec.md`, `plan.md` and `tasks.md` and adds the missing work to `tasks.md` as new tasks. It writes no code.
2. **Review per scope**, started right after converge: one fresh **reviewer** per changed scope (`roles.md` → Scope), all at once. Never the instance that wrote the code.
3. **Cross-app check** (main agent; a reviewer sees only its own scope):
   - Shared contracts match on both sides and match `contracts/`: fields, types, names.
   - Names that cross apps (queues, topics, events, routes, permissions) match and follow the guide's naming rules.
   - Env vars and config flow through every layer that needs them.
   - The profile's `Cross-app checks`.
   - Every FR-### and SC-### in `spec.md` has code and a test behind it (`tasks.md` cites them).
   - Every `(rule: …)` answer in `spec.md` → Clarifications still holds in the code, and the plan's Constitution Check still passes.
4. **Collect all findings first**: the new converge tasks and the reviewers' findings. Drop the ones that are wrong, and say why. Remove a dropped converge task from `tasks.md`.
5. **Fix in one batch.** Send each scope's confirmed findings and new tasks to its owner, `MODE: fix`, all at once. New converge tasks are done with the `speckit-implement` skill, for those task ids only; a new `[TEST]` task is written, not run.
6. **Re-review only the fixed parts**, with a fresh reviewer. No gate runs here; Phase 6 covers the fixes.
7. Report: findings per scope, fixed or dropped, with the reason.
8. **Extra review tracks** from the profile: start them beside step 2. Relay their questions to the user one at a time. Approved work runs after Phase 4, apart from the fix batch.

## Phase 5: Docs

Main agent. Skip a step the profile does not list.

1. **Project docs** (the profile's `Docs`): update the existing `<area>` folder the feature belongs to. Create a new one only for a truly new area. Follow the guide's doc rules (diagrams, decision records). Write one decision record for each decision in `research.md` the guide says needs one, from its rationale and the alternatives it rejected.
2. **User docs** if the profile lists them. A page that needs new code goes to the owner of its scope. Run the user docs `after edit` command when it is set.
3. **Final summary**, in chat:
   - What was built.
   - Files changed, per scope.
   - Tests written, review results.
   - What is left to try by hand (`quickstart.md`).
   - Release needs: config, migrations, merge order across repos, how to roll back, checked against what was built.
   - Steps the profile turned off (no integration tests, no docs path, ...).

Set the `status.md` status line to `Phase: 6`. Phase 6 starts when the user is ready to leave draft or merge; ask if it is not clear.
