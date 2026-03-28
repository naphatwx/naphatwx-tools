---
name: daily-log
description: Create and update a daily work log tracking commits, issues encountered, and work history.
---

# Daily Log

Manage a daily work log at `PRIVATE/LOG/{YYYY-MM-DD}.md` that tracks commits, troubleshooting issues, and work progress.

## User Input

```text
$ARGUMENTS
```

**Expected format:** `<action>` — one of `init`, `commit`, `issue`, `status`, or omit for auto-detect.

---

## Actions

### `init` — Create today's log

1. Get today's date in `YYYY-MM-DD` format.
2. Check if `PRIVATE/LOG/{date}.md` already exists — if yes, inform user and stop.
3. Detect topic from `$ARGUMENTS` (words after `init`) or infer from current branch name.
4. Create `PRIVATE/LOG/` directory if it doesn't exist.
5. Create `PRIVATE/LOG/{date}.md` with this template:

```markdown
# {YYYY-MM-DD} — {topic}

## Commits today

| Hash | Message |
|------|---------|

## Issues encountered

## Work log

## Still todo

-
```

6. Confirm creation to user.

---

### `commit` — Log a commit to today's log

Used after a commit is created (typically called from `c-commit`).

1. Get today's date and check if `PRIVATE/LOG/{date}.md` exists.
   - If **not found** → skip, do nothing.
2. Get the latest commit's short hash and message:
   ```bash
   git log -1 --format="%h" && git log -1 --format="%s"
   ```
3. Append a row to the `## Commits today` table:
   - Format: `| \`{hash}\` | {message} |`
   - Keep existing rows intact — only append.
4. Summarize what changed in this commit:
   ```bash
   git diff HEAD~1 --stat
   ```
5. Add a work log entry under `## Work log`:
   - Format: `- {HH:MM} — {short summary of what changed and why}`
   - Create the `## Work log` section if it doesn't exist (place between `## Commits today` and `## Still todo`).

---

### `issue` — Log a troubleshooting issue

Record a problem encountered during work, its cause, and how it was resolved.

1. Get today's date and check if `PRIVATE/LOG/{date}.md` exists.
   - If **not found** → run the `init` action first to create it.
2. Parse from `$ARGUMENTS` (words after `issue`) or ask the user:
   - **Problem:** What went wrong?
   - **Cause:** Why did it happen?
   - **Fix:** How was it resolved?
3. Append to the `## Issues encountered` section:
   ```markdown
   ### {short problem title}
   - **Problem:** {description of what went wrong}
   - **Cause:** {why it happened}
   - **Fix:** {how it was resolved}
   ```
4. If the user provides only a short description, ask follow-up questions to fill in cause and fix.

---

### `status` — Show today's log

1. Get today's date and check if `PRIVATE/LOG/{date}.md` exists.
   - If **not found** → inform user no log exists for today.
2. Read and display the contents of today's log.

---

### Auto-detect (no action specified)

If `$ARGUMENTS` is empty or doesn't match a known action:

1. Check if today's log exists.
   - If **not found** → run `init`.
   - If **found** → run `status`.
