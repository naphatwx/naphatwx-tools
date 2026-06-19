---
name: c-docs
description: Generate a styled single-file HTML documentation page (dark mode by default, light/dark toggle, sidebar nav, search). Use when the user asks to build or generate HTML docs, a docs page, or styled documentation instead of plain markdown.
---

# HTML Documentation Generator

Generate a single-file HTML documentation page from a bundled template.

The template is a dark-mode docs layout with a left sidebar, search box, and a light/dark theme toggle. The style is inspired by the Clerk docs.

## User Input

```text
$ARGUMENTS
```

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
2. Dark mode is the default theme.
3. The light/dark toggle button stays and works.
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

- Replace the `<title>`, the brand name, and the `badge` text.
- Rewrite the sidebar `nav` to match the real sections.
  - Group links under `nav-group-title` headings.
  - Each `nav-link` `href="#id"` must point to a heading with that `id`.
- Rewrite the `article.content` with the real documentation.
- Reuse the components already in the template:

| Component | Markup to copy |
| --------- | -------------- |
| Section heading | `<h2 id="...">` (must match a nav link) |
| Card grid | `<div class="card-grid"> … <a class="card">` |
| Callout | `<div class="callout">`, `.warn`, or `.danger` |
| Numbered steps | `<ol class="steps"> <li><strong>…</strong>…</li>` |
| Code block | `<pre><code>…</code></pre>` |
| Table | `<div class="table-wrap"><table>…</table></div>` |

- Keep the dark default and the theme toggle.

### 4. Write the file

- Default: `<topic>.html` at the project root, file name in kebab-case.
- No topic → `docs.html`.
- Custom: write to the path the user gave.

### 5. Confirm

- Output: `✅ Docs created at: {path}`
- Remind the user: click the top-right button to switch light/dark, use the sidebar search to filter sections.
