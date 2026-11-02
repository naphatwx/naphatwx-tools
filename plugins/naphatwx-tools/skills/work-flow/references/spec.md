# Phase 0: Spec

The main agent writes the spec. It runs nothing. It ends with a spec verify.

## Folder

The profile's `Spec folder`, numbered `NNN-<slug>` (next free number across the folder, tracked or not).
No profile value → `specs/NNN-<slug>/`. Slug: 2–4 words, like `add-user-export`. The number is how the
user refers to the task ("continue 194").

## Speckit path (when speckit is installed, as skills or commands)

Run each step the way the agent has it: a skill (`speckit-specify`), a slash command (`/speckit.specify`), or read its command file and follow it. The table names the slash form.

| # | Step | Who |
|---|---|---|
| 1 | `/speckit.specify <want>` | main agent; the folder must match the one above (move it if speckit wrote elsewhere) |
| 2 | `/speckit.clarify` | **the user answers**. No questions → skip |
| 3 | `/speckit.plan` | main agent |
| 4 | `/speckit.tasks` | main agent; mark test tasks `[TEST]` if speckit did not |
| 5 | `/speckit.analyze` | main agent fixes every real issue itself; a disputed one → the decider |
| 6 | `/speckit.checklist` | only when the user asks |
| 7 | Spec verify (below) | main agent fixes |

## Light spec path (no speckit)

1. Write `spec.md` in the shape below. Skip a section that has nothing.
2. **Clarify**: up to 5 questions whose answer changes the design, in one message (AskUserQuestion when the agent has it). **The user answers.** No questions → skip. Write each answer under Decisions.
3. Spec verify (below).

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

- Every story has at least one task. Every task names one app.
- Test tasks carry `[TEST]`. Phase 2 skips them, Phase 3 does them.
- For a bigger feature, the `generate-use-case` or `design-feature` skill can feed the Spec section.

## Spec verify

Checks that the plan follows the project's rules and the real code: each app's guide, the root guide,
existing helpers and components. Example: the plan writes a badge inline, the web guide says "a badge is
its own component" → the plan and tasks change to "add a badge component". It does not judge the
requirements; the user's clarify answers settle those.

1. Start one fresh **spec verifier** per changed app (`roles.md`), all at once.
2. A spec that touches another repo → one more verifier per repo.
3. The main agent applies every fix to the spec files itself. A finding it disagrees with → the decider.
4. A CRITICAL finding that changes the plan or the task list → update plan and tasks (speckit: `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze` again).
5. A verifier never becomes that app's owner later.

## Close Phase 0

- Write `flow.md` (phase 1, apps, target branch if an MR/PR exists).
- Go straight to Phase 1. No "start coding?" question.
