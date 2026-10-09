---
name: design-feature
description: Plan a feature as a browsable HTML folder (use cases with their flow diagrams and scenarios, database and API changes, open questions) from a spec or idea. Use when the user says "design this feature" or "plan spec 127". The full plan; one diagram is generate-diagram, a mock alone is generate-mock-ui.
argument-hint: <spec-folder | feature description> [output-path]
---

# Feature Plan Generator

Turn a spec, ticket or idea into a plan folder people can open in a browser.

```
<output>/
├── overview.html              entry page: every topic, every diagram
├── assets/                    overview.css + overview.js, copied from the template unchanged
├── flowchart/                 each use case's flow: steps, decisions, loops
│   ├── 01-<uc-slug>.svg       one use case = one file (.html when drawn by diagram-design)
│   └── 02-<uc-slug>.svg
├── sequence-diagram/          how each use case's services talk
│   ├── render.js              draws each sequence as inline SVG (manual mode only)
│   ├── 01-<uc-slug>.js        same NN-<uc-slug> as its flowchart (.html when drawn by diagram-design)
│   └── 02-<uc-slug>.js
├── database/
│   └── er-diagram.html        every related table and FK, opened from the Database section
├── use-cases.js               use cases + scenarios, by the generate-use-case skill; each use case's Scenarios view is generated from it
└── mock/                      optional, standalone mock by the generate-mock-ui skill
    └── shared/scenario-play.js   how to play each scenario; adds the Play links
                               (in-project mock lives in the app instead)
```

Scripts in this skill's `scripts/` (Node, no install):

| Script | Does |
|--------|------|
| `scenarios-panels.js <output>` | writes every use case's "Scenarios (N)" view from `use-cases.js`, with Play links from `mock/shared/scenario-play.js` when a mock exists; prints the counts |
| `publish-copy.js <output> <copy-dir>` | builds a copy that works as a claude.ai Artifact (step 8) and prints the publish arguments |

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

1. `overview.html` starts from `template/overview.html`. Its styles and script live in `template/assets/overview.css` and `overview.js`: copy them unchanged, and keep the rail, its search, the rail edge button, the floating tools, the presentation bar and the shortcut sheet (`#keys`) markup. Pages are always dark, in the Quiet Sheet theme: its colors are the `/* theme:tokens */` block at the top of `overview.css` (one blue accent; green, amber and red only mark the diffs + ~ −). Use `var(--token)`, never a hex. Don't edit between the `theme:` markers: change `theme/` in this plugin's repo and run `node theme/sync.mjs`. Dark only: add no light theme, theme toggle or other palette. The floating tools hold an **Export PDF** button (synced `theme:pdf` blocks): it loads every diagram frame, then opens the print dialog; the PDF shows every section and every use case view. Diagrams use the same palette and paper (the generate-diagram skill sets it).
    - Rail: always open on the left, numbered `01`–`07`, with use cases, changed tables and changed APIs nested as `UC<n>` / `4.N` / `5.N`. The round edge button or `[` hides it; `/` focuses its search.
    - Floating tools (bottom right of the page, top right on phones): `Open all` shows every use case view stacked; `Zoom` makes every `.flowchart` and `.seq` zoomable (wheel zooms at the cursor, drag pans, a `↺` button at the top right resets; off by default); `Present` (or `P`) starts presentation mode; `?` opens the shortcut sheet (`#keys` dialog: `1`–`4`, `P`, `←`/`→`, `Esc`, `[`, `/`, `?`).
    - Keep the skip link (`.skip` → `#sheet`) as the first element of `<body>`.
    - Each diagram has a border and a `⛶` button at its top right that opens it in a lightbox: the page dims behind, the diagram sits in a frame 80% of the window's width and 90% of its height, fitted whole inside it, with its use case name and view as a caption below. Zoom works there even with the switch off (`✕`, Esc or a backdrop click closes it).
    - Presentation mode shows one step per screen with a `← N / M · label →` bar: each use case gives one step per view, the API section an intro step plus one per `.api[data-part]`, every other `.slide` one step. A long step scrolls down; nothing scrolls sideways. A diagram draws at 1:1, never scaled (every label 14px); its box ends above the bar, and a taller one scrolls inside its box with a `continues ↓` cue on the bottom edge; the refs line keeps to one line. `←` / `→` / Space step, Esc leaves. Full schema and full contracts stay out of it.
    - The browser remembers each viewer's settings (`localStorage`): rail collapse, zoom and Open all.
