---
name: weekly-work-log
description: Summarize the user's git commits into up to 5 weekly achievement items, ready to paste. Use when the user says "log my work" or "weekly achievements for last week".
---

# Work Log — Weekly Achievements from Git History

Turn the user's git commits across all work repos into short achievement items
ready to paste into the company "My Weekly Achievements" page.

## Inputs

- **Date range** (optional): parse from the user's message (e.g., "29 June - 5 July",
  "last week", "week 28"). If absent, use the current week, Monday through Sunday.
- Resolve relative dates against today's date. Weeks run Mon-Sun.
- **Repos** (optional): if the user names one or more repos (e.g., "only thanos",
  "thanos and pipeline-master"), scan only those. Otherwise auto-discover.

## Repos to scan

Default: the current directory is the work root. The user `cd`s there before running this skill.

- The current directory is a git repo → scan only that repo.
- Otherwise → scan every git repo under it (a directory containing `.git`, max 2 levels deep).
  Do not hardcode repo names; the user works on different repos over time.

```bash
find . -maxdepth 3 -name .git -prune | sed 's|/.git$||'
```

If the user named specific repos, resolve each name against the current directory
(`./<name>`); if a path is missing or not a git repo, skip it and note that in the reply.

## Steps

1. Discover repos (or use the user-specified list), then for each repo run
   (via the Bash tool, all repos in parallel):

   ```bash
   git -C <repo-path> log --all --author="$(git -C <repo-path> config user.email)" --since="<YYYY-MM-DD> 00:00" --until="<YYYY-MM-DD> 23:59" \
     --pretty=format:"%h|%ad|%s" --date=format:"%Y-%m-%d %H:%M" --no-merges
   ```

   Repos with zero commits in range are silently omitted from grouping (mention
   them only in the overview if the user asked about them explicitly).

2. Group commits by **theme/feature**, not by repo or by day. A theme that spans
   repos (e.g., web + pipeline + terraform) is ONE item — mention the end-to-end
   scope, it reads as a bigger achievement.

3. Write **at most 5 items** (fewer is fine for a light week). Rules per item:
   - **Hard cap 140 characters** (the achievements form limit). Count before
     output; trim until it fits.
   - Single logical line — no manual line breaks inside an item.
   - Start with a past-tense verb: Built, Added, Implemented, Fixed, Shipped,
     Designed, Hardened, Refactored.
   - Lead with user/business impact, then key technical detail.
   - Merge docs/chore/style commits into their parent feature item; never list
     them alone unless the week has nothing else.
   - Skip noise: merge commits, WIP, revert-of-own-commit pairs, `.env` tweaks.

4. Output format: a numbered label line, then the item in its **own fenced code
   block** (`text` tag) so the user can copy each item with one click. The number
   stays OUTSIDE the block — copied text must be the item only:

   ````markdown
   **1.**

   ```text
   <item>
   ```
   ````

5. After the blocks, add a 1-2 sentence week overview.

## Notes

- If a repo has zero commits in range, say so briefly — do not fabricate items.
- If the user asks for fewer/more items, regenerate accordingly;
  the 140-char cap always applies.
