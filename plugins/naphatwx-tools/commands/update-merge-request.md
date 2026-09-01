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

1. **Get the MR data and diff** — invoke the `naphatwx-tools:get-mr-diffs`
   skill with `$ARGUMENTS` as the MR reference. It resolves the project/IID,
   fetches metadata, and gets the diff (local git first, MCP fallback).
   Note from its result: current title/description, Draft status, and the
   commits + changed files in `base_sha..head_sha`.

2. **Read the driving spec/context.** If commits reference a `specs/NNN-*` folder,
   read that `spec.md` to understand the feature, phase, and scope. Otherwise infer
   intent from the commits and diff.

3. **Write the output**:
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

4. **Present** the title and description as copy-paste-ready blocks.

5. **Apply to the MR** via the gitlab MCP tool `update_merge_request`
   (project_id + merge_request_iid + `title` + `description`) — no confirmation
   needed.
   - If the tool call fails or the tool is unavailable, say why it was not applied
     so the user can paste the text manually.

6. **Report** whether the MR was updated and give the MR URL.

## Rules

- No absolute local paths, personal dev-sandbox names, or vendor lock-in names in
  the title/description (they are shared with other devs). Use repo-relative paths.
- Keep it factual — describe only what the diff shows; do not invent features.
