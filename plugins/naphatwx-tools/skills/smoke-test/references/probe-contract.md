# Probe contract

This is what setup builds in the target repo. Every service in a flow follows the same rules, so one runner can check any flow.

## Shape

```text
runner ──POST smoke/probes {flow}──► entry service ──real transport──► service B ──► service C ...
   │                                     │                               │              │
   │                                     └── report hop ─────────────────┴──────────────┴──► shared store (entry service)
   │                                                                          (each service also keeps its own copy)
   └── polls: shared store per hop ─► fallback: service's own smoke/probes/{id} ─► infra APIs (queue, CI, git host)
```

## 1. Entry: the simulation call

- `POST smoke/probes` on the entry service, with body `{ "flow": "<flow>" }`. It answers `{ "probeId": "<uuid>" }`.
- It creates the probe record in the shared store with a TTL (default 1 hour), then starts the flow's **first real step** through the **real client** (the real publisher, HTTP client or CI client), carrying `probeId` and `smoke: true`.
- An unknown `flow` → 400. Follow the project's existing auth: reuse the strongest existing admin or system permission, and add a new permission only if the project's rules ask for one per verb.

## 2. Every hop: pass it on, do no real work

Each service on the path does the following:

1. Recognises the smoke marker (`smoke: true` in the message, header `X-Smoke-Probe: <probeId>`, or a CI parameter `SMOKE_PROBE_ID`). Use the transport's normal metadata slot: message headers, HTTP headers or job parameters.
2. Records its hop: `{ hop, service, instance, at, ok, error?, env }`.
   - `hop` = the flow map's `hops[].id`.
   - `instance` = the host, pod or task id, so replica problems show up.
   - `env` = the env var **names** this hop really used, mapped to the values it read. A secret is sent as `sha256:` + the first 8 hex characters of its SHA-256, never the value.
3. Reports the hop to the **shared store**: `POST smoke/probes/{probeId}/hops` on the entry service, through the service's normal client to it. A report failure is logged and never breaks the hop.
4. Keeps its own copy in memory or in its cache with the same TTL, served at `GET smoke/probes/{probeId}`. This is the fallback when the shared store has no hop. It can answer 404 on another replica, which is fine.
5. Forwards to the next service through the **same code path** a real message takes (same exchange, queue, client, URL and credentials), with the marker attached.
6. Skips the real side effect: no DB write except the probe record, no email or push, no real build, no git write. Put the branch as late as possible, right before the side effect, so the hop proves everything up to it.

## 3. Outside systems (CI, git host, cloud APIs)

What exploring found decides the choice. Ask the user when it is unclear.

| Situation | Do |
|---|---|
| The flow triggers a CI job | A no-op job (or the real job with `SMOKE_PROBE_ID`, which exits right after its first step) that does one read-only call to the git host and calls the flow's real callback with the probe id. |
| The flow only reads from a system | Do the same read with the real credentials, and report the hop. |
| The flow writes to a system | A read-only call with the same credentials and base URL (for example, `GET` the project). This proves the URL and auth, not the write. Say so in the hop's `note`. |

## 4. The shared store

- It lives on the entry service. `GET smoke/probes/{probeId}` → `{ probeId, flow, createdAt, hops: [...] }`, and `POST smoke/probes/{probeId}/hops` appends one entry.
- Use the service's existing store: a DB table with an `expires_at` column cleaned by an existing job, or the cache, or memory **only when** the entry service runs a single replica.
- A probe id that is unknown or expired → 404.

## 5. Safety rules

- The smoke path never writes business data and never notifies a person.
- The probe and its hops expire (TTL), so there is nothing to clean up by hand.
- Logs mark smoke traffic (`smoke=true probeId=<id>`), so it can be filtered out of metrics.
- Secrets never leave a service in plain text: only names and `sha256:<8 hex>` are reported.

## 6. Names

- Generic names (`SmokeProbe`, `smoke/probes`), never a vendor name.
- Follow the project's own naming rules for routes, RPCs, queues, permissions and env vars. Read its guide files before writing any of them.
