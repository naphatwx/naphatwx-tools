---
name: c-commit
description: Generate a conventional commit message from staged changes and create the commit.
allowed-tools: Bash
---

Commit staged changes with a conventional commit message.

## Steps

1. Run `git diff --staged`. If empty → stop silently.
2. Build message from the diff only:
    - Subject: `<type>(<scope>): <subject>`
        - Types: `feat` `fix` `refactor` `chore` `docs` `test` `style` `perf` `ci`.
        - Scope: infer from paths; omit if changes span many areas.
        - Imperative, lowercase after colon, no period, max 72 chars.
    - Body (always include):
        - 1–3 sentence paragraph on **what** and **why**.
        - Blank line, then bullets (`- `, imperative) for notable changes.
        - Wrap at ~72 chars.
    - Trailer `Refs: TICKET-123` only if a ticket id appears in the diff.
3. Run `git commit -m "<message>"`. On failure → print error and stop.

Only 2 git calls total. Never run `git log`, `git status`, `git show`, or any history/inspect command.

## Output format

Parse short hash and diffstat from `git commit` output. Use the message you generated (not re-derived). Print exactly:

````
**Committed `<short-hash>`:**

```
<subject>

<body paragraph>

- <bullet 1>
- <bullet 2>
```

- <X> files changed, <Y> insertions(+), <Z> deletions(-)
````

Rules:

- Wrap message in a fenced block, no language tag, preserve blank lines.
- Include trailers exactly as committed. No leading `> ` quote.
