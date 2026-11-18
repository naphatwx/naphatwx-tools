---
name: setup-device
description: Install the MCP servers and plugins these skills and the user rely on (GitLab, Jenkins and OmniSQL MCP; diagram-design, mattpocock-skills, ui-ux-pro-max and impeccable plugins) on a new or existing machine. Secrets are left as placeholders for the user to paste. Use when the user says "set up this device", "install my tools" or "update my MCP servers".
argument-hint: "[all | <tool> ...] [check | update]"
disable-model-invocation: true
---

# Setup Device

Install the tools in `references/tools.md`. Each entry there has its commands, what to ask and its secrets.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the user's message.

- Tool names (`gitlab`, `jenkins`, `omnisql`, `diagram-design`, `mattpocock-skills`, `ui-ux-pro-max`, `impeccable`), or `all` (default).
- `check`: report only, change nothing.
- `update`: update what is installed; add nothing new.

## Rules

- **Secrets never pass through the chat.** Never ask for a token, never read one, never print a config value. Add each secret as the placeholder `PASTE_<VAR>`; the user pastes the real value (step 5).
- **Never overwrite or remove** an existing server or plugin. Same name already there → skip it and say so. Replace only when the user asks, and confirm first.
- **MCP names**: `<tool>-<env>-mcp` at user scope, e.g. `gitlab-prod-mcp`, `omnisql-local-mcp`. One server per env.
- **Hosts, user names and connection names come from the user.** Never guess them, never write them into any file of this plugin.
- **Install system runtimes only with a yes.** Missing Node, `uv` or Python → show the install command and ask.
- The commands are for Claude Code. For another agent, use the Codex or "other agents" line in `references/tools.md`; none listed → tell the user.
- No filler text in the reply.

## 1. Check the machine

Run and keep the results (names and versions only):

- `claude --version`, `node -v`, `npm -v`, `uv --version`, `python3 --version`
- `claude mcp list`: server names and status. Never `claude mcp get`: it prints env values.
- `claude plugin list`: installed plugins and versions.

`check` mode → go to step 6.

## 2. Ask

Use AskUserQuestion when the agent has it; else ask in one message.

- Which tools, when `$ARGUMENTS` named none. Default: all that are missing.
- For each MCP tool: its envs (`prod`, `dev`, `local`, …). Per env, the non-secret values `references/tools.md` lists under "Ask" (API URL, Jenkins URL and user, allowed connections, read only or not).
- Existing servers of that tool: show their names and offer to keep them.

## 3. Prerequisites

Per tool, check its "Needs" line. Missing → show the install command (e.g. `brew install uv`), ask, run it on a yes, else skip that tool.

## 4. Install

Run the commands from `references/tools.md`, one tool at a time, with the user's values filled in.

- Plugins: add the marketplace (skip when `claude plugin marketplace list` has it), then install.
- MCP: run `claude mcp add` per env, with `PASTE_<VAR>` for each secret.
- OmniSQL: `npm i -g omnisql-mcp@latest` once, before its servers.
- A command fails → show its error in full, skip that tool, go on.

`update` mode → run each installed tool's "Update" line instead.

## 5. Secrets

For each server with a placeholder, tell the user:

1. Open `~/.claude.json`.
2. In `mcpServers` → `<server name>` → `env`, replace `PASTE_<VAR>` with the real value.
3. Where to make that secret (from `references/tools.md`).
4. Restart the agent, or reconnect with `/mcp`.

Then wait. Check without reading values: `grep -c PASTE_ ~/.claude.json` (0 when done) and `claude mcp list`.

## 6. Report

One table, one row per tool and server:

| Tool | Server / plugin | Status | Next step |
|------|-----------------|--------|-----------|

Status: installed, already there, updated, needs secret, skipped (why), failed (error). Then the one-time steps the user still has (e.g. `/setup-matt-pocock-skills` in each repo).
