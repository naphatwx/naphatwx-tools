---
name: review-code
description: Review only the changed lines of a diff (staged changes or a GitLab merge request)
argument-hint: [staged | <merge-request-url> | file paths...]
allowed-tools: Skill, Read, Write, Glob, Grep, Bash(git diff:*), Bash(git log:*), Bash(git remote:*), Bash(git branch:*), Bash(git fetch:*), Bash(git status:*), Bash(git -C:*), mcp__gitlab__get_merge_request, mcp__gitlab__get_merge_request_diffs, mcp__gitlab__list_merge_request_changed_files, mcp__gitlab__get_merge_request_file_diff, mcp__gitlab__get_file_contents
---

# Code Review Agent

Review **the changes only** against project guidelines from AGENTS.md and
CONTRIBUTING.md.

## Golden Rule — Diff Scope

- Review **only lines this change adds or modifies** (`+` lines) and the direct
  effect of lines it removes (`-` lines).
- Unchanged (context) lines are **background for understanding only** — never a
  finding source.
- A pre-existing problem is reportable **only** when the change makes it worse
  or newly reachable. Label it `[pre-existing]` and tie it to the changed line
  that triggers it.
- If a finding cannot be anchored to a changed line, **drop it**. Fewer
  in-scope findings beat a long list padded with unchanged code.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

## Workflow

### 1. Determine Review Target

**A. Staged changes** — `$ARGUMENTS` is empty or contains "staged":
- Run `git diff --cached`.
- If the diff is empty → do NOT review. Tell the user there are no staged
  changes and to stage files first (`git add`), then stop.

**B. GitLab merge request** — `$ARGUMENTS` contains an MR URL like
`https://<host>/<group>/<project>/-/merge_requests/<iid>`:
- Invoke the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code) with the MR URL. It resolves
  the project/IID, fetches metadata, and gets the diff (local git first, MCP
  fallback).
- Command-specific rule: do NOT exclude test files from the diff — the review
  must see them.
- If the diff is large, read it file by file — do NOT dump the whole diff.

**C. Files / directories** — `$ARGUMENTS` contains file paths or directory
names:
- Still diff-scoped: use the pending changes for those paths
  (`git diff --cached -- <paths>`, else `git diff HEAD -- <paths>`).
- Only if those paths have no pending changes, review the files whole — and say
  so in the output header (`Scope: whole file (no pending changes)`).

### 2. Build the Changed-Lines Map (required before reviewing)

1. Get exact changed line numbers with zero context:
   - Staged: `git diff --cached -U0`
   - MR: `git -C <repo> diff -U0 <base_sha>..<head_sha>`
   - MCP fallback: read the hunk headers (`@@ -a,b +c,d @@`) of the returned
     diffs.
2. From each hunk header, record per file:
   - **Added / changed lines** — new-side numbers `c` .. `c+d-1` → the
     reviewable set.
   - **Removed lines** — old-side numbers, so you know what the change deletes.
3. Keep this map. Every finding's `file:line` must fall inside the
   added/changed set of that file.

Read wider context (the full file, or a `-U20` diff) **only** to judge a
changed line — not to hunt for issues elsewhere.

### 3. Load Guidelines

Default (staged, files, or an MR of the repo currently checked out — compare
the MR project path with `git remote get-url origin`):

1. `CONTRIBUTING.md` (root level)
2. `AGENTS.md` (root level)
3. `CONTRIBUTING.md` inside the affected app or module directory
4. `AGENTS.md` inside the affected app or module directory
5. Only the `docs/` files that the guidelines above explicitly reference —
   do not scan the whole `docs/` folder.

Rare case — the MR belongs to a different repo than the local checkout:
- Fetch `CONTRIBUTING.md` and `AGENTS.md` from the MR's repo via
  `get_file_contents` (ref = the MR target branch).

### 4. Perform Review

For each changed hunk, ask in order:

1. What does this hunk change?
2. Does the new code work (logic, edge cases, error paths)?
3. Does it break something that used to work (removed lines, changed
   signature, changed default, callers)?
4. Does it violate the loaded guidelines?

Check the changed lines for:

#### Code Style
- Naming conventions (variables, functions, files)
- Code organization and structure
- Proper use of language idioms
- Formatting consistency

#### Bugs & Logic Errors
- Null/undefined handling
- Edge cases not covered
- Race conditions
- Resource leaks
- Error handling gaps

