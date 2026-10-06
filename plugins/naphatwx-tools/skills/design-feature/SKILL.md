---
name: design-feature
description: Design a feature as a browsable HTML folder — overview.html with scope, a Flows section where every flow has a flowchart (its logic) and a sequence diagram (how services talk) showing real permission keys, RPCs, fields and codes, each in its own file and hidden until opened along with the flow's rules, database changes with an ER diagram page, API changes (each API's request / response changes, with the full schema and full contracts hidden until opened), errors and open questions, plus an optional interactive mock UI. Use when the user asks to plan a feature, design a feature, or generate feature docs/diagrams from a spec, ticket or idea.
argument-hint: <spec-folder | feature description> [output-path]
---

# Feature Plan Generator

Turn a spec, ticket or idea into a plan folder people can open in a browser.

```
<output>/
├── overview.html              entry page: every topic, every diagram
├── assets/                    overview.css + overview.js, copied from the template unchanged
├── flowchart/                 flow logic: steps, decisions, loops
│   ├── 01-<flow-slug>.svg     one flow = one file (.html when drawn by diagram-design)
│   └── 02-<flow-slug>.svg
├── sequence-diagram/          how the flow's services talk
│   ├── render.js              draws each flow as inline SVG (manual mode only)
│   ├── 01-<flow-slug>.js      same NN-<flow-slug> as its flowchart (.html when drawn by diagram-design)
│   └── 02-<flow-slug>.js
├── database/
│   └── er-diagram.html        every related table and FK, opened from the Database section
└── mock/                      optional, built by the generate-mock-ui skill
```

Every diagram is drawn by the `generate-diagram` skill (`naphatwx-tools:generate-diagram` in Claude Code): it uses diagram-design when installed, else its own templates. This skill picks the **mode** once (step 2) so all diagrams match, and embeds what it returns:

| Mode | When | Flowchart file | Sequence file | Embedded in `overview.html` as |
|------|------|----------------|---------------|--------------------------------|
| diagram-design | the `diagram-design` skill is available | `flowchart/NN-<slug>.html` | `sequence-diagram/NN-<slug>.html` | `<iframe class="diagram-frame">` |
| manual | no `diagram-design` skill | `flowchart/NN-<slug>.svg` | `sequence-diagram/NN-<slug>.js` | `<img>` / `render.js` |

The ER diagram is its own page in both modes (`database/er-diagram.html`), opened from the Database section. Sections are built by parallel sub-agents after the source is read (step 3).

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

1. `overview.html` starts from `template/overview.html`. Its styles and script live in `template/assets/overview.css` and `overview.js`: copy them unchanged, and keep the text size picker, diagram zoom switch and sidebar search markup. Pages are always dark and monochrome (neutral graphite grays; only the diff marks + ~ − carry a muted hue): add no light theme, theme toggle or accent color. Diagrams keep their own colors on the same gray background (the generate-diagram skill sets it). The script makes every `.flowchart` and `.seq` zoomable (wheel zooms at the cursor, drag pans, a `↺` button at the top right resets); the `Zoom` switch in the top bar turns this on or off (off by default). Each diagram has a border, so panned-away space never blends into the page. A `⛶` button after the zoom scale opens that diagram in a lightbox: the page dims behind, the diagram sits in a frame 80% of the window's width and 90% of its height, fitted whole inside it, with its flow name as a caption below, and zoom works there even with the switch off (`✕`, Esc or a backdrop click closes it). The top bar's text size picker sets the base size: small 14px, medium 16px (default), large 18px. The browser remembers each viewer's settings (`localStorage`): text size, zoom, sidebar collapse, and the "Show all diagrams" choice.
2. **Every flow has both diagrams**: `flowchart/NN-<slug>` (its logic) and `sequence-diagram/NN-<slug>` (how its services talk), same `NN-<slug>`. Never paste SVG into `overview.html`.
3. Both diagrams sit in the flow's own `<h3 id="flow-NN">` block, each inside a closed `<details class="diagram-toggle">` (no `open` attribute: hidden by default). The flow's rules sit in a closed `<details class="rules-toggle">` too.
    - Diagrams show real values, not generic words: every decision, call, write and error node names its permission key, field value, RPC, table op or code from the brief (see the `generate-diagram` flowchart reference), in simple words, not symbols (`not in`, not `∉`; `and 2 more`, not `+2`).
    - Manual mode: the flowchart is an `<img>`; every sequence file calls `SeqDiagrams.define()`, is loaded by a `<script src>` at the end of `overview.html`, and is drawn into `<div class="seq" data-flow="NN-<slug>">`.
    - diagram-design mode: each `.html` is embedded by an `<iframe class="diagram-frame">`.
    - Step details never sit inside a diagram: they go on the page right after the `.seq` box (manual: `render.js` adds them).
