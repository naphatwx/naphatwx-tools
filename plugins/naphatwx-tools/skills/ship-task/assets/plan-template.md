# NNN · {Title} ({ticket id, if any})
- Phase: 1 · Apps: {apps} · Target: {MR/PR target per repo, or "not known yet"} · Next: {one line}
- Branch: {branch per repo, or "not cut yet"} · Updated: {YYYY-MM-DD}
- Files: [tasks.md](tasks.md) · [decisions.md](decisions.md) · [contracts.md](contracts.md) · [research.md](research.md) · [log.md](log.md)

## Goal
- {what users can do after this ships}
- {why: the problem it removes}

## Status
- Phase: {phase and its state}
- Done: {phases or tasks finished}
- Written, not run: {code or tests not built or run yet | nothing yet}
- Open: {open questions and reviews | none}
- Next: {the next 1–3 steps}

## Open questions
- Q1 {question} — decides: {who} · needed before: {phase or task}

## Rules check
- [ ] {project rule} — {what is still to check, and when}

## Accept
- **A1 {Topic} (new):** {role} can {action}. {What the user sees.}
- **A2 {Topic} (changed):** {rule now}. Before: {what the app did}.
  - Reason: `{REFUSAL_REASON}`
  - Message: "{What is wrong}. {What to do next}."
- **A3 {Topic} (removed):** {behaviour that goes away}.

## Edge cases
- **E1 {Case}:** {input or state} → {what happens, with the exact message}.

## Out of scope
- {thing not built} ({source})
- Known gap: {thing that stays broken} ({who accepted it})

## Risks
- R1 {risk} → mitigation: {what limits it} | accepted ({who, date})

## Changes per app
- {app} (`{folder}`):
  - `{path}` (new) — {what}
  - `{path}` (edit) — {what}
- Main agent: {docs, root config}
- User steps: {env vars, job config, other things only the user can do}

## Verify locally
1. {start the apps and seed data}
2. {open a page or call an endpoint as a role} → {expected result} (A#)
3. {trigger a refusal} → `{REASON}` with the exact message (A#)

## Release & rollback
- Needs first: {other repo MR, job, env var, config that must exist before deploy}
- Merge order: {repo or MR} → {repo or MR} → {deploy}
- After deploy: {first check}
- Rollback: {previous build}; {migrations down, in order}; {other repo revert}