2. **Every use case has both diagrams** (they draw its flow): `flowchart/NN-<slug>` (its logic) and `sequence-diagram/NN-<slug>` (how its services talk), same `NN-<slug>`. Never paste SVG into `overview.html`.
3. Each use case is one `<section class="slide use-case" id="uc-NN" data-title="UC<n> · <name>">` with four view buttons (disclosure buttons in a `role="group"` `.views` row: Flowchart, Sequence, Rules, Scenarios, each `aria-expanded` + `aria-controls`) and their four panels (`role="region"`), all closed by default (`aria-expanded="false"`, every `.panel` `hidden`). A click opens one panel at a time; a second click closes it.
    - Diagrams show real values, not generic words: every decision, call, write and error node names its permission key, field value, RPC, table op or code from the brief (see the `generate-diagram` flowchart reference), in simple words, not symbols (`not in`, not `∉`; `and 2 more`, not `+2`).
    - Manual mode: the flowchart is an `<img>`; every sequence file calls `SeqDiagrams.define()`, is loaded by a `<script src>` at the end of `overview.html`, and is drawn into `<div class="seq" data-flow="NN-<slug>">`.
    - diagram-design mode: each `.html` is embedded by an `<iframe class="diagram-frame">`. Its embed script (the `generate-diagram` skill adds it) hides the file's own eyebrow and title inside the frame and draws the diagram at 1:1.
    - Step details never sit inside a diagram: they go on the page right after the `.seq` box (manual: `render.js` adds them).
4. Every rail link `href="#id"` (`.rail-list a`, nested ones included) matches a real `id` on the page, and every `.slide` has a `data-title` (presentation mode labels its steps with it).
5. Every mock link (into `mock/`, or the app's `/mock/spec<NNN>` route) opens in a new tab: `target="_blank" rel="noopener"`. This is for the local folder; the published copy drops it (step 8).
6. No external scripts, styles or fonts in `overview.html` or the diagram files: text uses the OS font. `assets/`, `render.js` and the diagram files are local.
7. Every name (RPC, endpoint, table, field, job) comes from the source. Unknown → write `TBD`.
8. Only the main agent edits `overview.html`. Sub-agents write their own files plus an HTML fragment under `<output>/.parts/`; the main agent merges the fragments and deletes `.parts/`.
9. Use cases and scenarios are written only by the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code) to `<output>/use-cases.js`. Each use case's Scenarios button and panel are generated from it by `scripts/scenarios-panels.js`, never typed by hand, so they can't drift from the mock. Every count you report (scenarios per use case, total) comes from a script's output, never an estimate.
10. `overview.css` stays a template copy: add no class to it and no inline `style=` to `overview.html`. The Scenarios panel uses its `.nowrap` utility class (Story and Play cells).

## Workflow

### 1. Read the source

- Use Glob, Grep and Read on the spec folder: spec, plan, data model, contracts, research, decisions.
- Extract:
    - Summary, key decisions, in scope / out of scope.
    - **Use cases**: each goal a user wants to reach, named verb + object ("Cut a new version"). A step shared by several goals ("Open the form") or a refusal / timeout path is not a use case: it is a scenario of the goal it belongs to.
    - Decisions: each yes / no point the user or system hits (member? valid? retry?), with where each branch goes and the **real value** it checks: permission key (`redeployment.redeploy`), field + passing values (`status = AVAILABLE`), enum, flag or config key, validation rule.
    - Per step: the real RPC / endpoint, table op, queue or job it runs, and the error code or reason constant each refusal returns. Diagrams print these on their nodes.
    - Participants: user, frontend, backend services, databases, external systems.
    - Tables read and written, relations, and any external (read-through) tables.
    - Error mapping: cause → code → what the user sees.
    - Acceptance scenarios, edge cases and refusal rows, each with its story / AC id (or FR / decision id) and the exact user-facing message. They become the scenarios (step 3).
    - Control rules: which control is hidden and which is shown unavailable with a reason, as the spec says. No permission → whatever the real app does today (usually hidden).
    - Blockers and open questions.
- No source → ask once where the content is (use AskUserQuestion when the agent has it).
- Write the extract to `<output>/.parts/brief.md`: one heading per item above, use cases numbered `UC<n>` with a file slug `NN-<slug>`, names exactly as the source spells them, and the source file for each fact. Every sub-agent reads it instead of re-reading the spec.

### 2. Pick the mode and copy the template

