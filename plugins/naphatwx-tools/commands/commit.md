---
name: commit
description: Generate a conventional commit message from staged changes and create the commit.
allowed-tools: Bash, Read, Glob, Grep
---

# Commit Message Generator

Generate a commit message from staged changes following the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## User Input

```text
$ARGUMENTS
```

## Workflow

### 1. Gather Context

Run the following commands to understand the current state:

1. `git diff --staged` — get the full staged diff.
2. `git diff --staged --stat` — get a summary of changed files to help identify scope.
3. `git branch --show-current` — check the branch name for issue tickets.
4. `git log --oneline -5` — get recent commit messages to match the project's existing style.

If there are **no staged changes**, inform the user and stop. Do not generate a message.

### 2. Detect Scope

Analyze the file paths in the staged changes to determine the scope.

*   **Monorepo:** If changes are within `packages/xyz` or `apps/xyz`, use `xyz` as the scope.
*   **Modular Architecture:** If changes are within a distinct directory like `src/auth/` or `lib/utils/`, use that component name (e.g., `auth`, `utils`).
*   **Root Level:** If changes are to build config (`package.json`, `Makefile`, `Dockerfile`), the scope is usually omitted or denoted as `build` or `config`.
*   **Multiple Scopes:** If changes span multiple distinct areas, omit the scope or use a high-level descriptor (e.g., `core`).

If `$ARGUMENTS` contains a specific scope override, use that instead.

### 3. Classify the Change

Analyze the diff to determine the commit **type**:

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `chore` | Build, config, dependency, or tooling changes |
| `docs` | Documentation only |
| `test` | Adding or updating tests only |
| `style` | Formatting, whitespace, linting (no logic change) |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

If `$ARGUMENTS` contains a type override, use that instead.

### 4. Analyze the Diff

Read the staged diff carefully and identify:

- **What** changed (files, functions, classes, logic).
- **Why** it changed (intent of the code).
- **Impact** (breaking changes, new APIs, deprecated features).

Focus on the *intent* behind the change, not a line-by-line description of the code.

### 5. Extract Ticket Number

Check the output of `git branch --show-current`.
- Look for patterns like `PROJ-123`, `ISSUE-456`, or `feature/123-description`.
- If a ticket ID is found, it must be included in the footer (e.g., `Refs: PROJ-123` or `Closes #123`).

### 6. Generate Commit Message

Follow the **Conventional Commits** format:

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer]
```

#### Rules

1. **Subject line**:
   - Use imperative mood ("Add feature" **not** "Added feature" or "Adds feature").
   - Do **not** capitalize the first letter after the colon.
   - Do **not** end with a period.
   - Keep under 72 characters.
   - Be specific — describe *what* was done.

2. **Body** (include only when the subject alone is insufficient):
   - Separate from subject with a blank line.
   - Explain **what** changed and **why**, not **how**.
   - Wrap at 72 characters.
   - Use bullet points (`- `) if listing multiple distinct changes.

3. **Footer** (include only when applicable):
   - `BREAKING CHANGE: <description>` (starts with `BREAKING CHANGE: `).
   - Ticket references (e.g., `Refs: TICKET-123`).

### 7. Create the Commit

After generating the commit message, **immediately create the commit** using `git commit`. Use a HEREDOC to pass the message:

```bash
git commit -m "$(cat <<'EOF'
<the generated commit message>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Then run `git status` to verify the commit succeeded.

### 8. Output

After the commit is created, show:
1. The commit hash and message summary (from the git output)
2. The `git status` result confirming success

## Examples

### Single-scope feature
```
feat(auth): add generic provider support to login flow
```

### Complex refactor with body
```
refactor(core): decouple data layer from service logic

Move direct database calls into a repository pattern to improve
testability and allow for easier swapping of data sources.
```

### Bug fix with ticket reference
```
fix(ui): prevent crash when user list is empty

Refs: PROJ-3625
```

### Breaking change
```
feat(api): rename user status enum values

BREAKING CHANGE: Status enum values changed from PascalCase to
UPPER_SNAKE_CASE. Clients must update their payload validation.

Refs: API-4000
```
