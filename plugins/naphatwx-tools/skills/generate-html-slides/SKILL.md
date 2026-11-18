---
name: generate-html-slides
description: Create a single-file full-window HTML slide deck, one click per slide, from a topic. Use when the user says "make HTML slides about X", "build a presentation" or "make a slideshow". Slides only; a scrolling docs page is generate-html-docs, an end-user guide is write-user-guide.
---

# HTML Presentation Generator

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

1. The template's navigation and layout: the stage fills the whole window, click left / right moves, slides fade, and neither end wraps around.
2. Single self-contained file. No external CSS, JS, or images.
3. Dark only. Add no light theme, theme toggle, or other palette.
4. **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

## Workflow

### 1. Copy the template

- Read `assets/index.html` from this skill folder.
- This file already satisfies every hard rule. Do not rewrite it from scratch.
- Updating a deck made earlier → Read the old file first (rename it to `*.old.html`), copy the template to the same path, move the content over, then delete the old file. Start from `assets/index.html` and move every slide over as it is, changing only what was asked; never edit the old file in place. This keeps an old page from holding an old design: its theme blocks and page code come from the plugin's newest template every time.

### 2. Fill in content

- If the user gave a topic, replace the slide content with that topic.
- Keep 4-6 slides unless the user asks otherwise.
- Only edit text inside `<section class="slide">` blocks.
- Keep the minimal style. Color with the theme tokens, never new hex values.
- Do not change the navigation script or the layout CSS.

### 3. Write the file

- Write to the output path from User Input.

### 3b. Review the layout (always)

- Follow [references/layout-review.md](references/layout-review.md): one fresh sub-agent per HTML file this run wrote, all in parallel. Each opens its file in a browser and fixes broken layout. Step through every slide.

### 4. Confirm

- Output: `✅ Presentation created at: {path}`
- The layout review: files reviewed, count per verdict, and each problem not fixed.
- Remind the user: click left or right to move, arrow keys also work.
