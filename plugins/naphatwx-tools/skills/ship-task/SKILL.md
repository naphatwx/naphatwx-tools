---
name: ship-task
description: Carry one feature, bug fix or hotfix from idea to a merge-ready branch in fixed phases - plan (grilling, with an optional auto-answer), a plan stop, code, a stop for the user, tests, review, docs, pre-merge gate. The plan is saved as tasks/NNN-slug/plan.md. Works on any project. Run it as "/ship-task <what you want>", or "/ship-task <number>" to resume. Slash only.
argument-hint: <what-you-want | task number [phase] | (empty = status)>
disable-model-invocation: true
---

# Work Flow

Take one task from idea to a merge-ready branch. Same phases on every project.
The project's own rules come from its guide files and its **flow profile**.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

## Phases

```text
Setup               tasks/ at the project root
Phase 1  Plan       grilling (YOU, or auto-answer) → draft plan.md → spec verify
   ■ PLAN STOP: summary of the plan; "implement" to go on
Phase 2  Code       tasks by app tag, contract owner first; code only: no test files, no checks
   ■ USER CHECKPOINT: always stop here
Phase 3  Tests      write tests, run nothing
Phase 4  Review     fresh reviewer per app + cross-app check, fix in one batch
Phase 5  Docs       update the docs the profile lists, final summary
Phase 6  Pre-merge  merge the target branch in, fix numbers, then THE gate
```

Phases 2–3 and the checkpoint are below. For the others, read **only the reference file for the phase you are entering**.

| Phase | Read |
|---|---|
| Start, any phase | [references/profile.md](references/profile.md), [references/roles.md](references/roles.md) |
| 1, or any edit to a plan | [references/plan.md](references/plan.md), then the template it picks |
| 4, 5 | [references/review-docs.md](references/review-docs.md) |
| 6, or a gate the user asks for | [references/pre-merge.md](references/pre-merge.md) |

## Start

1. **Setup**, before anything else. Work folder: the `Work folder` in a saved `## Flow profile`, else `tasks/`, at the repo root (`git rev-parse --show-toplevel`).
   - Missing → create it and say so in one line.
2. **Parse the input.**
   - Empty → list every `<work folder>/*/plan.md` not at `Phase: done`, with its number, phase and next step; ask which to pick up. Stop.
   - A task number (`195`) or a task folder → resume at the phase in its `plan.md` status line. A phase name after it (`plan`, `code`, `tests`, `review`, `docs`, `pre-merge`) re-runs that phase, only if the task already reached it.
   - Anything else → a new task. The whole input is what the user wants.
3. **Load the project profile** (`references/profile.md`). Missing parts → ask once, then go on.
4. **Status**: at the end of every phase, update three things in `plan.md`:
   - Line 2, the status line: `- Phase: 1 | 2 | checkpoint | 3 | 4 | 5 | 6 | done · Apps: <apps> · Target: <branch> · Next: <one line>`
   - Line 3: `- Branch: <branch per repo> · Updated: <today>`
   - `## Status`: what is done, what is written but not run, open questions and reviews, the next steps. A new session resumes from it.
5. **Old plans.** A `plan.md` without `## Status` or IDs (A#, D#, T#), or with `## Order` or `## Dependencies & assumptions`, is an older shape. Before its next phase, offer once to move it to the current template (`references/plan.md` → 4. Draft). Move it only on a yes: renumber, regroup, keep every fact.

## Phase 2: Code

1. **Split by app tag.** Group the non-`[TEST]` tasks by their `[app]` tag. Tasks outside any app (root config, compose, env examples) → the main agent does them.
2. **Order.** Follow each task's `after:`. With codegen in the profile, the owner of the contract app goes first; the apps that use the contract start after it. Apps with no link start at the same time.
3. Start one **owner** per app, `MODE: code` (`roles.md`), with its task ids, the path to `plan.md`, its folder and guide, and its codegen command if any. Owners that start at the same time go in one message.
4. Keep each owner's id: a later fix goes back to the same instance (SendMessage when the agent has it).
5. Follow-up owners from the profile start after their app's owner, `MODE: code`.
6. An owner reports an edit outside its folder → route it to that folder's owner, or do it yourself if it is main-agent territory.
7. Tick the done tasks.

## User checkpoint

Stop and end the turn. Report:

- The plan path.
- What was built and the files changed, per app.
- How to try it by hand: the plan's `## Verify locally` steps, updated to what was built. Mention the `play-scenarios` skill if the task has use cases.
- Plainly: no tests are written yet and no build, lint or typecheck has run. The user can ask for a gate at any time.

Then wait. "continue" / "review" → Phase 3. Change requests → same owners, back to Phase 2 (Phase 1 if the plan changes), then stop here again.

## Phase 3: Tests

1. **Unit tests**: one owner per changed app, `MODE: tests`, the same instance when it is still reachable. Scope: the files it changed plus its `[TEST]` tasks, covering every A# and E# those tasks cite.
2. **Integration tests**: if the profile has them, the integration test owner, `MODE: tests`, for the added or changed behavior. Use the project's test skill or guide.
3. A test that cannot pass without a code change is a real bug: report it and fix the code in Phase 4, never the test.
4. Tick the `[TEST]` tasks. Report what was written, per app.

## Hard rules

- **The flow runs on its own** except for three stops: the grill in Phase 1 (none with auto-answer, after scope), the plan stop, and the checkpoint.
- **The plan stop always stops.** Code starts only when the user says "implement".
- **Phase 1 edits nothing but the plan.** Do not use plan mode: its exit asks for an approval this flow does not have.
- **The checkpoint after Phase 2 always stops.** End the turn. Go on only when the user says so ("continue", "review").
- **Phases 1–5 run no checks and no tests.** No build, lint, typecheck, unit test or integration test. The only automatic gate is in Phase 6.
- **A gate the user asks for runs at any time.** Report the result and stop. Do not fix unless asked.
- **Phase 2 never creates or edits a test file.** Tests come in Phase 3, after the user confirms the behavior.
- **The main agent orchestrates.** App code is changed by an app owner sub-agent (`references/roles.md`), even a one-line edit. The main agent edits only the work folder, root config and docs.
- **Keep it flat.** Only the main agent starts sub-agents. Owners, reviewers and gate runners never start their own.
- **A reviewer is always a fresh instance.** The instance that wrote the code never reviews it or verifies its plan.
- **One code round per phase.** Plan every edit across every app, then start all owners at once.
- **No commit, push or merge** unless the user asks, except the Phase 6 merge of the target branch, which the user started by entering Phase 6.
- **Never fix a pre-existing failure inside the task.** Report it as a separate task.

## Decisions without the user

- Spec verify findings: the main agent fixes them itself. One it disagrees with → the **decider** (`roles.md`), whose call is final.
- Never leave an open question in the plan: the grill asks it. Only the user can defer one; it goes under `## Open questions` with what it blocks.
- The project's rules answer convention questions (guides, ADRs, existing patterns). The grill never asks them; the plan marks them `(rule: <source>)`.
- Auto-answer: the decider answers grill rounds after the user settles scope (`references/plan.md`).
- A step that fails or loops more than 3 times → stop and report the blocker.

## Agents without sub-agents

If the agent cannot start sub-agents, run each role yourself, one app at a time:

- Before each role, re-read that app's guide file.
- For a review, read only the diff and the rules, as if you had not written the code.
- Say in the report that roles ran in one context.
