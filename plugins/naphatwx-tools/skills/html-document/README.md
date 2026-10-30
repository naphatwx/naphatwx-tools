# html-document

Generates one self-contained HTML docs page, dark only, in the naphatwx theme (the same look as design-feature's overview), from files or a topic.

## When to use it

- You have markdown, a `docs/` folder or a topic, and want one styled page to share or open offline.
- You want readers to jump between sections from a numbered rail and filter them by name.
- Say: "make HTML docs for X", "turn this markdown into a docs page".

| You want | Use instead |
|----------|-------------|
| A slide deck, one click per slide | `html-presentation` |
| A plain-words guide for end users, in markdown | `user-guide` |
| A full feature plan: use cases, flows, database and API changes | `design-feature` |
| One flowchart, sequence or ER diagram | `generate-diagram` |

## How it works

The agent copies the template and changes only the content. Style and script stay as they are.

```mermaid
graph TD
    IN["input: topic + source, both optional"] --> SRC{source given?}
    SRC -->|yes| READ[read the files: topic, sections, steps, code, terms, tables, warnings]
    SRC -->|no| ASK[ask once where the content is, or offer placeholder content]
    ASK --> READ
    READ --> COPY[copy template/index.html]
    COPY --> FILL[replace the title and brand with the topic]
    FILL --> NAV["rewrite the rail: 01, 02 … with nested N.M links"]
    NAV --> ART["rewrite the sections: kicker, facts, callouts, steps, code, tables"]
    ART --> CHK{every rail link href matches an id?}
    CHK -->|no| NAV
    CHK -->|yes| OUT["write #lt;topic#gt;.html"]
    OUT --> MSG["reply: ✅ Docs created at: #lt;path#gt;"]
```

Rules the diagram doesn't show:

- One file. No external CSS, JS, fonts or images.
- Dark only. No light theme, no toggle.
- Text uses the `--fs-*` tokens, never fixed `px`.
- Colors use the theme tokens, never new hex values. Never edit between the `theme:` markers.
- The Export PDF button stays: it opens the print dialog, pick "Save as PDF".
- `[` hides the rail; `/` jumps to its search.
- Diagrams (flowchart, sequence, table cards) are inline SVG in the theme, never Mermaid or an image.
- A part the template does not have reuses a theme class first, else matches the closest part with theme tokens.

## Input → output

Input: `<topic>` plus a source location, both optional.

- Source: a file, a folder or a `docs/` path the user points to.
- Output path: the one the user gave, else `<topic>.html` (kebab-case) at the project root, else `docs.html`.

Output:

```
<project root>/
└── <topic>.html     the docs page: numbered rail with search, active-section highlight, text size, Export PDF
```


## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |
| [template/index.html](template/index.html) | The docs page with sample content; copied, then its content replaced |

## Related skills

- `html-presentation`: the same theme, as slides.
- `user-guide`: an end-user guide in markdown, which this skill can turn into a page.
- `design-feature`: a browsable plan folder for a feature.
