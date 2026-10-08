# Explore agent prompt (one agent per flow)

Spawn one read-only agent per picked flow, all in **one message** so they run in parallel. Use an explore or general-purpose agent type, and give each one the prompt below with the `<...>` parts filled in.

```text
READ ONLY — do not edit any file.

Trace one flow through the repo at <repo-root> and return a hop table.

Flow: <flow-id> — <one-line description>
Starts at: <entry service + operation, from the quick map>
Services in the repo: <list from the quick map>
Guide files to read first: <the repo's CLAUDE.md / AGENTS.md / CONTRIBUTING.md paths>

For every hop from the entry to the end of the flow, find in the code:
1. from → to service, and the transport (HTTP, gRPC, queue, CI trigger, webhook, outside API)
2. the exact code that sends and the exact code that receives (file:line)
3. names on the wire: route or RPC, exchange / queue / routing key, CI job name, callback route
4. every env var or config key this hop reads (name, which service reads it, file:line, secret or not),
   and its value per environment when a checked-in config file states one
5. where the hop's result lands (table, cache key, outside system), and the real side effect to skip in smoke mode
6. how a script could see that the hop happened from outside: an existing read API, the queue
   management API, the CI build API, the git host API
7. the latest point to branch for smoke mode: the line right before the real side effect
8. auth on each link (which token or credential, from which env var)

Also report:
- the commit (`git rev-parse --short HEAD`) and the folder paths you read for this flow
- anything you could not trace (dynamic names, config from a secret store), stated as a gap

Return only this, no prose:

## Flow <flow-id>
commit: <sha>   paths: <folders>

| # | hop id | from → to | transport | send (file:line) | receive (file:line) | wire names | env vars (name: value/secret) | lands in | observe from outside | smoke branch point | auth |
|---|--------|-----------|-----------|------------------|---------------------|------------|-------------------------------|----------|----------------------|--------------------|------|

Gaps:
- ...
```

## Merging the results (main agent)

- Hop ids: short `<service>-<verb>` (`grpc-publish`, `worker-consume`, `ci-build`). They must be unique within a flow.
- Two flows that share a hop: keep one implementation in the service, recorded under each flow's own hop id.
- Every gap becomes a question for the user, or a hop marked `observe: http` on an infra API.
- Fill each `flows/<flow>.json` straight from the table: `envVars` from the env var column, `observe` from the "observe from outside" column, `mapVersion` from the commit and paths.
