# list-plugins

Lists the installed Claude Code plugins and marketplaces, with versions, skills and commands.

## When to use it

- You want to see which plugins and versions are installed.
- You want each plugin's skills and commands with their descriptions.
- Say: "list my plugins", "what plugins are installed".

| You want | Use instead |
|----------|-------------|
| A styled HTML page about a topic | `html-document` |
| A user guide for a feature | `user-guide` |

## How it works

Reads the local Claude Code plugin folders only. It changes nothing.

```mermaid
graph TD
    R["~/.claude/plugins/installed_plugins.json"] --> P[name, marketplace, version, dates, git SHA]
    M["~/.claude/plugins/marketplaces/#lt;name#gt;/README.md"] --> MS[marketplace source URL]
    P --> C["~/.claude/plugins/cache/#lt;marketplace#gt;/#lt;plugin#gt;/#lt;version#gt;/"]
    C --> CM["commands/*.md: first 5 lines"]
    C --> SK["skills/*/SKILL.md: first 5 lines"]
    MS & P & CM & SK --> OUT[markdown tables]
```

## Input → output

Input: none.

Output: a chat reply.

```
## Marketplaces            table: Marketplace | Source
## Installed Plugins
### <plugin> (from <marketplace>)
    Version, Installed, Last updated, Git commit
    #### Commands           table: Command | Description
    #### Skills             table: Skill | Description
```

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions and the output format |

## Related skills

- None. It reads plugins; it does not use other skills.
