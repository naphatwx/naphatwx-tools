# Flowchart

A flowchart shows one flow's logic: its steps, yes / no decisions, loops and end states. It does not show services or calls; that is the sequence diagram's job.

- One flow = one file, `NN-<slug>`. When a sequence diagram of the same flow exists, use its `NN-<slug>`.
- A flow with no decision still gets a flowchart: a straight line from start pill to end pill.

## Shapes

| Shape | Use for | Manual SVG |
|-------|---------|------------|
| Pill | Start, end, exit | outlined `rect rx="25"`: fill `#121316`, stroke `#4a4d55` |
| Box | A step the user or system does | filled `rect rx="8"`: fill `#24262c`, stroke `#363940` |
| Diamond | A yes / no question | accent `polygon`: fill `#1b2232`, stroke `#8ab0ff` |
| Arrow | Next step, loop back (retry, reset) | grey `#6b6e78` path with arrowhead |

- Shape carries the meaning; the diamond's blue is the only colour. Label text is `#e2e3e7` (14px), detail lines `#c6c8cf` (12px mono), exit labels `#a3a6b0` (13px). These are the theme's `--text`, `--text-2`, `--text-3`; nothing below 12px.
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

- Ask for a Flowchart of the same content, dark theme, with each node's detail line as its mono sub-label, in the theme's colors and type (SKILL.md hard rule 4); save to `NN-<slug>.html`; add the height reporter (SKILL.md step 3).

## Manual mode

- Start from `template/flowchart/01-example-flow.svg`. Keep its `<title>` / `<desc>`, marker, colours and the mono `<g>` for detail lines. A standalone `.svg` can't read CSS variables, so it uses the theme's hex values directly.
- Size shapes to the detail line: boxes and pills ≥ 160 wide, diamonds ≥ 220 wide.
- Set the `viewBox` to fit; lay nodes on a grid, main path top to bottom, branches to the sides; no line crosses a node.
- Save to `NN-<slug>.svg`. Don't copy the example itself to the output.

## Checks

- Every diamond has two labelled exits; every path reaches an end pill or loops back.
- No line crosses a node; no text overflows its shape.
- Every permission, call, write, state check and error node has a detail line with a real value (or `TBD`).
- No symbol from the "Words, not symbols" table is left in any label.
