# Phase 1–2: Routing and Code

## Phase 1: Routing (main agent)

1. Group the non-`[TEST]` tasks by app.
2. Find the order:
   - Codegen in the profile (shared contracts, generated types) → the app that owns the contract goes first. The others start after it finishes.
   - Apps with no link to each other start at the same time.
3. Find edits outside any app (root config, compose, env examples). The main agent does these itself.
4. Plan every edit now. A second code round means the plan missed something.

## Phase 2: Code

1. Start one **owner** per app, `MODE: code` (`roles.md`). Independent owners go in one message so they run at once.
2. Give each owner its task ids, the spec folder, its folder and guide, and the codegen command if it needs one.
3. Keep each owner's id, so a later fix can go back to the same instance (SendMessage when the agent has it).
4. An owner reports an edit outside its folder → route it to that folder's owner, or do it yourself if it is main-agent territory.
5. Tick the done tasks in the task list.
6. Manual: report each app as it finishes.

Phase 2 writes **no test file** and runs **no check**.

## User checkpoint (always)

After Phase 2, stop and end the turn. Report:

- What was built, per app.
- Files changed, per app.
- How to try it by hand: the screen or endpoint, and the steps. Mention the `play-scenarios` skill if the task has use cases.
- Plainly: no tests are written yet (Phase 3) and no build, lint or typecheck has run. The user can ask for a gate at any time.

Then wait.

- "continue" / "review" → Phase 3.
- Change requests → same owners, back to Phase 2 (or Phase 0 if the spec changes). Stop at the checkpoint again.

Set `flow.md` to `Phase: checkpoint`.
