---
name: plan-feature
description: Plan a feature as a browsable HTML folder — overview.html with scope, flowcharts of the decision logic, one sequence diagram per flow (each in its own file), database changes, API changes, errors and open questions, plus an optional interactive mock UI. Use when the user asks to plan a feature, design a feature, or generate feature docs/diagrams from a spec, ticket or idea.
argument-hint: <spec-folder | feature description> [output-path]
---

# Feature Plan Generator

Turn a spec, ticket or idea into a plan folder people can open in a browser.

```
<output>/
├── overview.html              entry page: every topic, every diagram
├── flowchart/
│   └── 01-<chart-slug>.svg    one chart = one file (.html when drawn by diagram-design)
├── sequence-diagram/
│   ├── render.js              draws each flow as inline SVG (copied as-is; manual mode only)
│   ├── 01-<flow-slug>.js      one flow = one file (.html when drawn by diagram-design)
│   └── 02-<flow-slug>.js
└── mock/                      optional, built by the generate-mock-ui skill
```

**Diagram mode**, picked once in step 2:

| Mode | When | Flowchart file | Sequence file | Embedded in `overview.html` as |
|------|------|----------------|---------------|--------------------------------|
| diagram-design | the `diagram-design` skill is available | `flowchart/NN-<slug>.html` | `sequence-diagram/NN-<slug>.html` | `<iframe class="diagram-frame">` |
| manual | no `diagram-design` skill | `flowchart/NN-<slug>.svg` | `sequence-diagram/NN-<slug>.js` | `<img>` / `render.js` |

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<spec-folder | feature description> [output-path]`

- A spec folder or file → read it as the source of truth.
- A plain description → plan from it, and mark every unknown as **TBD**. Never invent endpoints, tables or fields.
- No output path:
    - Input is a spec folder → write to `<spec-folder>/plan/`.
    - Otherwise → write to `plans/<feature-slug>/` at the project root.

## Hard Rules

1. `overview.html` starts from `template/overview.html`. Keep its `<style>` block, theme toggle, font-size picker, sidebar search and the template's `<script>` block unchanged.
2. **One flow = one diagram file**; one flowchart = one file. Never paste SVG into `overview.html`.
3. Manual mode: every flow file calls `SeqDiagrams.define()`, is loaded by a `<script src>` at the end of `overview.html`, and is drawn into `<div class="seq" data-flow="NN-<slug>">` inside its own `<h3 id="flow-NN">` block. diagram-design mode: each flow and flowchart `.html` is embedded by an `<iframe class="diagram-frame">` in its own `<h3>` block.
4. Every sidebar `nav-link` `href="#id"` matches a real heading `id`.
5. Every link into `mock/` opens in a new tab: `target="_blank" rel="noopener"`.
6. No external scripts, styles or fonts in `overview.html`. `render.js` and the flow files are local.
7. At most 7 participants per sequence diagram, at most 12 nodes per flowchart. More than that → split it. In diagram-design mode its own, tighter budgets win.
8. Every name in a diagram (RPC, endpoint, table, job) comes from the source. Unknown → write `TBD` in the label.

## Workflow

### 1. Read the source

- Use Glob, Grep and Read on the spec folder: spec, plan, data model, contracts, research, decisions.
- Extract:
    - Summary, key decisions, in scope / out of scope.
    - **Flows**: each user story or use case that has its own trigger and its own sequence of calls. A refusal/timeout path shared by several flows is its own flow.
    - Decisions: each yes / no point the user or system hits (member? valid? retry?), with where each branch goes.
    - Participants: user, frontend, backend services, databases, external systems.
    - Tables read and written, relations, and any external (read-through) tables.
    - Error mapping: cause → code → what the user sees.
    - Blockers and open questions.
- No source → ask once where the content is (use AskUserQuestion when the agent has it).

### 2. Pick the diagram mode

- Check whether the `diagram-design` skill is available (`diagram-design:diagram-design` in Claude Code; any agent: listed in its skills).
- Available → **diagram-design mode**: draw every flowchart and sequence diagram with that skill.
    - One standalone `.html` per diagram, written straight into `flowchart/` or `sequence-diagram/`. Use its minimal template and its Flowchart / Sequence types.
    - If it asks its first-run style-guide question, pass it to the user once; don't answer it for them.
- Not available → **manual mode**: draw flowcharts as hand-written SVG (step 4) and sequence diagrams with `render.js` (step 5).
- Say which mode is used in the confirm step.

### 3. Copy the template

- Copy `template/overview.html` → `<output>/overview.html`.
- Manual mode:
    - Copy `template/sequence-diagram/render.js` → `<output>/sequence-diagram/render.js`, unchanged.
    - Read `template/flowchart/01-example-flow.svg` and `template/sequence-diagram/01-example-flow.js` for the formats; don't copy the examples to the output.
- diagram-design mode: don't copy `render.js`, and remove its `<script>` lines and `SeqDiagrams.renderAll()` from the output `overview.html`.

### 4. Draw the flowcharts

- What a flowchart shows: the decision logic a user or the system walks through — not the calls between services (that is the sequence diagram).
- Start with one flowchart for the whole feature (entry → every branch → each end state). Add one per flow only when a flow has its own branching and the feature chart would pass 12 nodes.
- Name: `NN-<chart-slug>`, numbered in reading order (`01-login.svg`).
- Shapes:

| Shape | Use for | Manual SVG |
|-------|---------|------------|
| Pill | Start, end, exit | gold `#e0bb6a` rounded `rect` |
| Box | A step the user or system does | navy `#274a73` `rect` |
| Diamond | A yes / no question | red `#ab5258` `polygon` |
| Arrow | Next step, loop back (retry, reset) | grey `#7a7a84` path with arrowhead |

