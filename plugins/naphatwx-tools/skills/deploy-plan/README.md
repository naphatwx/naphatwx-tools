# deploy-plan

Builds a production deployment plan as one clickable HTML checklist, split into Pre-deploy, Deploy, Post-deploy and Rollback steps, from an MR, a branch, a spec or a described release.

A deploy plan always means: merge the change into the default branch (`master` or `main`), cut a version, then deploy that version to production. It never asks which branch or env.

## When to use it

- You are about to release a change and want every step around the deploy, taken from the change itself.
- You want migrations, new env vars, flags, queues, API order and rollback spelled out before you start.
- You want a checklist you tick while you deploy, then copy as Markdown or save as PDF.
- Say: "deployment plan for this MR", "what do I need to do before and after deploy", "deploy plan for branch feature/x".

| You want | Use instead |
|----------|-------------|
| Check after the deploy that services still reach each other | `smoke-test` |
| A short changelog of the MR | `generate-changelog` |
| An announcement of the change for users | `announce` |
| A review of the diff itself | `review-code` |
| Why a Jenkins build failed | `check-job` |

## How it works

Plan only. It never runs a migration, sets an env var, deploys, or calls a write tool.

```mermaid
graph TD
    IN[input: MR, branch, spec or description] --> G[read the repo's guide files and runbooks]
    G --> C{what was given?}
    C -->|MR URL or !iid| M[get-mr-diffs]
    C -->|branch| B["git diff against the default branch"]
    C -->|spec| S[read the spec, then the code it points to]
    C -->|description| D[use the text; every step marked check]
    C -->|nothing| B
    M --> SC
    B --> SC
    S --> SC
    D --> SC
    SC[scan, then read the code behind each hit: migrate config, env loader, switches, infra, queues, API callers] --> V["find the default branch and the next version (tags, release script, CI job, changelog)"]
    V --> ST["build steps: Pre starts with merge + cut version; Deploy the version to production; Post; Rollback"]
    ST --> AL[add common steps only when they apply; smoke step only when scripts/smoke covers the change]
    AL --> RT[resolve check items with read-only tools, e.g. Thanos MCP]
    RT --> RR[re-read every step: source, timing, exact names, rollback, length]
    RR --> Q[ask only about check steps no read-only tool could answer]
    Q --> W{user answers}
    W --> H["copy the template, replace /*__PLAN_DATA__*/null with the plan JSON"]
    H --> R[reply: default branch, version, order, steps per phase, high-risk, still-check steps, file path]
```

The plan JSON the page reads:

```mermaid
erDiagram
    PLAN ||--|{ PHASE : has
    PHASE ||--o{ STEP : has
    PLAN {
        string id "stable per plan; ticks are saved under it"
        string title
        string env "production"
        string source "MR URL or path"
        string createdAt
        list services
        string order "order of deploy"
        list notes
    }
    PHASE {
        string key "pre, deploy, post or rollback"
        string title
    }
    STEP {
        string text "required; starts with a verb"
        string detail
        string cmd "copy button on the page"
        string tag "db env infra flag api data comms check"
        string risk "high only"
        string source "file, MR or spec line"
        bool check "could not confirm in code"
    }
```

Rules the diagrams don't show:

- Every step, command, table name and log line comes from the code, a migration, a script or a read-only tool result.
- Nothing the release adds (a switch, a page, an RPC, a table) is checked before the deploy.
- Each step is one line; `detail` only when needed, at most 2 short sentences.
- Pre-deploy always starts with "Merge into <default branch> and check its pipeline is green", then "Cut version <next>". With no release mechanism in the repo, the cut-version step is marked check.
- The Deploy phase deploys the version to production, one service per step, in dependency order.
- If the default branch gets more than your change (e.g. other merges in `dev00`), one note names the count and the risky ones. No steps, no question.
- `pre`, `deploy` and `post` phases are required. `rollback` is added when there is a way back; a step that cannot be undone is said plainly.
- Rollback turns the feature switch off first. When the app migrates at boot, the down migrations run with the new image before the previous version tag is redeployed, and each one says what data it deletes.
- Secrets never appear. A step names the env var, never its value.
- One action per step. No generic "check everything" filler.
- The repo's guide files win on deploy steps, tools and names.

## Input → output

Input: `<MR url | !iid | branch | spec path | description>`

- No input: the current branch against the default branch.

Output: one HTML file, at the repo root unless the repo already has a place for deploy docs.

```
<repo>/
└── deploy-plans/
    └── <YYYY-MM-DD>-<slug>.html   the checklist: tick steps, Hide done, Copy as Markdown, Export PDF, Reset
```

- Ticks are saved in the browser under the plan's `id`, so a reopened page keeps them.
- Plus a chat reply: default branch, version to cut, deploy order, steps per phase, high-risk steps, steps still marked check, the file path.

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |
| [template/deploy-plan-template.html](template/deploy-plan-template.html) | The checklist page; the agent fills in the plan JSON and changes nothing else |

## Related skills

- `get-mr-diffs`: fetches the MR diff this skill reads.
- `smoke-test`: the post-deploy service check; the plan adds a smoke step only when `scripts/smoke/features/` or `scripts/smoke/review/` covers the change.
- `generate-changelog`: the changelog a user-facing step can link.
- `announce`: the announcement a user-facing step can link.
