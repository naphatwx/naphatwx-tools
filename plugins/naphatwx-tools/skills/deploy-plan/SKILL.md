---
name: deploy-plan
description: Build a deployment plan as a clickable HTML checklist, split into Pre-deploy and Post-deploy steps, from a GitLab MR, a branch, a spec or a described release. Use when the user says "deployment plan for this MR" or "what do I need to do before and after deploy". Plans only; it never deploys or changes anything. Post-deploy service checks are smoke-test.
argument-hint: "<MR url | !iid | branch | spec path | description> [--env <env>]"
---

# Deploy Plan

Read what is being released, find every step it needs around the deploy, and write one HTML checklist.

```text
input ─► find the MR that deploys to the env
      ─► get the change (MR diff, branch diff, spec)
      ─► read the code behind each deploy-relevant change
      ─► build Pre-deploy, Post-deploy and Rollback steps
      ─► resolve "check" items with read-only tools
      ─► re-read every step against the rules
      ─► confirm the gaps left with the user
      ─► fill template/deploy-plan-template.html ─► one HTML file
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- MR URL or `!iid`: get the diff with the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code). Then do step 1 below.
- Branch name: `git diff --stat <default>...<branch>`, then `git diff` on the files that matter.
- Spec path or number: read the spec files, then the code they point to.
- Description only: use it as the source. Mark every step you could not confirm in code as `"check": true`.
- `--env <env>`: the target environment (for example `staging`, `production`). If not given, ask. Use AskUserQuestion when the agent has it, otherwise a numbered list.
- Nothing given: use the current branch against the default branch.

## Core rule: the code is the source

Every step, command, value, log line and table name comes from something you read: the code, the migrations, the scripts, the repo's docs, or a read-only tool result. Never from a tool's default, habit, or the generic table in step 3.

Why: a plan that looks right but names the wrong table or the wrong order fails in the middle of a deploy, when there is no time to check. A step you could not trace to a source is marked `"check": true`, not guessed.

## Rules

- **Read the repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, deploy or runbook docs). Their deploy steps, tools and names win over this skill.
- **Plan only.** Never run a migration, set an env var, deploy, or call a write tool. Read-only tools are fine and expected (step 5).
- **Short by default.** Each step is one line. Add `detail` only when the step cannot be done without it: a value, a warning, a side effect. At most 2 short sentences. No filler, no restating `text` or `source`.
- **Steps are actions.** Start each with a verb: "Run", "Set", "Check", "Tell". One action per step.
- **Secrets never appear in plain text.** Name the env var, never its value.
- **One HTML file per plan.**

## 1. Find the MR that deploys to the env

The MR the user gives is often not the one that deploys. A feature MR into `dev00` reaches staging through a `dev00 → staging` MR, and production through a `staging → master` MR.

1. Find which branch deploys to the target env: the repo's guide files, the CI file (`.gitlab-ci.yml`, `Jenkinsfile`) rules, or the deploy docs. Example: in thanos, shared-prod deploys from `master`.
2. If the given MR's target branch does not deploy to the env, find the next MR: source = that target branch, the next branch up the chain. Repeat until you reach the branch that deploys. Plan from that MR, and list the user's MR inside it.
3. Its diff can hold more than the user's change. Plan for all of it, and name the extra changes in `notes`.
4. If that MR is already merged, the "approved and merged" step becomes a check of the target branch's pipeline for the merge commit.

## 2. Get the change

Collect:
- the list of changed files and their diffs
- the MR title, description and linked spec, if any
- the apps or services the change touches (`apps/*`, `services/*`, compose or manifest names)

## 3. Read the code behind each change

Find each item below in the diff. Then read the code it touches, not only the diff lines. The right column says where to look, not what to write.

| Look for | Read before you write a step |
|---|---|
| New or changed DB migrations | The migrate config: tool, schema, migrations table (thanos: `infra.migrations`, not golang-migrate's default `schema_migrations`). Who runs them: the pipeline, a job, or the app at boot. What each down file deletes. |
| New env vars or config keys (`process.env`, `os.Getenv`, config loaders, `.env.example`, catalog files) | The loader: required or optional, the default, what the app logs or does when it is missing. Whether it is a shared/global key or per app. |
| Removed or renamed env vars | Every reader of the old name. The old key is removed only once nothing reads it. |
| Feature switches, flags or toggles | Where the switch lives (a table the release seeds, or an outside flag service), and its default. |
| Deploy manifests, Dockerfiles, Terraform, Helm, CI files | What the pipeline builds and applies, and in which order. |
| New queues, topics, exchanges, buckets, cron or scheduled jobs | The code or infra that creates them. |
| API changes: removed fields, new required fields, new routes | Who calls them, so the deploy order is right (server before client). |
| Dependency or runtime version bumps | The build target arch. |
| Data backfills or one-off scripts | The script, its args, and whether the new code needs it before or after start. |
| Permissions, roles, auth, CORS | Where roles are seeded or granted. |
| Cache keys or cache shape | The key prefix and the TTL. |
| User-facing changes | The changelog or announcement to link. |

Write each command with the exact names you read. When a step says "check the logs", quote the exact log line from the code (`log.Info("...")`), not "check for warnings".

## 4. Build the steps

### Timing: can this be done at this phase?

Ask this of every step. Anything the release adds (a feature switch, a page, an RPC, a route, a table, a column, a log line) does not exist before the deploy. Never check it in Pre-deploy. Check it in Post-deploy, right after the deploy step it depends on.

Pre-deploy holds only what must exist before the new code starts: env vars the new code needs at boot, outside resources it calls, a snapshot, a heads-up.

### Common steps: only when they apply

These are not always added. Add each one only when it applies to this change and can be done as written.
- Pre: the MR is approved and merged (or, if merged, its pipeline on the target branch is green); the people who must know are told (only for a change with downtime, risk, or users who will notice).
- Post: the deployed version matches the release; the health check passes; logs show no new errors for the services touched (quote the log lines to watch).
- **Smoke test: only when the repo has smoke coverage for this change.** Grep `scripts/smoke/features/` and `scripts/smoke/review/` (or the repo's smoke folder) for the spec number, the feature name, the RPC or the page. If a feature or review file covers it, add one step that runs that file. No coverage → no smoke step. Never add a generic full-suite run.

### Rollback

1. If the change has a feature switch, the first rollback step is to turn it off. It is the fastest and loses no data.
2. If the release has migrations, read how the app runs them at start:
   - If the app runs `migrate up` at boot (golang-migrate and others), the old image fails to start when the DB version is ahead of its files ("no migration found for version N").
   - So run the down migrations with the NEW image first, then deploy the old image.
   - For each down file, say what data it deletes (the table, the columns, the seeded rows).
3. Then the image rollback: the previous image tag or the revert MR.
4. Say plainly if a step cannot be undone.

## 5. Resolve "check" items with read-only tools

Before you ask the user, try to answer each `check` item with a read-only tool the agent has. Turn the answer into a concrete step, or drop the step if it is already done.

Examples:
- Thanos MCP `GlobalEnvVarService`: `ListGlobalEnvVarsByName` shows whether a global key exists in the env; `GetGlobalEnvVarUsage` shows which apps it is linked to. "Check the key exists" becomes "Link GLOBAL_X to thanos-grpc" or goes away.
- Thanos MCP `AppEnvVarService`, `FeatureToggleService`: whether an app key or a toggle already exists.
- GitLab MCP: the pipeline status of the merge commit; whether the next MR exists.
- A read-only SQL tool: the current migration version in the migrations table you found in step 3.

Use read-only operations only. Call `GetInputSchema` first when a tool needs it. Keep `check: true` only when no tool can answer.

## 6. Re-read every step

Before you show the plan, go through each step and fix what fails:
1. Source: does it come from code, a migration, a script, a doc or a tool result?
2. Timing: can it be done at this phase? Does it check something the release adds before the deploy?
3. Command: are the names, tables, flags and log lines the exact ones in the code?
4. Rollback: switch first; down migrations with the new image when the app migrates at boot; data loss named.
5. Check items: did you try a read-only tool?
6. Smoke: is there a feature or review file for this change? If not, is the smoke step gone?
7. Common steps: does each one apply and can it be done as written?
8. Length: one line, `detail` only when needed, at most 2 short sentences.

## 7. Confirm gaps

Show the user a short list:
- the MR you planned from (and why, if it is not the one they gave), the env, the services, and the order of deploy
- every step still marked `"check": true`
- every open question tools could not answer

Wait for answers. If the user says go on, keep those steps marked `check`.

## 8. Write the HTML

1. Copy `template/deploy-plan-template.html` to `deploy-plans/<YYYY-MM-DD>-<slug>.html` at the repo root, unless the repo already has a place for deploy docs.
   - The page is dark only. Its styles come from the synced theme block: don't edit between the `theme:` markers.
2. Replace `/*__PLAN_DATA__*/null` with the plan JSON below. Change nothing else in the file.
3. Escape `</` as `<\/` inside JSON strings, so the script tag stays closed.
4. The page has an **Export PDF** button (synced `theme:pdf` blocks). It opens the print dialog; pick "Save as PDF". The PDF shows every step with its current tick.

```json
{
  "id": "mr-123-staging",
  "title": "Release !123 · add deploy status",
  "env": "staging",
  "source": "https://gitlab.example.com/group/repo/-/merge_requests/123",
  "createdAt": "2026-10-08T10:00:00+07:00",
  "services": ["thanos-grpc", "thanos-web"],
  "order": "thanos-grpc, then thanos-web",
  "notes": ["Migration 0042 down drops deploy_status. Take a snapshot first."],
  "phases": [
    {
      "key": "pre",
      "title": "Pre-deploy",
      "steps": [
        {
          "text": "Set DEPLOY_STATUS_TTL on thanos-grpc",
          "detail": "Required at boot; grpc exits without it.",
          "cmd": "thanos env set thanos-grpc staging DEPLOY_STATUS_TTL",
          "tag": "env",
          "risk": "high",
          "source": "apps/thanos-grpc/config.go",
          "check": false
        }
      ]
    },
    { "key": "post", "title": "Post-deploy", "steps": [] },
    { "key": "rollback", "title": "Rollback", "steps": [] }
  ]
}
```

- `id`: stable and unique per plan and env. The page saves ticks in the browser under it, so a reopened page keeps its ticks.
- `notes`: only what changes how you deploy. Keep it short.
- `phases`: `pre` and `post` are required. Add `rollback` when there is a way back.
- Step fields: `text` is required. `detail`, `cmd`, `tag` (`db`, `env`, `infra`, `flag`, `api`, `data`, `comms`, `check`), `risk` (`high` only), `source` and `check` are optional.

## 9. Report

Reply with:
- the MR planned from, the env and the order of deploy
- the number of steps per phase, and the high-risk ones
- the steps still marked `check`
- the full path of the HTML file
