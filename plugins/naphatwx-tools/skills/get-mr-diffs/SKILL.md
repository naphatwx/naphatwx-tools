---
name: get-mr-diffs
description: Shared helper - resolve a GitLab merge request reference and fetch its actual changes (local git first, GitLab MCP fallback). Invoked by the MR-based commands; not meant to be run directly by users.
user-invocable: false
---

# Get MR Diffs (shared helper)

Resolve a GitLab merge request reference and get its **actual changes (diffs)**.
This is the single shared flow for `/update-merge-request`,
`/generate-changelog`, `/announce`, and `/review-code` (MR mode).

The calling command may add overrides (e.g. noise-file filters, or "never
exclude test files"). Apply them on top of this flow.

## Input

One MR reference:

| Input | Meaning |
|-------|---------|
| Full MR URL | `https://<host>/<group>/<project>/-/merge_requests/<iid>` |
| `<project_id>!<iid>` | e.g. `avengers/thanos!123` or `456!123` |
| `!<iid>` or `<iid>` | MR in the current repo (resolve project from `git remote`) |

## Steps

### 1. Resolve project and IID

- Full URL → `project_id = <group>/<project>`, `merge_request_iid = <iid>`.
- `project!iid` → split on `!`.
- Bare `iid` / `!iid` → `git remote get-url origin` to derive the project path.
- If either cannot be resolved, report what is missing and stop.

### 2. Fetch MR metadata (MCP)

Call `mcp__gitlab__get_merge_request` (project_id + merge_request_iid). Note:

- `diff_refs.base_sha` and `diff_refs.head_sha`
- state, Draft status, source/target branch
- current title/description (metadata only — NOT a content source unless the
  calling command explicitly says so)

If the fetch fails (bad URL, no access), report the error and stop — do not
guess another target.

### 3. Locate the repo locally

1. If `git remote get-url origin` matches the MR's project path → use the
   current repo.
2. Otherwise scan sibling folders of the current repo's parent directory and
   match each folder's `origin` URL. Do NOT search beyond that.

### 4. Get the diff — local first (preferred)

If the repo was found locally:

```bash
git -C <repo> fetch origin
git -C <repo> log --oneline <base_sha>..<head_sha>    # commits
git -C <repo> diff --stat <base_sha>..<head_sha>      # changed files
git -C <repo> diff <base_sha>..<head_sha> -- <paths>  # read specific areas
```

If a diff is too large to read inline, read it path by path — do NOT dump the
whole diff.

### 5. MCP fallback

Use only if the repo was not found locally, or fetch/SHAs fail:

- `mcp__gitlab__get_merge_request_diffs` — pass `excluded_file_patterns` only
  if the calling command asks for noise filtering.
- Still too large → `mcp__gitlab__list_merge_request_changed_files`, then
  `mcp__gitlab__get_merge_request_file_diff` on the files that matter.

## Rules

- Scope everything to `base_sha..head_sha` — NEVER the whole branch (the branch
  tip may be ahead of the MR head).
- If the GitLab MCP server is not authorized and the repo is not local, tell
  the user and ask them to paste the diff or changed-file list.
