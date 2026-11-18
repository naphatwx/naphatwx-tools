# setup-device

Installs the runtimes, MCP servers and plugins the naphatwx skills use, on a new or existing machine. You paste the secrets yourself.

## When to use it

- A new laptop, or a teammate setting up.
- You want to check what is missing, or update what is there.
- Say: "set up this device", "install my tools", "update my MCP servers".

## What it installs

| Runtime | Through | Version |
|---------|---------|---------|
| Node + npm | nvm | 24 LTS |
| Python | uv | 3.14 |
| Java | SDKMAN | 25 LTS (Temurin) |
| uv | its own installer | latest |

It installs a missing version manager first, and only adds versions: it never removes one or touches the OS Python.

| Tool | Kind | Used by |
|------|------|---------|
| [gitlab-mcp](https://github.com/zereight/gitlab-mcp) | MCP | review-code, get-mr-diffs, generate-changelog, update-merge-request, deployment-plan |
| [mcp-jenkins](https://github.com/lanbaoshen/mcp-jenkins) | MCP | check-job |
| [omnisql-mcp](https://github.com/srthkdev/omnisql-mcp) | MCP | database questions |
| [diagram-design](https://github.com/cathrynlavery/diagram-design) | plugin | diagrams |
| [mattpocock skills](https://github.com/mattpocock/skills) | plugin | ship-task (grilling) |
| [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | plugin | UI design |
| [impeccable](https://github.com/pbakaus/impeccable) | plugin | UI review |

## How it works

```mermaid
graph TD
    A[check: runtimes, MCP name + status, plugin list] --> B{mode}
    B -->|check| R[report table]
    B -->|install| Q[ask: tools, envs, hosts, connections, defaults]
    B -->|update| U[run each tool's update command]
    Q --> P[runtimes: manager first nvm / uv / SDKMAN, then the version]
    P --> I[install plugins, add MCP servers with PASTE_ placeholders]
    I --> S[you paste secrets into ~/.claude.json]
    S --> V[grep PASTE_ count, mcp list] --> R
    U --> R
```

- MCP servers are named `<tool>-<env>-mcp` at user scope: `gitlab-prod-mcp`, `jenkins-prod-mcp`, `omnisql-local-mcp`.
- It never sees your tokens. It never overwrites a server or plugin you already have.
- It reads `claude mcp list` as name and status only, so a token in a server's args never shows.
- The Jenkins token goes in an env var, not in the command args, so `ps` does not show it.

## Input → output

```
setup-device [all | <tool or runtime> ...] [check | update]
```

Output: a table per tool (installed, already there, updated, needs secret, skipped, failed) and the steps left for you.

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Workflow |
| `references/tools.md` | Each tool's install, secret and update commands. Add a tool here. |