- Every diamond has exactly two labelled exits (`Yes` / `No`, or two short outcomes). Every path ends at a pill or loops back to an earlier node.
- Node text is a short phrase (≤ 4 words, 2 lines max); a question ends with `?`. Names (screens, codes) come from the source; unknown → `TBD`.
- Loops (retry, forgot password → reset → back to login) route around the side, never through other nodes.
- Manual mode: start from `template/flowchart/01-example-flow.svg`. Keep its `<title>` / `<desc>`, marker and colours; set the `viewBox` to fit; lay nodes on a grid, main path top-to-bottom, branches to the sides; no line crosses a node.
- diagram-design mode: ask it for a Flowchart of the same content and save to `flowchart/NN-<slug>.html`.

### 5. Draw one sequence diagram per flow

- diagram-design mode: ask it for a Sequence diagram per flow, with the same labels and detail rules as below; save to `sequence-diagram/NN-<slug>.html`. Skip the `.js` format.
- Manual mode: write one `.js` file per flow, as follows.

- Name: `NN-<flow-slug>.js`, numbered in reading order (`01-cut-new-version.js`).
- Header comment (max 3 lines): flow number, name, user story; the step format line from the example.
- Shape:

```js
SeqDiagrams.define("01-cut-new-version", {
    actors: [["eng", "Engineer", "browser"], ["api", "api-service", "VersionService"]],
    steps: [
        ["phase", "1 · Open the form"],
        ["call", "eng", "api", "GetBases", "repositoryId 1204"],
        ["ret", "api", "eng", "GetBasesResponse", "latestVersion 2.3.2-1"],
        ["note", "api", "guards", null, "permission check · eligibility"],
        ["alt", "upstream accepts"], ["hot", "api", "db", "INSERT audit"], ["else", "refused"], ["ret", "api", "eng", "reason"], ["end"],
    ],
});
```

| Step | Meaning |
|------|---------|
| `["phase", text]` | Section band across the diagram |
| `["call", from, to, label, detail?]` | Request (solid arrow) |
| `["ret", from, to, label, detail?]` | Response (dashed arrow) |
| `["hot", from, to, label, detail?]` | Side effect: external write, audit, job trigger (accent arrow) |
| `["note", at, text, to?, detail?]` | Note over one participant, or spanning to `to` (`null` for none) |
| `["alt", cond]` … `["else", cond]` … `["end"]` | Branches |
| `["opt", cond]` / `["loop", cond]` … `["end"]` | Optional or repeated block |

- Labels are the name only, ≤ 40 chars: RPC (`TriggerRedeployment`), endpoint (`POST /things`), table op (`INSERT infra.redeployment`), queue (`publish infra.redeployment.create`), job (`build app-redeployment`), status or error code (`FAILED_PRECONDITION`).
- Put arguments, example values, messages and reasons in `detail`. It shows on hover and in the "Step details" list under the diagram. `render.js` warns in the console for any label, note or condition over 40 chars (a single long name such as an RPC is fine).
- Notes and `alt` / `else` conditions are a short phrase too (`guards`, `environment not AVAILABLE`); the rule itself goes in `detail` or in "Rules this flow must keep".
- Use `hot` only for writes that leave the service or must be audited, so readers can scan for side effects.

### 6. Fill in `overview.html`

