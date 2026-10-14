# AGENTS.md

## Layout

- `plugins/naphatwx-tools/skills/<name>/SKILL.md` is the single source for every tool. Edit only here.
- Frontmatter: `name` + `description` are required by every agent. Claude-only keys (`allowed-tools`, `argument-hint`, `disable-model-invocation`, `context`, `background`) are allowed; other agents ignore them.
- `context: fork` runs a skill in a fresh sub-agent that does not see the chat. Use it only for skills that ask the user nothing and return one report (e.g. `check-job`). Add `background: false` when the skill needs MCP tools.
- Keep skill bodies agent-neutral: name a Claude-only tool as an option ("use AskUserQuestion when the agent has it"), and give a fallback for `$ARGUMENTS`.
- Refer to other skills by bare name, e.g. the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code).
- `skills/<name>/README.md` is for people; agents follow `SKILL.md` only. `template/README.md` ships inside the generated folder.
- `plugins/naphatwx-tools/hooks/` holds the response-rules hook. It is Claude Code only, wired inline in the Claude `plugin.json`. Don't add a `hooks/hooks.json`: Claude auto-loads it too, and the hook would run twice.

## Theme

- Every HTML a skill makes uses one dark-only theme. No light theme, no toggle.
- Source: `theme/tokens.css` (colors, fonts, radius) and `theme/base.css` (element defaults).
- `node theme/sync.mjs` copies them into each template between `/* theme:tokens:start */ … end */` and `/* theme:base:start */ … end */` markers. Each skill folder stays self-contained, because `npx skills add` installs one folder only.
- Export PDF: `theme/pdf.css` (print rules, `.no-print`) syncs into `/* theme:pdf:start */ … end */`; `theme/pdf.js` (`addExportPdf(target, prepare)`) syncs into `/* theme:pdf-js:start */ … end */` inside a `<script>` or `.js` file. Every HTML template has both and calls `addExportPdf` once. With no target, Export PDF goes into the bottom-right `.float-bar` (one long box); put page tools in a `<div class="float-bar no-print">` before it. Page-specific print layout goes in its own `@media print`, outside the markers.
- Diagrams: `theme/diagram-labels.js` (`fitDiagramLabels`: each `.edge-label` box fits its rendered text) syncs into `/* theme:diagram-labels-js:start */ … end */`; `theme/diagram-embed.js` (Export PDF, 1:1 SVGs, the iframe embed contract) into `/* theme:diagram-embed-js:start */ … end */`. generate-diagram's `template/embed.html` holds both, for diagram-design files.
- Opt-in shared blocks, each synced into `/* theme:<name>:start */ … end */` only where a page has the marker:
  - `report.css` (`report`): deploy-plan, smoke-test and e2e-test page shell, `.pill` + `.tone-*`, `.tools`, `.cmd code`, and the `.disclosure` / `.disclosure-head` card.
  - `scenario.css` (`scenario`): generate-mock-ui and play-scenarios index chrome (use-case rows, scenario list, guide, frame, results).
  - `page-head.css` (`page-head`): header row, `h1`, `.sub`, `.actions`, `.btn` of the API contracts and ER pages.
  - `seq.css` (`seq`): sequence-diagram SVG parts, for the design-feature overview and the generate-diagram viewer.
  - `scrollbar.css` (`scrollbar`): thin WebKit scrollbars.
- `.sc-kind` and `.refs-chip` live in `base.css`; their print rules in `pdf.css`.
- Radii: use `--radius` (6px), `--radius-md` (8px), `--radius-lg` (10px), `--radius-xl` (12px), never a raw px value.
- Change marks: `theme/diff.css` syncs into `/* theme:diff:start */ … end */`. One class set for every table or message card, HTML and SVG: `.tbl` (+ `.add` / `.drop` / `.change` / `.ext`), `.tbl-head` (name first, then `.tag`), `.row` (+ `.add` / `.change` / `.drop`) with `.col`, `.type`, `.key`. Used by the design-feature overview, the API contracts page and the ER diagram.
- Every page with a `.float-bar` gets bottom padding from `theme/pdf.css` (`--float-space`), so the bar never hides the last line. A full-window page sets it back to 0 in its own CSS.
- Never edit between the markers. Edit `theme/`, then run `node theme/sync.mjs`.
- design-feature's `template/mock`, `flowchart`, `sequence-diagram` and `database` are preview copies of the generate-mock-ui and generate-diagram templates. Edit the source, then run `node theme/sync.mjs`. Files that differ on purpose are listed in `OWN` in `theme/sync.mjs`.
- Run `node theme/sync.mjs --check` before committing. It fails on drift, on any hex color that is not a theme color, and on text tokens below 4.5:1 contrast.
- Template CSS uses `var(--token)` only. Standalone `.svg` files use the theme hex values.
- Exception: mock screens (`mock/page|shared|contract`) use the target app's own design system.
- Review layout changes in `theme/gallery/index.html`: every template, live at 1300, 1920 and 2560px.
- The deploy-plan, smoke and e2e examples are built from `theme/gallery/data/`. Run `node theme/gallery/build.mjs` after changing those templates.

## Manifests

| File | Tool |
|------|------|
| `.claude-plugin/marketplace.json` | Claude Code marketplace |
| `plugins/naphatwx-tools/.claude-plugin/plugin.json` | Claude Code plugin (lists each skill) |
| `.agents/plugins/marketplace.json` | Codex marketplace |
| `plugins/naphatwx-tools/.codex-plugin/plugin.json` | Codex plugin |
| `plugins/naphatwx-tools/gemini-extension.json` | Gemini CLI extension |

Cursor, Windsurf, Cline and Copilot install through `npx skills add` and need no manifest.

## Versioning Rule

When any skill or hook is added, updated, or removed, you **must** bump the `version` field (patch increment) in all of:

1. `plugins/naphatwx-tools/.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json`
3. `plugins/naphatwx-tools/.codex-plugin/plugin.json`
4. `plugins/naphatwx-tools/gemini-extension.json`

All four files must always have matching versions.

A README-only change needs no version bump. A `SKILL.md` change (including moving a diagram out to the README) still bumps all four.

When adding or removing a skill, also update the `skills` list in `plugins/naphatwx-tools/.claude-plugin/plugin.json`.
