# Phase 0: Spec

The main agent writes the spec. It runs nothing. It ends with a spec verify.

## Write the spec

1. **Folder.** The profile's `Spec folder`. Else the repo's spec folder if it has one (`specs/`, `docs/specs/`), with its numbering (`NNN-<slug>`, next free number). Else `docs/specs/<slug>/`. Slug: 2–4 words, like `add-user-export`.
2. **Ask or decide.** List up to 5 questions whose answer changes the design. Autopilot: the decider answers. Manual: ask the user (AskUserQuestion when the agent has it).
3. **Write one file, `spec.md`**, short. Full: the shape below. Small: the short shape. Skip a section that has nothing.
4. **Review.** Full + Autopilot: the decider reviews `spec.md`; NEEDS REVISION → fix, review again. Otherwise: present it to the user, wait.
5. **Spec verify** (below). Full only.

```markdown
# <Title>

## Spec
- Goal: <one line>
- Users and roles: <who>
- Stories:
  1. As <role>, I want <x>, so that <y>.
     - Accept: <testable result>
- Edge cases and refusals: <list>
- Out of scope: <list>
- Decisions: <question → answer, who decided>

## Plan
- Approach: <3-6 bullets>
- Changes per app:
  - <app>: <files or areas, what changes>
- Data / API / contract changes: <tables, fields, endpoints, messages>
- Numbered files: <new migration names, if any>
- Risks: <list>

## Tasks
- [ ] T001 [<app>] <task>
- [ ] T002 [<app>] [TEST] <test task>
```

Small shape:

```markdown
# <Title>

- Goal: <one line>
- Accept:
  - <testable result>
- Out of scope: <list>
- App: <the one app> · files: <files or areas>
- Tasks:
  - [ ] T001 <task>
  - [ ] T002 [TEST] <test task>
```

- Every story has at least one task. Every task names one app.
- Test tasks carry `[TEST]`. Phase 2 skips them, Phase 3 does them.
- For a bigger feature, the `generate-use-case` or `design-feature` skill can feed the Spec section.

## Spec verify (Full only)

Checks the spec against each app's guide and the real code. Catches made-up APIs, wrong
paths and edits no task owns.

1. Start one fresh **spec verifier** per changed app (`roles.md`), all at once.
2. A spec that touches another repo → one more verifier per repo.
3. The main agent applies the fixes to the spec files.
4. A CRITICAL finding that changes the plan or the task list → rewrite the Plan and Tasks sections, then review again.
5. A verifier never becomes that app's owner later.

## Close Phase 0

- Write `flow.md` (size, phase 1 for Full or 2 for Small, apps, target branch if an MR/PR exists).
- Manual: ask "start coding?" and wait.
