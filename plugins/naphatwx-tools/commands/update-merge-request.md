---
name: update-merge-request
description: Generate an updated title and description for a GitLab merge request and apply them to the MR
argument-hint: <merge-request-url-or-iid>
---

# Update MR Title & Description

Generate a clean, updated **title** and **description** for a GitLab merge request,
then apply them to the MR automatically.

Target MR: `$ARGUMENTS`

## Steps

1. **Parse the input.** From `$ARGUMENTS`, extract the project path and MR IID.
   - Full URL like `https://<host>/<group>/<project>/-/merge_requests/1295` →
     `project_id = <group>/<project>`, `merge_request_iid = 1295`.
   - A bare number → use it as `merge_request_iid` and infer `project_id` from the
     current repo's git remote (`git remote get-url origin`).

2. **Fetch the MR** via the gitlab MCP tool `get_merge_request` (project_id +
   merge_request_iid). Note `diff_refs.base_sha`, `diff_refs.head_sha`, source
   and target branch, current title/description, and whether it is a Draft.

3. **Find what the MR actually changes** — use the SHA range `base_sha..head_sha`,
   NOT the whole branch (the branch tip may be ahead of the MR head).
   Get the diff **local-first, MCP fallback**:
   - **Locate the repo locally**: if `git remote get-url origin` matches the MR's
     project path, use the current repo. Otherwise scan sibling folders of the
     current repo's parent directory for one whose `origin` matches. Do not
     search beyond that.
   - **Local (preferred)**: `git -C <repo> fetch origin`, then
     `git -C <repo> log --oneline <base_sha>..<head_sha>` for commits and
     `git -C <repo> diff --stat <base_sha>..<head_sha>` for changed files.
     If a diff is too large to read inline, skim it with `git -C <repo> diff`
     on specific paths — do NOT dump the whole diff.
   - **MCP fallback** (repo not found locally, or fetch/SHAs fail): use
     `get_merge_request_diffs`. If still too large, use
     `list_merge_request_changed_files` then `get_merge_request_file_diff`
     on the files that matter.

4. **Read the driving spec/context.** If commits reference a `specs/NNN-*` folder,
   read that `spec.md` to understand the feature, phase, and scope. Otherwise infer
   intent from the commits and diff.

5. **Write the output**:
   - **Title**: conventional-commit style, one line, states the change and its
     scope/phase. Drop the `Draft:` prefix from the suggested title, but tell the
     user the MR is still a Draft if it is.
   - **Description** (Markdown, sections as relevant):
     - `## What` — one short paragraph.
     - `## Why` — the motivation.
     - `## Changes` — grouped bullets by app/area, name key new/changed files.
     - `## Scope` — In vs Out (call out phases or follow-up slices).
     - `## Testing` — tests added/how it was verified.
     - Link the spec folder if there is one.
   - Scope everything to what is in `base_sha..head_sha` only. If the branch has
     later commits not in the MR head, mention that they are not yet part of the MR.

6. **Present** the title and description as copy-paste-ready blocks.

7. **Apply to the MR** via the gitlab MCP tool `update_merge_request`
   (project_id + merge_request_iid + `title` + `description`) — no confirmation
   needed.
   - If the tool call fails or the tool is unavailable, say why it was not applied
     so the user can paste the text manually.

8. **Report** whether the MR was updated and give the MR URL.

## Rules

- No absolute local paths, personal dev-sandbox names, or vendor lock-in names in
  the title/description (they are shared with other devs). Use repo-relative paths.
- Keep it factual — describe only what the diff shows; do not invent features.
