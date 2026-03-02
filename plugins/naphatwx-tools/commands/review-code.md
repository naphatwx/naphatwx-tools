---
name: review-code
description: Review code changes
allowed-tools: Read, Glob, Grep
---

# Code Review Agent

Review code changes against project guidelines from AGENTS.md and CONTRIBUTING.md.

## User Input

```text
$ARGUMENTS
```

## Workflow

### 1. Determine Review Target

If `$ARGUMENTS` is empty or contains "staged":
- Review staged changes using `git diff --cached`

If `$ARGUMENTS` contains file paths or directory names:
- Review the specified files/directories

### 2. Detect App Context

Based on the files being reviewed, identify the language and framework:
- `.go` files → Go
- `.ts`, `.tsx`, `.js`, `.jsx` files → JavaScript / TypeScript
- `.py` files → Python
- `.java`, `.kt` files → Java / Kotlin
- `.rs` files → Rust
- Detect framework from config files (e.g., `next.config.*`, `package.json`, `go.mod`, `pyproject.toml`)

### 3. Load Guidelines

Read the following files if they exist:
1. `CONTRIBUTING.md` (root level)
2. `AGENTS.md` (root level)
3. `CONTRIBUTING.md` inside the affected app or module directory
4. `AGENTS.md` inside the affected app or module directory
5. Any `docs/` markdown files relevant to the changed files (e.g., design system, architecture)

### 4. Perform Review

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

### 5. Output Format

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
