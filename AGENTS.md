# AGENTS.md

## Layout

- `plugins/naphatwx-tools/skills/<name>/SKILL.md` is the single source for every tool. Edit only here.
- Frontmatter: `name` + `description` are required by every agent. Claude-only keys (`allowed-tools`, `argument-hint`, `disable-model-invocation`) are allowed; other agents ignore them.
- Keep skill bodies agent-neutral: name a Claude-only tool as an option ("use AskUserQuestion when the agent has it"), and give a fallback for `$ARGUMENTS`.
- Refer to other skills by bare name, e.g. the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code).
- `plugins/naphatwx-tools/commands/` holds Claude-only commands that are not shipped (not listed in `plugin.json`).
- `plugins/naphatwx-tools/hooks/` holds the response-rules hook. It is Claude Code only, wired inline in the Claude `plugin.json`. Don't add a `hooks/hooks.json`: Claude auto-loads it too, and the hook would run twice.

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
