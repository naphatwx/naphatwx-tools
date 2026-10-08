# AGENTS.md

## Layout

- `plugins/naphatwx-tools/skills/<name>/SKILL.md` is the single source for every tool. Edit only here.
- Frontmatter: `name` + `description` are required by every agent. Claude-only keys (`allowed-tools`, `argument-hint`, `disable-model-invocation`) are allowed; other agents ignore them.
- Keep skill bodies agent-neutral: name a Claude-only tool as an option ("use AskUserQuestion when the agent has it"), and give a fallback for `$ARGUMENTS`.
- Refer to other skills by bare name, e.g. the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code).
- `plugins/naphatwx-tools/hooks/` holds the response-rules hook. It is Claude Code only, wired inline in the Claude `plugin.json`. Don't add a `hooks/hooks.json`: Claude auto-loads it too, and the hook would run twice.

## Theme

- Every HTML a skill makes uses one dark-only theme. No light theme, no toggle.
- Source: `theme/tokens.css` (colors, fonts, radius) and `theme/base.css` (element defaults).
- `node theme/sync.mjs` copies them into each template between `/* theme:tokens:start */ … end */` and `/* theme:base:start */ … end */` markers. Each skill folder stays self-contained, because `npx skills add` installs one folder only.
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

When adding or removing a skill, also update the `skills` list in `plugins/naphatwx-tools/.claude-plugin/plugin.json`.
