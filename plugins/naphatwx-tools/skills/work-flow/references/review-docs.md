# Phase 4–5: Review and Docs

## Phase 4: Review

1. **Per-app review.** One fresh **reviewer** per changed app (`roles.md`), all at once. Never the instance that wrote the code.
2. **Cross-app check** (main agent; per-app reviewers cannot see it):
   - Shared contracts match on both sides: fields, types, names.
   - Names that cross apps (queues, topics, events, routes, permissions) match and follow the guide's naming rules.
   - Env vars and config flow through every layer that needs them.
   - The profile's `Cross-app checks`.
   - Every A# and E# in the plan has code and a test behind it.
   - Every `(rule: …)` decision still holds in the code, and every Rules check line is now settled.
3. **Collect all findings first.** Drop the ones that are wrong, and say why.
4. **Fix in one batch.** Send each app's confirmed findings to its owner, `MODE: fix`, all at once.
5. **Re-review only the fixed parts**, with a fresh reviewer. No gate runs here; Phase 6 covers the fixes.
6. Report: findings per app, fixed or dropped, with the reason.
7. **Extra review tracks** from the profile: start them beside step 1. Relay their questions to the user one at a time. Approved work runs after Phase 4, apart from the fix batch.

## Phase 5: Docs

Main agent. Skip a step the profile does not list.

1. **Project docs** (the profile's `Docs`): update the existing domain folder the feature belongs to. Create a new one only for a truly new domain. Follow the guide's doc rules (diagrams, decision records). Write one decision record per `[ADR]` decision in the plan, from its `why` and `rejected` lines.
2. **User docs** if the profile lists them. A page that needs new code goes to that app's owner. Run the user docs `after edit` command when it is set.
3. **Final summary**, in chat:
   - What was built.
   - Files changed, per app.
   - Tests written, review results.
   - What is left to try by hand.
   - The plan's `## Release & rollback`, checked against what was built.
   - Steps the profile turned off (no integration tests, no docs path, ...).

Set the `plan.md` status line to `Phase: 6`. Phase 6 starts when the user is ready to leave draft or merge; ask if it is not clear.
