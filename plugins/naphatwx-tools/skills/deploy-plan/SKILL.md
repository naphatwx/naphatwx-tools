---
name: deploy-plan
description: Build a production deployment plan as a clickable HTML checklist (merge into the default branch, cut a version, deploy it to production, then Post-deploy and Rollback steps) from a GitLab MR, a branch, a spec or a described release. Use when the user says "deployment plan for this MR" or "what do I need to do before and after deploy". Plans only; it never deploys or changes anything. Post-deploy service checks are smoke-test.
argument-hint: "<MR url | !iid | branch | spec path | description>"
---

# Deploy Plan

Read what is being released, find every step it needs around the deploy, and write one HTML checklist.

A deploy plan always means: merge the change into the default branch (`master` or `main`), cut a version, then deploy that version to production. Never ask which branch, env, promotion path or scope.

```text
input ─► get the change (MR diff, branch diff, spec)
      ─► read the code behind each deploy-relevant change
      ─► find the default branch and the next version
      ─► build Pre-deploy, Deploy, Post-deploy and Rollback steps
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

- MR URL or `!iid`: get the diff with the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code). The MR's own target branch does not change the plan.
- Branch name: `git diff --stat <default>...<branch>`, then `git diff` on the files that matter.
- Spec path or number: read the spec files, then the code they point to.
- Description only: use it as the source. Mark every step you could not confirm in code as `"check": true`.
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
- **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

## 1. Scope and target

- Scope: the MR, branch or spec the user gives. Plan for that change only.
- Target: the default branch (read it from `git symbolic-ref refs/remotes/origin/HEAD` or the GitLab project), then production.
- Next version: read the repo's release mechanism: version tags (`git tag --sort=-v:refname`), a release script, a CI release job, a changelog. Name the version it will cut. If none is found, write the step with `<next>` and mark it `"check": true`.
- Other changes: if the default branch will receive more than the user's change (for example, the MR targets `dev00` and `dev00` holds other merges not yet in the default branch), add one `notes` line: the count of other MRs or commits, and the risky ones (migrations, new env vars). No steps for them, no question.

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

### Fixed steps

- Pre-deploy always starts with these two steps, in this order:
  1. "Merge into `<default branch>` and check its pipeline is green". Name only the default branch, never the path through `dev00` or `staging`: how the change gets there is the team's process, not a plan step. Already merged → keep only the pipeline check. No pipeline in the repo → drop the check.
  2. "Cut version `<next>`", with the command or job you found in step 1 in `cmd`.
- Deploy phase: "Deploy `<version>` to production", one step per service in dependency order (server before client, workers after the schema they read).

### Common steps: only when they apply

These are not always added. Add each one only when it applies to this change and can be done as written.
- Pre: the people who must know are told (only for a change with downtime, risk, or users who will notice).
- Post: the deployed version matches the release; the health check passes; logs show no new errors for the services touched (quote the log lines to watch).
- **Smoke test: only when the repo has smoke coverage for this change.** Grep `scripts/smoke/features/` and `scripts/smoke/review/` (or the repo's smoke folder) for the spec number, the feature name, the RPC or the page. If a feature or review file covers it, add one step that runs that file. No coverage → no smoke step. Never add a generic full-suite run.

### Rollback

1. If the change has a feature switch, the first rollback step is to turn it off. It is the fastest and loses no data.
2. If the release has migrations, read how the app runs them at start:
   - If the app runs `migrate up` at boot (golang-migrate and others), the old image fails to start when the DB version is ahead of its files ("no migration found for version N").
   - So run the down migrations with the NEW image first, then deploy the old image.
   - For each down file, say what data it deletes (the table, the columns, the seeded rows).
3. Then redeploy the previous version tag to production. No earlier version tag → revert the merge commit instead.
4. Say plainly if a step cannot be undone.

## 5. Resolve "check" items with read-only tools

Before you ask the user, try to answer each `check` item with a read-only tool the agent has. Turn the answer into a concrete step, or drop the step if it is already done.

Examples:
- Thanos MCP `GlobalEnvVarService`: `ListGlobalEnvVarsByName` shows whether a global key exists in the env; `GetGlobalEnvVarUsage` shows which apps it is linked to. "Check the key exists" becomes "Link GLOBAL_X to thanos-grpc" or goes away.
- Thanos MCP `AppEnvVarService`, `FeatureToggleService`: whether an app key or a toggle already exists.
- GitLab MCP: the default branch; the latest version tag; the pipeline status of the merge commit.
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
7. Fixed and common steps: does Pre-deploy start with merge and cut version? Does each common step apply and can it be done as written?
8. Length: one line, `detail` only when needed, at most 2 short sentences.

## 7. Confirm gaps

Ask only about steps still marked `"check": true` that no read-only tool could answer. Never ask about branches, env, promotion path or scope. If no such step is left, skip this step.

Wait for answers. If the user says go on, keep those steps marked `check`.

## 8. Write the HTML

1. Copy `template/deploy-plan-template.html` to `deploy-plans/<YYYY-MM-DD>-<slug>.html` at the repo root, unless the repo already has a place for deploy docs.
   - The page is dark only. Its styles come from the synced theme block: don't edit between the `theme:` markers.
2. Replace `/*__PLAN_DATA__*/null` with the plan JSON below. Change nothing else in the file.
3. Escape `</` as `<\/` inside JSON strings, so the script tag stays closed.
4. The page has an **Export PDF** button (synced `theme:pdf` blocks). It opens the print dialog; pick "Save as PDF". The PDF shows every step with its current tick. Keep the text size picker too: the `theme:font-size` and `theme:font-size-js` blocks and the `addFontSize(...)` call.

```json
{
  "id": "mr-123-production",
  "title": "Release !123 · add deploy status",
  "env": "production",
  "source": "https://gitlab.example.com/group/repo/-/merge_requests/123",
  "createdAt": "2026-10-08T10:00:00+07:00",
  "services": ["thanos-grpc", "thanos-web"],
  "order": "thanos-grpc, then thanos-web",
  "notes": ["Migration 0042 down drops deploy_status. Take a snapshot first.", "master also gets 4 other MRs from dev00, incl. migration 0041 and new env var FOO_URL."],
  "phases": [
    {
      "key": "pre",
      "title": "Pre-deploy",
      "steps": [
        { "text": "Merge into master and check its pipeline is green" },
        { "text": "Cut version v1.86.0", "cmd": "scripts/release/cut.sh 1.86.0", "source": "scripts/release/README.md" },
        {
          "text": "Set DEPLOY_STATUS_TTL on thanos-grpc",
          "detail": "Required at boot; grpc exits without it.",
          "cmd": "thanos env set thanos-grpc production DEPLOY_STATUS_TTL",
          "tag": "env",
          "risk": "high",
          "source": "apps/thanos-grpc/config.go",
          "check": false
        }
      ]
    },
    { "key": "deploy", "title": "Deploy", "steps": [{ "text": "Deploy v1.86.0 of thanos-grpc to production" }, { "text": "Deploy v1.86.0 of thanos-web to production" }] },
    { "key": "post", "title": "Post-deploy", "steps": [] },
    { "key": "rollback", "title": "Rollback", "steps": [] }
  ]
}
```

- `id`: stable and unique per plan. The page saves ticks in the browser under it, so a reopened page keeps its ticks.
- `notes`: only what changes how you deploy. Keep it short.
- `phases`: `pre`, `deploy` and `post` are required. Add `rollback` when there is a way back.
- Step fields: `text` is required. `detail`, `cmd`, `tag` (`db`, `env`, `infra`, `flag`, `api`, `data`, `comms`, `check`), `risk` (`high` only), `source` and `check` are optional.

## 9. Report

Reply with:
- the default branch, the version to cut and the order of deploy
- the number of steps per phase, and the high-risk ones
- the steps still marked `check`
- the full path of the HTML file
