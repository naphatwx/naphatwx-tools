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
    - Add body only when subject alone is unclear
3. Run `git commit -m "<message>"`.
    - On failure (hook error, etc.) → print the error and stop.
    - On success → print result (see below).

## Output format

- Parse the short hash and diffstat from `git commit` output.
- Use the **full message you generated in step 2** for the body — do not re-derive from `git commit` output (it only shows the subject).
- **Do not** run `git show`, `git log`, or any extra command.

Print exactly this:

```
**Committed `<short-hash>`:**

<subject line>

<body paragraph 1>

<body paragraph 2>

...

- <X> files changed, <Y> insertions(+), <Z> deletions(-)
```

Rules for the message block:

- Include subject, body, and any trailers (e.g. `Refs: MUT-4691`) exactly as committed.
- Preserve blank lines between paragraphs.
- No leading `> ` quote, no code fence around the message.

Example `git commit` output to parse for hash + diffstat:

```
[main f45ddaf] feat(monorepo-build): re-enable MISSING apps...
 8 files changed, 475 insertions(+), 2 deletions(-)
```

→ short hash = `f45ddaf`, diffstat = `8 files changed, 475 insertions(+), 2 deletions(-)`.

Example final output:

```
**Committed `f45ddaf`:**

feat(monorepo-build): re-enable MISSING apps when they reappear in manifest

Add reEnableMissingApps() function to ntb_monorepo_build.groovy that
detects apps with MISSING status in Thanos whose names are back in
turbo-manifest.yaml and updates them to ENABLED. DISABLED apps are
never touched.

Refs: MUT-4691

- 8 files changed, 475 insertions(+), 2 deletions(-)
```

## Rules

- Only 2 git calls total: `git diff --staged` and `git commit`.
- Never run `git log`, `git status`, `git show`, or any history/inspect command.
- Run all commands normally (foreground). No background, no polling.