4. Every sidebar `nav-link` `href="#id"` (sub-links included) matches a real `id` on the page.
5. Every link into `mock/` opens in a new tab: `target="_blank" rel="noopener"`.
6. No external scripts, styles or fonts in `overview.html`. `assets/`, `render.js` and the flow files are local.
7. Every name (RPC, endpoint, table, field, job) comes from the source. Unknown → write `TBD`.
8. Only the main agent edits `overview.html`. Sub-agents write their own files plus an HTML fragment under `<output>/.parts/`; the main agent merges the fragments and deletes `.parts/`.

## Workflow

### 1. Read the source

- Use Glob, Grep and Read on the spec folder: spec, plan, data model, contracts, research, decisions.
- Extract:
    - Summary, key decisions, in scope / out of scope.
    - **Flows**: each user story or use case that has its own trigger and its own sequence of calls. A refusal/timeout path shared by several flows is its own flow.
    - Decisions: each yes / no point the user or system hits (member? valid? retry?), with where each branch goes and the **real value** it checks: permission key (`redeployment.redeploy`), field + passing values (`status = AVAILABLE`), enum, flag or config key, validation rule.
    - Per step: the real RPC / endpoint, table op, queue or job it runs, and the error code or reason constant each refusal returns. Diagrams print these on their nodes.
    - Participants: user, frontend, backend services, databases, external systems.
    - Tables read and written, relations, and any external (read-through) tables.
    - Error mapping: cause → code → what the user sees.
    - Blockers and open questions.
- No source → ask once where the content is (use AskUserQuestion when the agent has it).
- Write the extract to `<output>/.parts/brief.md`: one heading per item above, flows numbered `NN-<slug>`, names exactly as the source spells them, and the source file for each fact. Every sub-agent reads it instead of re-reading the spec.

### 2. Pick the mode and copy the template

- Mode: the `diagram-design` skill is available (`diagram-design:diagram-design` in Claude Code; any agent: listed in its skills) → diagram-design; otherwise manual. Pass it to every `generate-diagram` run.
- Copy `template/overview.html` → `<output>/overview.html` and `template/assets/` → `<output>/assets/`. The template's `flowchart/`, `sequence-diagram/`, `database/` and `mock/` files exist only to preview it; don't copy them — `generate-diagram` and `generate-mock-ui` write the real ones.
- The template shows the same example flow twice: flow 01 in manual mode (`<img>` + `render.js`), flow 02 in diagram-design mode (`<iframe class="diagram-frame">`, files drawn by the diagram-design skill). Copy the block of the chosen mode as the flow block, then delete flow 02 and its nav link from the output.
- diagram-design mode: remove the `render.js` `<script>` lines and `SeqDiagrams.renderAll()` from the output `overview.html`.

### 3. Fan out section agents

- Once the brief exists, the sections don't depend on each other. Build them in parallel.
- The agent can spawn sub-agents (the Agent tool in Claude Code) → start them all in one message so they run at once. It can't → do the same jobs yourself, one after another.

| Agent | Does | Writes |
|-------|------|--------|
| Flow (one per flow; over 6 flows → 2–3 flows each) | `generate-diagram flowchart` and `generate-diagram sequence` for the flow, then the flow block (Flows rules in step 4) | `flowchart/NN-<slug>.*`, `sequence-diagram/NN-<slug>.*`, `.parts/flow-NN.html` |
| Database | `generate-diagram er` for every related table, then the section (Database rules in step 4) | `database/er-diagram.html` (or `er-<area>.html`), `.parts/database.html` |
| API | the section (API rules in step 4) | `.parts/api.html` |

- The main agent keeps the short sections: Overview, Scope, Errors, Mock UI, Open questions.
- Each sub-agent prompt gives:
    - The path of this `SKILL.md` and the rules to follow, the path of `.parts/brief.md`, the mode and `<output>`.
    - For diagrams: run the `generate-diagram` skill with the type, `.parts/brief.md` as source, the output path above, the mode, and "embedded in design-feature's `overview.html`" (manual sequence then skips its standalone viewer).
    - The exact files it may write. It must not edit `overview.html` or any other file.
    - The fragment format: the section's block copied from `template/overview.html` (between its `<!-- =====` comments), filled in with the embed snippets `generate-diagram` returned, ready to paste.
    - Its reply: the files written, plus every TBD and open question it found.
- Wait for every agent, then go to step 4.

### 4. Fill in `overview.html`

