# How to Install naphatwx-tools

Every tool lives as an [Agent Skill](https://agentskills.io) (`SKILL.md`) under `plugins/naphatwx-tools/skills/`, so the same skills work in Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Cline and GitHub Copilot.

## Prerequisites

- **Git** installed.
- The AI tool you want to use.
- **Node.js** (only for the `npx skills` install path).

---

## 📥 Installation

### Claude Code

Register this repository as a plugin marketplace, then install the plugin.

> **Note:** Use the HTTPS URL (not SSH) to ensure compatibility.

```bash
/plugin marketplace add https://github.com/naphatwx/naphatwx-tools.git
/plugin install naphatwx-tools@naphatwx-marketplace
```

### Codex

```bash
codex plugin marketplace add naphatwx/naphatwx-tools
```

Then open `/plugins` in Codex and install **naphatwx-tools**.

### Gemini CLI

Gemini installs extensions from a repo root only, so install from a local checkout:

```bash
git clone https://github.com/naphatwx/naphatwx-tools.git
gemini extensions install ./naphatwx-tools/plugins/naphatwx-tools
```

### Cursor, Windsurf, Cline, GitHub Copilot (and other agents)

Use the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add naphatwx/naphatwx-tools -a cursor -a windsurf -a cline -a github-copilot
```

Add `-g` to install for your user instead of the current project. Drop the `-a` flags to choose agents interactively.

---

## Notes

- Some skills call MCP servers (GitLab, Jenkins). Set up those servers in each tool you use.
- `list-plugins` reads Claude Code's plugin folders, so it is only useful in Claude Code.

---

## 🧩 Response Rules Hook

The plugin ships a hook that injects chat formatting rules (lists only, `&nbsp;` between blocks). It is **on by default** and works in Claude Code only.

To disable it, add this to your `~/.claude/settings.json` and start a new session:

```json
{
    "env": {
        "NAPHATWX_RESPONSE_RULES": "0"
    }
}
```

- Full rules: `plugins/naphatwx-tools/hooks/response-rules.md` (loaded once at session start).
- A short reminder is added to every prompt.
