# work-flow

Carries one feature, bug fix or hotfix from idea to a merge-ready branch, in the same phases on every project.

## When to use it

- You start a feature, bug fix or hotfix and want a fixed flow: spec, code, your review, tests, AI review, docs, pre-merge gate.
- You want sub-agents to write the code, one per app, and fresh sub-agents to review it.
- Run: `/work-flow add CSV export to the users page`, or `/work-flow 127` to resume spec 127, or `/work-flow` for status.
- Slash only. The agent never starts it by itself.

| You want | Use instead |
|----------|-------------|
| A full HTML plan of a feature, no code | `design-feature` |
| Only the use cases and scenarios | `generate-use-case` |
| A review of a diff you already have | `review-code` |
| To try the scenarios by hand on the running app | `play-scenarios` |

## How it works

```mermaid
flowchart TD
    START([/work-flow: new spec number NNN]) --> P0
    subgraph P0["Phase 0 - Spec (main agent, runs nothing)"]
        SK[speckit specify / or light spec.md] --> CL[clarify: YOU answer]
        CL --> PT[plan, tasks, analyze: agent fixes issues]
        PT --> VER[spec verify: plan vs project rules, agent fixes]
    end

    P0 --> P1[Phase 1 - Routing: split tasks per app, find the order]
    P1 --> P2[Phase 2 - Code: one owner per app, no tests, no checks]
    P2 --> CP{{USER CHECKPOINT - always stops}}
    CP -->|changes| P2
    CP -->|continue| P3[Phase 3 - Tests: owners write unit + integration tests, run nothing]
    P3 --> P4[Phase 4 - Review: fresh reviewer per app + cross-app check, fix in one batch]
    P4 --> P5[Phase 5 - Docs + final summary]
    P5 --> P6

    subgraph P6["Phase 6 - Pre-merge"]
        M[merge the MR target branch] --> N[number check + renumber our files]
        N --> G[THE gate: one gate runner per changed app + changed integration tests]
        G -->|FAIL| F[owner fixes → re-gate that app]
        F --> G
    end

    G -->|PASS| DONE([ready to merge])
    ASK[/you ask for a gate, any phase/] -.-> ON[gate runners, report only]
```

- Runs on its own. You answer the clarify questions in Phase 0 (skipped when there are none) and review at the checkpoint.
- Spec verify checks the plan against the project's rules, not the requirements. The agent fixes what it finds; a decider sub-agent settles disputes.
- The checkpoint after Phase 2 stops in both modes. You try the code first; tests come after you confirm.
- No build, lint or test runs before Phase 6, unless you ask for a gate.
- The main agent only orchestrates. App code is changed by the app's owner sub-agent.

## Project profile

The flow reads a `## Flow profile` section in the project's root `AGENTS.md` or `CLAUDE.md`: apps, guides, owner agents, gate commands, integration tests, numbered folders, docs paths. With no profile, it detects what it can, asks you for the rest, and offers to save it. See [references/profile.md](references/profile.md).

## Input → output

Input: `<what you want | spec number or folder [phase] | (empty)>`

Output:

```
<spec folder>/NNN-<slug>/
├── spec.md, plan.md, tasks.md, …   from speckit, or one light spec.md
└── flow.md                          spec, phase, apps, target branch, next step
```

Plus the code, tests and docs changes on the working branch. Nothing is committed unless you ask.

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions: phases, Phases 1–3 and the checkpoint, hard rules |
| [references/profile.md](references/profile.md) | The project profile and how to detect it |
| [references/roles.md](references/roles.md) | Prompts for owner, reviewer, spec verifier, gate runner, decider |
| [references/spec.md](references/spec.md) | Phase 0: write spec.md, then spec verify |
| [references/review-docs.md](references/review-docs.md) | Phases 4–5 |
| [references/pre-merge.md](references/pre-merge.md) | Phase 6 and gates on request |

## Related skills

- `generate-use-case`, `design-feature`: can feed the spec.
- `review-code`: reviewers may use it for the diff.
- `play-scenarios`: try the code by hand at the checkpoint.
