---
name: c-init-log
description: Create a new daily work log for today.
allowed-tools: Bash, Write, Read
---

Create a daily work log at `PRIVATE/LOG/{YYYY-MM-DD}.md`. Arguments: `$ARGUMENTS` (optional topic override).

## Steps

1. Get today's date in `YYYY-MM-DD` format.
2. Check if `PRIVATE/LOG/{date}.md` already exists — if yes, inform user and stop.
3. Detect topic from `$ARGUMENTS` or infer from current branch name.
4. Create `PRIVATE/LOG/` directory if it doesn't exist.
5. Create `PRIVATE/LOG/{date}.md` with this template:

```markdown
# {YYYY-MM-DD} — {topic}

## Commits today

| Hash | Message |
|------|---------|

## Still todo

-
```

6. Confirm creation to user.
