# Phase 1: Plan

The main agent writes the plan straight to the task folder. It edits nothing but the plan. Two stops:
the grill, and the plan summary at the end. Code starts only when the user says "implement".

## 1. Number and folder

- Task folder: `tasks/NNN-<slug>/`, with the next number from Setup (`SKILL.md` → Start).
  Slug: 2–4 words, like `bucket-csv-export`. The number is how the user refers to the task ("continue 195").

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
- **Rule check, each round.** Before the user sees a round, check every question against the Rules that apply
  list. A question the list does not cover but a lookup could → one read-only sub-agent checks the guides,
  the ADRs and similar code, for all such questions in the round.
  - Priority: a written rule (guide, ADR) beats a code pattern. Check the written rules first.
  - Answered → don't ask. Write it under Decisions as `(rule: <file:line or guide section>)`.
  - Otherwise → ask. Two sources of the same rank that disagree don't answer it.
  - Show the settled ones at the top of the round, each with its source, so the user can overrule one.
- Write each answer under Decisions as `D# <question> → <answer> (user | auto)`.
- The user may defer a question ("answer later"). Write it under Open questions with who decides and the
  phase or task it blocks. Only the user can defer; the decider never does.
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

Write `tasks/NNN-<slug>/plan.md` from a template. Keep its section order.

- **Pick the size.**
  - A bug fix with one cause → [plan-template-fix.md](../assets/plan-template-fix.md). Grow it into the full shape only when the fix needs a decision, a contract change or a migration.
  - Anything else → [plan-template.md](../assets/plan-template.md).
- **Required sections** (full shape): header, Goal, Status, Accept, Decisions, Tasks. Every other section and every `Data / API` sub-section is written only when it has content; delete it otherwise. Never write `- None.`
- **One fact, one place.** A changed fact is replaced where it lives, with `(supersedes "<old>")`. Never keep old text, rounds or history.
- **No restating.** A section never repeats another one in other words. When the task folder has `plan/api/` or `plan/database/` files, `Data / API` links them and keeps only what they lack.
- **IDs:** A# accept, E# edge case, D# decision, Q# open question, R# risk, T# task. IDs never change once given; a dropped item keeps its number free.
- **Accept:** each line is testable and names the role when it matters. A refusal gives its reason and exact message. Tag each line `(new)`, `(changed)` or `(removed)` against what the app does today; a `(changed)` line says `Before: …`.
- **Edge cases:** failure paths, outside systems that refuse or time out, two users at once, data that is missing.
- **Out of scope:** everything the grill left out, every "not in v1" and every known gap, with its source.
- **Context:** facts the design rests on (counts, sizes, limits, current code behaviour, outside systems it relies on), each with the date and where it was checked. Facts go here, not in Decisions.
- **Decisions:** grouped by topic, one line each, with a source: `(user | auto | rule: <source> | spec verify: <app> | decider)`. Mark a decision that needs a decision record `[ADR]` and add one line `why: … · rejected: …`; write `rejected: not recorded` rather than guess.
- **Open questions:** only a question the user chose to defer. Each says who decides and the phase or task it blocks.
- **Rules check:** only the project rules (the profile's `Rules check`, plus the Rules that apply list) not yet settled by a Decision, each saying when it gets checked. A settled rule lives on its decision as `(rule: …)`; delete its line here.
- **Changes per app:** paths, marked `(new)` or `(edit)` when known.
- **Status flow:** every entity with a status gets one diagram with every move and its trigger.
- **Risks:** each ends in `→ mitigation: …` or `→ accepted (<who, date>)`.
- **Tasks:** grouped by phase. Each task names one app, cites the A#, D# and E# it covers, and ends `· after: T###` when it waits on another; `after:` is the only record of order. Test tasks carry `[TEST]`; Phase 2 skips them, Phase 3 does them.
- **Verify locally:** the steps the user runs at the checkpoint, each citing the A# it shows.
- **Release & rollback:** what must exist before deploy, merge order across repos, the first check after deploy, and how to undo it.
- Every A# and E# has at least one code task and one test task.

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

Set the status line to `Phase: 1 · … · Next: say "implement"` and fill `## Status`, then stop and end the turn. Report:

- The plan path.
- What will be built: the goal and the Accept lines, in short.
- What changes per app, and the task count per app.
- The decisions the user did not make (auto, spec verify, decider).
- The rule-settled decisions, one short line each, so the user can overrule one.
- The `[ADR]` decisions whose `rejected:` says `not recorded`, so the user can fill them.
- The open questions and what each blocks.
- The top risks, and any Rules check line.

Then wait.
- "implement" → set the status line to `Phase: 2` and go to Phase 2.
- Changes → a new decision goes back to the grill for that question, a wording or scope fix back to step 4;
  run spec verify again only for the apps the change touches, then stop here again.
- `/ship-task <number>` on a task at this stop shows the summary again and waits.
