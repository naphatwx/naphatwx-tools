# Flowchart

A flowchart shows one flow's logic: its steps, yes / no decisions, loops and end states. It does not show services or calls; that is the sequence diagram's job.

- One flow = one file, `NN-<slug>`. When a sequence diagram of the same flow exists, use its `NN-<slug>`.
- A flow with no decision still gets a flowchart: a straight line from start pill to end pill.

## Shapes

| Shape | Use for | Manual SVG |
|-------|---------|------------|
| Pill | Start, end, exit | `rect.pill rx="22"`: outlined, `--bg` fill, `--line-3` stroke |
| Box | A step the user or system does | `rect.box rx="8"`: `--surface-3` fill, `--line-strong` stroke |
| Diamond | A yes / no question | `polygon.decision`: `--accent-fill` fill, `--accent` stroke |
| Arrow | Next step, loop back (retry, reset) | `.connector` path in `--connector` grey, with arrowhead |

- Shape carries the meaning; the diamond's blue is the only colour. Label text is `--text`, detail lines `--text-2` (mono), exit labels `--text-3`. Labels, detail lines and exit labels are all 12px.
- Exit labels (`Yes`, `No`, `Retry`) are `.edge-label` groups (SKILL.md step 3), centered on the midpoint of the segment they label: just above a level segment, on a vertical one (the box hides the line behind the text).
- Labels are sentence case: `Yes`, `No`, `Retry`.

- Every diamond has exactly two labelled exits (`Yes` / `No`, or two short outcomes). Every path ends at a pill or loops back to an earlier node.
- Node text is two lines: a short phrase (≤ 4 words; a question ends with `?`), then a **detail line** with the real value (below).

## Real values on every node

A reader should see *what exactly* is checked or called without opening the spec. Each node's detail line (monospace, ≤ 28 chars) names the real value from the source:

| Node | Detail line holds | Example |
|------|-------------------|---------|
| Permission diamond | the permission key | `redeployment.redeploy` |
| State / type diamond | the field and the values that pass | `status = AVAILABLE`, `type in WEB, BACKEND, WORKER` |
| Validation diamond | the rule | `name max 64 chars` |
| Feature flag / config diamond | the flag or key | `FF_LEGACY_REDEPLOY` |
| Step that calls a service | the RPC or endpoint | `TriggerRedeployment`, `POST /things` |
| Step that writes | the table op or queue | `INSERT infra.redeployment` |
| Error / refusal step or pill | the code or reason constant | `REASON_NOT_LONG_RUNNING` |
| Start pill | the screen, route or trigger | `/repositories/:id` |
| End pill | the resulting state | `status = QUEUED` |

- Exit labels use real values too when they are not plain yes / no: `THANOS_LEGACY` / `THANOS`, `INACTIVE or FAILED`.
- Few symbols: say it in simple words (table below). Keep only `=` and the real names themselves (dots in `infra.redeployment`, `/` in routes).
- Several values → the most telling ones, then `and N more` (`WEB, BACKEND and 1 more`); the full list goes in the caller's rules.
- No real value in the source → `TBD`, never a made-up one. A node with nothing to name (e.g. `Done`) may skip the detail line.
- Loops (retry, forgot password → reset → back to login) route around the side, never through other nodes, and enter their target at their own point (a free edge of the shape), never joining another connector mid-shaft.

## Words, not symbols

Every label, detail line and condition a reader sees:

| Instead of | Write |
|------------|-------|
| `∈` / `∉` | `in` / `not in` |
| `⊆` | `all in` |
| `≠`, `!=` | `not` (`status not AVAILABLE`) |
| `≠ ''`, `!= null` | `not empty`, `is set` |
| `≤` / `≥` | `at most` / `at least` |
| `&&` / `\|\|` | `and` / `or` |
| `→` | `gives`, `then`, `maps to` |
| `+N` | `and N more` |
| `·` or `/` between values | `,` or `or` / `and` |
| `(a)/(b)` | the plain name of each check |

## diagram-design mode

- Ask for a Flowchart of the same content, dark theme, with each node's detail line as its mono sub-label, in the theme's colors and type (SKILL.md hard rule 4); save to `NN-<slug>.html`; add the embed script (SKILL.md step 3).

## Manual mode

- Start from `template/flowchart/01-example-flow.html`. Keep its `theme:` blocks, its classes, the `<title>` / `<desc>`, the marker and the scripts at the end (Export PDF, label fitting, the embed contract). Change the `<title>`, `.eyebrow`, `<h1>` and the `<svg>`. Several parts of one flow → one `<h2>` + `<div class="diagram">` per part.
- Size shapes to the detail line (about 8.5px per mono character, on the wide side, plus 12px each side): boxes and pills ≥ 160 wide, diamonds ≥ 240 wide; a 28-char detail line needs a 260-wide box.
- Keep it compact so more of the flow fits on one screen: pills 44 tall, boxes 52, diamonds 96; about 30px of connector between shapes, 12–16px margin around the drawing.
- Set the `viewBox` to fit, and `width` / `height` on the `<svg>` to the same numbers: a host page draws it at that 1:1 size, never scaled, so its text renders at its own size (a wider drawing scrolls sideways). Lay nodes on a grid, main path top to bottom, branches to the sides; no line crosses a node.
- Save to `NN-<slug>.html`. Don't copy the example itself to the output.

## Checks

- Every diamond has two labelled exits; every path reaches an end pill or loops back.
- Every exit label is centered on its segment (`data-cx` = the segment's midpoint).
- No line crosses a node; no text overflows its shape.
- Every permission, call, write, state check and error node has a detail line with a real value (or `TBD`).
- No symbol from the "Words, not symbols" table is left in any label.
