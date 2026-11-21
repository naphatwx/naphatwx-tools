# How to Install naphatwx-tools

Every tool lives as an [Agent Skill](https://agentskills.io) (`SKILL.md`) under `plugins/naphatwx-tools/skills/`, so the same skills work in Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Cline and GitHub Copilot.

## 🧰 Skills

Each skill folder has a `README.md` with diagrams of how it works.

| Skill | What it does |
|-------|--------------|
| [ship-task](plugins/naphatwx-tools/skills/ship-task/) | Carry one task from idea to a merge-ready branch: spec, code, your review, tests, AI review, docs, pre-merge gate |
| [design-feature](plugins/naphatwx-tools/skills/design-feature/) | Plan a feature as a browsable HTML folder: acceptance criteria, use cases, diagrams, scenarios, database and API changes |
| [generate-use-case](plugins/naphatwx-tools/skills/generate-use-case/) | Write a feature's use cases and scenarios to one `use-cases.js` file |
| [generate-diagram](plugins/naphatwx-tools/skills/generate-diagram/) | Draw one flowchart, sequence diagram or ER diagram as a local file |
| [generate-mock-ui](plugins/naphatwx-tools/skills/generate-mock-ui/) | Build a clickable mock UI in the app's real design system, with every edge state |
| [play-scenarios](plugins/naphatwx-tools/skills/play-scenarios/) | Play a feature's scenarios by hand on the real running app, with Pass / Fail |
| [e2e-test](plugins/naphatwx-tools/skills/e2e-test/) | Test every scenario of a feature (UI in the browser, API by request, MCP by an AI agent), with a fresh-agent review and one HTML report |
| [smoke-test](plugins/naphatwx-tools/skills/smoke-test/) | Check after a deploy that every service in a real flow still reaches the next one |
| [deployment-plan](plugins/naphatwx-tools/skills/deployment-plan/) | Build a deployment plan as a clickable HTML checklist, split into Pre-deploy and Post-deploy |
| [copy-reports](plugins/naphatwx-tools/skills/copy-reports/) | Copy e2e, smoke and deployment-plan output from a worktree into the main checkout |
| [review-code](plugins/naphatwx-tools/skills/review-code/) | Review only the changed lines of staged changes, files or a GitLab MR |
| [get-mr-diffs](plugins/naphatwx-tools/skills/get-mr-diffs/) | Helper: fetch a GitLab MR diff, local git first, else GitLab MCP |
| [generate-changelog](plugins/naphatwx-tools/skills/generate-changelog/) | Write a short changelog from a GitLab MR diff, as one copy-paste code block |
| [update-merge-request](plugins/naphatwx-tools/skills/update-merge-request/) | Rewrite a GitLab MR's title and description from its diff, and save them |
| [commit-staged-changes](plugins/naphatwx-tools/skills/commit-staged-changes/) | Commit staged changes with a conventional commit message written from the diff |
| [check-job](plugins/naphatwx-tools/skills/check-job/) | Watch a Jenkins build until it ends, then explain any failure |
| [summarize-weekly-work](plugins/naphatwx-tools/skills/summarize-weekly-work/) | Sum up your git commits into up to 5 weekly achievement items |
| [write-user-guide](plugins/naphatwx-tools/skills/write-user-guide/) | Write a markdown user guide for a feature, in plain words for end users |
| [generate-html-docs](plugins/naphatwx-tools/skills/generate-html-docs/) | Make a single-file HTML docs page in the naphatwx theme, with a numbered section rail and search |
| [generate-html-slides](plugins/naphatwx-tools/skills/generate-html-slides/) | Make a single-file full-window HTML slide deck |
| [list-plugins](plugins/naphatwx-tools/skills/list-plugins/) | List installed Claude Code plugins and marketplaces |
| [setup-device](plugins/naphatwx-tools/skills/setup-device/) | Install the MCP servers and plugins these skills use; you paste the secrets |

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

- Some skills call MCP servers (GitLab, Jenkins). `setup-device` installs them in Claude Code.
- `list-plugins` reads Claude Code's plugin folders, so it is only useful in Claude Code.

---

## 🧩 Response Rules Hook

The plugin ships a hook that injects chat formatting rules (plain language, short answers). It is always on and works in Claude Code only.

- Full rules: `plugins/naphatwx-tools/hooks/response-rules.md` (loaded once at session start).
- A short reminder is added to every prompt.
