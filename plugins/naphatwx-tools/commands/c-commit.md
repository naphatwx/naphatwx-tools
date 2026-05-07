---
name: c-commit
description: Generate a conventional commit message from staged changes and create the commit.
allowed-tools: Bash
---

Commit staged changes with a conventional commit message. Arguments: `$ARGUMENTS` (optional flags).

## Flags

- `--result` — print full commit details after commit.
- Default — print nothing on success (silent).

## Steps

1. Run `git diff --staged` in background.
    - If output is empty → stop. Do nothing. Do not print anything.
    - Do **not** run `git log`, `git status`, or any history command.
2. Generate a commit message from the diff only:
    - Format: `<type>(<scope>): <subject>`
    - Types: `feat` `fix` `refactor` `chore` `docs` `test` `style` `perf` `ci`
    - Scope: infer from changed paths; omit if changes span many areas
    - Subject: imperative, lowercase after colon, no period, max 72 chars
    - Add body only when subject alone is unclear
3. Commit in background:
    ```bash
    git commit -m "$(cat <<'EOF'
    <message>
    )"
    ```
4. Output rules:
    - If `$ARGUMENTS` contains `--result`:
        - Print `**Committed `<short-hash>`:**`
        - Print full commit message in a code block
        - Print diffstat (`git show --stat --format=`)
    - Otherwise: print nothing.

## Rules

- Never run `git log` or fetch commit history — wastes tokens.
- Never run `git status` — `git diff --staged` is enough.
- All `git` calls use `run_in_background: true`.
- If commit fails (hook error, etc.) → print the error and stop.
