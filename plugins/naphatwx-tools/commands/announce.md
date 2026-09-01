---
description: Draft a Thanos announcement from a GitLab merge request. Analyzes the MR and produces a ready-to-paste title + markdown content (+ popup recommendation).
allowed-tools: Skill, Bash, Read, Glob, Grep, mcp__gitlab__get_merge_request, mcp__gitlab__get_merge_request_diffs, mcp__gitlab__list_merge_request_changed_files, mcp__gitlab__get_merge_request_file_diff, mcp__gitlab__list_merge_requests, mcp__thanos-mcp__AnnouncementService_CreateAnnouncement
---

# Announcement Writer

Turn a GitLab merge request into a Thanos announcement for the platform's users.
Cover **all apps and all meaningful changes** in the MR — not just the thanos-web
UI. "Users" here means anyone who touches the platform: engineers using thanos-web
(repos, deployments, config), and people who connect to the Thanos MCP / API.

Work from the **MR file changes (diffs) only**. Do NOT read or use the MR title
or description — they may be stale, templated, or wrong. The diff is the single
source of truth for what changed.

## User Input

```text
$ARGUMENTS
```

`$ARGUMENTS` is the MR to analyze, plus optional flags. Accepted forms:

| Input | Meaning |
|-------|---------|
| Full MR URL | `https://git.ntbx.tech/<group>/<project>/-/merge_requests/123` |
| `<project_id>!<iid>` | e.g. `avengers/thanos!123` or `456!123` |
| `!<iid>` or `<iid>` | MR in the current repo (resolve project from `git remote`) |

Optional flags (anywhere in `$ARGUMENTS`):

- `--en` — write the announcement in English (default is **Thai**).
- `--popup` / `--no-popup` — force the popup recommendation instead of deciding.
- `--publish` — after drafting, create + publish it via the Announcement MCP tool.

If `$ARGUMENTS` is empty, print usage and stop:

```text
Usage: /announce <mr-url | project!iid | iid> [--en] [--popup|--no-popup] [--publish]
Examples:
  /announce https://git.ntbx.tech/avengers/thanos/-/merge_requests/123
  /announce avengers/thanos!123 --en
  /announce 123 --popup
```

## Announcement schema (target output)

From `apps/thanos-grpc/proto/definitions/announcement.proto` (`CreateAnnouncementRequest`):

- **title**: plain string, required, max 200. No markdown.
- **content**: non-empty GitHub-flavored markdown. Rendered with
  `react-markdown` + `remark-gfm` + `rehype-sanitize` (headings, lists, links,
  tables, code, bold/italic — no raw HTML, no images unless already supported).
- **popupEnabled**: bool. `true` shows the announcement as a one-time modal on
  next login. Reserve for changes users must not miss.

### Validation (MUST pass — the draft is useless if the server rejects it)

The backend (`internal/service/announcement/announcement.go`) validates on create.
A draft that fails these is unusable, so check them BEFORE you output:

- **title — max 200 BYTES, not characters.** The server checks `len(title)` in Go,
  which counts UTF-8 **bytes**. A Thai character is 3 bytes; a common emoji is 4
  bytes; an ASCII letter is 1 byte. So a Thai title has room for only ~60-65
  characters, far fewer than 200. **Always verify the byte length** of the title
  (e.g. `printf '%s' "<title>" | wc -c` ≤ 200) before printing — do not trust the
  character count. If it is over, shorten the title (drop the emoji first, then
  trim words) and re-check.
- **title — required, trimmed non-empty.** Leading/trailing spaces are stripped;
  it must not be blank after trimming.
- **content — required, trimmed non-empty.** Must not be blank after trimming.
  No max length on content.

These are the only server-side rules; there is no separate frontend cap to worry
about. When in doubt, keep the title short and put detail in the content.

## Workflow

### 1. Parse input

Strip the flags from `$ARGUMENTS`; keep the MR reference.

### 2. Fetch the MR changes

Invoke the `naphatwx-tools:get-mr-diffs` skill with the MR reference. It
resolves the project/IID, fetches metadata, and gets the diff (local git
first, MCP fallback).

Command-specific rules:

- **Ignore the MR title and description entirely** — do not read them as
  content, do not let them shape the analysis or the draft. The file diffs are
  the sole content source; derive every claim in the announcement from them.
- **Filter noise**: skip tests, lockfiles, generated code, `docs/`, `specs/`
  when reading locally; on the MCP fallback pass `excluded_file_patterns`, e.g.
  `["_test\\.go$", "\\.spec\\.ts$", "package-lock\\.json", "/gen/", "\\.pb\\.go$", "\\.feature$", "^docs/", "^specs/"]`.
- If the diff is still too large to read inline (common for release MRs), read
  it in chunks, or hand it to a subagent (general-purpose) with an explicit
  instruction to read 100% of it and return a grouped, quote-grounded summary
  of every meaningful change across all apps.

If the MR is not found or not yet merged, still proceed but note its state in
chat (draft announcements for open MRs are fine, just flag it).

### 3. Analyze the changes (all apps)

