---
name: ship-task-with-speckit
description: Carry one feature, bug fix or hotfix from idea to a merge-ready branch in fixed phases, with Spec Kit (github/spec-kit) writing the plan and the code - plan (speckit specify, clarify, plan, tasks, analyze), a plan stop, code (speckit implement), a stop for the user, tests, review (speckit converge + fresh reviewers), docs, pre-merge gate. The plan is a specs/NNN-slug/ folder. "/ship-task-with-speckit setup" installs Spec Kit core in a repo. Works on any project. Slash only.
argument-hint: <setup | what-you-want | task number [phase] | (empty = status)>
disable-model-invocation: true
---

# Work Flow with Spec Kit

The project's own rules come from its guide files, its Spec Kit constitution and its **flow profile**.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

## Phases

```text
Setup               .specify/ in the repo (else: run "setup")
Phase 1  Plan       explore → speckit specify → clarify rounds (YOU, or auto-answer)
                    → speckit plan → speckit tasks → speckit analyze + spec verify
   ■ PLAN STOP: summary of the plan; "implement" to go on
Phase 2  Code       owners run speckit implement on their tasks; code only: no test files, no checks
   ■ USER CHECKPOINT: always stop here
Phase 3  Tests      owners run speckit implement on the [TEST] tasks; run nothing
Phase 4  Review     speckit converge + fresh reviewers + cross-app check, fix in one batch
Phase 5  Docs       update the docs the profile lists, final summary
Phase 6  Pre-merge  merge the target branch in, fix numbers, then THE gate
```

Phases 2–3 and the checkpoint are below. For the others, read **only the reference file for the phase you are entering**.

| Phase | Read |
|---|---|
| `setup` | [references/setup.md](references/setup.md) |
| Start, any phase | [references/profile.md](references/profile.md), [references/roles.md](references/roles.md) |
| 1, or any edit to a plan | [references/plan.md](references/plan.md) |
| 4, 5 | [references/review-docs.md](references/review-docs.md) |
| 6, or a gate the user asks for | [references/pre-merge.md](references/pre-merge.md) |

## Spec Kit skills

- Spec Kit installs its skills into the repo (`speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-analyze`, `speckit-implement`, `speckit-converge`, ...). Run each with the agent's own syntax: `/speckit-specify <text>` in Claude Code.
- The phase decides what a skill may do. Each call passes the limits of its phase in its input ("run no build, lint, typecheck or test", "skip [TEST] tasks").
- A skill that stops to ask the user (a checklist gate, a question) → pass the question to the user, or to the decider under auto-answer (`references/plan.md`).
- Before any skill call on a task, write its folder to `.specify/feature.json` (`{ "feature_directory": "specs/NNN-slug" }`), so the skill works on that task.

## Start

1. **Parse the input.**
   - `setup` → follow `references/setup.md`. Stop.
   - Empty → list every `specs/*/status.md` not at `Phase: done`, with its number, phase and next step; ask which to pick up. Stop.
   - A task number (`043`) or a task folder → resume at the phase in its `status.md`. A phase name after it (`plan`, `code`, `tests`, `review`, `docs`, `pre-merge`) re-runs that phase, only if the task already reached it.
   - Anything else → a new task, feature or bug fix alike. The whole input is what the user wants.
2. **Spec Kit check.** No `.specify/` at the repo root (`git rev-parse --show-toplevel`), or no `speckit-*` skills for this agent → stop: "Spec Kit is not set up here. Run `/ship-task-with-speckit setup`."
3. **Load the project profile** (`references/profile.md`). Missing parts → ask once, then go on.
4. **Status**: at the end of every phase, update `specs/NNN-slug/status.md` ([assets/status-template.md](assets/status-template.md)):
   - Line 2, the status line: `- Phase: 1 | 2 | checkpoint | 3 | 4 | 5 | 6 | done · Apps: <apps> · Target: <branch> · Next: <one line>`
   - Line 3: `- Branch: <branch per repo> · Updated: <today>`
   - `## Status`: what is done, what is written but not run, open questions and reviews, the next steps. A snapshot: replace its lines, never add to them. A new session resumes from it.
   - History (what changed, test runs, things found) goes to `log.md` in the same folder, 1–3 dated lines per phase.