#### Security
- Input validation
- SQL injection risks
- XSS vulnerabilities
- Sensitive data exposure
- Authentication/authorization issues
- OWASP Top 10 vulnerabilities

#### Performance
- N+1 queries
- Unnecessary computations
- Memory leaks
- Inefficient algorithms
- Missing indexes (for database changes)

#### Best Practices
- DRY violations
- SOLID principles
- Proper abstraction levels
- Test coverage considerations
- Documentation needs

#### Ripple Effects of the Change
- Callers of a changed function, signature, or return type
- Removed or renamed code still referenced elsewhere (`grep` the old name)
- Changed defaults, config keys, or migrations

### 5. Scope Check (required before printing)

Walk the draft findings and, for each one:

1. Confirm its `file:line` is in that file's added/changed set from step 2.
2. Confirm the quoted code is text this change actually introduced.
3. If either fails → **delete the finding**, unless it is a real ripple effect
   or a newly reachable pre-existing bug. Then rewrite it anchored to the
   changed line that causes it and prefix the title with `[pre-existing]`.

Report the count in the output (`Findings dropped as out-of-scope: <n>`).

### 6. Output Format

**Files Reviewed**: [list of files]
**Scope**: [changed lines only | whole file (no pending changes)]
**Changed Lines**: [`file:1-20, 45` per file]
**Language / Framework**: [detected language and framework]

#### Critical Issues
[Issues that must be fixed before merge]

#### Warnings
[Issues that should be addressed but not blocking]

#### Suggestions
[Optional improvements for better code quality]

#### Positive Notes
[Good patterns or practices observed]

---

**Review Result: [PASS | FAIL]**
**Findings dropped as out-of-scope: [n]**

- PASS: No critical issues, ready to commit
- FAIL: Critical issues found, must be fixed before commit

Every finding uses this shape:

```text
- [severity] file:line — <what is wrong>
  Changed line: <the + line from the diff>
  Why: <impact>
  Fix: <concrete change>
```

For an MR review, use line numbers from the MR head so findings map to the MR
diff.

### 7. Save Review to Spec PRIVATE Folder

After generating the report, save a copy into the related spec's `PRIVATE`
folder **if one exists**:

1. **Find the related spec folder** under `specs/`:
   - MR review → use the MR's source branch; staged/file review → use the
     current git branch (`git branch --show-current`).
   - Match the branch name to a `specs/<folder>/` (exact name, or the `NNN-`
     prefixed variant).
   - If no spec folder matches, skip this step silently.
2. **Write the report to `specs/<folder>/PRIVATE/review-code/`**:
   - Create `PRIVATE/` and `review-code/` if they do not exist.
3. **File naming** — always include the round number:
   - MR review: `review-mr-<iid>-round-<n>.md` (e.g., `review-mr-1325-round-1.md`)
   - Staged/file review: `review-<target>-round-<n>.md` (e.g.,
     `review-staged-round-1.md`)
   - `<n>` starts at 1. Never overwrite: use the next unused round number.
4. Still print the report in the chat response as usual; the file is an
   extra copy.

## Review Severity Levels

- **CRITICAL**: Security vulnerabilities, data loss risks, breaking changes, violations of project guidelines (AGENTS.md, CONTRIBUTING.md, or any loaded docs)
- **WARNING**: Bugs, performance issues, minor inconsistencies
- **SUGGESTION**: Style improvements, refactoring opportunities

## Out of Scope — Never Report

- Style, naming, or structure of untouched code.
- "Missing" features, tests, or docs unrelated to what changed.
- Rewrites of whole files or modules the change only touched lightly.
- Pre-existing issues the change neither worsens nor exposes.
- Any finding whose line number is not in the changed-lines map.

## Special Rules by Language

### Go
- Check error handling with proper wrapping
- Verify transaction and resource cleanup (`defer`)
- Check for goroutine leaks
- Verify proper use of interfaces and struct embedding

### TypeScript / JavaScript
- Check strict mode compliance (TypeScript)
- Verify async/await and Promise error handling
- Check for type safety (avoid `any`)
- Verify proper use of framework patterns (e.g., React hooks, Next.js conventions)

### Python
- Check for proper exception handling
- Verify use of type hints
- Check for resource management (`with` statements)
- Follow PEP 8 conventions

### General (all languages)
- Verify that all guidelines from loaded `CONTRIBUTING.md` and `AGENTS.md` are followed
- Flag any pattern that contradicts the loaded docs as **CRITICAL**
- Apply every check above to changed lines only (see Golden Rule)
