---
name: create-merge-request
description: Open a GitLab merge request for the current branch through the GitLab MCP, with the user as assignee and delete source branch always on. The target branch comes from the user's guide (CLAUDE.md / AGENTS.md), else the user is asked. Use when the user says "create an MR", "open a merge request" or "MR this branch". To rewrite an MR that already exists, use update-merge-request.
argument-hint: "[target-branch]"
---

# Create Merge Request

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input. It may name a target branch; anything else is extra context for the title and description.

## Prerequisite

- A GitLab MCP server (e.g. `gitlab-prod-mcp`). Use the one whose host matches the `origin` remote. Several match, or none → name the servers found and stop.
- No GitLab MCP → say so and stop. Never fall back to `glab`, `curl` or the GitLab API.

## Defaults

| Setting | Value |
|---|---|
| Source branch | The current branch |
| Target branch | See step 2 |
| Assignee | The user (`whoami` → `id`) |
| Delete source branch | Always on (`remove_source_branch: true`) |
| Draft, squash, reviewers, labels | Not set, unless the user asks |

## Steps

1. **Read the branch.** `git rev-parse --abbrev-ref HEAD`, `git remote get-url origin`, `git status --short`.
   - Get the project path and repo name from the remote URL.
   - `HEAD` is detached → stop and say why.
2. **Pick the target branch**, first match wins:
   1. A branch named in `$ARGUMENTS`.
   2. The branch the user's guides name for this repo: read the global and repo `CLAUDE.md` / `AGENTS.md` (e.g. a repo → base / MR target branch table).
   3. None found → ask the user which branch to target (use AskUserQuestion when the agent has it; offer the project's default branch as one option). Wait for the answer.
   - Current branch is the target branch → stop and say why.
   - Check the remote: `git fetch origin <source> <target>` and compare `origin/<source>` with `HEAD`. Branch not on the remote, or local commits not pushed → stop and tell the user to push first. Never push.
   - Uncommitted changes → mention they will not be in the MR, then go on.
3. **Check for an open MR.** `list_merge_requests` with `source_branch` and `state: opened`. One exists → give its URL and stop.
4. **Get the assignee.** `whoami` → `id`.
5. **Write the title and description** from `git log origin/<target>..HEAD` and `git diff --stat origin/<target>...HEAD`.
   - If commits or changed files point to a spec folder, read its spec for intent.
   - **Title**: conventional-commit style, one line.
   - **Description** (Markdown, sections as relevant): `## What`, `## Why`, `## Changes` (bullets by app/area), `## Scope` (In vs Out), `## Testing`. Link the spec folder if there is one.
6. **Create the MR** with `create_merge_request`: `project_id`, `source_branch`, `target_branch`, `title`, `description`, `assignee_ids: [<id>]`, `remove_source_branch: true`. No confirm step.
   - The call fails → give the error as it is, plus the title and description so the user can open it by hand.
7. **Report**: MR URL, `source → target`, where the target came from (argument, guide, or user), assignee, delete source branch on.

## Rules

- No absolute local paths, personal dev-sandbox names, or vendor lock-in names in the title or description. Use repo-relative paths.
- Describe only what the commits and diff show. Do not invent features.
- Never push, commit, or create a branch.
