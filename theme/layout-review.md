# Layout review

One fresh sub-agent per HTML file checks its layout in a browser and fixes what is broken. Run it after the skill's own Verify step, before the reply.

Why fresh agents: the agent that wrote the page reads its own intent into it. A reviewer that only sees the rendered page sees what the user will see.

```
files written + verified
   ├── layout agent: file 1 ─┐
   ├── layout agent: file 2 ─┤  (in parallel, one per file)
   └── layout agent: file N ─┤
                             ▼
        main agent fixes shared files, re-runs Verify
```

## 1. List the files

- Every `.html` file this run wrote or changed. Skip files copied unchanged.
- A page that embeds others (iframes) is one file; each embedded file is its own file too.

## 2. Spawn the agents

- Spawn one **fresh** agent per file, all in **one message**, so they run in parallel.
- Give each: the file's path, the page type (slides, docs, report, diagram, mock screen, …), its brief below and the reply format.
- The agent can't spawn sub-agents → review the files yourself, one after the other, with the same brief. Say so in the reply: a self-review is weaker.

## 3. Brief for each agent

- Open the file in a headless browser (Playwright when installed, else Chrome / Chromium `--headless`, with `--allow-file-access-from-files`).
    - Widths: 1300, 1920 and 2560px. A full-window page (slides, a mock frame) also at 1280×720; step through every slide or state.
    - Take a full-page screenshot at each width and look at it.
    - No browser at all → read the HTML and CSS instead, and say the review is static.
- Look for:
    - a page wider than the window (`document.documentElement.scrollWidth > innerWidth`);
    - text that overlaps, is clipped, or runs out of its box; long words or code that do not wrap or scroll;
    - boxes, tables, cards or diagrams that overflow their column or sit on top of each other;
    - large empty gaps, collapsed (zero-height) boxes, an iframe cut off or with empty space below;
    - broken images or iframes, missing fonts or icons, console errors;
    - the floating bar (`.float-bar`) covering the last line;
    - a section, card or column that does not line up with the ones next to it.
- Fix layout only, in this file only:
    - change markup structure and CSS outside the `theme:*` markers; use `var(--token)` and the `--radius*` tokens, never a raw hex or px radius;
    - never change the content: text, data, numbers, links, order;
    - never edit between `theme:*` markers, or any other file.
- Report, not fix, when the cause is outside this file: a shared CSS or JS file, a `theme:*` block, or a page built by a script from a template (the next run overwrites it).
- After a fix, open the file again at every width and check it.
- Reply:
    - verdict: `CLEAN` / `FIXED` / `NEEDS MAIN`;
    - each problem found: the width, where on the page, what is wrong, and the fix made (`file:line`) or why it was not fixed.

## 4. After the agents

- Fix each `NEEDS MAIN` problem once, in the shared file.
- The cause is a `theme:*` block or a template the skill copies unchanged → don't patch the output; tell the user it needs a fix in the plugin.
- Anything changed → re-run the skill's Verify step.
- Reply: files reviewed, count per verdict, and each problem not fixed.
