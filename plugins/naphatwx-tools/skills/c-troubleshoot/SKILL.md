---
name: c-troubleshoot
description: Log troubleshooting issues encountered during work — problems, causes, and fixes.
---

# Daily Log

Store troubleshooting issues at `PRIVATE/LOG/{YYYY-MM-DD}.md`.

## User Input

```text
$ARGUMENTS
```

**Expected format:** `<problem description>` or omit to view today's log.

---

## Actions

### Log an issue (arguments provided)

Record a problem encountered during work.

1. Get today's date in `YYYY-MM-DD` format.
2. If `PRIVATE/LOG/{date}.md` does **not** exist:
   - Create `PRIVATE/LOG/` directory if needed.
   - Create `PRIVATE/LOG/{date}.md` with this template:
     ```markdown
     # {YYYY-MM-DD} — Troubleshooting Log

     ## Issues encountered
     ```
3. Parse from `$ARGUMENTS` or ask the user:
   - **Problem:** What went wrong?
   - **Cause:** Why did it happen?
   - **Fix:** How was it resolved?
4. Append to the `## Issues encountered` section:
   ```markdown
   ### {short problem title}
   - **Problem:** {description of what went wrong}
   - **Cause:** {why it happened}
   - **Fix:** {how it was resolved}
   ```
5. If the user provides only a short description, ask follow-up questions to fill in cause and fix.

---

### View log (no arguments)

1. Get today's date and check if `PRIVATE/LOG/{date}.md` exists.
   - If **not found** → inform user no log exists for today.
   - If **found** → read and display the contents.
