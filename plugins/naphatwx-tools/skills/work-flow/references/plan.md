# Phase 1: Plan

The main agent writes the plan straight to the task folder. It edits nothing but the plan. Two stops:
the grill, and the plan summary at the end. Code starts only when the user says "implement".

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
- It also returns **Rules that apply**: each guide rule, ADR and existing code pattern that settles a choice
  in this task (pagination fields, error text, naming, permissions), with its source, like
  `apps/<app>/AGENTS.md → Pagination` or `path/to/similar.go:42`.
- One agent. More only when the task spans unrelated areas, one per area, all at once.

## 3. Grill

Run the `grilling` skill (`mattpocock-skills:grilling` in Claude Code) on the task. Not `grill-me`: that one
only the user can start. Rounds go on until no decision is left open.
- Give `grilling` the Rules that apply list when you start it: it sees only what is in its context.
- **Rule filter, before every round.** A question the project already answers (a guide rule, an ADR, an
  existing code pattern) is not asked. Write it under Decisions as `(rule: <source>)` instead.
  Ask it only when two rules conflict, or when the task has to break a rule.
- Write each answer under Decisions as `<question> → <answer> (user | auto)`.
- The grill ends when `grilling` asks to confirm shared understanding and gets a yes. That yes ends the
  grill only: go straight on to step 4. The go-ahead to code is "implement" in step 6.
- `grilling` missing → stop and tell the user to install it:
  `/plugin install mattpocock-skills@claude-plugins-official`

### Auto-answer

The user turns it on with "auto-answer" (or "auto") in the input or in any grill reply.
- The **decider** (`roles.md`) answers each round in place of the user, from the code, the guides and the
  recommended answers. Mark those answers `(auto)`.
- **Scope stays with the user.** The first question (what to build, what is out) goes to the user when the
  input does not settle it, or when the feature already exists. Auto-answer starts after it.
- The decider also gives the final yes, so the grill ends without a stop. The plan stop in step 6 still stops.
- Show each auto-answered round to the user, one line per question, so the choices are on record.

## 4. Draft

Write `<work folder>/NNN-<slug>/plan.md` in this shape. Skip a section that has nothing.

```markdown
# NNN · <Title>
- Phase: 1 · Apps: <apps> · Target: <MR/PR target or "not known yet"> · Next: <one line>

## Goal
- <one line>

## Accept
- <testable result, with the exact user-facing message when there is one>

## Decisions
- <question> → <answer> (user | auto | rule: <source> | spec verify: <rule> | decider)

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

## 6. Plan stop

Set the status line to `Phase: 1 · … · Next: say "implement"`, then stop and end the turn. Report:

- The plan path.
- What will be built: the goal and the Accept lines, in short.
- What changes per app, and the task count per app.
- The decisions the user did not make (auto, spec verify, decider).
- The rule-settled decisions, one short line each, so the user can overrule one.
- The top risks.

Then wait.
- "implement" → set the status line to `Phase: 2` and go to Phase 2.
- Changes → a new decision goes back to the grill for that question, a wording or scope fix back to step 4;
  run spec verify again only for the apps the change touches, then stop here again.
- `/work-flow <number>` on a task at this stop shows the summary again and waits.
