# How to Install naphatwx-tools

Every tool lives as an [Agent Skill](https://agentskills.io) (`SKILL.md`) under `plugins/naphatwx-tools/skills/`, so the same skills work in Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Cline and GitHub Copilot.

## 🧰 Skills

Each skill folder has a `README.md` with diagrams of how it works.

| Skill | What it does |
|-------|--------------|
| [design-feature](plugins/naphatwx-tools/skills/design-feature/) | Plan a feature as a browsable HTML folder: use cases, diagrams, scenarios, database and API changes |
| [generate-use-case](plugins/naphatwx-tools/skills/generate-use-case/) | Write a feature's use cases and scenarios to one `use-cases.js` file |
| [generate-diagram](plugins/naphatwx-tools/skills/generate-diagram/) | Draw one flowchart, sequence diagram or ER diagram as a local file |
| [generate-mock-ui](plugins/naphatwx-tools/skills/generate-mock-ui/) | Build a clickable mock UI in the app's real design system, with every edge state |
| [play-scenarios](plugins/naphatwx-tools/skills/play-scenarios/) | Play a feature's scenarios by hand on the real running app, with Pass / Fail |
| [generate-test-cases](plugins/naphatwx-tools/skills/generate-test-cases/) | Write a test case file an AI can run later against MCP tools, APIs or the web UI |
| [e2e-test](plugins/naphatwx-tools/skills/e2e-test/) | Write and run Playwright browser tests, with a screenshot per step and one HTML report |
| [smoke-test](plugins/naphatwx-tools/skills/smoke-test/) | Check after a deploy that every service in a real flow still reaches the next one |
| [deploy-plan](plugins/naphatwx-tools/skills/deploy-plan/) | Build a deployment plan as a clickable HTML checklist, split into Pre-deploy and Post-deploy |
| [review-code](plugins/naphatwx-tools/skills/review-code/) | Review only the changed lines of staged changes, files or a GitLab MR |
| [get-mr-diffs](plugins/naphatwx-tools/skills/get-mr-diffs/) | Helper: fetch a GitLab MR diff, local git first, else GitLab MCP |
| [generate-changelog](plugins/naphatwx-tools/skills/generate-changelog/) | Write a short changelog from a GitLab MR diff, as one copy-paste code block |
| [update-merge-request](plugins/naphatwx-tools/skills/update-merge-request/) | Rewrite a GitLab MR's title and description from its diff, and save them |
| [announce](plugins/naphatwx-tools/skills/announce/) | Draft a Thanos markdown announcement from a GitLab MR diff |
| [commit](plugins/naphatwx-tools/skills/commit/) | Commit staged changes with a conventional commit message written from the diff |
| [check-job](plugins/naphatwx-tools/skills/check-job/) | Watch a Jenkins build until it ends, then explain any failure |
| [issue-log](plugins/naphatwx-tools/skills/issue-log/) | Log a troubleshooting issue to today's private log, or show today's log |
| [weekly-work-log](plugins/naphatwx-tools/skills/weekly-work-log/) | Sum up your git commits into up to 5 weekly achievement items |
| [user-guide](plugins/naphatwx-tools/skills/user-guide/) | Write a markdown user guide for a feature, in plain words for end users |
| [html-document](plugins/naphatwx-tools/skills/html-document/) | Make a single-file HTML docs page with sidebar navigation and search |
| [html-presentation](plugins/naphatwx-tools/skills/html-presentation/) | Make a single-file full-window HTML slide deck |
| [multi-column-sort](plugins/naphatwx-tools/skills/multi-column-sort/) | Add multi-column table sorting with a three-state header toggle |
| [run-parallel](plugins/naphatwx-tools/skills/run-parallel/) | Split a task into independent sub-tasks and run them with several sub-agents |
| [list-plugins](plugins/naphatwx-tools/skills/list-plugins/) | List installed Claude Code plugins and marketplaces |

---

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
