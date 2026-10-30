---
name: html-document
description: Generate a single-file HTML docs page in the naphatwx theme (the same look as design-feature's overview), with a numbered section rail and search, from files or a topic. Use when the user says "make HTML docs for X" or "turn this markdown into a docs page". Slides are html-presentation; a markdown user guide is user-guide.
---

# HTML Documentation Generator

Generate a single-file HTML docs page from a bundled template, in the naphatwx theme.

- Layout: the same as design-feature's overview. A numbered rail on the left (`01`, `02` …, sub-sections `2.1`, `2.2` …) with search, a round edge button that hides it, and a centered sheet of sections.
- Colors and element defaults come from the synced theme block (Quiet Sheet) between the `theme:*` markers in the `<style>`. Don't edit between the markers; change `theme/` in the plugin repo and run `node theme/sync.mjs`.
- The floating bar at the bottom right holds the text size picker and **Export PDF** (opens the print dialog; pick "Save as PDF"). Keep the `theme:pdf`, `theme:pdf-js`, `theme:font-size` and `theme:font-size-js` blocks and the `addFontSize()` + `addExportPdf()` calls.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<topic>` plus a source location, both optional.

- Source is whatever the user points to.
    - A file, a folder, or a `docs/` path.
    - The user tells you where it is.
- No source given → ask once where the content should come from.
    - Offer to use placeholder content if they have no source.
- No output path → write `<topic>.html` at the project root.
    - Use the topic as the file name, in kebab-case.
    - No topic → write `docs.html`.

## Hard Rules

The output **must** keep all of these:

1. Single self-contained file. No external CSS, JS, fonts, or images.
2. Dark only. Add no light theme, theme toggle, or other palette.
3. Export PDF and the A / A / A text size picker stay in the floating bar and work.
4. The rail, its search, the edge button, the ☰ menu (phones), the skip link and the active-section highlight stay and work. `[` hides the rail; `/` focuses its search.
5. Every rail link `href="#id"` (nested ones too) matches a real `id` on the page. Rail numbers match each `.section-number`.
6. Everything on the page uses the theme, including parts the template does not have (step 3, "Diagrams" and "Anything else"). No library, CDN script, web font or second palette: no Mermaid, Chart.js or icon fonts.
7. **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

## Workflow

### 1. Read the source

- Use Glob and Grep to find and read the files the user pointed to.
- Extract:
    - Topic and overview.
    - Main sections and sub-sections.
    - Steps, code samples, terms, tables, and warnings.
- No source → ask where it is, or use placeholder content.

### 2. Copy the template

- Read `template/index.html` from this skill folder.
- This file already satisfies every hard rule. Do not rewrite it from scratch.
- Do not change the existing `<style>` and `<script>` rules or anything between the `theme:` markers. Only add CSS for a new part (step 3, "Anything else").
- Delete example parts the content does not use (a diagram, a table card), and their rail links.

### 3. Fill in content

- Replace the `<title>`, the rail brand (`.rail-mark` letter + name) and the Overview kicker. Keep the brand to the topic only — no badge or spec number.
- One `<section class="slide" id="…">` per main section, in order.
    - The first is the overview: kicker (`<span class="section-number">01</span>` + version, owner or status), `<h1>`, a one-sentence `.lead`, then an optional `dl.facts` of 2–4 key facts.
    - Every other section: `<h2><span class="section-number">NN</span>Title</h2>`.
    - A sub-section that needs a rail link: `<h3 id="…"><span class="section-number">N.M</span>Title</h3>`.
- Rewrite the rail to match: one `<li>` per section, numbers `01`, `02` …; sub-sections nest in an `<ol>` as `N.M`. No sub-sections → the section link alone.
- Reuse the parts already in the template:

| Part | Markup to copy |
| --- | --- |
| Key facts | `<dl class="facts"><dt>…</dt><dd>…</dd></dl>` |
| Callout | `<p class="callout"><strong>Label</strong>text</p>`, `.warn` or `.danger` |
| Numbered steps | `<ol class="steps"><li><strong>…</strong><p>…</p></li></ol>` |
| Code block | `<pre><code>…</code></pre>` |
| Table | `<div class="table-wrap"><table>…</table></div>` |
| Tag | `<span class="pill">new</span>`, `.pill.quiet` |
| Hidden detail | `<details class="more"><summary>Title <span class="aside">what it holds</span></summary>…</details>` |
| Minor note | `<span class="aside">…</span>` |
| Flowchart | `<div class="flowchart"><svg>…</svg></div>` |
| Sequence diagram | `<div class="sequence"><svg>…</svg></div>` |
| Table, message or data model card | `<div class="tables"><div class="table-card">…</div></div>`, `<p class="relation">` |

**Diagrams**

- Draw every diagram as inline SVG inside the page, copied from the template's "How it works" section. Never a separate file, an image or a diagram library.
- Flowchart (`.flowchart`): `rect.pill rx="22"` for start / end, `rect.box rx="8"` for a step, `polygon.decision` for a yes / no question, `.connector` paths with an arrowhead `<marker>` whose id is unique per flowchart (`ah-1`, `ah-2` …), exit labels as `g.edge-label[data-cx]`. Node text is a short phrase plus a `.detail` line with the real value.
- Sequence (`.sequence`): `g.actor` heads, `line.lifeline`, then one `g.step` per message: `line.message` (call), `.message.return` (response, dashed), `.message.hot` (write or side effect), each with its `.arrowhead` and a numbered `g.edge-label`.
- Tables, request / response messages, data models (`.tables` + `.table-card`): one `.row` per column with `.column`, `.type`, `.key`. Changes use `.table-card.add` / `.change` / `.drop` / `.external` and `.row.add` / `.change` / `.drop`, plus `<p class="legend">`.
- Draw at 1:1: set `viewBox`, `width` and `height` to the same size, at most about 1000 wide (wider scrolls in its box). Labels are 14px, secondary lines 12px; never scale the SVG.
- Give each `<svg>` a `<title>` or `aria-label` saying what it shows.
- When the `generate-diagram` skill is installed, follow its flowchart, sequence and ER references for layout and budgets (at most 12 nodes, 7 participants). Copy only the SVG inside the page, not its file.
- `fitDiagramLabels()` sizes every label box to its text, again when the text size changes or a `<details>` opens. Keep the `theme:diagram-labels-js` block and the code that calls it.

**Anything else** (tabs, badges, cards, a filter, a chart, a toggle …)

- First reuse a part from the template or a theme class (`.label`, `.pill`, `.aside`, `.table-card`, `.callout`, `details.more`).
- Nothing fits → write new CSS in the page's own `<style>`, outside the `theme:` markers, that matches the closest part:
    - Surfaces `var(--surface)` / `var(--surface-2)`, borders `1px solid var(--line)` or `var(--line-strong)`, hover `var(--hover)`, selected `var(--accent)` / `var(--accent-soft)`.
    - Text `var(--text)` / `var(--text-2)` / `var(--text-3)`; status colors only `--ok`, `--warn`, `--bad` and their `-soft` tints.
    - Fonts `var(--sans)` / `var(--mono)`, sizes `--fs-*`, radii `--radius*`, motion `var(--ease)`. Keep the theme focus ring; add no other outline.
- A chart is inline SVG too: theme colors only, labels at `--fs-meta`.
- Never add a new hex color. `node theme/sync.mjs --check` in the plugin repo rejects any hex that is not a theme color.


### 4. Write the file

- Default: `<topic>.html` at the project root, file name in kebab-case.
- No topic → `docs.html`.
- Custom: write to the path the user gave.

### 5. Confirm

- Output: `✅ Docs created at: {path}`
- Remind the user: `/` searches the rail, `[` hides it.
