---
name: work-flow
description: Carry one feature, bug fix or hotfix from idea to a merge-ready branch in fixed phases - spec, code, a stop for the user, tests, review, docs, pre-merge gate. Works on any project. Run it as "/work-flow <what you want>" or "/work-flow <spec-folder>" to resume. Slash only.
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
Phase 0  Spec       speckit, or a light spec → spec verify
Phase 1  Routing    split tasks per app
Phase 2  Code       code only: no test files, no checks
   ■ USER CHECKPOINT: always stop here
Phase 3  Tests      write tests, run nothing
Phase 4  Review     1 fresh reviewer per app + cross-app check, fix in one batch
Phase 5  Docs       update the docs the profile lists, final summary
Phase 6  Pre-merge  merge the target branch in, fix numbers, then THE gate
```

Read **only the reference file for the phase you are entering**. Never load them all.

| Phase | Read |
|---|---|
| Start, any phase | [references/profile.md](references/profile.md), [references/roles.md](references/roles.md) |
| 0 | [references/spec.md](references/spec.md) |
| 1, 2, checkpoint | [references/code.md](references/code.md) |
| 3 | [references/tests.md](references/tests.md) |
| 4, 5 | [references/review-docs.md](references/review-docs.md) |
| 6, or a gate the user asks for | [references/pre-merge.md](references/pre-merge.md) |

## Start

1. **Parse the input.**
   - Empty → find `flow.md` files in spec folders (see below), list each task with its phase and next step, ask which to pick up. Stop.
   - A spec folder that holds `flow.md` → resume at its phase. A phase name after it (`spec`, `code`, `tests`, `review`, `docs`, `pre-merge`) re-runs that phase, only if `flow.md` shows the task already reached it.
   - Anything else → a new task. The whole input is what the user wants.
2. **Load the project profile** (`references/profile.md`). Missing parts → ask once, then go on.
3. **New task only: ask the mode.** Use AskUserQuestion when the agent has it, else ask in chat:
   - **Autopilot**: run Phases 0–2 without questions, then stop at the checkpoint.
   - **Manual**: ask the user at every review and decision point.
4. Write `flow.md` in the spec folder as soon as Phase 0 creates it, and update it at the end of every phase:

```markdown
# Flow
- Mode: Autopilot | Manual
- Phase: 0 | 1 | 2 | checkpoint | 3 | 4 | 5 | 6 | done
- Apps: <apps this task changes>
- Target branch: <from the open MR/PR, or "not known yet">
- Next: <one line>
```

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
| Questions in Phase 0 | the **decider** sub-agent answers | ask the user, wait |
| Spec, plan, tasks review | decider reviews; revise until it approves | present each, wait |
| Spec verify findings | fix them; disputed ones go to the decider | present, fix the confirmed ones |
| Before Phase 2 | go on | ask "start coding?" |
| Phase 2 progress | silent | report each app as it finishes |
| Checkpoint, Phases 3–6 | same in both modes | same in both modes |

- Autopilot never asks the user before the checkpoint and never leaves `[NEEDS CLARIFICATION]` markers.
- Autopilot: a step that fails or loops more than 3 times → stop and report the blocker.
- Manual: give options and a recommendation; the user decides.

## Agents without sub-agents

If the agent cannot start sub-agents, run each role yourself, one app at a time:

- Before each role, re-read that app's guide file.
- For a review, read only the diff and the rules, as if you had not written the code.
- Say in the report that roles ran in one context.
