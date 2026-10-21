# keep-reports

Moves report output from a git worktree into the main checkout, so it is not lost when the worktree is deleted.

## When to use it

- You are done with a worktree and want to keep its e2e-test, smoke-test or deploy-plan output.
- Run it by hand: `/keep-reports`. Agents never start it on their own.

## What it moves

| Folder | Made by |
|--------|---------|
| `**/e2e-results/` | `e2e-test` |
| `scripts/smoke/results/` | `smoke-test` |
| `deploy-plans/` | `deploy-plan` |
| any extra folder you name | you |

## Options

- `--dry-run`: list what would move, change nothing.
- Extra folders: `/keep-reports docs/screenshots`.

## Safety

- Copies first, checks the copy with `diff -r`, then deletes the worktree copy.
- Never overwrites. A name already taken in main with other content is saved as `<name>-wt-<branch>`.
- Skips files tracked by git and folders that are symlinks.
