---
name: c-commit
description: Generate a conventional commit message from staged changes and create the commit.
allowed-tools: Bash
---

Commit staged changes with a conventional commit message. Arguments: `$ARGUMENTS` (optional flags).

## Flags

- `--result` — wait for commit, then print full commit details.
- Default — fire-and-forget. Trigger commit in background and exit immediately.

## Steps

1. Run `git diff --staged`.
    - If output is empty → stop. Do nothing. Do not print anything.
    - Do **not** run `git log`, `git status`, or any history command.
2. Generate a commit message from the diff only:
    - Format: `<type>(<scope>): <subject>`
    - Types: `feat` `fix` `refactor` `chore` `docs` `test` `style` `perf` `ci`
    - Scope: infer from changed paths; omit if changes span many areas
    - Subject: imperative, lowercase after colon, no period, max 72 chars
    - Add body only when subject alone is unclear
3. Run the commit based on flag:
    - **Default (no `--result`)**:
        - Run `git commit` with `run_in_background: true`.
        - Do **not** read the background output.
        - Do **not** wait for completion.
        - Print nothing. Exit immediately.
    - **With `--result`**:
        - Run `git commit` normally (foreground, **no** `run_in_background`).
        - Read the command output directly.
        - On success, print:
            - `**Committed `<short-hash>`:**`
            - Full commit message in a code block
            - Diffstat from `git show --stat --format=`
        - On failure (hook error, etc.) → print the error and stop.

## Rules

- Never run `git log` or fetch commit history — wastes tokens.
- Never run `git status` — `git diff --staged` is enough.
- Default mode is trigger-and-forget. Never poll or read background output.
