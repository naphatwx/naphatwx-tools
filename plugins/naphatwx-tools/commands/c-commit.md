---
name: c-commit
description: Generate a conventional commit message from staged changes and create the commit.
allowed-tools: Bash
---

Generate a conventional commit from staged changes. Arguments: `$ARGUMENTS` (optional type/scope override).

## Steps

1. Run `git diff --staged` — stop and inform user if nothing is staged.
2. Run `git branch --show-current` — extract ticket ID (e.g. `PROJ-123`) if present.
3. Generate a commit message:
   - Format: `<type>(<scope>): <subject>`
   - Types: `feat` `fix` `refactor` `chore` `docs` `test` `style` `perf` `ci`
   - Scope: infer from changed paths; omit if changes span many areas
   - Subject: imperative, lowercase after colon, no period, max 72 chars
   - Add body only when subject alone is unclear
   - Add `Refs: TICKET-ID` footer if ticket found in branch name
4. Commit:
   ```bash
   git commit -m "$(cat <<'EOF'
   <message>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
5. Show the commit result.
6. Update daily log (if it exists):
   - Check if `PRIVATE/LOG/{today's date}.md` exists
   - If **not found** → skip, do nothing
   - If **found**:
     a. Append the new commit to the `## Commits today` table
        - Get the short hash and message from the commit just created
        - Add a new row: `| \`{hash}\` | {message} |`
        - Keep existing rows intact — only append
     b. Summarize what was done since the last commit entry in the log
        - Compare `git diff HEAD~1` to get changes in this commit
        - Write a short one-line summary under a `## Work log` section
        - Format: `- {short summary of what changed and why}`
        - Create the `## Work log` section if it doesn't exist (place it between `## Commits today` and `## Still todo`)
