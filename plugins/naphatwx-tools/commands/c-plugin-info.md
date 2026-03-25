---
name: c-plugin-info
description: Show installed Claude Code plugin and marketplace details
allowed-tools: Bash, Read, Glob
---

Show details of all installed Claude Code plugins and marketplaces.

## Steps

1. **Read the installed plugins registry:**
   - Read `~/.claude/plugins/installed_plugins.json`
   - Extract: plugin name, marketplace, version, install date, last updated, git commit SHA

2. **List all registered marketplaces:**
   - List directories in `~/.claude/plugins/marketplaces/`
   - For each marketplace, read its `README.md` (if exists) to get the source URL

3. **For each installed plugin, list its contents:**
   - List files recursively in `~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`
   - Identify commands (files in `commands/` folder) and skills (folders in `skills/` folder)
   - Read the first 5 lines of each command `.md` file and each `SKILL.md` to get the name and description from frontmatter

4. **Display results in this format:**

   ```
   ## Marketplaces

   | Marketplace | Source |
   |-------------|--------|
   | {name}      | {url}  |

   ## Installed Plugins

   ### {plugin-name} (from {marketplace})

   - **Version:** {version}
   - **Installed:** {date}
   - **Last updated:** {date}
   - **Git commit:** {short SHA}

   #### Commands

   | Command | Description |
   |---------|-------------|
   | /{name} | {description} |

   #### Skills

   | Skill | Description |
   |-------|-------------|
   | {name} | {description} |
   ```

5. Repeat for all installed plugins.
