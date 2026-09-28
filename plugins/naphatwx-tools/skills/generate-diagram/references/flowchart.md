# Flowchart

A flowchart shows one flow's logic: its steps, yes / no decisions, loops and end states. It does not show services or calls; that is the sequence diagram's job.

- One flow = one file, `NN-<slug>`. When a sequence diagram of the same flow exists, use its `NN-<slug>`.
- A flow with no decision still gets a flowchart: a straight line from start pill to end pill.

## Shapes

| Shape | Use for | Manual SVG |
|-------|---------|------------|
| Pill | Start, end, exit | gold `#e0bb6a` rounded `rect` |
| Box | A step the user or system does | navy `#274a73` `rect` |
| Diamond | A yes / no question | red `#ab5258` `polygon` |
| Arrow | Next step, loop back (retry, reset) | grey `#7a7a84` path with arrowhead |

- Every diamond has exactly two labelled exits (`Yes` / `No`, or two short outcomes). Every path ends at a pill or loops back to an earlier node.
- Node text is a short phrase (≤ 4 words, 2 lines max); a question ends with `?`.
- Loops (retry, forgot password → reset → back to login) route around the side, never through other nodes.

## diagram-design mode

- Ask for a Flowchart of the same content, dark theme; save to `NN-<slug>.html`; add the height reporter (SKILL.md step 3).

## Manual mode

- Start from `template/flowchart/01-example-flow.svg`. Keep its `<title>` / `<desc>`, marker and colours.
- Set the `viewBox` to fit; lay nodes on a grid, main path top to bottom, branches to the sides; no line crosses a node.
- Save to `NN-<slug>.svg`. Don't copy the example itself to the output.

## Checks

- Every diamond has two labelled exits; every path reaches an end pill or loops back.
- No line crosses a node; no text overflows its shape.
