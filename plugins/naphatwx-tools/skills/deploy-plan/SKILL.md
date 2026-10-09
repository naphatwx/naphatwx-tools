---
name: deploy-plan
description: Build a deployment plan as a clickable HTML checklist, split into Pre-deploy and Post-deploy steps, from a GitLab MR, a branch, a spec or a described release. Use when the user says "deployment plan for this MR" or "what do I need to do before and after deploy". Plans only; it never deploys or changes anything. Post-deploy service checks are smoke-test.
argument-hint: "<MR url | !iid | branch | spec path | description> [--env <env>]"
---

# Deploy Plan

Read what is being released, find every step it needs around the deploy, and write one HTML checklist.

```text
input ─► get the change (MR diff, branch diff, spec)
      ─► scan for deploy-relevant changes
      ─► build Pre-deploy and Post-deploy steps
      ─► confirm gaps with the user
      ─► fill template/deploy-plan-template.html ─► one HTML file
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- MR URL or `!iid`: get the diff with the `get-mr-diffs` skill (`naphatwx-tools:get-mr-diffs` in Claude Code).
- Branch name: `git diff --stat <default>...<branch>`, then `git diff` on the files that matter.
- Spec path or number: read the spec files, then the code they point to.
- Description only: use it as the source. Mark every step you could not confirm in code as `"check": true`.
- `--env <env>`: the target environment (for example `staging`, `production`). If not given, ask. Use AskUserQuestion when the agent has it, otherwise a numbered list.
- Nothing given: use the current branch against the default branch.

## Rules

- **Read the repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, deploy or runbook docs). Their deploy steps, tools and names win over this skill.
- **Plan only.** Never run a migration, set an env var, deploy, or call a write tool.
- **Every step comes from the change.** Each step names its source (file, MR, spec line). No generic "check everything" filler.
- **Secrets never appear in plain text.** Name the env var, never its value.
- **Steps are actions.** Start each with a verb: "Run", "Set", "Check", "Tell". One action per step.
- **One HTML file per plan.**

## 1. Get the change

Collect:
- the list of changed files and their diffs
- the MR title, description and linked spec, if any
- the apps or services the change touches (`apps/*`, `services/*`, compose or manifest names)

## 2. Scan for deploy-relevant changes

Look for each item below. Note the file for each hit.

| Look for | Usually means |
|---|---|
| New or changed DB migrations | Pre: back up or snapshot, check the migration is backward compatible, run it (or confirm the pipeline runs it). Post: check the schema and the row counts. |
| New env vars or config keys (`process.env`, `os.Getenv`, config loaders, `.env.example`, catalog files) | Pre: set each key in every target env. Post: check the service started with them. |
| Removed or renamed env vars | Post: remove the old key once the new version is live. |
| Feature flags or toggles | Pre: create the flag, default off. Post: turn it on, then watch. |
| Deploy manifests, Dockerfiles, Terraform, Helm, CI files | Pre: review the plan or the image build. Post: check the new resources exist. |
| New queues, topics, exchanges, buckets, cron or scheduled jobs | Pre: create them, or confirm infra code creates them. Post: check consumers and the first run. |
| API changes: removed fields, new required fields, new routes | Pre: check the order of deploy across services (server before client). Post: call the new route. |
| Dependency or runtime version bumps | Pre: check the build passes for the target arch. Post: watch error rates. |
| Data backfills or one-off scripts | Pre or Post, by what the code needs: run the script, then check the result. |
| Permissions, roles, auth, CORS | Pre: grant the role. Post: test with a real user of that role. |
| Cache keys or cache shape | Post: clear or warm the cache. |
| User-facing changes | Post: tell support or users; link the changelog or announcement. |

Always add these when they apply:
- Pre: the MR is approved and merged; the pipeline is green; the people who must know are told (deploy window, on-call).
- Post: the deployed version matches the release; the health check passes; logs and error rates are normal for some minutes; the smoke test passes (if the repo has `scripts/smoke/`, give the `smoke-test run <env>` command).
- Rollback: how to go back (previous image tag, revert MR, down migration). Say plainly if a step cannot be undone, for example a destructive migration.

## 3. Confirm gaps

Show the user a short list:
- the env, the services, and the order of deploy
- every step marked `"check": true` (could not confirm in code)
- every open question (for example "Does the pipeline run migrations, or is it manual?")

Wait for answers. If the user says go on, keep those steps marked `check`.

## 4. Write the HTML

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
  "notes": ["Migration 0042 is not reversible. Take a snapshot first."],
  "phases": [
    {
      "key": "pre",
      "title": "Pre-deploy",
      "steps": [
        {
          "text": "Set DEPLOY_STATUS_TTL on thanos-grpc",
          "detail": "New key read in apps/thanos-grpc/config.go. Default is 300.",
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
- `phases`: `pre` and `post` are required. Add `rollback` when there is a way back.
- Step fields: `text` is required. `detail`, `cmd`, `tag` (`db`, `env`, `infra`, `flag`, `api`, `data`, `comms`, `check`), `risk` (`high` only), `source` and `check` are optional.

## 5. Report

Reply with:
- the env and the order of deploy
- the number of steps per phase, and the high-risk ones
- the steps still marked `check`
- the full path of the HTML file
