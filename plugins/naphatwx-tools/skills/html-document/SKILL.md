---
name: html-document
description: Generate a styled single-file HTML docs page with sidebar navigation and search, from files or a topic. Use when the user says "make HTML docs for X" or "turn this markdown into a docs page". Slides are html-presentation; a markdown user guide is user-guide.
---

# HTML Documentation Generator

Generate a single-file HTML documentation page from a bundled template.

The template is a dark-only docs layout with a left sidebar, search box, and a base font size picker (small 14px / normal 16px / big 18px, default normal). The style is inspired by the Clerk docs.

Colors and element defaults come from the synced theme block (Quiet Sheet) between the `theme:*` markers in the `<style>`. Don't edit between the markers; change `theme/` in the plugin repo and run `node theme/sync.mjs`.

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
3. The base font size picker stays and works. Default is normal (16px).
4. The sidebar nav, search box, and active-section highlight stay and work.
5. Every `nav-link` `href` matches a real heading `id` in the content.

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
- Do not change the `<style>` block, the theme tokens, or the `<script>` block.

### 3. Fill in content

- Replace the `<title>` and the brand name. Keep the brand to the topic only — no badge or spec number.
- Rewrite the sidebar `nav` to match the real sections.
    - Group links under `nav-group-title` headings.
    - Each `nav-link` `href="#id"` must point to a heading with that `id`.
- Rewrite the `article.content` with the real documentation.
- Reuse the components already in the template:

| Component       | Markup to copy                                    |
| --------------- | ------------------------------------------------- |
| Section heading | `<h2 id="...">` (must match a nav link)           |
| Card grid       | `<div class="card-grid"> … <a class="card">`      |
| Callout         | `<div class="callout">`, `.warn`, or `.danger`    |
| Numbered steps  | `<ol class="steps"> <li><strong>…</strong>…</li>` |
| Code block      | `<pre><code>…</code></pre>`                       |
| Table           | `<div class="table-wrap"><table>…</table></div>`  |

- Keep the font size picker. Color with the theme tokens (`var(--accent)`, `var(--text-2)` …), never new hex values.
- Size text with the `--fs-*` tokens, never hard-coded `px`. They are `rem`, so they follow the picker.

### 4. Write the file

- Default: `<topic>.html` at the project root, file name in kebab-case.
- No topic → `docs.html`.
- Custom: write to the path the user gave.

### 5. Confirm

- Output: `✅ Docs created at: {path}`
- Remind the user: pick A / A / A to change text size, use the sidebar search to filter sections.
