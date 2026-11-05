# copy-reports

Copies report output and ship-task work from a git worktree into the main checkout, so it is not lost when the worktree is deleted. The worktree copy is never deleted.

## When to use it

- You are done with a worktree and want to keep its e2e-test, smoke-test or deployment-plan output, or its ship-task work.
- Run it by hand: `/copy-reports`. Agents never start it on their own.

## What it copies

| Folder | Made by |
|--------|---------|
| `**/e2e-results/` | `e2e-test` |
| `scripts/smoke/results/` | `smoke-test` |
| `deploy-plans/` | `deployment-plan` |
| `.work/` | `ship-task` |
| any extra folder you name | you |

## Options

- `--dry-run`: list what would be copied, change nothing.
- Extra folders: `/copy-reports docs/screenshots`.

## Safety

- Copies, then checks the copy with `diff -r`. Never deletes anything in the worktree.
- One copy per spec or task: a spec folder (or `_adhoc/`) under `e2e-results/` or `scripts/smoke/results/`, or a task folder under `.work/`, that main already has → the newer copy wins. A newer worktree copy replaces main's after the copy check; a newer main copy is kept. Use `--dry-run` to see which side wins.
- Anything else never overwrites: a name already taken in main with other content is saved as `<name>-wt-<branch>`. Running it again does not make a second copy.
- Skips files tracked by git and folders that are symlinks.
