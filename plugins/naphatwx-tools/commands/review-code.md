---
name: review-code
description: Review code changes (staged changes or a GitLab merge request)
argument-hint: [staged | <merge-request-url> | file paths...]
allowed-tools: Skill, Read, Write, Glob, Grep, Bash(git diff:*), Bash(git log:*), Bash(git remote:*), Bash(git branch:*), Bash(git fetch:*), Bash(git -C:*), mcp__gitlab__get_merge_request, mcp__gitlab__get_merge_request_diffs, mcp__gitlab__list_merge_request_changed_files, mcp__gitlab__get_merge_request_file_diff, mcp__gitlab__get_file_contents
---

# Code Review Agent

Review code changes against project guidelines from AGENTS.md and CONTRIBUTING.md.

## User Input

```text
$ARGUMENTS
```

## Workflow

### 1. Determine Review Target

**A. Staged changes** — `$ARGUMENTS` is empty or contains "staged":
- Run `git diff --cached`.
- If the diff is empty → do NOT review. Tell the user there are no staged
  changes and to stage files first (`git add`), then stop.

**B. GitLab merge request** — `$ARGUMENTS` contains an MR URL like
`https://<host>/<group>/<project>/-/merge_requests/<iid>`:
- Invoke the `naphatwx-tools:get-mr-diffs` skill with the MR URL. It resolves
  the project/IID, fetches metadata, and gets the diff (local git first, MCP
  fallback).
- Command-specific rule: do NOT exclude test files from the diff — the review
  must see them.
- If the diff is large, read it file by file — do NOT dump the whole diff.

**C. Files / directories** — `$ARGUMENTS` contains file paths or directory
names:
- Review the specified files/directories.

### 2. Load Guidelines

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

### 3. Perform Review

Review the code for:

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

### 4. Output Format

**Files Reviewed**: [list of files]
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

- PASS: No critical issues, ready to commit
- FAIL: Critical issues found, must be fixed before commit

Reference every finding as `file:line`. For an MR review, use line numbers
from the MR head so findings map to the MR diff.

### 5. Save Review to Spec PRIVATE Folder

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
