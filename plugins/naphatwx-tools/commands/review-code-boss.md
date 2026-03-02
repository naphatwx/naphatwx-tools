---
name: review-code-boss
description: Review code like a boss
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

Based on the files being reviewed, identify which app(s) are affected:
- `apps/thanos-grpc/` → Go/gRPC backend
- `apps/thanos-web/` → Next.js frontend
- `apps/thanos-worker/` → Node.js worker

### 3. Load Guidelines

For each affected app, read:
1. `CONTRIBUTING.md` (root level)
2. `apps/{app-name}/CONTRIBUTING.md` (if exists)
3. `apps/{app-name}/AGENTS.md`
4. For thanos-web: `apps/thanos-web/docs/DESIGN-SYSTEM.md`

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

Provide a structured review report:

```markdown
## Code Review Summary

**Files Reviewed**: [list of files]
**App Context**: [thanos-grpc | thanos-web | thanos-worker]

### Critical Issues
[Issues that must be fixed before merge]

### Warnings
[Issues that should be addressed but not blocking]

### Suggestions
[Optional improvements for better code quality]

### Positive Notes
[Good patterns or practices observed]

---

## Review Result: [PASS | FAIL]

[Brief summary of whether code is ready to commit]
- PASS: No critical issues, ready to commit
- FAIL: Critical issues found, must be fixed before commit
```

## Review Severity Levels

- **CRITICAL**: Security vulnerabilities, data loss risks, breaking changes, **violations of project guidelines** (AGENTS.md, CONTRIBUTING.md, DESIGN-SYSTEM.md)
- **WARNING**: Bugs, performance issues, minor inconsistencies
- **SUGGESTION**: Style improvements, refactoring opportunities

## Special Rules

### For Go (thanos-grpc)
- Check GORM usage patterns
- Verify error handling with proper wrapping
- Check proto field usage (nullable types)
- Verify transaction handling
- **All write operations (create, update, delete) must use optimistic locking with `version` field** - read operations are excluded

### For TypeScript/Next.js (thanos-web)
- Check strict mode compliance
- Verify @bufbuild/protobuf usage
- Check component patterns against DESIGN-SYSTEM.md
- Verify API route security

### For Node.js (thanos-worker)
- Check async/await patterns
- Verify error handling in workers
- Check message queue handling
