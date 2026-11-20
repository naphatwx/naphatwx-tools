---
name: setup-device
description: Install the user's tools by group on a new or existing machine, prerequisites first. Dev group - runtimes (Node via nvm, Python via uv, Java via SDKMAN), GitLab, Jenkins and OmniSQL MCP, and the diagram-design, mattpocock-skills, ui-ux-pro-max and impeccable plugins. Editor group - ffmpeg, yt-dlp, whisper, and the Remotion and HyperFrames agent skills. Secrets are left as placeholders for the user to paste. Use when the user says "set up this device", "install my tools", "install the editor tools" or "update my MCP servers".
argument-hint: "[all | dev | editor | <tool or prerequisite> ...] [check | update]"
disable-model-invocation: true
---

# Setup Device

Install the tools in `references/tools.md`. Each entry there has its commands, what to ask and its secrets.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the user's message.

- Group names (`dev`, `editor`), `all`, tool names (see `references/tools.md` → Groups) or prerequisite names (`brew`, `ffmpeg`, `uv`, `node`, `python`, `java`). None → ask (step 2).
- `check`: report only, change nothing.
- `update`: update what is installed; add nothing new.

## Rules

- **Secrets never pass through the chat.** Never ask for a token, never read one, never print a config value. Add each secret as the placeholder `PASTE_<VAR>`; the user pastes the real value (step 5).
- **Never overwrite or remove** an existing server or plugin. Same name already there → skip it and say so. Replace only when the user asks, and confirm first.
- **MCP names**: `<tool>-<env>-mcp` at user scope, e.g. `gitlab-prod-mcp`, `omnisql-local-mcp`. One server per env.
- **Hosts, user names and connection names come from the user.** Never guess them, never write them into any file of this plugin.
- **Runtimes go through a version manager**: Node via nvm, Python via uv, Java via SDKMAN. Never install a runtime with `brew` or a system installer; `brew` is for ffmpeg only. Missing manager → install it first, with a yes.
- **Only add versions.** Never remove a runtime version, and never touch the OS Python. Changing a default version needs a yes.
- The commands are for Claude Code. For another agent, use the Codex or "other agents" line in `references/tools.md`; none listed → tell the user.
- No filler text in the reply.

## 1. Check the machine

Run and keep the results (names and versions only):

- `claude --version`
- Prerequisites: the "Check" lines in `references/tools.md` → Prerequisites.
- Editor tools: their "Check" lines.
- MCP servers, name and status only. Never run plain `claude mcp list` or `claude mcp get`: they print args and env values, tokens included.

  ```bash
  claude mcp list | perl -ne 'print "$1 - $2\n" if /^(.*?): .* - ([✔✘!].*)$/'
  ```
- `claude plugin list`: installed plugins and versions.

`check` mode → go to step 6.

## 2. Ask

Use AskUserQuestion when the agent has it; else ask in one message.

1. Which groups (`dev`, `editor`, both; multi-select), when `$ARGUMENTS` named none.
2. Which tools in those groups. Default: all that are missing or older than the recommended version.
3. Whether to make each new runtime version the default (nvm alias, uv `--default`, SDKMAN default).
4. For each MCP tool: its envs (`prod`, `dev`, `local`, …). Per env, the non-secret values `references/tools.md` lists under "Ask" (API URL, Jenkins URL and user, allowed connections, read only or not).
5. Each "Ask before" or "Tell the user" line of the chosen tools (e.g. HyperFrames `media-use`, whisper's download size).

## 3. Prerequisites

Take the prerequisites of the chosen groups and tools from `references/tools.md` → Groups. Install each once, in the Prerequisites order (Homebrew, ffmpeg, uv, Node, Python, Java):

1. Manager missing → show its install command, ask, run it on a yes. No → skip that prerequisite and the tools that need it.
2. Recommended version missing → install it through the manager.

Every new shell must load nvm, SDKMAN and (on Linux) Homebrew first (the "Load" line); a plain `nvm` or `sdk` call fails in a non-interactive shell.

Per tool, check its "Needs" line against the result. Still missing → skip that tool and say why.

## 4. Install

Run the commands from `references/tools.md`, one tool at a time, with the user's values filled in.

- Plugins: add the marketplace (skip when `claude plugin marketplace list` has it), then install.
- Editor tools: their "Install" line, then any step after it (e.g. the yt-dlp config line).
- MCP: run `claude mcp add` per env, with `PASTE_<VAR>` for each secret.
- A command fails → show its error in full, skip that tool, go on.

`update` mode → run each installed tool's "Update" line instead.

## 5. Secrets

Dev MCP servers only. For each server with a placeholder, tell the user:

1. Open `~/.claude.json`.
2. In `mcpServers` → `<server name>` → `env`, replace `PASTE_<VAR>` with the real value.
3. Where to make that secret (from `references/tools.md`).
4. Restart the agent, or reconnect with `/mcp`.

Then wait. Check without reading values: `grep -c PASTE_ ~/.claude.json` (0 when done) and the filtered MCP list from step 1.

## 6. Report

One table, one row per tool and server:

| Group | Tool | Server / plugin / version | Status | Next step |
|-------|------|---------------------------|--------|-----------|

Prerequisites get rows too (manager, version, default). Status: installed, already there, updated, needs secret, skipped (why), failed (error). Then the one-time steps the user still has (e.g. `/setup-matt-pocock-skills` in each repo).
