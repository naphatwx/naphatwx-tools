---
name: copy-reports
description: Copy report output (e2e-test runs, smoke-test results, deploy plans) and ship-task work (tasks/, specs/) from a git worktree into the main checkout, so it survives when the worktree is deleted. The worktree copy is never deleted. Run by hand before removing a worktree.
disable-model-invocation: true
argument-hint: "[--dry-run] [extra report folder ...]"
---

# Copy Reports

## User Input

```text
$ARGUMENTS
```

No `$ARGUMENTS` support → read the flags from the user's message.

## Rules

- Run only from inside a git worktree. In the main checkout the script exits 2; say so and stop.
- Use the script. Never copy, move or delete report files by hand.

## Steps

1. Run `bash <this skill's folder>/scripts/copy-reports.sh $ARGUMENTS` from the worktree root.
2. Show the user the script's output as is: one line per entry, then the totals. Point out every `replace` and `keep` line: a replace overwrites main's older report or task for that spec or task.
3. A `FAILED copy check` line → tell the user which entry failed, and that its worktree copy is unchanged.
