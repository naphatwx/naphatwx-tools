# generate-use-case

Writes a feature's use cases (one per user goal) and their scenarios (one per path and result) to one `use-cases.js` file that other skills read.

## When to use it

- You have a spec or an idea, and you want the list of what users can do and what they should see.
- You are about to plan, mock, play or test a feature: those skills read this file and never write their own.
- An old `use-cases.js` (`USE_CASE_FLOWS`) needs moving to the new format.
- Say: "use cases for spec 127", "list the use cases".

| You want | Use instead |
|----------|-------------|
| The full feature plan with flows, database and API | `design-feature` |
| A clickable mock where you play each scenario | `generate-mock-ui` |
| Play the scenarios by hand on the running app | `play-scenarios` |
| A test case file an AI runs later | `generate-test-cases` |
| Automated browser tests with screenshots | `e2e-test` |

| Word | Meaning | Example |
|------|---------|---------|
| Use case | One goal a user wants to reach, verb + object | Cut a new version |
| Scenario | One path through a use case, with one result | Merge request already released |

## How it works

Four steps. `check.js` gates the file before the reply.

```mermaid
graph TD
    A[input: spec folder, plan folder or description] --> B{use-cases.js already there?}
    B -->|yes, new format| B1[update in place, keep matching scenario ids]
    B -->|yes, old format| B2[rewrite: each goal flow becomes a use case, ids kept]
    B -->|no| C[read the spec: stories, acceptance scenarios, edge cases, refusals, FRs]
    B1 --> C
    B2 --> C
    C --> D["list use cases UC1, UC2, ... in reading order"]
    D --> E[one scenario per acceptance scenario, edge case and refusal]
    E --> F[write use-cases.js from template/use-cases.js]
    F --> G[node scripts/check.js]
    G -->|errors| F
    G -->|exit 0| H[reply: path, counts per use case, next steps]
```

Who reads the file:

```mermaid
graph LR
    S[spec] --> U[generate-use-case]
    U --> F["plan/use-cases.js"]
    F --> DF["design-feature: Scenarios view per use case"]
    F --> MU["generate-mock-ui: how to play each scenario"]
    F --> PS["play-scenarios: plays each on the running app"]
    F --> TC["generate-test-cases: one test case per scenario, same id"]
    TC --> E2E["e2e-test: report grouped by use case"]
```

The data in the file:

```mermaid
erDiagram
    USE_CASE ||--o{ SCENARIO : "has"
    USE_CASE {
        string id "UC1"
        string title "verb + object"
        string refs "US1 · FR-001"
        string none "only when no scenario"
    }
    SCENARIO {
        string id "kebab-case, unique"
        string useCase "a USE_CASE id"
        string title "the path or its result"
        string story "US1 · AC2"
        string surface "ui, api or job"
        string given "optional start state"
        string when "the action or trigger"
        array expect "first line is the key outcome"
    }
```

Rules the diagrams don't show:

- Both arrays are strict JSON after `var NAME = `, so a page on `file://` loads the file with `<script src>` and a script parses it.
- Every scenario comes from the source. Unknown copy → `TBD`. Never invented behaviour.
- No mock or test details: no state ids, pages, selectors or mock data.
- Ids are stable. Other files link to `#sc-<scenario id>`.
- Every count in the reply comes from `check.js`.

## Input → output

Input: `<spec-folder | plan-folder | feature description> [output-folder]`

| Input | Where the file goes |
|-------|---------------------|
| Output folder given | that folder |
| Plan folder (has `overview.html`) | the plan folder |
| Spec folder or number | `<spec-folder>/plan/` |
| Feature description | `plans/<feature-slug>/` at the project root |

Output: one file.

```
<plan>/
└── use-cases.js       var USE_CASES = [...]; var SCENARIOS = [...]
```

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |
| [template/use-cases.js](template/use-cases.js) | Example file: 3 use cases, 11 scenarios across `ui`, `api` and `job` |
| [scripts/check.js](scripts/check.js) | Checks the file and prints the scenario count per use case; `--json` for machine output; exit 1 on any error |

## Related skills

- `design-feature`: shows the scenarios in each use case's Scenarios view.
- `generate-mock-ui`: makes each scenario playable in the mock.
- `play-scenarios`: plays each scenario on the running app.
- `generate-test-cases`: writes one test case per scenario, same id.
- `e2e-test`: groups its report by these use cases.
