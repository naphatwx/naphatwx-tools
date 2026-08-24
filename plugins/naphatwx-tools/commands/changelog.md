---
description: Generate a short, copy-paste changelog from a GitLab merge request. Outputs a single code block grouped by spec/area.
allowed-tools: Bash, Read, Glob, Grep, mcp__gitlab__get_merge_request, mcp__gitlab__get_merge_request_diffs, mcp__gitlab__list_merge_requests
---

# Changelog Writer

Turn a GitLab merge request into a short changelog, ready to copy from one code
block.

## User Input

```text
$ARGUMENTS
```

`$ARGUMENTS` is the MR to summarize, plus optional flags. Accepted forms:

| Input | Meaning |
|-------|---------|
| Full MR URL | `https://git.ntbx.tech/<group>/<project>/-/merge_requests/123` |
| `<project_id>!<iid>` | e.g. `avengers/thanos!123` or `456!123` |
| `!<iid>` or `<iid>` | MR in the current repo (resolve project from `git remote`) |

Optional flags (anywhere in `$ARGUMENTS`):

- `--tiny` — one bullet per area, no sub-bullets (shortest form).
- `--full` — one section per area with sub-bullets (longest form).
- Default (no flag) — one bullet per area with a short detail line.

If `$ARGUMENTS` is empty, print usage and stop:

```text
Usage: /changelog <mr-url | project!iid | iid> [--tiny|--full]
Examples:
  /changelog https://git.ntbx.tech/avengers/thanos/-/merge_requests/1307
  /changelog avengers/thanos!1307 --tiny
  /changelog 1307 --full
```

## Workflow

### 1. Parse input

1. Strip the flags from `$ARGUMENTS`; keep the MR reference.
2. Resolve `project_id` and `merge_request_iid`:
   - Full URL → parse group/project path and the trailing number.
   - `project!iid` → split on `!`.
   - Bare `iid` / `!iid` → run `git remote get-url origin` to derive the project
     path, then use that as `project_id`.
3. If you cannot resolve both, print what is missing and stop.

### 2. Fetch the MR

- `mcp__gitlab__get_merge_request` — title, description, state, spec references.
- `mcp__gitlab__get_merge_request_diffs` — only if the description is thin; use
  the changed files to fill gaps. Skip if the description already covers changes.

### 3. Summarize

Group changes by spec or area (the MR description's own sections are the best
source). For each group write a short, plain-language line of what changed —
what a reader of the changelog cares about, not implementation trivia.

Rules:
- Lead each area with a short label; append the spec number in parentheses when
  the MR names one, e.g. `(spec 101)` or `(specs 103, 107)`.
- Plain everyday words, short lines. Cut filler.
- Never paste raw local paths, dev sandbox names (`dev00`), or internal branch
  names.
- Do not invent changes the MR does not support.

### 4. Output

Print exactly **one** code block (language tag `text`) so the whole changelog
copies in one action. First line is a title: `<mr-title-or-summary> (MR !<iid>)`.
Then the grouped bullets.

- `--tiny`: title line + one flat bullet per area.
- default: title line + one bullet per area, each with a brief detail.
- `--full`: title line + a header per area, each with sub-bullets.

Before the code block, add one short chat note (in Thai) saying which MR and its
state. Put nothing else inside the code block except the changelog itself — no
labels that would get copied by accident.

## Notes

- Reads a real MR over the GitLab MCP server; if that server is not authorized,
  tell the user and ask them to paste the MR title + description, then continue
  from step 3.
- One MR → one changelog.
