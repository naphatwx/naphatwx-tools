# generate-use-case

Writes a feature's use cases (one per user goal), their scenarios (one per path and result, on every channel: UI, MCP, API, job) and the spec's acceptance criteria to one `use-cases.js` file. Every skill that plays or tests the feature reads it and shows the same tree: use case → scenarios.

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
| Automated browser tests with screenshots | `e2e-test` |

| Word | Meaning | Example |
|------|---------|---------|
| Use case | One goal a user wants to reach, verb + object | Cut a new version |
| Scenario | One path through a use case, with one result, on one channel | Merge request already released |
| Kind | How a scenario ends: `basic` (the main path), `alternate` (another path to the goal), `exception` (the goal is not reached) | exception |
| Channel | Where a user reaches it: `ui`, `mcp` (an AI agent), `api` (REST / gRPC), `job` | mcp |
| Acceptance criterion | One Given / When / Then from the spec | US1 · AC3 |

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
    D --> D2["list each use case's channels: ui, mcp, api, job"]
    D2 --> E[one scenario per acceptance scenario, edge case and refusal, on each channel]
    E --> E2["no twin on a channel? na: reason"]
    E2 --> E3[ACCEPTANCE: the spec's Given / When / Then]
    E3 --> F
    F[write use-cases.js from template/use-cases.js]
    F --> G[node scripts/check.js]
    G -->|errors| F
    G -->|exit 0| H[reply: path, counts per use case, next steps]
```

Who reads the file:

```mermaid
graph LR
    S[spec] --> U[generate-use-case]
    U --> F["plan/use-cases.js"]
    F --> DF["design-feature: Acceptance criteria + Scenarios view per use case"]
    F --> MU["generate-mock-ui: ui scenarios as screens, others 'No mock'"]
    F --> PS["play-scenarios: every scenario on the running app"]
    F --> E2E["e2e-test: every scenario as a test, same tree"]
```

The data in the file:

```mermaid
erDiagram
    USE_CASE ||--o{ SCENARIO : "has"
    ACCEPTANCE ||--o{ SCENARIO : "cited by story"
    USE_CASE {
        string id "UC1"
        string title "verb + object"
        string refs "US1 · FR-001"
        array channels "ui, mcp, api, job"
        string none "only when no scenario"
    }
    ACCEPTANCE {
        string id "US1 · AC3"
        string given "Given"
        string when "When"
        string then "Then"
        array channels "where it applies"
        object na "channel: why not"
    }
    SCENARIO {
        string id "kebab-case, unique"
        string useCase "a USE_CASE id"
        string title "the path or its result"
        string story "US1 · AC2"
        string surface "ui, mcp, api or job"
        string given "optional start state"
        string when "the action or trigger"
        array expect "first line is the key outcome"
        object na "channel: why no twin"
    }
```

Rules the diagrams don't show:

- Every channel is covered: each outcome has one scenario per channel of its use case, or an `na` reason. MCP scenarios name the tool, its arguments and the exact answer or error.
- All three arrays are strict JSON after `var NAME = `, so a page on `file://` loads the file with `<script src>` and a script parses it.
- Every scenario comes from the source. Unknown copy → `TBD`. Never invented behaviour.
- Every scenario carries a concrete, true example: real versions, counts, ids, a request → answer, or a script's output line.
- Messages are copied verbatim from the code, not the spec (the spec drifts). The reply lists every place the two differ.
- A role scenario names the role and its exact permission strings ("DEV: has repositories.versions.read, not repositories.versions.create").
- No mock or test details: no state ids, pages, query params or selectors. Example values are fine.
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
└── use-cases.js       var USE_CASES = [...]; var SCENARIOS = [...]; var ACCEPTANCE = [...]
```

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |
| [template/use-cases.js](template/use-cases.js) | Example file: 3 use cases, 18 scenarios across `ui`, `mcp` and `job`, 6 acceptance criteria |
| [scripts/check.js](scripts/check.js) | Checks the file; prints the scenario count per use case and channel and the acceptance coverage; errors on a channel or acceptance criterion with no scenario; warns on a scenario with no twin on another channel, no example, or a role with no permission string; `--json` for machine output; exit 1 on any error |

## Related skills

- `design-feature`: shows the acceptance criteria with their scenarios, and each use case's Scenarios view.
- `generate-mock-ui`: mocks each `ui` scenario; the others show "No mock".
- `play-scenarios`: plays every scenario on the running app.
- `e2e-test`: runs every scenario as an automated test; its report follows the same tree.
