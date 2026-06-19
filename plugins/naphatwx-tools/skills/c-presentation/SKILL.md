---
name: c-presentation
description: Create an HTML slide presentation (16:9, click-zone navigation, fade transitions). Use when the user asks to build or generate an HTML presentation, slides, or slideshow.
---

# HTML Presentation Generator

Create a single-file HTML slide presentation from a bundled template.

The template uses a minimal style with two themes.

- Dark theme is the default (`#1a1a1a` background).
- Light theme uses a light grey background (`#d3d3d3`).
- A toggle button (top right) or the `t` key switches themes.

## User Input

```text
$ARGUMENTS
```

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
7. Dark theme is the default. Light theme reachable through the toggle.

## Workflow

### 1. Copy the template

- Read `template/index.html` from this skill folder.
- This file already satisfies every hard rule. Do not rewrite it from scratch.

### 2. Fill in content

- If the user gave a topic, replace the slide content with that topic.
- If not, keep the placeholder random content.
- Keep 4-6 slides unless the user asks otherwise.
- Only edit text inside `<section class="slide">` blocks.
- Keep the minimal style and the two themes.
- Keep dark theme as the default.
- Do not change the navigation script, theme toggle, or the layout CSS.

### 3. Write the file

- Default: `<topic>.html` at the project root.
  - Use the topic as the file name, in kebab-case.
  - No topic → use `presentation.html`.
- Custom: write to the path the user gave.

### 4. Confirm

- Output: `✅ Presentation created at: {path}`
- Remind the user: click left or right to move, arrow keys also work.
- Remind the user: click the toggle or press `t` to switch dark and light themes.
