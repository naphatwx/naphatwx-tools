# CLAUDE.md

## Versioning Rule

When any command or skill is added, updated, or removed, you **must** bump the `version` field (patch increment) in both:

1. `plugins/naphatwx-tools/.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json`

Both files must always have matching versions.
