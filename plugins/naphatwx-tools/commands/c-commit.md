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
