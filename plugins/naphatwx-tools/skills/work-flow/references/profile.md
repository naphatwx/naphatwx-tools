# Project Profile

The profile tells the flow what this project has. Read it once at start.

## Where to find it

1. A `## Flow profile` section in the root `AGENTS.md` or `CLAUDE.md`.
2. Else detect it (below), show what you found, and ask the user to fill the gaps once.
3. Offer to save the result as a `## Flow profile` section. Write it only if the user says yes.

## Shape

```markdown
## Flow profile

| App | Folder | Guide | Owner agent |
|-----|--------|-------|-------------|
| api | apps/api | apps/api/AGENTS.md | api-specialist |
| web | apps/web | apps/web/AGENTS.md | - |

- Run checks: `docker compose run --rm dev` | host
- Gate per app:
  - api: `go build ./... && go vet ./...` · unit: `go test ./...`
  - web: `npx tsc --noEmit` · `npx eslint .` · unit: `npx vitest run` · build (last): `npm run build`
- Integration tests: `make integration` (folder: tests/integration) | none
- Codegen order: api first (`make proto`), then web (`npm run proto:gen`) | none
- Numbered folders: migrations/sql, specs | none
- Docs: docs/features/<domain>/ (README.md, architecture.md, decisions/) | none
- Target branch fallback: ask
```

- `Owner agent` `-` → the generic owner role in `roles.md`.
- Every field is optional. A missing field turns its step off and the final summary says so.

## Detect when there is no profile

| Field | Look at |
|---|---|
| Apps | `apps/*`, `packages/*`, `services/*`, workspace files (`package.json` workspaces, `go.work`, `nx.json`, `turbo.json`, `pnpm-workspace.yaml`); a single-app repo is one app at `.` |
| Guide | `<app>/AGENTS.md`, `<app>/CLAUDE.md`, `<app>/CONTRIBUTING.md`, then the root ones |
| Owner agent | `.claude/agents/*.md` whose description names the app's folder |
| Gate commands | `Makefile` targets, `package.json` scripts, `nx.json`, CI files (`.gitlab-ci.yml`, `.github/workflows/`, `Jenkinsfile`) |
| Run checks | the guide says "run in Docker" or a compose service runs the toolchain |
| Integration tests | a `tests/integration`, `e2e` or `features` folder, or an `integration` script |
| Numbered folders | folders whose entries start with a number, like `000123_x.up.sql` or `127-foo/` |
| Docs | `docs/` structure the guide describes |

Never guess a gate command. Missing → ask, or leave the check off.

## Always read

- The root guide (`AGENTS.md` / `CLAUDE.md`) and `CONTRIBUTING.md`.
- Each changed app's guide. Owners and reviewers read it too; tell them its path.
