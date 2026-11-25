# Phase 1: Plan

## 1. Number and folder

- Task folder: `tasks/NNN-<slug>/`, with the next number from Setup (`SKILL.md` → Start).
  Slug: 2–4 words, like `users-csv-export`. The number is how the user refers to the task ("continue 043").

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
- **Rule check, each round.** Before the user sees a round, check every question in this order:
  1. **Rules.** The Rules that apply list, then the guides and ADRs.
  2. **No rule → a similar feature.** Find an existing feature that solves the same kind of
     problem (another import, another sync) and see how it settles this point.
  - One read-only sub-agent does the lookups for all such questions in the round.
  - Answered → don't ask. Write it in `decisions.md` as `(rule: <guide section, ADR, or feature + file:line>)`.
  - Otherwise → ask. Two sources of the same rank that disagree don't answer it.
    Where this task differs from the similar feature, that point is a question.
  - Show the settled ones at the top of the round, each with its source, so the user can overrule one.
- Write each answer in `decisions.md` as `D# <question> → <answer> (user | auto)`.
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

Write the task folder `tasks/NNN-<slug>/` from the templates. Keep each template's section order.

- **Pick the size.**
  - A bug fix with one cause → [plan-template-fix.md](../assets/plan-template-fix.md): one file, `plan.md`, with its tasks inside. Grow it into the full shape only when the fix needs a decision, a contract change or a migration.
  - Anything else → the full shape, one file per kind of fact:

    | File | Holds | Template |
    |---|---|---|
    | `plan.md` | header, Goal, Status, Open questions, Rules check, Accept, Edge cases, Out of scope, Risks, Changes per app, Verify locally, Release & rollback | [plan-template.md](../assets/plan-template.md) |
    | `tasks.md` | Tasks | [tasks-template.md](../assets/tasks-template.md) |
    | `decisions.md` | Decisions | [decisions-template.md](../assets/decisions-template.md) |
    | `contracts.md` | Data / API | [contracts-template.md](../assets/contracts-template.md) |
    | `research.md` | Context: facts checked, findings | [research-template.md](../assets/research-template.md) |
    | `log.md` | dated history that git does not hold | none: `- YYYY-MM-DD {what changed}`, newest last |

- **`plan.md` is the only file read on every resume.** It links the other files on its `Files:` line; drop the link of a file that is not written. No other file links a third one.
- **Required** (full shape): `plan.md` with header, Goal, Status and Accept; `tasks.md`; `decisions.md`. Every other file, section and `contracts.md` sub-section is written only when it has content; delete it otherwise. Never write `- None.`
- **One fact, one place.** A changed fact is replaced where it lives. Never write struck text (`~~…~~`) and never keep old text or rounds; what changed goes to `log.md` as one line, like `D160 replaced the live check in A7`.
- **A decision that changes an older one** edits that D# in place. The new D# is one line: `D160 → see D158`.
- **No restating.** A section never repeats another one in other words. When the task folder has `plan/api/` or `plan/database/` files, `contracts.md` links them and keeps only what they lack.
- **IDs:** A# accept, E# edge case, D# decision, Q# open question, R# risk, T# task. IDs never change once given; a dropped item keeps its number free.
- **Accept:** each line is testable and names the role when it matters. A refusal gives its reason and exact message. Tag each line `(new)`, `(changed)` or `(removed)` against what the app does today; a `(changed)` line says `Before: …`.
- **Edge cases:** failure paths, outside systems that refuse or time out, two users at once, data that is missing.
- **Out of scope:** everything the grill left out, every "not in v1" and every known gap, with its source.
- **Research:** facts the design rests on (counts, sizes, limits, current code behaviour, outside systems it relies on), each with the date and where it was checked. Facts go here, not in Decisions.
- **Decisions:** grouped by topic, one line each, with a source: `(user | auto | rule: <source> | spec verify: <app> | decider)`. Mark a decision that needs a decision record `[ADR]` and add one line `why: … · rejected: …`; write `rejected: not recorded` rather than guess.
- **Open questions:** only a question the user chose to defer. Each says who decides and the phase or task it blocks.
- **Rules check:** only the project rules (the profile's `Rules check`, plus the Rules that apply list) not yet settled by a Decision, each saying when it gets checked. A settled rule lives on its decision as `(rule: …)`; delete its line here.
- **Changes per app:** paths, marked `(new)` or `(edit)` when known.
- **Status flow:** every entity with a status gets one diagram with every move and its trigger.
- **Risks:** each ends in `→ mitigation: …` or `→ accepted (<who, date>)`.
- **Tasks:** grouped by phase. Each task names one app, cites the A#, D# and E# it covers, and ends `· after: T###` when it waits on another; `after:` is the only record of order. Test tasks carry `[TEST]`; Phase 2 skips them, Phase 3 does them. A ticked task is cut to one line: its id, app, a title of a few words and the IDs it cites.
- **Verify locally:** the steps the user runs at the checkpoint, each citing the A# it shows.
- **Release & rollback:** what must exist before deploy, merge order across repos, the first check after deploy, and how to undo it.
- Every A# and E# has at least one code task and one test task.

## 5. Spec verify

Checks that the plan follows the project's rules and the real code: the guides, existing helpers and
components. Example: the plan builds a piece inline, a guide says "that piece is its own component" →
the plan changes to "add the component". It does not judge the requirements; the grill settled those.

1. Start one fresh **spec verifier** per changed scope (`roles.md` → Scope), all at once. They only read.
2. A plan that touches another repo → one more verifier per repo.
3. The main agent applies every fix to the plan files itself and notes it under Decisions. A finding it disagrees with → the decider.
4. A finding that changes scope or a user decision → back to the grill for that one question.
5. A verifier never becomes an owner of that scope later.

## 6. Plan stop

Set the status line to `Phase: 1 · … · Next: say "implement"` and fill `## Status`, then stop and end the turn. Report:

- The task folder and the files written in it.
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
