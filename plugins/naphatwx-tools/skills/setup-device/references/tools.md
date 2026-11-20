# Tool catalog

One section per tool. `<env>` is the name the user picks (`prod`, `dev`, `local`, `shared`).
Values in `<angle brackets>` come from the user. `PASTE_<VAR>` is a placeholder the user replaces by hand.

## Groups

| Group | Prerequisites | Tools |
|-------|---------------|-------|
| `dev` | uv, Node, Python, Java | gitlab, jenkins, omnisql, diagram-design, mattpocock-skills, ui-ux-pro-max, impeccable |
| `editor` | Homebrew, ffmpeg, uv, Node | yt-dlp, whisper, remotion, hyperframes |

## Prerequisites

Each runtime goes through its version manager. Install the manager first when it is missing. Order: Homebrew, ffmpeg, uv, Node, Python, Java. Install only the rows the chosen groups need, each once.

| Prerequisite | Manager | Recommended | Group | Needed by |
|--------------|---------|-------------|-------|-----------|
| Homebrew | itself | latest | editor | ffmpeg |
| ffmpeg | Homebrew | latest | editor | yt-dlp, whisper, hyperframes |
| uv | itself | latest | dev, editor | Jenkins MCP (`uvx`), Python, yt-dlp, whisper |
| Node + npm | nvm | 24 LTS | dev, editor | GitLab MCP (20+), OmniSQL MCP (`^22.15` or 24+), hyperframes (22+), `npx` installs |
| Python | uv | 3.14 | dev | ui-ux-pro-max script, diagram-design PNG export |
| Java | SDKMAN | 25 LTS, Temurin | dev | the user's own projects (no tool here needs it) |

Update the "Recommended" column when a new LTS line is out (Node: even majors, LTS each October; Java: LTS every 2 years).

### Homebrew

- Check: `brew --version`
- Install manager: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`. It may ask for the sudo password: the user runs it with `! <command>`.
- Load (Linux only): `eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"`
- Use it for ffmpeg only, never for a runtime.

### ffmpeg

- Check: `ffmpeg -version`. Any install already there (brew, apt, other) → skip.
- Install: `brew install ffmpeg`
- Update: `brew upgrade ffmpeg`

### uv

- Check: `uv --version`
- Install manager: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Update: `uv self update` (installer copy). Installed with `brew` → `brew upgrade uv`.

### Node (nvm)

- Load: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`
- Check: `nvm --version`, `nvm ls`, `node -v`, `npm -v`
- Install manager: run `install.sh` of the latest release tag at https://github.com/nvm-sh/nvm (`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/<tag>/install.sh | bash`).
- Install: `nvm install 24`
- Default (with a yes): `nvm alias default 24`
- npm comes with Node. Global npm packages belong to one Node version: after a new default, run `npm i -g omnisql-mcp@latest` again.

### Python (uv)

- Check: `uv python list --only-installed`
- Install: `uv python install 3.14`
- Default (with a yes): `uv python install 3.14 --default`. It adds `python` and `python3` to `~/.local/bin`. Older uv asks for `--preview` too.
- Never change or remove the OS Python (`/usr/bin/python3`) or a `brew` Python.

### Java (SDKMAN)

- Load: `. "$HOME/.sdkman/bin/sdkman-init.sh"`
- Check: `sdk version`, `sdk current java`, `ls ~/.sdkman/candidates/java`
- Install manager: `curl -s "https://get.sdkman.io" | bash`
- Install: find the newest `25.*-tem` id in `sdk list java`, then `sdk install java <id>`. SDKMAN asks to make it default: answer with the user's choice.
- Keep older versions: projects may need them.

## Dev tools

### MCP servers

Server name: `<tool>-<env>-mcp`, user scope. One server per env.

#### gitlab

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

#### jenkins

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

#### omnisql

- Repo: https://github.com/srthkdev/omnisql-mcp (npm `omnisql-mcp`)
- Needs: Node `^22.15` or 24+ (`node -v`). DuckDB needs the `duckdb` CLI; RDS IAM needs the `aws` CLI.
- Install the binary once per Node version: `npm i -g omnisql-mcp@latest`
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

### Plugins

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

## Editor tools

No secrets.

### yt-dlp

- Repo: https://github.com/yt-dlp/yt-dlp
- Needs: uv, ffmpeg, Node (YouTube needs a JavaScript runtime).
- Check: `yt-dlp --version`
- Install: `uv tool install "yt-dlp[default]"`. `[default]` adds the YouTube challenge solver.
- Then add the line `--js-runtimes node` to `~/.config/yt-dlp/config` (make the file when missing; skip when the line is there). Without it YouTube warns `No supported JavaScript runtime could be found` and formats may be missing.
- Update: `uv tool upgrade yt-dlp`

### whisper

- Repo: https://github.com/openai/whisper (PyPI `openai-whisper`)
- Needs: uv, ffmpeg.
- Tell the user before install: it pulls in PyTorch, a large download (5.5 GB on Linux, less on macOS). Each model downloads on first use (`tiny` 72 MB, bigger models more).
- Check: `whisper --help`
- Install: `uv tool install --python 3.12 openai-whisper`. Pin 3.12: newer Python may not be supported. uv fetches 3.12 itself.
- Update: `uv tool upgrade openai-whisper`

### remotion

- Repo: https://github.com/remotion-dev/remotion. The app is made per project (`npx create-video`), so only the agent skills install here.
- Needs: Node.
- Check: `npx -y skills list -g`, look for `remotion-best-practices`.
- Install: `npx -y skills add remotion-dev/skills -g -y --agent claude-code`
- Codex: same with `--agent codex`. Other agents: drop `--agent`, pick in the prompt.
- Update: `npx -y skills update -g`

### hyperframes

- Repo: https://github.com/heygen-com/hyperframes. The CLI runs per project (`npx hyperframes`), so only the agent skills install here.
- Needs: Node 22+, ffmpeg.
- Check: `npx -y skills list -g`, look for `hyperframes`.
- List the skills first: `npx -y skills add heygen-com/hyperframes --list`
- Ask before installing `media-use`: when used, it runs `curl -fsSL https://static.heygen.ai/cli/install.sh | bash` (a pipe-to-shell install of HeyGen's CLI).
- Install the chosen skills: `npx -y skills add heygen-com/hyperframes -g -y --agent claude-code --skill <name> <name> …` (all: `--skill '*'`).
- Codex: same with `--agent codex`. Other agents: drop `--agent`, pick in the prompt.
- Update: `npx -y skills update -g`