- Merge the sub-agent fragments from `.parts/` into their sections, add their open questions to Open questions, then delete `.parts/`.
- Replace the title, brand and eyebrow (spec number, ticket, status).
- Sections, in order. Always keep every section and its nav link. When a section has no content, replace its body with one sentence saying so (e.g. "This feature has no database changes.").
    1. **Overview**: a one-sentence lead + a `<dl class="summary">` of 3–4 key facts (key decision, data impact, UI impact, eligibility/scale), each `<dd>` one short line.
    2. **Scope**: `<h3>In scope</h3>` and `<h3>Out of scope</h3>`, each a bullet list. Each out-of-scope item ends with its reason in `<span class="faint">— why</span>`.
    3. **Flows**: one block per flow (copy the block between the `one block per flow` comments):
        - `<h3 id="flow-NN">` with its tags on the same line: `<span class="meta">` after the name (user story, requirement ids joined by ` · `; no file names). Then a list: `What:` and `Trigger:` bullets.
        - Flowchart in a closed `<details class="diagram-toggle">`, summary `Flowchart · flow logic`:
            - `<div class="flowchart">` + the embed `generate-diagram` returned (`<img>` or `<iframe class="diagram-frame">`, no inline height: the iframe fits the height its file posts).
        - Sequence diagram in a second closed `<details class="diagram-toggle">`, summary `Sequence diagram · how the services talk`:
            - Manual: `<div class="seq" data-flow="NN-<slug>"></div>`.
            - diagram-design: `<div class="seq">` + the returned `<iframe class="diagram-frame">`, then the returned `<div class="seq-steps">` right after the `.seq` box, not inside it.
        - The top bar's "Show all diagrams" button opens and closes every diagram toggle; keep it.
        - Rules in a third closed `<details class="rules-toggle">`, summary `Rules · what this flow must keep`: 3–5 bullets from the spec. Not opened by "Show all diagrams".
        - One `<p class="try">` line of mock links (`Try in the mock: Happy path ↗ · Empty ↗`) — only if a mock exists or will be built; each opens in a new tab.
    4. **Database changes**: the ER diagram button, the changes, then the full schema hidden in a closed `<details class="full-toggle">` (copy the Database block).
        - **Intro list** (copy the Database block): `Migration:`, `Changed tables:`, and `Not touched on purpose:` with one sublist item per table. Name indexes and constraints here too.
        - **Open ER diagram ↗** button, inside the `<h2 id="database">` right after its text: `<a class="diagram-all" href="database/er-diagram.html" target="_blank" rel="noopener">`. Split by area → one button per page (`Open ER diagram · catalog ↗`). No related table → no page and no button.
        - **Changes** (always visible): one `.erd` card per table whose schema changes, each with `id="db-<table>"` for its sidebar sub-link:
            - `.erd-table.write` + tag `new table` for a new table (all its columns); `.erd-table` + tag `altered` for an existing table (only the changed columns).
            - Changed rows: `.erd-row.add` (`+ add`), `.erd-row.change` (`~ type` / `~ null`) (show `old → new` in the type), `.erd-row.drop` (`− drop`). Indexes and constraints count as changes: show them as a row on the column they cover (type `unique index`, `index`) and name them in the intro list.
            - `.erd-rel` lines only for new or changed FKs. Name the migration file when the source gives one.
            - No schema change → one sentence in place of the cards: "This feature has no schema change." Also say "no schema change" in the Overview data-impact line.
        - **Full schema** (hidden, summary `Full schema · every related table, all columns`): every table the feature reads or writes, with all its columns.
            - Tags: `new table` / `altered` (changed rows keep their marks), `read` for a table only read or only written to without a schema change, `external` + `.erd-table.external` for a table another service owns.
            - `.erd-rel` lines for every relation between the listed tables.
        - No related table at all → keep the section with one sentence: "This feature has no database changes."
    5. **API changes**: one block per API with its request and response changes, then the full contracts hidden in a closed `<details class="full-toggle">` (copy the API block).
        - Source: the proto / OpenAPI / DTO diff in the spec's contracts.
        - **Intro list** (copy the API block), one bold-labelled bullet each; leave out a bullet with nothing to say:
            - `Summary:` count of new / changed RPCs and the service.
            - `Files:` sublist, one file per item with its change count (`+4 RPCs, +8 messages`) or `new file`.
            - `Compatibility:` wire-compatible or not.
            - `Unchanged:` existing messages that gain no field, as a sublist when there are several.
            - `Permissions:` new permissions, seeds, permission-map entries, snapshots to update.
            - Other notes (an RPC kept as-is, where it appears): one bullet each.
        - **One block per changed API** (always visible):
            - `<h3 id="api-<kebab-name>"><code>RpcName</code> <span class="meta">…</span></h3>`, the meta on the heading's line, not a line below: `new` (as `<span class="new">`) / `changed` / `behaviour change`, route, permission (`none · system caller` when it has none), joined by ` · `.
            - An `.erd` with two cards: `Request · <Message>` and `Response · <Message>`. New message → `.erd-table.write` + tag `new message`, every field with its number. Existing message → tag `altered`, only the changed fields: `+ N` add (`.erd-row.add`), `~ N` change (`.erd-row.change`, type `old → new`), `− N` remove (`.erd-row.drop`). No field change → tag `unchanged` and one `.erd-row.none` "No field change."
            - A rule change without a contract change → `behaviour change` in the meta line, both cards `unchanged`.
            - Any runtime rule change (with or without a contract change) → a closed `<details class="rules-toggle">` under the cards, summary `Behaviour · what changes at runtime`, one bullet per rule (refusals with their code and message, guards, what is or is not stored). Not a plain `Behaviour:` paragraph.
        - **Shared types** (`<h3 id="api-shared-types">`): new or changed enums and nested messages used by more than one API. Leave the subsection out when there are none.
        - When the contract leaves a field number open (`<16 / 26>`), show it as-is and flag it in Open questions.
        - **Full contracts** (hidden, summary `Full contracts · every related API, full request and response`): every API the feature adds, changes or calls.
            - `<h4>` per API (name · route · `new` / `changed` / `called, unchanged`), then full Request and Response cards with every field in field-number order. Changed fields keep their marks.
            - An API another service owns → `.erd-table.external`.
        - No related API at all → keep the section with one sentence: "This feature has no API changes."
    6. **Errors**: cause → code → user-facing text. No new errors → one sentence saying so.
    7. **Mock UI**: one text link into `mock/index.html` (new tab). No mock → replace with one line saying the feature has no UI.
    8. **Open questions**: a `<strong class="blocker">Blocker:</strong>` line per blocker, then a numbered list. None → one sentence saying there are no open questions.