- Mode: the `diagram-design` skill is available (`diagram-design:diagram-design` in Claude Code; any agent: listed in its skills) → diagram-design; otherwise manual. Pass it to every `generate-diagram` run.
- Copy `template/overview.html` → `<output>/overview.html` and `template/assets/` → `<output>/assets/`. The template's `flowchart/`, `sequence-diagram/`, `database/`, `mock/` and `use-cases.js` files exist only to preview it; don't copy them — `generate-diagram`, `generate-use-case` and `generate-mock-ui` write the real ones.
- The template shows the same example use case twice: UC1 in manual mode (`<img>` + `render.js`), UC2 in diagram-design mode (`<iframe class="diagram-frame">`, files drawn by the diagram-design skill). Copy the block of the chosen mode as the use case block, then delete UC2 and its rail link from the output.
- diagram-design mode: remove the `render.js` `<script>` lines and `SeqDiagrams.renderAll()` from the output `overview.html`.

### 3. Fan out section agents

- Once the brief exists, the sections don't depend on each other. Build them in parallel.
- The agent can spawn sub-agents (the Agent tool in Claude Code) → start them all in one message so they run at once. It can't → do the same jobs yourself, one after another.

| Agent | Does | Writes |
|-------|------|--------|
| Use case (one per use case; over 6 → 2–3 each) | `generate-diagram flowchart` and `generate-diagram sequence` for the use case, then the use case block (Use cases rules in step 4) | `flowchart/NN-<slug>.*`, `sequence-diagram/NN-<slug>.*`, `.parts/uc-NN.html` |
| Database | `generate-diagram er` for every related table, then the section (Database rules in step 4) | `database/er-diagram.html` (or `er-<area>.html`), `.parts/database.html` |
| API | the section (API rules in step 4) | `.parts/api.html` |
| Use cases + scenarios | `generate-use-case` with `<output>` and `.parts/brief.md`, use cases numbered as in the brief | `use-cases.js` |

- The main agent keeps the short sections: Overview, Scope, Errors, Open questions, and runs `scenarios-panels.js` (step 4).
- Each sub-agent prompt gives:
    - The path of this `SKILL.md` and the rules to follow, the path of `.parts/brief.md`, the mode and `<output>`.
    - For diagrams: run the `generate-diagram` skill with the type, `.parts/brief.md` as source, the output path above, the mode, and "embedded in design-feature's `overview.html`" (manual sequence then skips its standalone viewer).
    - The exact files it may write. It must not edit `overview.html` or any other file.
    - The fragment format: the section's block copied from `template/overview.html` (between its `<!-- =====` comments), filled in with the embed snippets `generate-diagram` returned, ready to paste.
    - Its reply: the files written, plus every TBD and open question it found.
- Wait for every agent, then go to step 4.

### 4. Fill in `overview.html`