- Replace the title, brand and eyebrow (spec number, ticket, status).
- Sections, in order. Drop a section only when it truly does not apply, and remove its nav link too:
    1. **Overview**: lead sentence + 3–4 cards (key decision, data impact, UI impact, eligibility/scale).
    2. **Scope**: in / out table.
    3. **Flowcharts**: one block per chart file (copy the block between the `one block per flowchart` comments):
        - `<h3 id="chart-NN">`, file-name pill, one sentence on which decision it answers.
        - Manual: `<div class="flowchart"><img src="flowchart/NN-<slug>.svg" alt="…"></div>`.
        - diagram-design: `<div class="flowchart"><iframe class="diagram-frame" src="flowchart/NN-<slug>.html" title="…" style="height:…px"></iframe></div>`, height from the diagram's `viewBox`.
    4. **Sequence diagrams**: one flow block per diagram file (copy the block between the `one block per flow` comments):
        - `<h3 id="flow-NN">`, pills (user story, requirement ids, file name), what + trigger.
        - Manual: `<div class="seq" data-flow="NN-<slug>"></div>`. diagram-design: `<div class="seq"><iframe class="diagram-frame" src="sequence-diagram/NN-<slug>.html" …></iframe></div>`.
        - "Rules this flow must keep" — 3–5 bullets from the spec.
        - "Try it in the mock" cards — only if a mock exists or will be built; each opens in a new tab.
    5. **Database changes**: schema changes only (copy the block between the `schema changes only` comments).
        - One `.erd` card per table whose schema changes: `.erd-table.write` + tag `new table` for a new table (all its columns), `.erd-table` + tag `altered` for an existing table (only the changed columns).
        - Changed rows: `.erd-row.add` (`+ add`), `~ type` / `~ null` for a change (show `old → new` in the type), `.erd-row.drop` (`− drop`). Indexes and constraints count as changes: show them as a row on the column they cover (type `unique index`, `index`) and name them in the section intro.
        - Leave out tables that are only read, only get rows inserted or updated, or are external. Those belong in the diagrams.
        - `.erd-rel` lines only for new or changed FKs. Name the migration file when the source gives one.
        - No schema change → delete the section and its nav link, and say "no schema change" in the Overview data-impact card.
    6. **API changes**: request / response changes only (copy the block between the `request / response changes only` comments).
        - Source: the proto / OpenAPI / DTO diff in the spec's contracts. Name the file(s) and say whether the change is wire-compatible.
        - **New RPCs** table: RPC → route → permission (`none · system caller` when it has none).
        - **Messages**: one `.erd` card per message. New message → `.erd-table.write` + tag `new message`, every field with its number. Existing message → tag `altered`, only the changed fields: `+ N` add, `~ N` change (type `old → new`), `− N` remove. New enums count as new messages.
        - **Behaviour changes, same signature**: RPCs whose rules change without a proto change. Leave out a subsection that has no rows.
        - Leave out untouched messages. When the contract leaves a field number open (`<16 / 26>`), show it as-is and flag it in Open questions.
        - No API change → delete the section and its nav link.
    7. **Errors**: cause → code → user-facing text.
    8. **Mock UI**: link cards into `mock/` (new tab). No mock → replace with one line saying the feature has no UI.
    9. **Open questions**: blocker callout, then numbered steps.
- Manual mode: add one `<script src="sequence-diagram/NN-<slug>.js">` per flow before the final `SeqDiagrams.renderAll()` line.
- Rewrite the sidebar nav to match: one link per chart under "Flowcharts", one per flow under "Sequence diagrams".

### 7. Offer the mock

- Ask whether to build an interactive mock (use AskUserQuestion when the agent has it). Skip the question when the feature has no UI.
- Yes → run the `generate-mock-ui` skill (`naphatwx-tools:generate-mock-ui` in Claude Code) with `<output>` as its plan folder. It adds `mock/` and fills the "Try it in the mock" cards.
- No → remove the "Try it in the mock" blocks and the Mock UI nav link.

### 8. Verify

- Every `nav-link` hash matches a heading id; every `data-flow`, `<img src>` and `<iframe src>` points to a file that exists.
- Every flowchart diamond has two labelled exits and every path reaches an end pill or loops back.
- Open `overview.html` in a headless browser when one is available, and check each diagram draws (no "Missing diagram file" text, no broken image or empty iframe), labels are not clipped, iframes don't cut the diagram off, and the console has no `[seq]` length warnings.
- Grep the output for absolute local paths (`/Users/`, `/home/`, `C:\`) and remove them.

### 9. Confirm

- Output: `✅ Plan created at: {output}/overview.html`
- Say the diagram mode (diagram-design or manual).
- List the flowcharts and flows (one line each) and whether a mock was built.
- Remind the user: each diagram is edited in its own file under `flowchart/` or `sequence-diagram/`; the overview picks up the change on reload.