5. **Task files.** `status.md` is read on every resume. Read the Spec Kit files (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`) only when the step needs them; never read `log.md` to resume.

## Phase 2: Code

1. **Split into scopes.** Split the non-`[TEST]` tasks in `tasks.md` into owner scopes by the profile's `Agent split` (`references/profile.md`). Tasks outside every scope (root config, env examples) → the main agent does them.
2. **Order.** Follow the phases and dependencies in `tasks.md`. With codegen in the profile, the owner of the contract scope goes first; the scopes that use the contract start after it. Scopes with no link start at the same time.
3. Start one **owner** per scope, `MODE: code` (`roles.md`), with its task ids, the path to the task folder, its scope's folders and guides, and its codegen command if any. Add one line to its prompt: `Use: the speckit-implement skill, for these task ids only; skip [TEST] tasks; run no build, lint, typecheck or test.` Owners that start at the same time go in one message.
4. Keep each owner's id: a later fix goes back to the same instance (SendMessage when the agent has it).
5. Follow-up owners from the profile start after the owner of their scope, `MODE: code`.
6. An owner reports an edit outside its scope → route it to that scope's owner, or do it yourself if it is main-agent territory.
7. Check that the done tasks are ticked in `tasks.md`.

## User checkpoint

Stop and end the turn. Report:

- The task folder path.
- What was built and the files changed, per scope. Name any file Spec Kit touched outside the plan (ignore files, config).
- How to try it by hand: the steps in `quickstart.md`, updated to what was built. Mention the `play-scenarios` skill if the task has use cases.
- Plainly: no tests are written yet and no build, lint or typecheck has run. The user can ask for a gate at any time.

Then wait. "continue" / "review" → Phase 3. Change requests → same owners, back to Phase 2 (Phase 1 if the spec changes), then stop here again.

## Phase 3: Tests

1. **Unit tests**: the owner of each changed scope, `MODE: tests`, the same instance when it is still reachable. Its prompt adds: `Use: the speckit-implement skill, for these [TEST] task ids only; write the tests, run nothing.` It covers the files it changed and every requirement its `[TEST]` tasks cite.
2. **Integration tests**: if the profile has them, the integration test owner, `MODE: tests`, for the added or changed behavior. Use the project's test skill or guide.
3. A test that cannot pass without a code change is a real bug: report it and fix the code in Phase 4, never the test.
4. Check that the `[TEST]` tasks are ticked. Report what was written, per scope.

## Hard rules

- **The flow runs on its own** except for three stops: the clarify rounds in Phase 1 (none with auto-answer, after scope), the plan stop, and the checkpoint.
- **The plan stop always stops.** Code starts only when the user says "implement".
- **Phase 1 edits nothing but the task folder and `.specify/`.** Do not use plan mode: its exit asks for an approval this flow does not have.
- **The checkpoint after Phase 2 always stops.** End the turn. Go on only when the user says so ("continue", "review").
- **Phases 1–5 run no checks and no tests.** No build, lint, typecheck, unit test or integration test. The only automatic gate is in Phase 6.
- **A gate the user asks for runs at any time.** Report the result and stop. Do not fix unless asked.
- **Phase 2 never creates or edits a test file.** Tests come in Phase 3, after the user confirms the behavior.
- **The main agent orchestrates.** App code is changed by an owner sub-agent (`references/roles.md`), even a one-line edit. The main agent edits only the task folder, `.specify/`, root config and docs.
- **The repo decides the split.** How many owners, reviewers, spec verifiers and gate runners start, and what each one covers, follows the profile's `Agent split`.
- **Keep it flat.** Only the main agent starts sub-agents. Owners, reviewers and gate runners never start their own.
- **A reviewer is always a fresh instance.** The instance that wrote the code never reviews it or verifies its plan.
- **One code round per phase.** Plan every edit across every scope, then start all owners at once.
- **No commit, push or merge** unless the user asks, except the Phase 6 merge of the target branch, which the user started by entering Phase 6.
- **No Spec Kit installs inside a task.** Extensions, presets and upgrades are for `setup` or the user.
- **Never fix a pre-existing failure inside the task.** Report it as a separate task.
- **A change after `Phase: done` is a new task.** It gets its own folder and cites the old one.

## Decisions without the user

- A step that fails or loops more than 3 times → stop and report the blocker.

## Agents without sub-agents

If the agent cannot start sub-agents, run each role yourself, one scope at a time:

- Before each role, re-read the guide files of that scope.
- For a review, read only the diff and the rules, as if you had not written the code.
- Say in the report that roles ran in one context.
