---
name: generate-diagram
description: Draw one diagram as a local file — a flowchart (a flow's logic), a sequence diagram (how services talk) or an ER diagram (tables, columns, foreign keys) — with the diagram-design skill when it is installed, otherwise from this skill's own templates. Use when the user asks for a flowchart, sequence diagram, ER diagram or database schema diagram from a spec, brief, migrations or database, or when the design-feature skill needs one.
argument-hint: <flowchart | sequence | er> <source> [output-path] [mode=diagram-design|manual]
---

# Diagram Generator

Draw one diagram (or one set of the same type) into a file a browser can open or another page can embed.

| Type | Shows | diagram-design mode | Manual mode |
|------|-------|---------------------|-------------|
| `flowchart` | A flow's logic: steps, yes / no decisions, loops, end states | `NN-<slug>.html` (its Flowchart type) | `NN-<slug>.svg` from `template/flowchart/` |
| `sequence` | Who calls whom, in what order, what comes back, which writes leave the service | `NN-<slug>.html` (its Sequence type) | `NN-<slug>.js` + `render.js` from `template/sequence-diagram/` |
| `er` | Tables, columns, types, keys and foreign keys, with what changes | `er-diagram.html` (its Database Schema type) | `er-diagram.html` from `template/er/` |

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<flowchart | sequence | er> <source> [output-path] [mode=diagram-design|manual]`

- **Type**: missing → infer it from the request ("ER", "schema", "tables" → `er`; "who calls", "services" → `sequence`; "logic", "steps", "decisions" → `flowchart`). Still unclear → ask once (use AskUserQuestion when the agent has it).
- **Source**: a brief (such as design-feature's `.parts/brief.md`), a spec folder or file, or a plain description. For `er` also: migration files, DDL, ORM models, or a live database read with read-only schema queries when the agent has a database tool.
- **Output path**: a file or a folder. Missing → `diagrams/` at the project root. Name files `NN-<slug>` in reading order (`01-login.svg`); an ER page is `er-diagram.html`.
- **Mode**: a caller that draws several diagrams passes it so they all match. Missing → pick it in step 2.

## Hard Rules

1. Every name in a diagram (RPC, endpoint, table, column, job, screen) comes from the source. Unknown → write `TBD`. Never invent one.
2. Write only the output files. Never edit the caller's page (for example design-feature's `overview.html`); give it the embed snippet instead.
3. Budgets: at most 12 nodes per flowchart and 7 participants per sequence diagram; more → split into several diagrams and say so. In diagram-design mode its own, tighter budgets win.
4. diagram-design mode always uses its **default dark theme**: the minimal dark template (`assets/template-dark.html`, `example-<type>-dark.html`) with the shipped default tokens. No light copy, no custom brand. Skip its first-run style-guide question: the answer is always "proceed with the default".
5. Manual-mode files load nothing from the network: no external scripts, styles or fonts.

## Workflow

### 1. Read the source

- Read only what this diagram needs; a brief from a caller replaces the spec.
- Unclear names or branches → mark them `TBD` and list them in the reply.

### 2. Pick the mode

- Mode given → use it.
- Otherwise check whether the `diagram-design` skill is available (`diagram-design:diagram-design` in Claude Code; any agent: listed in its skills).
    - Available → **diagram-design mode**: load that skill and ask it for the type named in the table above.
    - Not available → **manual mode**: use this skill's templates.

### 3. Draw

- Read the reference for the type and follow it: [flowchart](references/flowchart.md), [sequence](references/sequence.md), [er](references/er.md).
- diagram-design mode, `flowchart` and `sequence`: add this height reporter just before `</body>` of every saved `.html`. The SVG shrinks with an iframe's width, so a fixed height leaves empty space; a host page that listens for `diagram-height` (design-feature's `overview.html` does) sizes the iframe instead. It does nothing when the file is opened on its own.

```html
<script>
  // Report the real height to the host page so its iframe fits (postMessage works on file://).
  // body, not documentElement: documentElement.scrollHeight never drops below the iframe's current height.
  // Fractional rect height, not scrollHeight (rounds down): a 0.1px overflow shows a scrollbar strip.
  if (parent !== window) {
    // Embedded: the host sizes the height, and a slimmer padding keeps the SVG's min-width inside a narrow column.
    document.documentElement.style.overflowY = "hidden";
    document.body.style.padding = "1rem";
  }
  const postHeight = () => parent.postMessage({ type: "diagram-height", height: document.body.getBoundingClientRect().height }, "*");
  addEventListener("load", postHeight);
  new ResizeObserver(postHeight).observe(document.body);
</script>
```

### 4. Verify

- Run the checks at the end of the type's reference.
- Open each file in a headless browser when one is available: it draws, labels are not clipped, and the console has no `[seq]` or `[er]` warnings.
- Grep the output for absolute local paths (`/Users/`, `/home/`, `C:\`) and remove them.

### 5. Reply

- The mode used and each file written.
- The embed snippet for each file (a caller pastes it as-is):

| Type · mode | Embed |
|-------------|-------|
| `flowchart` · diagram-design | `<iframe class="diagram-frame" src="<dir>/NN-<slug>.html" title="…" loading="lazy"></iframe>` (no inline height) |
| `flowchart` · manual | `<img src="<dir>/NN-<slug>.svg" alt="…">` |
| `sequence` · diagram-design | `<iframe class="diagram-frame" src="<dir>/NN-<slug>.html" title="…" loading="lazy"></iframe>` |
| `sequence` · manual | `<div class="seq" data-flow="NN-<slug>"></div>`, plus `<script src="<dir>/render.js">` once, `<script src="<dir>/NN-<slug>.js">` per flow, then `SeqDiagrams.renderAll()` |
| `er` · either | `<a href="<dir>/er-diagram.html" target="_blank" rel="noopener">Open ER diagram ↗</a>` (one link per page when split) |

- Every `TBD` and open question found.
