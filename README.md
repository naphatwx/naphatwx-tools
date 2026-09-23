# How to Install naphatwx-tools

This guide explains how to install these shared Claude Code commands on any computer.

## Prerequisites

- You must have **Claude Code** installed.
- You must have **Git** installed.

---

## 📥 Installation Steps

### 1. Add the Marketplace
Open Claude Code in your terminal and run the following command to register this repository as a plugin source. 

> **Note:** Use the HTTPS URL (not SSH) to ensure compatibility.

```bash
/plugin marketplace add https://github.com/naphatwx/naphatwx-tools.git
```

---

## 🧩 Response Rules Hook

The plugin ships a hook that injects chat formatting rules (lists only, `&nbsp;` between blocks). It is **on by default**.

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
