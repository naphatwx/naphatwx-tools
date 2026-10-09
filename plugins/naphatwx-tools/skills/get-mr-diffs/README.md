# get-mr-diffs

Helper that fetches a GitLab merge request's real diff: local git first, else the GitLab MCP server.

## When to use it

- Not for direct use. Other skills call it when they need an MR's changes.
- Called by `review-code`, `generate-changelog`, `announce` and `update-merge-request`.
- The caller may add its own rules on top, e.g. noise-file filters or "never exclude test files".

| You want | Use instead |
|----------|-------------|
| A review of the MR's changed lines | `review-code` |
| A copy-paste changelog of the MR | `generate-changelog` |
| A new MR title and description, saved to the MR | `update-merge-request` |
| A Thanos announcement drafted from the MR | `announce` |

## How it works

Pick the source: local git when the repo is on disk, else MCP.

```mermaid
graph TD
    A[MR reference] --> B[resolve project + IID]
    B -->|missing| X[report what is missing, stop]
    B --> C[get_merge_request: base_sha, head_sha, state, branches]
    C -->|fetch fails| Y[report the error, stop]
    C --> D{repo found locally?}
    D -->|current repo origin matches| L[local git]
    D -->|a sibling folder's origin matches| L
    D -->|no| M[MCP fallback]
    L -->|fetch or SHAs fail| M
    M -->|MCP not authorized| Z[ask the user to paste the diff or file list]
```

The calls, local path and fallback:

```mermaid
sequenceDiagram
    participant C as Calling skill
    participant H as get-mr-diffs
    participant G as Local git
    participant M as GitLab MCP
    C->>H: MR reference + its own rules
    H->>M: get_merge_request
    M-->>H: diff_refs.base_sha, head_sha, state, Draft, branches
    alt repo found locally
        H->>G: git fetch origin
        H->>G: git log --oneline base..head
        H->>G: git diff --stat base..head
        H->>G: git diff base..head -- paths (path by path if large)
    else not local, or git fails
        H->>M: get_merge_request_diffs (excluded_file_patterns only if the caller asks)
        opt still too large
            H->>M: list_merge_request_changed_files
            H->>M: get_merge_request_file_diff per file that matters
        end
    end
    H-->>C: commits, changed files, diffs
```

Rules the diagrams don't show:

- Everything is scoped to `base_sha..head_sha`, never the whole branch. The branch tip may be ahead of the MR head.
- The MR title and description are metadata only, not a content source, unless the caller says so.
- The local search stops at sibling folders of the current repo's parent folder.

## Input → output

Input: one MR reference.

| Form | Example |
|------|---------|
| Full MR URL | `https://<host>/<group>/<project>/-/merge_requests/<iid>` |
| `<project_id>!<iid>` | `avengers/thanos!123`, `456!123` |
| `!<iid>` or `<iid>` | MR in the current repo, project from `git remote` |

Output: no file. The MR metadata, commits, changed files and diffs, handed back to the calling skill.

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |

## Related skills

- `review-code`: reviews the diff this skill fetches (MR mode).
- `generate-changelog`: turns the diff into a changelog.
- `update-merge-request`: rewrites the MR title and description from the diff.
- `announce`: drafts a Thanos announcement from the diff.