- Merge the sub-agent fragments from `.parts/` into their sections, add their open questions to Open questions, then delete `.parts/`.
- Replace the `<title>`, the rail brand (`.rail-mark` letter + name) and the kicker (spec number, ticket, status).
- Sections, in order, each a `<section class="slide" id="…" data-title="…">` with its number in `<span class="sec-n">` (`02`–`07` in the `<h2>`, `01` at the start of the Overview kicker; use cases `UC<n>`). Always keep every section and its rail link. When a section has no content, replace its body with one sentence saying so (e.g. "This feature has no database changes.").
    1. **Overview**: the `<h1>`, a one-sentence `.lead` + a `<dl class="facts">` of 3–4 key facts (key decision, data impact, API impact, UI impact or eligibility/scale), each `<dd>` one short line; a fact about data or API ends with a link to its section.
    2. **Scope**: the `.scope` block, full width: `<h3>In scope</h3>` with its bullet list, then `<h3>Out of scope</h3>` with its bullet list below it. Each out-of-scope item ends with its reason in `<span class="aside">— why</span>`.
    3. **Use cases**: one muted line naming the four views, then an `ol.uc-index` with one row per use case (`UC<n>` + name, link to `#uc-NN`, user story and priority on the right). Then one block per use case (copy the block between the `one block per use case` comments):
        - `<header class="uc-head">`: `<h3>` with `<span class="sec-n">UC<n></span>` + the use case name, then `<p class="refs">` with its tags (user story, requirement ids joined by ` · `; no file names). The CSS puts them on the right of the title row.
        - `<p class="uc-line">`: the user's goal in one sentence, then `<span class="aside">Starts from <trigger>.</span>`.
        - The `.views` button row and four panels, ids `uc-NN-chart`, `uc-NN-seq`, `uc-NN-rules`, `uc-NN-sc` (buttons `…-tab`, linked by `aria-controls` / `aria-labelledby`):
            - Flowchart panel (`.panel.wide`): `<div class="flowchart">` + the embed `generate-diagram` returned (`<img>` or `<iframe class="diagram-frame">`, no inline height: the iframe fits the height its file posts).
            - Sequence panel (`.panel.wide`): manual → `<div class="seq" data-flow="NN-<slug>">` with the `.seq-legend` line inside it; diagram-design → `<div class="seq">` + the returned `<iframe class="diagram-frame">`, then the returned `<div class="seq-steps">` right after the `.seq` box, not inside it.
            - Rules panel (`.panel`, not wide): 3–5 bullets from the spec.
            - Scenarios button and panel (`.panel`, not wide, always last in the block): leave them out of the fragment. `node <this skill dir>/scripts/scenarios-panels.js <output>`, run once the use case blocks are in, writes them from `use-cases.js`:
                - Button `Scenarios (K)`, K = the use case's scenario count.
                - A `.table-wrap` table: Scenario (title + first expect line in `.aside`) | Story | with a mock, `Play ↗` → `mock/index.html#sc-<id>` (new tab), or "not in the mock" for a skipped one. A use case with no scenario → one `.muted` line with its `none` sentence.
                - With a mock, it also adds `.side-link` "Open the mock ↗" (new tab) to the Use cases `<h2>`.
    4. **Database changes**: the ER diagram link, the facts, the changes, then the full schema hidden in a closed `<details class="more">` (copy the Database block).
        - **ER diagram ↗** link, inside the `<h2 id="database">` right after its text: `<a class="side-link" href="database/er-diagram.html" target="_blank" rel="noopener">`. Split by area → one link per page (`ER diagram · catalog ↗`). No related table → no page and no link.
        - **Facts** (`dl.facts`): `Migration`, `Changed` (each table + `new` / `altered`), `Left alone` (tables read but not changed, each with why). Name indexes and constraints here too.
        - **Changes** (always visible): the `+ add ~ change − drop` legend, then one `.tbl` card per table whose schema changes inside a `.tables` grid, each with `id="db-<table>"` for its rail sub-link:
            - `.tbl.new` + tag `new table` for a new table (all its columns, green card); `.tbl` + tag `altered` for an existing table (only the changed columns); `.tbl.drop` + tag `dropped table` for a dropped table (all its columns, red card, struck through).
            - Each column is a `.row` with `.col`, `.type`, `.key`. Changed rows: `.row.add` (`+ add`), `.row.change` (`~ type` / `~ null`) (show `old → new` in the type), `.row.drop` (`− drop`). Indexes and constraints count as changes: show them as a row on the column they cover (type `unique index`, `index`) and name them in the facts.
            - `<p class="rel">` lines only for new or changed FKs (`table_a.id` `1 ── *` `table_b.table_a_id`).
            - No schema change → one sentence in place of the cards: "This feature has no schema change." Also say "no schema change" in the Overview data-impact fact.
        - **Full schema** (hidden, summary `Full schema` + `<span class="aside">every related table, all columns</span>`): every table the feature reads or writes, with all its columns.
            - Tags: `new table` / `altered` (changed rows keep their marks), `read` for a table only read or only written to without a schema change, `external` + `.tbl.ext` for a table another service owns.
            - `.rel` lines for every relation between the listed tables.
        - No related table at all → keep the section with one sentence: "This feature has no database changes."
    5. **API changes**: the facts, one block per changed API, then the full contracts hidden in a closed `<details class="more">` (copy the API block).
        - Source: the proto / OpenAPI / DTO diff in the spec's contracts.
        - **Facts** (`dl.facts`), leave out a fact with nothing to say:
            - `Summary`: count of new / changed RPCs and the service.
            - `Files`: one file per line with its change count (`+4 RPCs, +8 messages`) or `new file`.
            - `Compatibility`: wire-compatible or not.
            - `Unchanged`: existing messages that gain no field.
            - `Permissions`: new permissions, seeds, permission-map entries, snapshots to update.
            - Other notes (an RPC kept as-is, where it appears): one fact each.
        - **One block per changed API** (always visible): `<div class="api" id="api-<kebab-name>" data-part="<RpcName>">` — each is one presentation step:
            - `<h3><code>RpcName</code> <span class="pill">new</span></h3>` (`<span class="pill quiet">` for `changed` / `behaviour`), then `<p class="refs">` with the route and permission (`none · system caller` when it has none), joined by ` · `.
            - A `.tables` grid with two cards headed by the message name alone: the request message first, then the response message. New message → `.tbl.new` + tag `new message` (green card), every field with its number. Removed message → `.tbl.drop` + tag `removed message` (red card), every field it had. Existing message → tag `altered`, only the changed fields: `+ N` add (`.row.add`), `~ N` change (`.row.change`, type `old → new`), `− N` remove (`.row.drop`). No field change → leave the cards out and end the refs line with `no field change`.
            - A rule change without a contract change → `behaviour` pill, no cards.
            - Any runtime rule change (with or without a contract change) → a closed `<details class="more">` under the cards, summary `Behaviour` + `<span class="aside">what changes at runtime</span>`, one bullet per rule (refusals with their code and message, guards, what is or is not stored). Not a plain paragraph.
        - **Shared types** (`<div class="api" id="api-shared-types" data-part="Shared types">` + `<h3>Shared types</h3>`): new or changed enums and nested messages used by more than one API. Leave the block out when there are none.
        - When the contract leaves a field number open (`<16 / 26>`), show it as-is and flag it in Open questions.
        - **Full contracts** (hidden, summary `Full contracts` + `<span class="aside">every related API, full request and response</span>`): every API the feature adds, changes or calls.
            - `<h4>` per API (name · route · `new` / `changed` / `called, unchanged`), then full request and response cards with every field in field-number order. Changed fields keep their marks.
            - An API another service owns → `.tbl.ext`.
        - No related API at all → keep the section with one sentence: "This feature has no API changes."
    6. **Errors**: a table of cause → code → what the user sees. No new errors → one sentence saying so.
    7. **Open questions**: a `<p class="blocker-line"><strong class="blocker">Blocker:</strong> …</p>` per blocker (a tinted amber band with the label), then an `ol.questions` with one `<li><p>question</p><span class="who">Owner: …</span></li>` each (leave out `.who` when no owner is known). None → one sentence saying there are no open questions.
