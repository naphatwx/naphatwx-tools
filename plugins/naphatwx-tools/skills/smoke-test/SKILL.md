---
name: smoke-test
description: Check after a deploy that every service in a real flow still reaches the next one, using a no-op probe. Use when the user says "smoke test staging" or "set up a smoke test". Checks service links and env vars, not the UI; for browser tests use e2e-test.
argument-hint: "setup [flow ...] | run <env> [flow ...]"
---

# Smoke Test

A smoke test answers one question after a deploy: **can every service in a real flow still reach the next one, with the right config?**

It does this with a **simulation probe**. One API/RPC call sends a marked message down the real path, through the real clients, transports and credentials. Every service records that it got the message and which env vars it used, passes it on, and skips the real side effect. A runner script in the repo triggers the probe and checks each hop from outside.

```text
setup (once per flow)                         run (after each deploy)
─────────────────────                         ───────────────────────
quick map ─► pick flows                        read scripts/smoke/flows/*.json
   ─► 1 explore agent per flow (parallel)      ─► node scripts/smoke/run.mjs <env>
   ─► design + confirm                         ─► 1 HTML report
   ─► build the probe in each service          ─► sum it up in chat
   ─► write scripts/smoke/ (runner, flows)
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

- `setup [flow ...]`: build the probe for these flows, or ask which flows.
- `run <env> [flow ...]`: run the probe on `<env>` for all flows, or only for the named ones.
- No mode given: if `scripts/smoke/flows/` exists in the repo, use `run` and ask for the env. Otherwise use `setup`.

## Rules

- **Read the target repo's guide files first** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, per-app guides). Their naming, permission, routing and "who edits what" rules win over this skill. If the repo routes app edits to specialist agents, send the code changes to them.
- **No real work on the smoke path**: no business writes, no notifications, no real builds, no git writes (`references/probe-contract.md` → Safety rules).
- **Secrets never appear in plain text**, not in code, flow files, reports or chat. Only env var names and `sha256:<8 hex>` are shown.
- **One HTML report per run.** Never hand over raw logs instead of it.
- Never run `run` against a production environment unless the user named it for this run.

---

## Setup mode

### S1. Quick map (main agent, cheap)

Without deep reading, list:

- **Services**: compose files, `apps/*`, `services/*`, k8s or Terraform service names, each with its stack.
- **Links**: queue names, HTTP/gRPC clients, CI triggers, webhook or callback routes, outside API clients. Grep for client constructors and the queue/exchange/route constants.
- **Candidate flows**: chains of 3 or more services that a real user action starts, for example "create deployment ticket: web → grpc → mq → worker → CI → git host → grpc callback".

Show the services and the candidate flows. Ask which flows to cover. Use a multi-select question when the agent has one (AskUserQuestion in Claude Code), otherwise a numbered list. If `setup` named flows, skip the question.

If `scripts/smoke/flows/<flow>.json` already exists, read its `mapVersion`. Re-explore that flow only if `git diff --name-only <commit> HEAD -- <paths>` lists a change. Otherwise reuse the saved map.

### S2. Explore: one sub-agent per flow, in parallel

Spawn one read-only agent per flow that needs exploring, **all in one message**, with the prompt in `references/explore-agent.md`. Each one returns a hop table: the transport, the send and receive code, the wire names, the env vars used, where the data lands, how to see the hop from outside, the branch point, and auth.

Agents with no sub-agents trace the flows one after another with the same checklist.

### S3. Design and confirm

Merge the tables, as `references/explore-agent.md` → Merging describes. Then show the user:

1. One diagram per flow: the hops, with the real transport on each arrow. Use ASCII in chat.
2. The probe design, following `references/probe-contract.md`:
   - the entry RPC/route
   - the shared store
   - the marker on each transport
   - the branch point in each service
   - the choice for outside systems (no-op CI job, read-only call)
3. Files to change per service, plus one-time manual steps (for example "create the no-op CI job", "issue a smoke token").
4. Every gap the agents reported, as a question.

**Wait for the user's confirmation before writing code.**

### S4. Build

1. **Probe code** in each service, following `references/probe-contract.md`. Use the repo's own patterns:
   - Handlers: put the new endpoints next to the existing ones.
   - Messages: put the marker in the existing message header or metadata slot.
   - Store: use what the entry service already has.
   - Permissions: follow the repo's permission rules.
2. **Runner** in `scripts/smoke/` (layout in `references/flow-map.md`):
   - Copy `template/run.mjs` and `template/report-template.html` unchanged.
   - The report is dark only. Its styles come from the synced theme block: don't edit between the `theme:` markers; change `theme/` in this plugin repo and run `node theme/sync.mjs`.
   - The page has an **Export PDF** button: it opens the print dialog; pick "Save as PDF". Keep the `theme:pdf` and `theme:pdf-js` blocks and the `addExportPdf(...)` call.
   - Write `envs.json`, using the base URLs the repo's config files show for each env. Ask for any you cannot find.
   - Write one `flows/<flow>.json` per flow, filled from the hop table, with `mapVersion`.
   - Add `scripts/smoke/results/` to `.gitignore`.
3. **How to run**: add a short section to the repo's README or contributor guide. It names the command, the env vars the runner needs (`SMOKE_TOKEN` and others, names only) and the one-time manual steps.
4. Run the repo's normal build and lint for each changed service, the same way its guide says to run them.

### S5. Prove it once

If a local or dev environment is up, run `node scripts/smoke/run.mjs <env>`.

A failure here is usually a wrong flow map or a missing marker. Fix it, then run again.

Report:
- the files changed per service
- the manual steps still open
- the report path

---

## Run mode

### R1. Preconditions

- `scripts/smoke/run.mjs`, `report-template.html`, `envs.json` and `flows/*.json` exist. If not, say "run `smoke-test setup` first" and stop.
- `<env>` is a key in `envs.json`. If not, list the known envs and ask.
- The auth env vars named in the flow files are set. Check the names only, never print values. If any are missing, list them and stop.
- **Deployed?** If the services expose a version or health endpoint, read it and say which version is under test.

### R2. Run

```bash
node scripts/smoke/run.mjs <env> [flow ...] --out scripts/smoke/results
```

All flows run in parallel. In each flow the hops are checked in order, and each hop is polled until its own timeout. A hop that is never observed is `timed-out`. After the first failed or timed-out hop, the rest of that flow are `not-reached`, never red.

### R3. Read the report and sum it up

Open the HTML file named on the last line of the output (`report: <path>`). It has the same layout as the e2e-test report: failed / passed counts and an All / Failed / Passed filter in the header, then one closed row per flow, failed flows first. Only one flow is open at a time: expanding one collapses the others. An opened failed flow shows its verdict and a copyable rerun command. For each failed flow, find the first failed hop and give a likely cause from its detail:

| Detail | Likely cause |
|---|---|
| `NAME = used (expected want)` | Env var mismatch: the service runs with a different value than the flow map expects (a wrong queue name, URL or key). The detail already names the var and both values (secrets as `sha256:`). |
| `not observed within N ms · K polls, last HTTP S` (timed out) | The message never arrived: wrong exchange, queue or route, consumer down, or a crash before the hop recorded. The hop shows the polled URL and its last answer: 404 on the store means the probe id is unknown there (wrong store, expired, or another replica). |
| `HTTP 401/403` | A wrong or expired credential on that link. |
| `HTTP 404` on the trigger | The probe endpoint is not deployed in this version. This is a blocker, not a failed smoke. |
| Hop missing from the store but found on the service | The report-to-store call is failing. The link itself works. |

Reply with:
- the overall status
- one line per flow, with the hop chain
- every failed hop, with its likely cause
- the full path of the HTML report

---

## Worked example (Thanos)

Flow `deploy-ticket`:
- thanos-web → thanos-grpc: HTTP
- thanos-grpc → RabbitMQ: `infra.<object>.<verb>.exchange`
- RabbitMQ → thanos-worker: the consumer
- thanos-worker → Jenkins: a no-op job with `SMOKE_PROBE_ID`
- Jenkins → GitLab: a read-only project `GET`
- Jenkins → thanos-grpc: the callback

The probe:
- Entry and shared store: `smoke/probes` on thanos-grpc.
- grpc and the worker report their hops and their `RABBITMQ_*` / `JENKINS_*` env vars to the store.
- The runner also checks the queue's consumer count through the RabbitMQ management API, and the Jenkins build through the Jenkins API.
