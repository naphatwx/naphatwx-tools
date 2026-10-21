---
name: keep-reports
description: Move report output (e2e-test runs, smoke-test results, deploy plans) from a git worktree into the main checkout, so it survives when the worktree is deleted. Run by hand before removing a worktree.
disable-model-invocation: true
argument-hint: "[--dry-run] [extra report folder ...]"
---

# Keep Reports

## User Input

```text
$ARGUMENTS
```

No `$ARGUMENTS` support → read the flags from the user's message.

## Rules

- Run only from inside a git worktree. In the main checkout the script exits 2; say so and stop.
- Use the script. Never move or delete report files by hand.
- Never delete the worktree. The user does that.

## Steps

1. Run `bash <this skill's folder>/move-reports.sh $ARGUMENTS` from the worktree root.
   - Folders it scans: `deploy-plans/`, `scripts/smoke/results/`, every `e2e-results/` (outside `node_modules`), and any extra repo-relative folder given.
   - It moves each run folder or file to the same path in the main checkout, copies first, checks the copy with `diff -r`, then deletes the worktree copy.
   - Same content already in main → only the worktree copy is removed.
   - A spec folder (or `_adhoc/`) in `e2e-results/` or `scripts/smoke/results/` that main already has with other content → one report per spec, so the newer copy wins (newest file time inside). Worktree newer → it replaces main's after the copy check. Main newer → the worktree copy is left in place and listed as `keep`.
   - Any other name taken in main with other content → saved as `<name>-wt-<branch>`.
   - Skips git-tracked files and symlinked folders.
2. Show the user the script's output as is: one line per entry, then the totals. Point out every `replace` and `keep` line: a replace overwrites main's older report for that spec.
3. A `FAILED copy check` line → tell the user which entry failed, and that its worktree copy was kept.
