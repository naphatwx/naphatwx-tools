Create a work log for the next workday and finalize today's log.

## Steps

1. Get today's date and determine the **next workday**:
   - Monday–Thursday → next day
   - Friday → next Monday
   - Saturday → next Monday
   - Sunday → next Monday

2. **Finalize today's log** at `PRIVATE/LOG/{today}.md`:
   - Add a `---` separator and `**Session ended: {current time}**` at the bottom
   - Make sure the "Still todo" section is up to date
   - Check for any unchecked items (`- [ ]`) in the log — these are remaining tasks

3. Check if `PRIVATE/LOG/{next-workday}.md` already exists:

   **Collect carry-over items** from today's log:
   - All items from "Still todo" section
   - All unchecked items (`- [ ]`) found anywhere in the log (remaining tasks)
   - Deduplicate — if an item appears in both, keep one copy

   **If next workday log does NOT exist** → create it:
   ```
   # {YYYY-MM-DD} — (continuing from {today})

   ## Carried over

   {deduplicated carry-over items as a checklist}

   ## What we did

   ## Commits today

   | Hash | Message |
   |------|---------|

   ## Still todo
   ```

   **If it already exists** → append carry-over items to the existing "Carried over" section (skip duplicates already present). Do NOT overwrite existing content.

4. Show:
   - Path to the next workday log
   - Items carried over
   - Whether the file was created or updated
