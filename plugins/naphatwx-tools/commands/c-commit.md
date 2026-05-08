---
name: c-commit
description: Generate a conventional commit message from staged changes and create the commit.
allowed-tools: Bash
---

Commit staged changes with a conventional commit message.

## Steps

1. Run `git diff --staged`.
    - If output is empty → stop. Do nothing. Do not print anything.
    - Do **not** run `git log`, `git status`, or any history command.
2. Generate a commit message from the diff only:
    - Format: `<type>(<scope>): <subject>`
    - Types: `feat` `fix` `refactor` `chore` `docs` `test` `style` `perf` `ci`
    - Scope: infer from changed paths; omit if changes span many areas
    - Subject: imperative, lowercase after colon, no period, max 72 chars
    - **Always** include a body. Structure:
        - One short paragraph (1–3 sentences) explaining **what** changed and **why**.
        - Blank line.
        - Bullet list of notable changes — one bullet per file, feature, or logical change.
            - Each bullet starts with `- ` and uses imperative voice.
            - Reference file/path or function name when helpful.
        - Wrap body lines at ~72 chars.
    - Add trailers (e.g. `Refs: TICKET-123`) only if a ticket id appears in the diff.
3. Run `git commit -m "<message>"`.
    - On failure (hook error, etc.) → print the error and stop.
    - On success → print result (see below).

## Output format

- Parse the short hash and diffstat from `git commit` output.
- Use the **full message you generated in step 2** for the body — do not re-derive from `git commit` output (it only shows the subject).
- **Do not** run `git show`, `git log`, or any extra command.

Print exactly this (note the inner fenced block around the message):

````
**Committed `<short-hash>`:**

```
<subject line>

<body paragraph 1>

<body paragraph 2>

...
```

- <X> files changed, <Y> insertions(+), <Z> deletions(-)
````

Rules for the message block:

- Include subject, body, and any trailers (e.g. `Refs: TICKET-123`) exactly as committed.
- Preserve blank lines between paragraphs.
- Wrap the message block (subject + body + trailers) in a fenced code block with no language tag.
- No leading `> ` quote.

Example `git commit` output to parse for hash + diffstat:

```
[main abc1234] <type>(<scope>): <subject>
 <X> files changed, <Y> insertions(+), <Z> deletions(-)
```

→ short hash = `abc1234`, diffstat = `<X> files changed, <Y> insertions(+), <Z> deletions(-)`.

Example final output:

````
**Committed `abc1234`:**

```
<type>(<scope>): <subject>

<Short paragraph explaining what changed and why. Keep it focused
on the motivation, not a restatement of the diff. Wrap around 72
characters per line.>

- <Notable change 1 — file, function, or feature>
- <Notable change 2>
- <Notable change 3>
```

- <X> files changed, <Y> insertions(+), <Z> deletions(-)
````

## Rules

- Only 2 git calls total: `git diff --staged` and `git commit`.
- Never run `git log`, `git status`, `git show`, or any history/inspect command.
- Run all commands normally (foreground). No background, no polling.
