# Tool catalog

One section per tool. `<env>` is the name the user picks (`prod`, `dev`, `local`, `shared`).
Values in `<angle brackets>` come from the user. `PASTE_<VAR>` is a placeholder the user replaces by hand.

## MCP servers

Server name: `<tool>-<env>-mcp`, user scope. One server per env.

### gitlab

- Repo: https://github.com/zereight/gitlab-mcp (npm `@zereight/mcp-gitlab`)
- Needs: Node 20+ (`node -v`).
- Ask: `<api-url>`, the GitLab API URL ending in `/api/v4` (not the web root).
- Secret: `GITLAB_PERSONAL_ACCESS_TOKEN`. Made in GitLab → User Settings → Access Tokens, scope `api` (or `read_api` for read only).

```bash
claude mcp add gitlab-<env>-mcp --transport stdio --scope user \
  --env GITLAB_API_URL=<api-url> \
  --env GITLAB_PERSONAL_ACCESS_TOKEN=PASTE_GITLAB_PERSONAL_ACCESS_TOKEN \
  -- npx -y @zereight/mcp-gitlab
```

- Codex: `codex mcp add gitlab-<env>-mcp --env GITLAB_API_URL=<api-url> --env GITLAB_PERSONAL_ACCESS_TOKEN=PASTE_GITLAB_PERSONAL_ACCESS_TOKEN -- npx -y @zereight/mcp-gitlab`
- Check: the `whoami` or `health_check` tool.
- Update: npx may reuse its cache. Run `npx -y @zereight/mcp-gitlab@latest --version` once, or pin a version in the args.
- Never set `GITLAB_TOOLSETS=all` (very large tool list).

### jenkins

- Repo: https://github.com/lanbaoshen/mcp-jenkins (PyPI `mcp-jenkins`)
- Needs: `uv` (`uv --version`), Python 3.11+.
- Ask: `<jenkins-url>`, `<user>`.
- Secret: `JENKINS_PASSWORD`, a Jenkins API token (Jenkins → your user → Configure → API Token).
- Pass the token as env, never as `--jenkins-password`: args show in `ps`.

```bash
claude mcp add jenkins-<env>-mcp --transport stdio --scope user \
  --env JENKINS_URL=<jenkins-url> \
  --env JENKINS_USERNAME=<user> \
  --env JENKINS_PASSWORD=PASTE_JENKINS_PASSWORD \
  -- uvx mcp-jenkins
```

- Optional: add `--read-only` after `mcp-jenkins` to block write tools (`build_item`, `stop_build`, `run_groovy_script`, …).
- Check: the `get_item` tool on a known job.
- Update: `uv cache clean mcp-jenkins`, or pin `mcp-jenkins==<version>`.

### omnisql

- Repo: https://github.com/srthkdev/omnisql-mcp (npm `omnisql-mcp`)
- Needs: Node `^22.15` or 24+ (`node -v`). DuckDB needs the `duckdb` CLI; RDS IAM needs the `aws` CLI.
- Install the binary once: `npm i -g omnisql-mcp@latest`
- Connections: read from the DBeaver workspace, or from a JSON file set by `OMNISQL_CONFIG_FILE`. The user sets them up there; this skill never reads them.
- Ask: the connection names each server may use (`<connections>`, comma separated), and whether it may write.
- Secret: none in the MCP config. In JSON mode, the env vars that each connection's `passwordEnv` / `urlEnv` names.
- Always set `OMNISQL_READ_ONLY` (3.x defaults to `true`). Use `true` for any shared or production database.

```bash
claude mcp add omnisql-<env>-mcp --transport stdio --scope user \
  --env OMNISQL_ALLOWED_CONNECTIONS=<connections> \
  --env OMNISQL_READ_ONLY=<true|false> \
  -- omnisql-mcp
```

- Codex: `codex mcp add omnisql-<env>-mcp --env OMNISQL_ALLOWED_CONNECTIONS=<connections> --env OMNISQL_READ_ONLY=<true|false> -- omnisql-mcp`
- Check: the `list_connections` and `test_connection` tools.
- Update: `npm i -g omnisql-mcp@latest`, then restart the agent.

## Plugins

No secrets. Install one way per agent: a plugin plus an `npx skills` copy gives every skill twice.

| Tool | Claude Code | Codex | Other agents |
|------|-------------|-------|--------------|
| diagram-design | `claude plugin marketplace add cathrynlavery/diagram-design`<br>`claude plugin install diagram-design@diagram-design` | `codex plugin marketplace add cathrynlavery/diagram-design`<br>`codex plugin add diagram-design@diagram-design` | `npx skills add cathrynlavery/diagram-design` |
| mattpocock-skills | `claude plugin install mattpocock-skills@claude-plugins-official` | `codex plugin marketplace add mattpocock/skills`<br>`codex plugin add mattpocock-skills@mattpocock` | `npx skills@latest add mattpocock/skills` |
| ui-ux-pro-max | `claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`<br>`claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill` | `npm i -g ui-ux-pro-max-cli && uipro init --ai codex --global` | `uipro init --ai universal --global` |
| impeccable | `claude plugin marketplace add pbakaus/impeccable`<br>`claude plugin install impeccable@impeccable` | `npx impeccable install --providers=codex --scope=global` | same, other `--providers` |

Notes:

- **diagram-design**: PNG export needs `pip install playwright && playwright install chromium`. Check with `/diagram-design:doctor`.
- **mattpocock-skills**: after install, run `/setup-matt-pocock-skills` once in each repo.
- **ui-ux-pro-max**: its search script needs `python3`.
- **impeccable**: ships a hook that runs outside model approval and may download its engine on first use.
- Update a plugin: `claude plugin marketplace update <marketplace>`, then `claude plugin update <plugin>@<marketplace>`.
