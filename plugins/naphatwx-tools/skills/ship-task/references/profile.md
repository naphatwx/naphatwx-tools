# Project Profile

## Where to find it

1. A `## Flow profile` section in the root `AGENTS.md` or `CLAUDE.md`.
2. Else detect it (below), show what you found, and ask the user to fill the gaps once.
3. Offer to save the result as a `## Flow profile` section. Write it only if the user says yes.

## Shape

```markdown
## Flow profile

| App | Folder | Guide | Owner agent |
|-----|--------|-------|-------------|
| <app> | <folder> | <folder>/AGENTS.md | `<agent>` |
| <app> | <folder> | <folder>/AGENTS.md | - |

- Agent split: one per app | <the repo's rule, e.g. one per folder, one per layer> | one for the whole change
- Other checkouts: `<path to another clone>` (their task numbers count too) | none
- Run checks: `<wrapper command, e.g. a container run>` | host
- Gate per app:
  - <app>: `<build>` · `<typecheck>` · `<lint>` · unit: `<unit test>` · build (last): `<build>`
- Unit tests on request: `<affected-tests command>` | same as pre-merge
- Integration tests: `<command>` (folder: <folder>) | none
  - At pre-merge: full | changed
- Codegen order: <contract app> first (`<codegen command>`), then <app> (`<codegen command>`) | none
- Follow-up owners: <app> → `<agent>` (<its area>) | none
- Numbered folders (tracked only): <folder> | none
- Hotfix branch (read only, never merged): `<hotfix branch>` | ask
- Pre-merge app steps: <app>: <step> | none
- Cross-app checks: <extra names that must match across apps> | none
- Rules check: <project rules every plan ticks> | from the Rules that apply list
- Extra review tracks: <agent, when it runs> | none
- Decider agent: <agent> | general-purpose
- Docs: <docs folder> | none
  - User docs: <folder> · after edit: `<docs index command>` | none
- Target branch fallback: ask
```

- `Agent split` sets the scopes of owners, reviewers, spec verifiers and gate runners (`roles.md` → Scope). Missing → use the rule the root guide states; no rule → one for the whole change.
- `Owner agent` `-` → the generic owner role in `roles.md`. With a split that is not per app, an owner uses the agent named for the app its scope falls in, if there is one.
- `Follow-up owners` run after the owner of the named app's scope, in the same phase, with a clear split: the owner makes it work, the follow-up owner refines its own area.
- `Extra review tracks` run beside Phase 4. They never join the fix batch and never hold the gate.
- Every field is optional. A missing field turns its step off and the final summary says so.

## Detect when there is no profile

| Field | Look at |
|---|---|
| Apps | `apps/*`, `packages/*`, `services/*`, workspace files (`package.json` workspaces, `go.work`, `nx.json`, `turbo.json`, `pnpm-workspace.yaml`, `Cargo.toml` workspace); a single-app repo is one app at `.` |
| Agent split | a rule in the root guide about sub-agents, owners or who edits which folder |
| Guide | `<app>/AGENTS.md`, `<app>/CLAUDE.md`, `<app>/CONTRIBUTING.md`, then the root ones |
| Owner agent | `.claude/agents/*.md` (or the agent's own folder) whose description names the app's folder |
| Gate commands | `Makefile` targets, package scripts, workspace tools, CI files |
| Run checks | the guide says checks run in a container or a wrapper |
| Integration tests | an integration, e2e or features test folder, or an integration script |
| Numbered folders | folders whose entries start with a number, like `000123_x.up.sql` or `043-foo/` |
| Docs | the docs folder the guide describes |

Never guess a gate command. Missing → ask, or leave the check off.

## Always read

- The root guide (`AGENTS.md` / `CLAUDE.md`) and `CONTRIBUTING.md`.
- The guides of each changed scope. Owners and reviewers read them too; tell them the paths.
