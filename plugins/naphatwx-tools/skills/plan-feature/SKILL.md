---
name: plan-feature
description: Plan a feature as a browsable HTML folder — overview.html with scope, one sequence diagram per flow (each in its own file), database structure, errors and open questions, plus an optional interactive mock UI. Use when the user asks to plan a feature, design a feature, or generate feature docs/diagrams from a spec, ticket or idea.
argument-hint: <spec-folder | feature description> [output-path]
---

# Feature Plan Generator

Turn a spec, ticket or idea into a plan folder people can open in a browser.

```
<output>/
├── overview.html              entry page: every topic, every diagram
├── sequence-diagram/
│   ├── render.js              draws each flow as inline SVG (copied as-is)
│   ├── 01-<flow-slug>.js      one flow = one file
│   └── 02-<flow-slug>.js
└── mock/                      optional, built by the generate-mock-ui skill
```

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
2. **One flow = one diagram file**: `sequence-diagram/NN-<slug>.js`, calling `SeqDiagrams.define()`. Never paste SVG into `overview.html`.
3. Every flow file is loaded by a `<script src>` at the end of `overview.html`, and drawn into `<div class="seq" data-flow="NN-<slug>">` inside its own `<h3 id="flow-NN">` block.
4. Every sidebar `nav-link` `href="#id"` matches a real heading `id`.
5. Every link into `mock/` opens in a new tab: `target="_blank" rel="noopener"`.
6. No external scripts, styles or fonts in `overview.html`. `render.js` and the flow files are local.
7. At most 7 participants per diagram. More than that → split the flow.
8. Every name in a diagram (RPC, endpoint, table, job) comes from the source. Unknown → write `TBD` in the label.

## Workflow

### 1. Read the source

- Use Glob, Grep and Read on the spec folder: spec, plan, data model, contracts, research, decisions.
- Extract:
    - Summary, key decisions, in scope / out of scope.
    - **Flows**: each user story or use case that has its own trigger and its own sequence of calls. A refusal/timeout path shared by several flows is its own flow.
    - Participants: user, frontend, backend services, databases, external systems.
    - Tables read and written, relations, and any external (read-through) tables.
    - Error mapping: cause → code → what the user sees.
    - Blockers and open questions.
- No source → ask once where the content is (use AskUserQuestion when the agent has it).

### 2. Copy the template

- Copy `template/overview.html` → `<output>/overview.html`.
- Copy `template/sequence-diagram/render.js` → `<output>/sequence-diagram/render.js`, unchanged.
- Read `template/sequence-diagram/01-example-flow.js` for the step format, then delete the example flow from the output.

### 3. Write one diagram file per flow

- Name: `NN-<flow-slug>.js`, numbered in reading order (`01-cut-new-version.js`).
- Header comment (max 3 lines): flow number, name, user story; the step format line from the example.
- Shape:

```js
SeqDiagrams.define("01-cut-new-version", {
    actors: [["eng", "Engineer", "browser"], ["api", "api-service", "VersionService"]],
    steps: [
        ["phase", "1 · Open the form"],
        ["call", "eng", "api", "GetBases(1204)"],
        ["ret", "api", "eng", "latestVersion"],
        ["note", "api", "permission check"],
        ["alt", "upstream accepts"], ["hot", "api", "db", "INSERT audit"], ["else", "refused"], ["ret", "api", "eng", "reason"], ["end"],
    ],
});
```

| Step | Meaning |
|------|---------|
| `["phase", text]` | Section band across the diagram |
| `["call", from, to, label]` | Request (solid arrow) |
| `["ret", from, to, label]` | Response (dashed arrow) |
| `["hot", from, to, label]` | Side effect: external write, audit, job trigger (accent arrow) |
| `["note", at, text]` / `["note", a, text, b]` | Note over one participant or spanning two |
| `["alt", cond]` … `["else", cond]` … `["end"]` | Branches |
| `["opt", cond]` / `["loop", cond]` … `["end"]` | Optional or repeated block |

- Labels: real names with example values (`GetLegacyRepositoryVersions(1204, page 1)`), not prose.
- Use `hot` only for writes that leave the service or must be audited, so readers can scan for side effects.

### 4. Fill in `overview.html`

- Replace the title, brand and eyebrow (spec number, ticket, status).
- Sections, in order. Drop a section only when it truly does not apply, and remove its nav link too:
    1. **Overview**: lead sentence + 3–4 cards (key decision, data impact, UI impact, eligibility/scale).
    2. **Scope**: in / out table.
    3. **Sequence diagrams**: one flow block per diagram file (copy the block between the `one block per flow` comments):
        - `<h3 id="flow-NN">`, pills (user story, requirement ids, file name), what + trigger.
        - `<div class="seq" data-flow="NN-<slug>"></div>`.
        - "Rules this flow must keep" — 3–5 bullets from the spec.
        - "Try it in the mock" cards — only if a mock exists or will be built; each opens in a new tab.
    4. **Mock UI**: link cards into `mock/` (new tab). No mock → replace with one line saying the feature has no UI.
    5. **Database structure**: `.erd` cards — `.erd-table` read, `.erd-table.write` written, `.erd-table.external` read through an API. Then `.erd-rel` relation lines with cardinality.
    6. **Errors**: cause → code → user-facing text.
    7. **Open questions**: blocker callout, then numbered steps.
- Add one `<script src="sequence-diagram/NN-<slug>.js">` per flow before the final `SeqDiagrams.renderAll()` line.
- Rewrite the sidebar nav to match: one link per flow under "Sequence diagrams".

### 5. Offer the mock

- Ask whether to build an interactive mock (use AskUserQuestion when the agent has it). Skip the question when the feature has no UI.
- Yes → run the `generate-mock-ui` skill (`naphatwx-tools:generate-mock-ui` in Claude Code) with `<output>` as its plan folder. It adds `mock/` and fills the "Try it in the mock" cards.
- No → remove the "Try it in the mock" blocks and the Mock UI nav link.

### 6. Verify

- Every `nav-link` hash matches a heading id; every `data-flow` has a loaded flow file.
- Open `overview.html` in a headless browser when one is available, and check each diagram draws (no "Missing diagram file" text) and labels are not clipped.
- Grep the output for absolute local paths (`/Users/`, `/home/`, `C:\`) and remove them.

### 7. Confirm

- Output: `✅ Plan created at: {output}/overview.html`
- List the flows (one line each) and whether a mock was built.
- Remind the user: each diagram is edited in its own `sequence-diagram/NN-*.js` file; the overview redraws itself.
