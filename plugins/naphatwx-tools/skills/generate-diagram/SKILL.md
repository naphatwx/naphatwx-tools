---
name: generate-diagram
description: Draw one flowchart, sequence diagram or ER diagram as a local file, from a spec, brief, migrations or a database. Use when the user says "flowchart of the login flow" or "ER diagram of these tables". One diagram only; a full feature plan is design-feature.
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
4. Dark only, in the shared theme: no light palette, theme toggle or second palette, in either mode.
    - Manual mode: every template's `<style>` holds the synced theme block (`theme:tokens` and `theme:base` markers). Keep it as-is and style only with its tokens (`var(--surface)`, `var(--accent)`, `var(--mono)`…); the standalone flowchart `.svg` uses the same hex values.
    - diagram-design mode: use the minimal dark template (`assets/template-dark.html`, `example-<type>-dark.html`) and skip its first-run style-guide question (the answer is always "proceed with the default"). Brief it so its output matches manual mode:
        - Colors: only the theme's values, the hexes in the `theme:tokens` block of `template/er/er-diagram.html`. Map its defaults: paper `#2d3142` → `#18191d`; `#393e53` → `#1f2025`; `#41465b` → `#363940`; ink `#f5f5f5` → `#e2e3e7`; muted `#bfc0c0` → `#c6c8cf`; tags `#8e98ac` → `#a3a6b0`; accent `#f08a59` → `#8ab0ff`; blue `#274a73` → `#1b2232`; amber → `#f0c26b`; red `#ab5258` → `#f28b8d`; connectors `#6b6e78`.
        - Type: every label 14px (`font-size` 14 in viewBox units), sans and mono alike, with shapes sized to fit it. Hosts draw the SVG at 1:1, never scaled, so keep the viewBox at most about 1000 wide (wider scrolls sideways). Sentence case labels (`Yes`, `Retry`, `1 · Load`): no all-caps or letter-spaced tags. No dot-grid or patterned background.
        - Fonts: the OS font, never a web font. Delete the Google Fonts `<link>` (and any `preconnect`) and swap the font stacks: Geist and Instrument Serif → `-apple-system, "Segoe UI", system-ui, sans-serif`; Geist Mono → `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (single quotes inside SVG `font-family="…"` attributes).
5. Manual-mode files load nothing from the network: no external scripts, styles or fonts.
6. A diagram file never holds a step details list. The caller's page shows it (see the sequence reference).

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
- diagram-design mode, `flowchart` and `sequence`: add this embed script just before `</body>` of every saved `.html`, unchanged. It is the contract with a host page that embeds the file in an `<iframe class="diagram-frame">` (design-feature's `overview.html`):
    - Height: it posts `diagram-height` on every resize, so the host sizes the iframe to the content (no fixed height).
    - Heading: embedded, it adds class `embedded` to `<html>`, which hides the file's own `.eyebrow` and `<h1>` (the host already titles it). Keep the diagram-design title in those two elements.
    - Width: each SVG draws at exactly its viewBox width (1:1, so 14px labels render at 14px) and scrolls sideways in a narrow window instead of overflowing the page. A taller one is scrolled by the host.

```html
<script>
  // Embed contract with a host page such as design-feature's overview.html (postMessage works on file://).
  // Out: {type: "diagram-height", height} on every resize, so the host sizes the iframe.
  const embedded = parent !== window;
  const style = document.createElement("style");
  style.textContent = `* { scrollbar-width: thin; scrollbar-color: #363940 transparent; }
    .embedded body { padding: 1rem; }
    .embedded .eyebrow, .embedded h1 { display: none; }`;
  document.head.append(style);
  // Embedded: the host shows the title and sizes the height, so the file drops its own heading.
  if (embedded) { document.documentElement.classList.add("embedded"); document.documentElement.style.overflowY = "hidden"; }
  // Draw each diagram at its viewBox width, never scaled, so 14px labels render at 14px; a narrow frame scrolls it sideways.
  const svgs = [...document.querySelectorAll("svg[viewBox]:not(svg svg)")];
  svgs.forEach(svg => {
    Object.assign(svg.style, { width: svg.viewBox.baseVal.width + "px", maxWidth: "none", height: "auto" });
    if (getComputedStyle(svg.parentElement).overflowX === "auto") return;
    const box = document.createElement("div");
    box.style.overflowX = "auto";
    svg.before(box);
    box.append(svg);
  });
  // body, not documentElement: its scrollHeight never drops below the iframe's height
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
| `sequence` · diagram-design | `<iframe class="diagram-frame" src="<dir>/NN-<slug>.html" title="…" loading="lazy"></iframe>`, plus its `<div class="seq-steps">` fragment (see the sequence reference) |
| `sequence` · manual | `<div class="seq" data-flow="NN-<slug>"></div>`, plus `<script src="<dir>/render.js">` once, `<script src="<dir>/NN-<slug>.js">` per flow, then `SeqDiagrams.renderAll()` |
| `er` · either | `<a href="<dir>/er-diagram.html" target="_blank" rel="noopener">Open ER diagram ↗</a>` (one link per page when split) |

- Every `TBD` and open question found.
