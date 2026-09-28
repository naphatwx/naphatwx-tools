---
name: plan-feature
description: Plan a feature as a browsable HTML folder — overview.html with scope, a Flows section where every flow has a flowchart (its logic) and a sequence diagram (how services talk), each in its own file and hidden until opened, database changes with an ER diagram page, API changes (each API's request / response changes, with the full schema and full contracts hidden until opened), errors and open questions, plus an optional interactive mock UI. Use when the user asks to plan a feature, design a feature, or generate feature docs/diagrams from a spec, ticket or idea.
argument-hint: <spec-folder | feature description> [output-path]
---

# Feature Plan Generator

Turn a spec, ticket or idea into a plan folder people can open in a browser.

```
<output>/
├── overview.html              entry page: every topic, every diagram
├── flowchart/                 flow logic: steps, decisions, loops
│   ├── 01-<flow-slug>.svg     one flow = one file (.html when drawn by diagram-design)
│   └── 02-<flow-slug>.svg
├── sequence-diagram/          how the flow's services talk
│   ├── render.js              draws each flow as inline SVG (copied as-is; manual mode only)
│   ├── 01-<flow-slug>.js      same NN-<flow-slug> as its flowchart (.html when drawn by diagram-design)
│   └── 02-<flow-slug>.js
├── database/
│   └── er-diagram.html        every related table and FK, opened from the Database section
└── mock/                      optional, built by the generate-mock-ui skill
```

**Diagram mode**, picked once in step 2:

| Mode | When | Flowchart file | Sequence file | Embedded in `overview.html` as |
|------|------|----------------|---------------|--------------------------------|
| diagram-design | the `diagram-design` skill is available | `flowchart/NN-<slug>.html` | `sequence-diagram/NN-<slug>.html` | `<iframe class="diagram-frame">` |
| manual | no `diagram-design` skill | `flowchart/NN-<slug>.svg` | `sequence-diagram/NN-<slug>.js` | `<img>` / `render.js` |

The ER diagram is its own page in both modes, drawn by diagram-design's Database Schema type or from `template/database/er-diagram.html` (step 7).

Sections are built by parallel sub-agents after the source is read (step 4).

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
2. **Every flow has both diagrams**: `flowchart/NN-<slug>` (its logic) and `sequence-diagram/NN-<slug>` (how its services talk), same `NN-<slug>`. Never paste SVG into `overview.html`.
3. Both diagrams sit in the flow's own `<h3 id="flow-NN">` block, each inside a closed `<details class="diagram-toggle">` (no `open` attribute: hidden by default).
    - Manual mode: the flowchart is an `<img>`; every sequence file calls `SeqDiagrams.define()`, is loaded by a `<script src>` at the end of `overview.html`, and is drawn into `<div class="seq" data-flow="NN-<slug>">`.
    - diagram-design mode: each `.html` is embedded by an `<iframe class="diagram-frame">`.
4. Every sidebar `nav-link` `href="#id"` matches a real heading `id`.
5. Every link into `mock/` opens in a new tab: `target="_blank" rel="noopener"`.
6. No external scripts, styles or fonts in `overview.html`. `render.js` and the flow files are local.
7. At most 7 participants per sequence diagram, at most 12 nodes per flowchart. More than that → split the flow. In diagram-design mode its own, tighter budgets win.
8. Every name in a diagram (RPC, endpoint, table, job) comes from the source. Unknown → write `TBD` in the label.
9. Only the main agent edits `overview.html`. Sub-agents write their own files plus an HTML fragment under `<output>/.parts/`; the main agent merges the fragments and deletes `.parts/`.

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
- Write the extract to `<output>/.parts/brief.md`: one heading per item above, flows numbered `NN-<slug>`, names exactly as the source spells them, and the source file for each fact. Every sub-agent reads it instead of re-reading the spec.

### 2. Pick the diagram mode

- Check whether the `diagram-design` skill is available (`diagram-design:diagram-design` in Claude Code; any agent: listed in its skills).
- Available → **diagram-design mode**: draw every flowchart, sequence diagram and the ER diagram page with that skill.
    - One standalone `.html` per diagram, written straight into `flowchart/` or `sequence-diagram/`. Use its Flowchart / Sequence types.
    - Always use its **default dark theme**: the minimal dark template (`assets/template-dark.html`, `example-<type>-dark.html`) with the shipped default tokens. No light copy, no custom brand.
    - Skip its first-run style-guide question: the answer is always "proceed with the default".
- Not available → **manual mode**: draw flowcharts as hand-written SVG (step 5) and sequence diagrams with `render.js` (step 6).
- Say which mode is used in the confirm step.

### 3. Copy the template

- Copy `template/overview.html` → `<output>/overview.html`.
- Manual mode:
    - Copy `template/sequence-diagram/render.js` → `<output>/sequence-diagram/render.js`, unchanged.
    - Read `template/flowchart/01-example-flow.svg` and `template/sequence-diagram/01-example-flow.js` for the formats; don't copy the examples to the output.
    - Copy `template/database/er-diagram.html` → `<output>/database/er-diagram.html` (the Database agent fills it).
- diagram-design mode: don't copy `render.js` or the ER template, and remove the `render.js` `<script>` lines and `SeqDiagrams.renderAll()` from the output `overview.html`.

### 4. Fan out section agents

- Once the brief exists, the sections don't depend on each other. Build them in parallel.
- The agent can spawn sub-agents (the Agent tool in Claude Code) → start them all in one message so they run at once. It can't → do the same jobs yourself, one after another.

| Agent | Follows | Writes |
|-------|---------|--------|
| Flow (one per flow; over 6 flows → 2–3 flows each) | steps 5, 6 and the Flows rules in step 8 | `flowchart/NN-<slug>.*`, `sequence-diagram/NN-<slug>.*`, `.parts/flow-NN.html` (the flow block) |
| Database | step 7 and the Database rules in step 8 | `database/er-diagram.html` (or `er-<area>.html`), `.parts/database.html` |
| API | the API rules in step 8 | `.parts/api.html` |

- The main agent keeps the short sections: Overview, Scope, Errors, Mock UI, Open questions.
- Each sub-agent prompt gives:
    - The path of this `SKILL.md` and the steps to follow, the path of `.parts/brief.md`, the diagram mode and `<output>`.
    - The exact files it may write. It must not edit `overview.html` or any other file.
    - The fragment format: the section's block copied from `template/overview.html` (between its `<!-- =====` comments) and filled in, ready to paste.
    - Its reply: the files written, plus every TBD and open question it found.
- diagram-design mode: each sub-agent that draws loads the `diagram-design` skill itself.
- Wait for every agent, then go to step 8.

### 5. Draw one flowchart per flow

- A flowchart shows the flow's logic: its steps, yes / no decisions, loops and end states. It does not show services or calls; that is the sequence diagram's job.
- Name: `NN-<flow-slug>`, the same as the flow's sequence diagram, numbered in reading order (`01-login.svg`).
- A flow with no decision still gets a flowchart: a straight line from start pill to end pill.
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

### 6. Draw one sequence diagram per flow

- A sequence diagram shows how the flow's services talk: who calls whom, in what order, what comes back, and which writes leave the service. Every branch in the flowchart that reaches a service shows up here as an `alt` / `opt`.

- diagram-design mode: ask it for a Sequence diagram per flow, with the same labels and detail rules as below; save to `sequence-diagram/NN-<slug>.html`. Skip the `.js` format.
- diagram-design mode, both diagram kinds: add this height reporter just before `</body>` of every saved `.html`. The SVG shrinks with the iframe width, so a fixed height from the `viewBox` leaves empty space; the template's `message` listener sizes the iframe instead.

```html
<script>
  // Report the real height to overview.html so its iframe fits (postMessage works on file://).
  // body, not documentElement: documentElement.scrollHeight never drops below the iframe's current height.
  const postHeight = () => parent.postMessage({ type: "diagram-height", height: document.body.scrollHeight }, "*");
  addEventListener("load", postHeight);
  new ResizeObserver(postHeight).observe(document.body);
</script>
```
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

### 7. Draw the ER diagram page

- One page for every table the feature reads or writes (the same set as the Full schema), with its columns and every FK between them. The Database section links to it with the "Open ER diagram ↗" button (new tab).
- Mark changes the same way as the cards: new table, added / changed / dropped columns, new or changed FKs.
- diagram-design mode: ask for a **Database Schema** diagram (`type-db-schema`, FK lines column to column, `ON DELETE` label when the source gives one) in the default dark theme; save it as `database/er-diagram.html`. No height reporter: it is a page, not an iframe.
    - Over its budget (5 tables, 8 columns each) → split by area (for example catalog, ordering) into `database/er-<area>.html`, one button per area. Every table appears in at least one page; a table shared by two areas appears in both.
- Manual mode: fill the copied `database/er-diagram.html`. Change only the `<title>`, the `<h1>` and the `ER` object:
    - `tables`: `{ id, name, tag, at: [col, row], cols: [[name, type, key, mark?]] }`. Tags: `new table`, `altered`, `read`, `external`. `mark` is `add`, `change` or `drop`, with `+ add` / `~ type` / `− drop` as the key.
    - `rels`: `[from "table.col", to "table.col", fromCard, toCard, isNew?]`, from the FK column to the column it references.
    - Layout: at most 4 grid columns; put a child next to its parent; keep FK lines short and avoid lines that cross a table.
- No related table → no page; remove the button.

### 8. Fill in `overview.html`

- Merge the sub-agent fragments from `.parts/` into their sections, add their open questions to Open questions, then delete `.parts/`.

- Replace the title, brand and eyebrow (spec number, ticket, status).
- Sections, in order. Always keep every section and its nav link. When a section has no content, replace its body with one sentence saying so (e.g. "This feature has no database changes.").
    1. **Overview**: lead sentence + 3–4 cards (key decision, data impact, UI impact, eligibility/scale).
    2. **Scope**: in / out table.
    3. **Flows**: one block per flow (copy the block between the `one block per flow` comments):
        - `<h3 id="flow-NN">`, pills (user story, requirement ids, both file names), what + trigger.
        - Flowchart in a closed `<details class="diagram-toggle">`, summary `Flowchart · flow logic`:
            - Manual: `<div class="flowchart"><img src="flowchart/NN-<slug>.svg" alt="…"></div>`.
            - diagram-design: `<div class="flowchart"><iframe class="diagram-frame" src="flowchart/NN-<slug>.html" title="…" loading="lazy"></iframe></div>`. No inline height: the iframe fits the height its file posts (see step 6).
        - Sequence diagram in a second closed `<details class="diagram-toggle">`, summary `Sequence diagram · how the services talk`:
            - Manual: `<div class="seq" data-flow="NN-<slug>"></div>`.
            - diagram-design: `<div class="seq"><iframe class="diagram-frame" src="sequence-diagram/NN-<slug>.html" …></iframe></div>`.
        - Keep the section's "Show all diagrams" button; it opens and closes every toggle.
        - "Rules this flow must keep" — 3–5 bullets from the spec.
        - "Try it in the mock" cards — only if a mock exists or will be built; each opens in a new tab.
    4. **Database changes**: the ER diagram button, the changes, then the full schema hidden in a closed `<details class="full-toggle">` (copy the Database block).
        - **Open ER diagram ↗** button: `<a class="diagram-all" href="database/er-diagram.html" target="_blank" rel="noopener">`. Split by area → one button per page (`Open ER diagram · catalog ↗`).
        - **Changes** (always visible): one `.erd` card per table whose schema changes:
            - `.erd-table.write` + tag `new table` for a new table (all its columns); `.erd-table` + tag `altered` for an existing table (only the changed columns).
            - Changed rows: `.erd-row.add` (`+ add`), `~ type` / `~ null` for a change (show `old → new` in the type), `.erd-row.drop` (`− drop`). Indexes and constraints count as changes: show them as a row on the column they cover (type `unique index`, `index`) and name them in the section intro.
            - `.erd-rel` lines only for new or changed FKs. Name the migration file when the source gives one.
            - No schema change → one sentence in place of the cards: "This feature has no schema change." Also say "no schema change" in the Overview data-impact card.
        - **Full schema** (hidden, summary `Full schema · every related table, all columns`): every table the feature reads or writes, with all its columns.
            - Tags: `new table` / `altered` (changed rows keep their marks), `read` for a table only read or only written to without a schema change, `external` + `.erd-table.external` for a table another service owns.
            - `.erd-rel` lines for every relation between the listed tables.
        - No related table at all → keep the section with one sentence: "This feature has no database changes."
    5. **API changes**: one block per API with its request and response changes, then the full contracts hidden in a closed `<details class="full-toggle">` (copy the API block).
        - Source: the proto / OpenAPI / DTO diff in the spec's contracts. Name the file(s) and say whether the change is wire-compatible.
        - **One block per changed API** (always visible):
            - `<h3><code>RpcName</code></h3>` + pills: `new` / `changed` / `behaviour change`, route, permission (`none · system caller` when it has none).
            - An `.erd` with two cards: `Request · <Message>` and `Response · <Message>`. New message → `.erd-table.write` + tag `new message`, every field with its number. Existing message → tag `altered`, only the changed fields: `+ N` add, `~ N` change (type `old → new`), `− N` remove. No field change → tag `unchanged` and one `.erd-row.none` "No field change."
            - A rule change without a contract change → `behaviour change` pill, both cards `unchanged`, plus a `Behaviour:` line.
        - **Shared types**: new or changed enums and nested messages used by more than one API. Leave the subsection out when there are none.
        - When the contract leaves a field number open (`<16 / 26>`), show it as-is and flag it in Open questions.
        - **Full contracts** (hidden, summary `Full contracts · every related API, full request and response`): every API the feature adds, changes or calls.
            - `<h4>` per API (name · route · `new` / `changed` / `called, unchanged`), then full Request and Response cards with every field in field-number order. Changed fields keep their marks.
            - An API another service owns → `.erd-table.external`.
        - No related API at all → keep the section with one sentence: "This feature has no API changes."
    6. **Errors**: cause → code → user-facing text. No new errors → one sentence saying so.
    7. **Mock UI**: link cards into `mock/` (new tab). No mock → replace with one line saying the feature has no UI.
    8. **Open questions**: blocker callout, then numbered steps. None → one sentence saying there are no open questions.
- Manual mode: add one `<script src="sequence-diagram/NN-<slug>.js">` per flow before the final `SeqDiagrams.renderAll()` line.
- Rewrite the sidebar nav to match: one link per flow under "Flows".

### 9. Offer the mock

- Ask whether to build an interactive mock (use AskUserQuestion when the agent has it). Skip the question when the feature has no UI.
- Yes → run the `generate-mock-ui` skill (`naphatwx-tools:generate-mock-ui` in Claude Code) with `<output>` as its plan folder. It adds `mock/` and fills the "Try it in the mock" cards.
- No → remove the "Try it in the mock" blocks. Keep the Mock UI section and nav link with one sentence saying no mock was built.

### 10. Verify

- Every `nav-link` hash matches a heading id; every `data-flow`, `<img src>` and `<iframe src>` points to a file that exists.
- Every flow has both a flowchart and a sequence diagram file, and every `.diagram-toggle` and `.full-toggle` is closed by default.
- Database "Full schema" lists every table in the sequence diagrams; API "Full contracts" lists every API in them.
- Every table in the Full schema appears on an ER diagram page, and every ER button points to a page that exists.
- `.parts/` is deleted.
- Every flowchart diamond has two labelled exits and every path reaches an end pill or loops back.
- Open `overview.html` in a headless browser when one is available, and open every toggle ("Show all diagrams"), then check each diagram draws (no "Missing diagram file" text, no broken image or empty iframe), labels are not clipped, each iframe ends at its diagram (no cut-off, no empty space below), and the console has no `[seq]` length warnings. Open each ER diagram page too: every table and FK line draws, and the console has no `[er]` warnings.
- Grep the output for absolute local paths (`/Users/`, `/home/`, `C:\`) and remove them.

### 11. Confirm

- Output: `✅ Plan created at: {output}/overview.html`
- Say the diagram mode (diagram-design or manual).
- List the flows (one line each), the ER diagram page(s), and whether a mock was built.
- Remind the user: each diagram is edited in its own file under `flowchart/`, `sequence-diagram/` or `database/`; the overview picks up the change on reload.
