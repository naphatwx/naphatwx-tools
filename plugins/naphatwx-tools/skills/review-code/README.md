# review-code

Reviews only the changed lines of staged changes, files or a GitLab merge request against the repo's guidelines. Reports only, never edits code.

## When to use it

- You staged changes and want a review before you commit.
- You want a review of a GitLab MR, scoped to what the MR changes.
- You want pending changes in some files or folders reviewed.
- Say: "review my staged changes", "review this MR", "review src/auth".

| You want | Use instead |
|----------|-------------|
| Just the MR diff, no review | `get-mr-diffs` |
| A copy-paste changelog of the MR | `generate-changelog` |
| A new MR title and description | `update-merge-request` |
| To commit the staged changes | `commit` |

## How it works

Pick the target, then review changed lines only.

```mermaid
graph TD
    A[arguments] --> B{target}
    B -->|empty or staged| S[git diff --cached]
    S -->|empty| X[tell the user to git add, stop]
    B -->|MR URL| M[get-mr-diffs, test files kept]
    B -->|file or folder paths| F["git diff --cached -- paths, else git diff HEAD -- paths"]
    F -->|no pending changes| W[review the whole file, say so in the header]
    S --> C[changed-lines map from the -U0 hunk headers]
    M --> C
    F --> C
    C --> G[load guidelines: CONTRIBUTING.md, AGENTS.md, root + module, referenced docs/]
    G --> R[review each hunk: what changed, works?, breaks callers?, breaks guidelines?]
    R --> K[scope check: drop findings not on a changed line]
    K --> O[print report: PASS or FAIL]
    O --> P{"specs/<branch>/ exists?"}
    P -->|yes| Q["save a copy to specs/<folder>/PRIVATE/review-code/"]
    P -->|no| N[skip]
```

Where the guidelines come from:

```mermaid
graph LR
    A{MR repo = local checkout?} -->|yes, or staged / files| L["read local CONTRIBUTING.md, AGENTS.md (root, then app or module) + docs/ they reference"]
    A -->|no, a different repo| R["get_file_contents for both files, ref = MR target branch"]
```

Rules the diagrams don't show:

- Every finding's `file:line` must be in the changed-lines map, or it is dropped.
- A pre-existing problem counts only when the change makes it worse or newly reachable. It gets a `[pre-existing]` label.
- Breaking a loaded guideline is CRITICAL. Any CRITICAL finding means FAIL.
- MR findings use line numbers from the MR head.

## Input → output

Input: `[staged | <merge-request-url> | file paths...]`. Empty means staged.

Output: a chat reply with the review. Header (files, scope, changed lines, language), then Critical Issues, Warnings, Suggestions, Positive Notes, `Review Result: PASS | FAIL` and `Findings dropped as out-of-scope: <n>`.

When a spec folder matches the branch, a copy is also saved:

```
specs/<folder>/PRIVATE/review-code/
├── review-mr-<iid>-round-<n>.md        MR review
└── review-<target>-round-<n>.md        staged or file review, e.g. review-staged-round-1.md
```

`<n>` starts at 1 and never overwrites: each run takes the next free number.

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |

## Related skills

- `get-mr-diffs`: fetches the MR diff in MR mode.
- `commit`: commits the staged changes once the review passes.
- `update-merge-request`: rewrites the MR text after review.
