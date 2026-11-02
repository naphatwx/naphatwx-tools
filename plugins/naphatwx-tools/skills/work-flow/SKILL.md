---
name: work-flow
description: Carry one feature, bug fix or hotfix from idea to a merge-ready branch in fixed phases - plan (plan mode + grill-me), code, a stop for the user, tests, review, docs, pre-merge gate. The approved plan is saved as .work/NNN-slug/plan.md. Works on any project. Run it as "/work-flow <what you want>", or "/work-flow <number>" to resume. Slash only.
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
Phase 0  Plan       plan mode: grill-me (YOU) → draft → spec verify → YOU approve → plan.md
Phase 1  Routing    split tasks per app, find the order
Phase 2  Code       code only: no test files, no checks
   ■ USER CHECKPOINT: always stop here
Phase 3  Tests      write tests, run nothing
Phase 4  Review     fresh reviewer per app + cross-app check, fix in one batch
Phase 5  Docs       update the docs the profile lists, final summary
Phase 6  Pre-merge  merge the target branch in, fix numbers, then THE gate
```

Phases 1–3 and the checkpoint are below. For the others, read **only the reference file for the phase you are entering**.

| Phase | Read |
|---|---|
| Start, any phase | [references/profile.md](references/profile.md), [references/roles.md](references/roles.md) |
| 0 | [references/plan.md](references/plan.md) |
| 4, 5 | [references/review-docs.md](references/review-docs.md) |
| 6, or a gate the user asks for | [references/pre-merge.md](references/pre-merge.md) |

## Start

1. **Parse the input.**
   - Empty → list every `<work folder>/*/plan.md` not at `Phase: done`, with its number, phase and next step; ask which to pick up. Stop.
   - A task number (`195`) or a task folder → resume at the phase in its `plan.md` status line. A phase name after it (`plan`, `code`, `tests`, `review`, `docs`, `pre-merge`) re-runs that phase, only if the task already reached it.
   - Anything else → a new task. The whole input is what the user wants.
2. **Load the project profile** (`references/profile.md`). Missing parts → ask once, then go on.
3. **Status line**: the second line of `plan.md`. Update it at the end of every phase:
   `- Phase: 0 | 1 | 2 | checkpoint | 3 | 4 | 5 | 6 | done · Apps: <apps> · Target: <branch> · Next: <one line>`

## Phase 1: Routing

1. Group the non-`[TEST]` tasks by app.
2. Order: with codegen in the profile, the app that owns the contract goes first; the others start after it. Apps with no link start at the same time.
3. Edits outside any app (root config, compose, env examples) → the main agent does them.

## Phase 2: Code

1. Start one **owner** per app, `MODE: code` (`roles.md`), with its task ids, the path to `plan.md`, its folder and guide, and its codegen command if any. Independent owners go in one message.
2. Keep each owner's id: a later fix goes back to the same instance (SendMessage when the agent has it).
3. Follow-up owners from the profile start after their app's owner, `MODE: code`.
4. An owner reports an edit outside its folder → route it to that folder's owner, or do it yourself if it is main-agent territory.
5. Tick the done tasks.

## User checkpoint

Stop and end the turn. Report:

- What was built and the files changed, per app.
- How to try it by hand: the screen or endpoint, and the steps. Mention the `play-scenarios` skill if the task has use cases.
- Plainly: no tests are written yet and no build, lint or typecheck has run. The user can ask for a gate at any time.

Then wait. "continue" / "review" → Phase 3. Change requests → same owners, back to Phase 2 (Phase 0 if the plan changes), then stop here again.

## Phase 3: Tests

1. **Unit tests**: one owner per changed app, `MODE: tests`, the same instance when it is still reachable. Scope: the files it changed plus its `[TEST]` tasks.
2. **Integration tests**: if the profile has them, the integration test owner, `MODE: tests`, for the added or changed behavior. Use the project's test skill or guide.
3. A test that cannot pass without a code change is a real bug: report it and fix the code in Phase 4, never the test.
4. Tick the `[TEST]` tasks. Report what was written, per app.

## Hard rules

- **The flow runs on its own** except for three stops: the grill in Phase 0, the plan approval, and the checkpoint.
- **Phase 0 edits nothing but the plan.** Plan mode enforces it; agents without plan mode keep to it themselves.
- **The checkpoint after Phase 2 always stops.** End the turn. Go on only when the user says so ("continue", "review").
- **Phases 0–5 run no checks and no tests.** No build, lint, typecheck, unit test or integration test. The only automatic gate is in Phase 6.
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
- Never leave an open question in the plan: the grill asks it.
- A step that fails or loops more than 3 times → stop and report the blocker.

## Agents without sub-agents

If the agent cannot start sub-agents, run each role yourself, one app at a time:

- Before each role, re-read that app's guide file.
- For a review, read only the diff and the rules, as if you had not written the code.
- Say in the report that roles ran in one context.