Read the file diffs and take stock of **every meaningful change across all
apps** — thanos-grpc (backend/API), thanos-web (UI), thanos-worker, the MCP
gateway, RBAC/permissions, and schema. Group the changes by area or by spec,
inferring the grouping from file paths (`apps/<app>/...`, `specs/NNN-*`,
`migrations/...`) and from what the code actually does.

For each group, translate it into what it means for a **user of the platform**:

- thanos-web: new pages, features, buttons, fields, workflows, moved menus, new
  validation/approvals, new toasts/errors.
- Thanos MCP / API: new/removed tools or fields, changed tool shape, role-scoped
  visibility, response changes — anything a programmatic/AI consumer would see.
- RBAC/permissions: new or changed permissions users would notice.
- Schema/cleanup: usually a short "housekeeping" line, unless it changes behavior
  the user sees.

Keep genuinely invisible work brief or omit it (test-only, CI, mock regen, pure
internal refactors with zero observable effect). But err toward **including** a
change grouped under a short housekeeping line rather than dropping it — the goal
is a release roundup that covers the whole MR, not only the flashy UI parts.

If the diff touches spec folders (`specs/NNN-*`), you may read a `spec.md`'s
user stories for wording, but the diff stays the source of truth for what
actually changed.

### 4. Draft the announcement

Write for end users, task-oriented, not implementation detail. Language is
**Thai by default** (`--en` switches to English). Keep the user's global style:
plain everyday words, short sentences, no jargon. Add a few light emoji to make
it friendly — one in the title, one per section header — but do not overdo it
(no emoji on every bullet).

**Title** (max 200 BYTES — see Validation; for Thai aim for ~40-55 characters to
stay safely under, since Thai is 3 bytes/char and the emoji is 4): a clear,
benefit-led one-liner with a leading emoji that fits the news (🎉 new feature,
🚀 improvements, ⚠️ heads-up, 🐛 fix). No ticket numbers, no "MR", no branch
names, no vendor names. **Verify the byte length before you output it** (drop the
emoji, then trim words, if it is over 200).

**Content** (GFM markdown): open with a friendly one-line greeting, then 2-3
short sections — only those that apply. Emoji on the greeting and each `**...**`
section header, plain text on bullets.

Thai template (default):

```markdown
📢 อัปเดตจากทีม Infra

<เกริ่นสั้น ๆ 1-2 ประโยค: มีอะไรใหม่ และผู้ใช้ได้อะไร>

✨ **มีอะไรใหม่**

- <ความสามารถที่ผู้ใช้เห็น 1>
- <ความสามารถที่ผู้ใช้เห็น 2>

👉 **สิ่งที่ต้องทำ**

- <สิ่งที่ผู้ใช้ต้องทำ — ตัดทั้งหัวข้อนี้ออกถ้าไม่มี>
```

English template (`--en`): same shape, English copy.

```markdown
📢 Update from the Infra team

<one or two sentences: what changed and why it matters>

✨ **What's new**

- <user-facing capability 1>
- <user-facing capability 2>

👉 **What you need to do**

- <action the user must take — omit this whole section if none>
```

Rules:
- Never paste raw local paths, dev sandbox names (`dev00`), or internal branch
  names into the content.
- Do not fabricate screenshots or links you cannot verify.
- Keep it to what the diff actually supports.

**Popup recommendation**: default `false`. Recommend `true` only for changes
that need attention or action (breaking change, new required field, security /
permission change, migration users must know about). `--popup` / `--no-popup`
override the decision.

### 5. Output

**Before printing, validate the draft** (see the Validation section):
- Title byte length ≤ 200 — check with `printf '%s' "<title>" | wc -c`. If over,
  shorten and re-check until it passes.
- Title and content non-empty after trimming.

Print to chat (chat notes in Thai per the user's global rule; the announcement
fields themselves follow the language flag — Thai by default, `--en` for English).

1. A one-line note of what the MR does and whether it is user-facing.
2. A bold **Title** label, then the title in its own code block, so it can be
   copied on its own:

   **Title**

   ```text
   <title>
   ```

3. A bold **Content** label, then the content in a separate code block, so it
   can be copied on its own:

   **Content**

   ```text
   <markdown content>
   ```

4. The popup recommendation on one line after the blocks:

   `POPUP: <true|false> — <one-line reason>`

Keep title and content in **separate** code blocks — never combine them. Put the
bold **Title** / **Content** labels *outside* (above) each block so they are easy
to tell apart. Do NOT put labels *inside* the blocks (they would get copied too).

### 6. Publish (only if `--publish`)

If `--publish` was passed, call
`mcp__thanos-mcp__AnnouncementService_CreateAnnouncement` with
`{ title, content, popupEnabled }`. Report the created announcement id.
Without `--publish`, do NOT create anything — just hand back the draft.

## Notes

- This command reads a real MR over the GitLab MCP server; if that server is not
  authorized in this session, tell the user and ask them to paste the MR diff
  instead, then continue from step 3.
- One MR → one announcement. For several MRs, run the command once each and
  merge the drafts by hand.
