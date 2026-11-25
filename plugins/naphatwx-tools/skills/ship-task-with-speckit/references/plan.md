# Phase 1: Plan

Spec Kit writes every plan file. The main agent runs the Spec Kit skills in order, feeds them the
project's rules, and fixes the files they write. Phase 1 edits nothing but the task folder and `.specify/`.

## 1. Explore

Map the code before anything else: facts the code answers are never questions.
- Use the `Explore` sub-agent in Claude Code (any read-only sub-agent elsewhere). It reads the root guide,
  the constitution (`.specify/memory/constitution.md`), the guides of the areas the task touches, and that code.
- It returns a short map, not file dumps: files and symbols, current behavior, existing tests, docs, gaps.
- It also returns **Rules that apply**: each guide rule, constitution principle, ADR and existing code
  pattern that settles a choice in this task, with its source, like `<folder>/AGENTS.md → <section>` or
  `path/to/similar-file:42`.
- One agent. More only when the task spans unrelated areas, one per area, all at once.

## 2. Specify

Run `speckit-specify` with the user's input, then a `Rules that apply:` block with the list from step 1.
- It makes `specs/NNN-slug/` and `spec.md`. Note the folder and write it to `.specify/feature.json`.
- Create `status.md` from [status-template.md](../assets/status-template.md) and say the number in one line: "Task: 043-users-csv-export".
- A bug fix is a spec like any other: the user story is the broken behavior, fixed; the cause goes in
  `## Assumptions` or the plan's research.

## 3. Clarify rounds

Run `speckit-clarify`. Repeat it until it reports no open question, or every open one is deferred.
- **Rule check, each round.** Before the user sees a question, check it in this order:
  1. **Rules.** The Rules that apply list, then the guides, the constitution and ADRs.
  2. **No rule → a similar feature.** Find an existing feature that solves the same kind of problem and see
     how it settles this point.
  - One read-only sub-agent does the lookups for all such questions in the round.
  - Answered → give that answer to `speckit-clarify` yourself, ending `(rule: <source>)`.
  - Otherwise → ask the user. Two sources of the same rank that disagree don't answer it.
    Where this task differs from the similar feature, that point is a question.
  - Show the settled ones with their source, so the user can overrule one.
- The user may defer a question ("answer later"). Write it in `status.md` under Open, with who decides and
  the phase or task it blocks. Only the user can defer; the decider never does.

### Auto-answer

The user turns it on with "auto-answer" (or "auto") in the input or in any reply.
- The **decider** (`roles.md`) answers each question in place of the user, from the code, the guides and the
  recommended answer. End each answer `(auto)`.
- **Scope stays with the user.** The first question (what to build, what is out) goes to the user when the
  input does not settle it, or when the feature already exists. Auto-answer starts after it.
- Show each auto-answered round to the user, one line per question, so the choices are on record.

## 4. Plan

Run `speckit-plan` with the technical context: the stack, folders and patterns from step 1, and the
profile's apps. It writes `plan.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md`
as needed.
- Its Constitution Check must pass. A failed check → fix the plan, or ask the user when only a rule change
  would fix it.
- `quickstart.md` is what the user runs at the checkpoint: each step names the requirement it shows.

## 5. Tasks

Run `speckit-tasks` with these lines in its input:
- `Include test tasks for every user story. Mark each test task [TEST].`
- `Tag each task with its app from the profile: [<app>]. A task outside every app gets [main].`
- `Each task cites the requirement ids it covers (FR-###, SC-###).`
- `Every functional requirement and edge case gets at least one code task and one [TEST] task.`

## 6. Analyze and spec verify

Two checks, started together:
- Run `speckit-analyze`. It reads `spec.md`, `plan.md` and `tasks.md` and reports gaps and conflicts. It
  edits nothing.
- Start one fresh **spec verifier** per changed scope (`roles.md` → Scope), all at once. They only read. They
  check the plan files against the guides and the real code: paths, symbols, fields, patterns, helpers to
  reuse. A plan that touches another repo → one more verifier per repo.

Then:
1. The main agent applies every fix to the plan files itself and adds one line per fix to `log.md`. A
   finding it disagrees with → the decider.
2. A finding that changes scope or a user answer → back to step 3 for that one question.
3. Run `speckit-analyze` again until it reports no CRITICAL or HIGH finding.
4. A verifier never becomes an owner of that scope later.

## 7. Plan stop

Set the `status.md` status line to `Phase: 1 · … · Next: say "implement"` and fill `## Status`, then stop and
end the turn. Report:

- The task folder and the files written in it.
- What will be built: the goal, the user stories and the functional requirements, in short.
- What changes per app, and the task count per app.
- The answers the user did not give (auto, rule, decider), one short line each, so the user can overrule one.
- The open questions and what each blocks.
- The analyze findings left (MEDIUM, LOW), and the top risks.

Then wait.
- "implement" → set the status line to `Phase: 2` and go to Phase 2.
- Changes → a new question goes back to step 3, a spec change to step 2 (`speckit-specify` updates
  `spec.md`), a technical change to step 4; then steps 5–6 for what changed, and stop here again.
- `/ship-task-with-speckit <number>` on a task at this stop shows the summary again and waits.