- Manual mode: add one `<script src="sequence-diagram/NN-<slug>.js">` per use case before the final `SeqDiagrams.renderAll()` line.
- Rewrite the rail to match, one `<li>` per section in page order, numbers matching each `.sec-n`:
    - Use cases: one nested link per use case (`#uc-NN`, `UC<n>` + use case name).
    - Database: one nested link per changed table card (`#db-<table>`, `4.N` + table name).
    - API: one nested link per changed API (`#api-<kebab-name>`, `5.N` + RPC name), plus `Shared types` when that block exists.
    - No nested items (no changes) → the section link alone, no nested `<ol>`.

### 5. Offer the mock

- Ask which mock to build (use AskUserQuestion when the agent has it). Skip the question when the feature has no UI.
    - **In project** (recommended when the frontend app is found): mock pages inside the real app at `<routes-root>/mock/spec<NNN>/` (e.g. `apps/<web-app>/app/(main)/mock/spec164/`), built from its real components and types, with local data and no API / RPC calls. The user manages the branch and ignores the folder.
    - **Standalone HTML**: `<output>/mock/`, opens from disk, no app needed.
    - **No mock**.
- In project / Standalone → run the `generate-mock-ui` skill (`naphatwx-tools:generate-mock-ui` in Claude Code) with `<output>` as its plan folder and the chosen mode (`in-project` / `standalone`). It reads `<output>/use-cases.js`, writes the mock with `mock/shared/scenario-play.js` (how to play each scenario) and re-runs `scripts/scenarios-panels.js`, which adds the Play links and "Open the mock ↗".
- After it returns, re-run `node <this skill dir>/scripts/scenarios-panels.js <output>` yourself if you changed any use case block since (it is safe to re-run), and keep its printed counts for step 7.
- No mock → nothing to do: each use case's Scenarios view already lists its scenarios, without Play links.

### 6. Verify

