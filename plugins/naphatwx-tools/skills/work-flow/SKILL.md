---
name: work-flow
description: Carry one feature, bug fix or hotfix from idea to a merge-ready branch in fixed phases - spec, code, a stop for the user, tests, review, docs, pre-merge gate. A Small path trims it for one-app tasks. Works on any project. Run it as "/work-flow <what you want>" or "/work-flow <spec-folder>" to resume. Slash only.
argument-hint: <what-you-want | spec-folder [phase] | (empty = status)>
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
Phase 0  Spec       spec.md → spec verify (Full only)
Phase 1  Routing    split tasks per app, find the order (Full only)
Phase 2  Code       code only: no test files, no checks
   ■ USER CHECKPOINT: always stop here
Phase 3  Tests      write tests, run nothing
Phase 4  Review     fresh reviewer per app (+ cross-app check, Full only), fix in one batch
Phase 5  Docs       update the docs the profile lists, final summary
Phase 6  Pre-merge  merge the target branch in, fix numbers, then THE gate
```

Phases 1–3 and the checkpoint are below. For the others, read **only the reference file for the phase you are entering**.

| Phase | Read |
|---|---|
| Start, any phase | [references/profile.md](references/profile.md), [references/roles.md](references/roles.md) |
| 0 | [references/spec.md](references/spec.md) |
| 4, 5 | [references/review-docs.md](references/review-docs.md) |
| 6, or a gate the user asks for | [references/pre-merge.md](references/pre-merge.md) |

## Start

1. **Parse the input.**
   - Empty → find `flow.md` files in spec folders (see below), list each task with its phase and next step, ask which to pick up. Stop.
   - A spec folder that holds `flow.md` → resume at its phase. A phase name after it (`spec`, `code`, `tests`, `review`, `docs`, `pre-merge`) re-runs that phase, only if `flow.md` shows the task already reached it.
   - Anything else → a new task. The whole input is what the user wants.
2. **Load the project profile** (`references/profile.md`). Missing parts → ask once, then go on.
3. **New task only: ask the mode and confirm the size** in one question. Use AskUserQuestion when the agent has it, else ask in chat:
   - **Autopilot**: run Phases 0–2 without questions, then stop at the checkpoint.
   - **Manual**: ask the user at every review and decision point.
   - **Size**: propose Small or Full (below) with a one-line reason; the user confirms.
4. Write `flow.md` in the spec folder as soon as Phase 0 creates it, and update it at the end of every phase:

```markdown
# Flow
- Mode: Autopilot | Manual
- Size: Small | Full
- Phase: 0 | 1 | 2 | checkpoint | 3 | 4 | 5 | 6 | done
- Apps: <apps this task changes>
- Target branch: <from the open MR/PR, or "not known yet">
- Next: <one line>
```

## Small or Full

**Small** = every one of these is true. Anything else is **Full**.

- Only one app changes.
- No shared contract changes (proto, API shape, queue or event name, shared types).
- No file in a numbered folder (migrations and the like).
- No new permission.

| Step | Small | Full |
|---|---|---|
| `spec.md` | short shape (`spec.md` reference) | full shape |
| Spec verify | skip | run |
| Decider (Autopilot) | skip: ask the user, even in Autopilot | run |
| Phase 1 routing | skip | run |
| Code, checkpoint, tests | run | run |
| Review | one fresh reviewer | one per app |
| Cross-app check | skip | run |
| Docs | only when behavior changed | run |
| Number check | skip | run |
| Phase 6 gate | run, one app | run |

- The checkpoint, tests after the user confirms, a fresh reviewer and the Phase 6 gate never skip.
- **Upgrade:** the task grows past Small (a second app, a contract, a migration) → stop, tell the user, set `Size: Full` and go back to Phase 0 to add the missing parts.

## Phase 1: Routing (Full only)

1. Group the non-`[TEST]` tasks by app.
2. Order: with codegen in the profile, the app that owns the contract goes first; the others start after it. Apps with no link start at the same time.
3. Edits outside any app (root config, compose, env examples) → the main agent does them.

## Phase 2: Code

1. Start one **owner** per app, `MODE: code` (`roles.md`), with its task ids, the spec folder, its folder and guide, and its codegen command if any. Independent owners go in one message.
2. Keep each owner's id: a later fix goes back to the same instance (SendMessage when the agent has it).
3. Follow-up owners from the profile start after their app's owner, `MODE: code`.
4. An owner reports an edit outside its folder → route it to that folder's owner, or do it yourself if it is main-agent territory.
5. Tick the done tasks. Manual: report each app as it finishes.

## User checkpoint

Stop and end the turn. Report:

- What was built and the files changed, per app.
- How to try it by hand: the screen or endpoint, and the steps. Mention the `play-scenarios` skill if the task has use cases.
- Plainly: no tests are written yet and no build, lint or typecheck has run. The user can ask for a gate at any time.

Then wait. "continue" / "review" → Phase 3. Change requests → same owners, back to Phase 2 (Phase 0 if the spec changes), then stop here again.

## Phase 3: Tests

1. **Unit tests**: one owner per changed app, `MODE: tests`, the same instance when it is still reachable. Scope: the files it changed plus its `[TEST]` tasks.
2. **Integration tests**: if the profile has them, the integration test owner, `MODE: tests`, for the added or changed behavior. Use the project's test skill or guide.
3. A test that cannot pass without a code change is a real bug: report it and fix the code in Phase 4, never the test.
4. Tick the `[TEST]` tasks. Report what was written, per app.

## Hard rules

- **The checkpoint after Phase 2 always stops**, in Autopilot too. End the turn. Go on only when the user says so ("continue", "review").
- **Phases 0–5 run no checks and no tests.** No build, lint, typecheck, unit test or integration test. The only automatic gate is in Phase 6.
- **A gate the user asks for runs at any time.** Report the result and stop. Do not fix unless asked.
- **Phase 2 never creates or edits a test file.** Tests come in Phase 3, after the user confirms the behavior.
- **The main agent orchestrates.** App code is changed by an app owner sub-agent (`references/roles.md`), even a one-line edit. The main agent edits only the spec folder, `flow.md`, root config and docs.
- **Keep it flat.** Only the main agent starts sub-agents. Owners, reviewers and gate runners never start their own.
- **A reviewer is always a fresh instance.** The instance that wrote the code never reviews it or verifies its spec.
- **One code round per phase.** Plan every edit across every app, then start all owners at once.
- **No commit, push or merge** unless the user asks, except the Phase 6 merge of the target branch, which the user started by entering Phase 6.
- **Never fix a pre-existing failure inside the task.** Report it as a separate task.

## Autopilot vs Manual

| Step | Autopilot | Manual |
|---|---|---|
| Questions in Phase 0 | the **decider** sub-agent answers (Small: ask the user) | ask the user, wait |
| `spec.md` review | decider reviews; revise until it approves (Small: the user) | present it, wait |
| Spec verify findings (Full) | fix them; disputed ones go to the decider | present, fix the confirmed ones |
| Before Phase 2 | go on | ask "start coding?" |
| Checkpoint, Phases 3–6 | same in both modes | same in both modes |

- Autopilot never leaves `[NEEDS CLARIFICATION]` markers, and asks the user before the checkpoint only on the Small path.
- Autopilot: a step that fails or loops more than 3 times → stop and report the blocker.
- Manual: give options and a recommendation; the user decides.

## Agents without sub-agents

If the agent cannot start sub-agents, run each role yourself, one app at a time:

- Before each role, re-read that app's guide file.
- For a review, read only the diff and the rules, as if you had not written the code.
- Say in the report that roles ran in one context.
