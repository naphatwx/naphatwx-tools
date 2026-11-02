# Phase 0: Plan

The main agent plans in Claude Code's plan mode. It edits nothing but the plan. The user answers the
grill and approves the plan; everything else runs on its own.

## 1. Number and folder

- Folder: the profile's `Work folder`, else `.work/`. Task folder: `<work folder>/NNN-<slug>/`.
  Slug: 2–4 words, like `bucket-csv-export`. The number is how the user refers to the task ("continue 195").
- **Next number** = 1 + the highest `NNN` in the work folder of every place below. Missing folder → skip it.
  1. This checkout.
  2. Every worktree of the repo: `git worktree list --porcelain` (the `worktree <path>` lines).
  3. The profile's `Other checkouts`.
- Say it in one line: "Next: 195 (highest 194 in ../thanos.worktrees/foo)".

## 2. Plan mode

Enter plan mode (`EnterPlanMode`). Read the code, the root guide and each app's guide before asking
anything: facts the code answers are never questions.

## 3. Grill

Run the `grill-me` skill on the task. The user answers until no decision is left open.
Write each answer under Decisions as `<question> → <answer> (user)`.
`grill-me` missing → stop and tell the user to install it:
`npx skills add https://github.com/mattpocock/skills --skill grill-me`

## 4. Draft

Write the plan in plan mode's plan file, in this shape. Skip a section that has nothing.

```markdown
# NNN · <Title>
- Phase: 0 · Apps: <apps> · Target: <MR/PR target or "not known yet"> · Next: <one line>

## Goal
- <one line>

## Accept
- <testable result, with the exact user-facing message when there is one>

## Decisions
- <question> → <answer> (user | spec verify: <rule> | decider)

## Changes per app
- <app>: <files or areas, what changes>

## Data / API
- <tables, fields, endpoints, messages, migrations>

## Risks
- <list>

## Tasks
- [ ] T001 [<app>] <task>
- [ ] T002 [<app>] [TEST] <test task>
```

- Every Accept line has at least one task. Every task names one app.
- Test tasks carry `[TEST]`. Phase 2 skips them, Phase 3 does them.

## 5. Spec verify

Checks that the plan follows the project's rules and the real code: each app's guide, the root guide,
existing helpers and components. Example: the plan writes a badge inline, the web guide says "a badge is
its own component" → the plan changes to "add a badge component". It does not judge the requirements;
the grill settled those.

1. Start one fresh **spec verifier** per changed app (`roles.md`), all at once. They only read, so they run in plan mode.
2. A plan that touches another repo → one more verifier per repo.
3. The main agent applies every fix to the plan itself and notes it under Decisions. A finding it disagrees with → the decider.
4. A verifier never becomes that app's owner later.

## 6. Approve

Exit plan mode (`ExitPlanMode`). Claude Code asks the user to approve.
- "No, keep planning" → back to step 3 (a new decision) or step 4 (a wording or scope fix).
- Approved → step 7.

## 7. Save

- Copy the approved plan, as approved, to `<work folder>/NNN-<slug>/plan.md`. Set its status line to `Phase: 1`.
- Go straight to Phase 1.

## Agents without plan mode

Write the plan straight to `<work folder>/NNN-<slug>/plan.md`, grill with the `grill-me` skill if the agent has
it (else ask the same way in chat: one decision at a time, each with a recommended answer), run spec verify,
then ask the user to approve in chat.
