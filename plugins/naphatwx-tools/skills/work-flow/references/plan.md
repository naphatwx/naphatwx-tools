# Phase 0: Plan

The main agent writes the plan straight to the task folder. It edits nothing but the plan. The grill is
the only stop in this phase: once it ends, the plan is drafted and verified, and the flow goes on to code.

## 1. Number and folder

- Folder: the profile's `Work folder`, else `.work/`. Task folder: `<work folder>/NNN-<slug>/`.
  Slug: 2–4 words, like `bucket-csv-export`. The number is how the user refers to the task ("continue 195").
- **Next number** = 1 + the highest `NNN` in the work folder of every place below. Missing folder → skip it.
  1. This checkout.
  2. Every worktree of the repo: `git worktree list --porcelain` (the `worktree <path>` lines).
  3. The profile's `Other checkouts`.
- Say it in one line: "Next: 195 (highest 194 in ../thanos.worktrees/foo)".

## 2. Explore

Map the code before asking anything: facts the code answers are never questions.
- Use the `Explore` sub-agent in Claude Code (any read-only sub-agent elsewhere). It reads the root guide,
  each app's guide and the code the task touches.
- It returns a short map, not file dumps: files and symbols, current behavior, existing tests, docs, gaps.
- One agent. More only when the task spans unrelated areas, one per area, all at once.

## 3. Grill

Run the `grilling` skill (`mattpocock-skills:grilling` in Claude Code) on the task. Not `grill-me`: that one
only the user can start. Rounds go on until no decision is left open.
- Write each answer under Decisions as `<question> → <answer> (user | auto)`.
- The grill ends when `grilling` asks to confirm shared understanding and gets a yes. That yes is the
  go-ahead for the whole task: no other stop comes before the checkpoint after code.
- `grilling` missing → stop and tell the user to install it:
  `/plugin install mattpocock-skills@claude-plugins-official`

### Auto-answer

The user turns it on with "auto-answer" (or "auto") in the input or in any grill reply.
- The **decider** (`roles.md`) answers each round in place of the user, from the code, the guides and the
  recommended answers. Mark those answers `(auto)`.
- **Scope stays with the user.** The first question (what to build, what is out) goes to the user when the
  input does not settle it, or when the feature already exists. Auto-answer starts after it.
- The decider also gives the final yes, so the grill ends without a stop.
- Show each auto-answered round to the user, one line per question, so the choices are on record.

## 4. Draft

Write `<work folder>/NNN-<slug>/plan.md` in this shape. Skip a section that has nothing.

```markdown
# NNN · <Title>
- Phase: 0 · Apps: <apps> · Target: <MR/PR target or "not known yet"> · Next: <one line>

## Goal
- <one line>

## Accept
- <testable result, with the exact user-facing message when there is one>

## Decisions
- <question> → <answer> (user | auto | spec verify: <rule> | decider)

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

1. Start one fresh **spec verifier** per changed app (`roles.md`), all at once. They only read.
2. A plan that touches another repo → one more verifier per repo.
3. The main agent applies every fix to the plan itself and notes it under Decisions. A finding it disagrees with → the decider.
4. A finding that changes scope or a user decision → back to the grill for that one question.
5. A verifier never becomes that app's owner later.

Then set the status line to `Phase: 1` and go straight to Phase 1. The checkpoint report names the plan
path and lists the decisions that spec verify or the decider made.