- Manual mode: add one `<script src="sequence-diagram/NN-<slug>.js">` per flow before the final `SeqDiagrams.renderAll()` line.
- Rewrite the sidebar nav to match: one link per flow under "Flows".
- Database changes and API changes are `.nav-tree` accordions (copy them from the template), closed by default (`hidden` children, `.nav-parent` with `aria-expanded="false"`). Clicking the parent link jumps to its section and toggles its sub-links; clicking any other link closes every section it is not in:
    - Database changes: one sub-link per changed table card (`#db-<table>`, text = table name).
    - API changes: one sub-link per changed API (`#api-<kebab-name>`, text = RPC name), plus `Shared types` when that subsection exists.
    - No sub-items (no changes) → a plain `nav-link`, no `.nav-tree`.

### 5. Offer the mock

- Ask whether to build an interactive mock (use AskUserQuestion when the agent has it). Skip the question when the feature has no UI.
- Yes → run the `generate-mock-ui` skill (`naphatwx-tools:generate-mock-ui` in Claude Code) with `<output>` as its plan folder. It adds `mock/` and fills the "Try in the mock" lines.
- No → remove the "Try in the mock" lines. Keep the Mock UI section and nav link with one sentence saying no mock was built.

### 6. Verify

- Every `nav-link` hash, sub-links included, matches an id on the page; every `.nav-tree` is closed by default; every `data-flow`, `<img src>` and `<iframe src>` points to a file that exists.
- Every flow has both a flowchart and a sequence diagram file, and every `.diagram-toggle`, `.rules-toggle` and `.full-toggle` is closed by default.
- Every flowchart decision, call, write and error node shows a real value from the brief (or `TBD`); no sequence note or `alt` says only `guards` / `checks`.
- Database "Full schema" lists every table in the sequence diagrams; API "Full contracts" lists every API in them.
- Every table in the Full schema appears on an ER diagram page, and every ER button points to a page that exists.
- `.parts/` is deleted.
- Each `generate-diagram` run did its own checks; re-run it for any diagram that fails below.
- Open `overview.html` in a headless browser when one is available, and open every toggle ("Show all diagrams"), then check each diagram draws (no "Missing diagram file" text, no broken image or empty iframe), labels are not clipped, each iframe ends at its diagram (no cut-off, no empty space below), with `Zoom` switched on, the wheel zooms each diagram and its `↺` button resets it, its `⛶` button opens it in the lightbox and fits the whole diagram, and the console has no `[seq]` warnings. Open each ER diagram page too: every table and FK line draws, and its `← Overview` link works.
- Grep the output for absolute local paths (`/Users/`, `/home/`, `C:\`) and remove them.

### 7. Confirm

- Output: `✅ Plan created at: {output}/overview.html`
- Say the diagram mode (diagram-design or manual).
- List the flows (one line each), the ER diagram page(s), and whether a mock was built.
- Remind the user: each diagram is edited in its own file under `flowchart/`, `sequence-diagram/` or `database/`; the overview picks up the change on reload.
