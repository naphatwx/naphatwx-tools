---
name: html-presentation
description: Create a single-file 16:9 HTML slide deck, one click per slide, from a topic. Use when the user says "make HTML slides about X", "build a presentation" or "make a slideshow". Slides only; a scrolling docs page is html-document, an end-user guide is user-guide.
---

# HTML Presentation Generator

Create a single-file HTML slide presentation from a bundled template.

The template uses a minimal, dark-only style. Colors and element defaults come from the synced theme block (Quiet Sheet) between the `theme:*` markers in the `<style>`. Don't edit between the markers; change `theme/` in the plugin repo and run `node theme/sync.mjs`.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<topic>` or `<topic> <output-path>` (both optional)

- No topic → use placeholder random content.
- No output path → write `<topic>.html` at the project root.
    - Use the topic as the file name, in kebab-case.
    - No topic → write `presentation.html`.

## Hard Rules

The output **must** keep all of these:

1. Aspect ratio 16:9, centered, scales to fit the viewport.
2. Click left area → previous slide. Click right area → next slide.
3. Fade transition when changing slides.
4. First slide → cannot go to previous.
5. Last slide → cannot go to next.
6. Single self-contained file. No external CSS, JS, or images.
7. Dark only. Add no light theme, theme toggle, or other palette.

## Workflow

### 1. Copy the template

- Read `template/index.html` from this skill folder.
- This file already satisfies every hard rule. Do not rewrite it from scratch.

### 2. Fill in content

- If the user gave a topic, replace the slide content with that topic.
- If not, keep the placeholder random content.
- Keep 4-6 slides unless the user asks otherwise.
- Only edit text inside `<section class="slide">` blocks.
- Keep the minimal style. Color with the theme tokens, never new hex values.
- Do not change the navigation script or the layout CSS.

### 3. Write the file

- Default: `<topic>.html` at the project root.
    - Use the topic as the file name, in kebab-case.
    - No topic → use `presentation.html`.
- Custom: write to the path the user gave.

### 4. Confirm

- Output: `✅ Presentation created at: {path}`
- Remind the user: click left or right to move, arrow keys also work.