- Every rail link hash, nested ones included, matches an id on the page; every `.slide` has a `data-title`; every `data-flow`, `<img src>` and `<iframe src>` points to a file that exists.
- Every use case has both a flowchart and a sequence diagram file; every view button has `aria-expanded="false"`, every `.panel` is `hidden` and every `details.more` is closed by default.
- Every flowchart decision, call, write and error node shows a real value from the brief (or `TBD`); no sequence note or `alt` says only `guards` / `checks`.
- Database "Full schema" lists every table in the sequence diagrams; API "Full contracts" lists every API in them.
- Every table in the Full schema appears on an ER diagram page, and every ER button points to a page that exists.
- `.parts/` is deleted.
- Every `href="#…"` on the page (rail, use case index) resolves to an id.
- Each use case keeps one name everywhere: rail, use case index, `data-title`, its `<h3>` and its `USE_CASES` title. Its Scenarios panel lists scenarios of that use case only.
- Run the generate-use-case skill's `scripts/check.js <output>/use-cases.js` and fix every error it reports.
- Mock built (standalone) → run the generate-mock-ui skill's `scripts/check-scenarios.js <output>/mock` and fix every error it reports: `node --check` on every mock `.js` file and inline `<script>`, one play entry per scenario, every state id in `states.js`, and every API / console scenario run against the fake API with a result matching its `expect`. Then check each use case's Scenarios count and Play links match `use-cases.js` (re-run `scenarios-panels.js` if not).
- Each `generate-diagram` run did its own checks; re-run it for any diagram that fails below.
- Open `overview.html` in a headless browser when one is available, and press `Open all`, then check each diagram draws (no "Missing diagram file" text, no broken image or empty iframe), labels are not clipped, each iframe ends at its diagram (no cut-off, no empty space below), with `Zoom` switched on, the wheel zooms each diagram and its `↺` button resets it, its `⛶` button opens it in the lightbox and fits the whole diagram, and the console has no `[seq]` warnings. Open each ER diagram page too: every table and FK line draws, and its `← Overview` link works.
- Presentation mode, in the same browser at 1440×900, 1280×720 and 1024×768: press `P` and step through every step; on each, the page is no wider than the window (`document.documentElement.scrollWidth <= innerWidth`), the step's diagram or tables show whole across, the diagram box ends above the bar, every diagram label renders at 14px (not scaled up or down), and a box that scrolls shows the `continues ↓` cue.
- Grep the output for absolute local paths (`/Users/`, `/home/`, `C:\`) and remove them.

### 6b. Review the mock (always, when a mock exists)

- Run after step 6 passes, before step 8. Follow the generate-mock-ui skill's `references/mock-review.md`:
    - two **fresh**, review-only agents in one message, in parallel: a UI fidelity reviewer ("Would a user think this IS the real app?") and a functional reviewer ("Does every scenario behave as the spec says?");
    - merge their reports; settle each conflict against the spec first, then the real code, and note which won;
    - one **fresh** fix agent applies every fix (never a reviewer);
    - then `node <this skill dir>/scripts/scenarios-panels.js <output>` and re-run step 6.
- Don't run the reviewers again unless the fix agent reports a finding it could not apply.
- No mock → skip.

### 7. Confirm

- Output: `✅ Plan created at: {output}/overview.html`
- Say the diagram mode (diagram-design or manual).
- List the use cases (one line each), the ER diagram page(s), and which mock was built (standalone, in-project with its folder, or none).
- Scenarios: the total, the count per use case and how many are playable, copied from the script output, plus the path of `use-cases.js` (generate-test-cases reads it too).
- Mock review: both verdicts, findings by severity, how many were fixed, and each conflict with the side that won.
- Remind the user: each diagram is edited in its own file under `flowchart/`, `sequence-diagram/` or `database/`; the overview picks up the change on reload.

### 8. Publish as a claude.ai Artifact (only when asked)

Publish only after step 6b (when a mock exists). Publish from a copy, never the plan folder itself. Two things break inside claude.ai:

- A `target="_blank"` link opens the artifact's internal frame URL in a new tab, which claude.ai refuses (`ERR_BLOCKED_BY_RESPONSE`). The copy drops `target` / `rel` from every link.
- The entry page is published as `index.html`, so links back to `overview.html` (`../overview.html` from the ER diagram's `← Overview` and the mock's `← Feature plan`) must point at `index.html` in the copy.

Steps:

- `node <this skill dir>/scripts/publish-copy.js <output> <copy-dir>`, with `<copy-dir>` outside the plan folder (the agent's scratchpad, e.g. `<scratchpad>/<feature-slug>-artifact/`). It makes both fixes and prints `file_path`, `root` and `files`.
- Publish with the Artifact tool when the agent has it: `file_path` = the printed `index.html`, `root` + `files` = the printed values (every file goes through `files`; `types.ts` is sent as `text/plain`). First publish also needs an `icon`.
- Republish → rebuild the copy at the **same** `<copy-dir>` and publish the same `file_path`, so the URL stays.
- Keep Hard Rule 5 for the local folder: only the copy loses `target="_blank"`.
- No Artifact tool → stop after the copy and tell the user where it is.
