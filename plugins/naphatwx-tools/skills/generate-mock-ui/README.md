# generate-mock-ui

Builds a clickable mock of a planned feature in the app's real design system, with a fake API and every edge state, where a reviewer plays each scenario and marks Pass / Fail.

## When to use it

- You have a feature plan or spec, and you want to click through its screens before the backend exists.
- You want every edge state (empty, refused, unreachable, timeout) on its own link.
- You want a frontend contract (`types.ts`, `rules.js`, `data.js`) the real build can follow.
- Say: "mock UI for spec 127", "clickable prototype".

| You want | Use instead |
|----------|-------------|
| The full plan: use cases, diagrams, database and API changes | `design-feature` |
| The use cases and scenarios themselves | `generate-use-case` |
| Play the scenarios on the real running app, with real data | `play-scenarios` |
| Automated browser tests with screenshots | `e2e-test` |
| A test case file an AI runs later | `generate-test-cases` |
| One flowchart, sequence or ER diagram | `generate-diagram` |

## How it works

Two modes. Standalone is a plain HTML folder that opens from disk. In-project writes mock routes inside the real frontend app.

```mermaid
graph TD
    IN["plan or spec folder"] --> UC{"use-cases.js exists?"}
    UC -->|no| GU[run generate-use-case first]
    GU --> MODE
    UC -->|yes| MODE{mode}
    MODE -->|standalone| S1[read the plan: screens, operations, edge states, scenarios]
    S1 --> S2[scan the app's design system: class strings, shell, components]
    S2 --> S3["copy template/ to plan/mock/, replace the placeholder domain"]
    S3 --> S4["contract/: types.ts, rules.js, data.js"]
    S4 --> S5["shared/scenario-play.js: how to play each scenario"]
    S5 --> S6["shared/: states, fake API, components, shell"]
    S6 --> S7["page/*.html: one per screen, every state"]
    MODE -->|in-project| P1["references/in-project.md: routes in the app at mock/spec NNN"]
    P1 --> P2["_mock/: types, rules, data, states, one hook per screen"]
    P2 --> P3[pages built from the app's real components]
    S7 --> LINK[scenarios-panels.js: Play links in the plan's overview]
    P3 --> LINK
    LINK --> V[verify: check-scenarios.js or the app's typecheck and lint]
    V --> R[review: two fresh reviewers, one fix agent]
    R --> C[confirm: counts from the script output]
```

What loads what in a standalone mock. Every rule runs through `rules.js`, so the mock is never looser or stricter than the spec:

```mermaid
graph LR
    UCJ["../use-cases.js: USE_CASES, SCENARIOS"] --> SP[shared/scenario-play.js]
    SP -->|merged by id| SCS[SCENARIOS the pages read]
    ST["shared/states.js: entity, perms, faults per state"] --> FA[shared/fake-api.js]
    DATA[contract/data.js] --> FA
    RULES[contract/rules.js] --> FA
    FA --> PG["page/screen.html"]
    COMP[shared/components.js] --> PG
    SH["shared/shell.js: app chrome + pink mock panel"] --> PG
    SCS --> IDX[index.html]
    SCS --> SH
    TYPES[contract/types.ts] -.->|reference only, never loaded| DATA
```

One scenario pick on the index:

```mermaid
sequenceDiagram
    actor U as Reviewer
    participant I as index.html
    participant SS as sessionStorage
    participant F as Frame: page/screen.html
    participant A as FakeApi
    U->>I: pick a scenario chip
    I->>SS: clear every FakeApi.STORE key
    I->>F: load with state, sc, embed=1 and the scenario's params
    F->>A: the real operation name, real request shape
    A->>A: latency, permission check, state faults, Rules
    A->>SS: writes and audit rows
    A-->>F: response or the spec's error
    U->>F: play the steps
    I->>SS: poll the audit log every 1.5 s
    U->>I: mark Pass or Fail, add a note
    Note over I: results kept in localStorage, never cleared with the store
```

The review step, from `references/mock-review.md`:

```mermaid
graph TD
    B[mock built and verified] --> R1["UI fidelity reviewer: would a user think this IS the real app?"]
    B --> R2["Functional reviewer: does every scenario behave as the spec says?"]
    R1 --> M[merge, settle conflicts: spec first, then real code]
    R2 --> M
    M --> FX[one fresh fix agent applies every finding]
    FX --> RE[re-run scenarios-panels.js and verify]
```

Rules the diagrams don't show:

- Standalone opens from `file://`: classic `<script src>` only, no modules, no `fetch()`, data as `.js` globals.
- Use cases and scenarios are read-only here. A wrong one is fixed with `generate-use-case`.
- Every count reported comes from `check-scenarios.js` (or `scenarios-panels.js` in-project), never by eye.
- In-project writes only inside `mock/spec<NNN>/`: no API or RPC calls, no edits to other app files.
- Run by `design-feature`: the review is skipped here, since design-feature runs it after its own checks.

## Input → output

Input: `<plan-folder | spec-folder> [frontend-app-path] [standalone | in-project]`

- A plan folder from `design-feature`, or a spec folder (the plan goes in `<spec-folder>/plan/`).
- `<plan>/use-cases.js` must exist. If it doesn't, the agent runs `generate-use-case` first.
- No mode given: the agent asks; in-project is recommended when a frontend app is found.

Output, standalone:

```
<plan>/
├── use-cases.js            read only; written by generate-use-case
├── overview.html           when it exists: Scenarios views get Play links
└── mock/
    ├── README.md           how to open and use the mock, for teammates
    ├── index.html          one block per use case: scenario list, framed screen, guide, results, audit log
    ├── contract/
    │   ├── types.ts        real shapes to implement; never loaded by pages
    │   ├── rules.js        spec rules as pure functions
    │   └── data.js         realistic data in the upstream shapes
    ├── page/
    │   ├── <screen>.html   one per screen; state from ?state=
    │   └── console.html    MCP / API client, only when the feature has one
    └── shared/
        ├── scenario-play.js  how to play each scenario, keyed by id
        ├── fake-api.js     the real operation names, served from contract/
        ├── components.js   the app's component class strings
        ├── shell.js        the app's chrome + the mock-only panel
        └── states.js       pages + mock states
```

Output, in-project:

```
<routes-root>/mock/spec<NNN>/
├── page.tsx                index: scenarios grouped by use case
├── <screen>/page.tsx       one route per screen; state from ?state=
└── _mock/                  types.ts, rules.ts, data.ts, states.ts, use-cases.ts,
                            scenario-play.ts, use<Screen>.ts, StatePanel.tsx
```

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions; standalone mode |
| [references/in-project.md](references/in-project.md) | In-project mode: mock routes inside the real app |
| [references/mock-review.md](references/mock-review.md) | The review: two fresh reviewers, then one fix agent |
| [scripts/check-scenarios.js](scripts/check-scenarios.js) | Syntax-checks every script, matches play entries to scenarios, runs console scenarios against the fake API |
| [template/](template/) | The standalone `mock/` folder on a placeholder domain; copied whole and filled in per feature |
| [template/README.md](template/README.md) | Ships as `mock/README.md` |
| [use-cases.js](use-cases.js) | Example use cases for the template preview; never copied |

## Related skills

- `generate-use-case`: writes the `use-cases.js` this skill plays.
- `design-feature`: makes the plan folder that holds `mock/`, and runs the mock review.
- `play-scenarios`: the same layout, on the real running app with real data.
- `e2e-test`: plays the same flows as automated browser tests.
- `generate-test-cases`: reads the same `use-cases.js`.
