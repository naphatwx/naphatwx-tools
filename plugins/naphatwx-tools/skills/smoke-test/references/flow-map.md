# Flow map and env files

The runner (`template/run.mjs`) reads two kinds of file in the target repo's `scripts/smoke/` folder:

- `flows/<flow>.json`: one file per flow, which says how to trigger it and how to check each hop
- `envs.json`: the base URLs for each environment

Setup writes both. Run mode only reads them, and it never explores the code again.

## `scripts/smoke/` layout in the target repo

```text
scripts/smoke/
├── run.mjs                 # copied from template/run.mjs
├── report-template.html    # copied from template/report-template.html
├── envs.json               # base URLs per env
├── flows/
│   ├── <flow-a>.json
│   └── <flow-b>.json
└── results/                # reports land here — add to .gitignore
```

## `envs.json`

```json
{
  "local": {
    "services": {
      "thanos-grpc": "http://localhost:3003/",
      "rabbitmq-mgmt": "http://localhost:15672/",
      "jenkins": "http://localhost:8080/"
    },
    "hopTimeoutMs": 30000,
    "requestTimeoutMs": 10000
  },
  "dev": { "services": { "thanos-grpc": "https://grpc.dev.example.com/" } }
}
```

- Every base URL ends with `/`, and paths in flow files never start with `/`.
- Never put tokens here. Auth always names an env var (see `auth` below).
- One key per service the runner calls. That includes infra APIs such as the RabbitMQ management API, Jenkins and GitLab.

## `flows/<flow>.json`

```json
{
  "flow": "announcement-publish",
  "description": "grpc publishes an announcement event, the worker consumes it and sends web push",
  "mapVersion": { "commit": "5d6b8d6", "paths": ["apps/thanos-grpc/internal/service/announcement", "apps/thanos-worker/src/consumers/announcement"] },
  "entry": {
    "service": "thanos-grpc",
    "method": "POST",
    "path": "api/infra/v1/smoke/probes",
    "body": {},
    "probeIdField": "probeId",
    "auth": { "type": "bearer", "env": "SMOKE_TOKEN" }
  },
  "store": {
    "service": "thanos-grpc",
    "path": "api/infra/v1/smoke/probes/{probeId}",
    "auth": { "type": "bearer", "env": "SMOKE_TOKEN" }
  },
  "hops": [
    {
      "id": "grpc-publish",
      "from": "runner",
      "service": "thanos-grpc",
      "transport": "amqp",
      "observe": { "type": "store" },
      "envVars": [
        { "name": "RABBITMQ_EXCHANGE_ANNOUNCEMENT_PUBLISH", "expected": "infra.announcement.publish.exchange" }
      ]
    },
    {
      "id": "rabbitmq-queue",
      "from": "rabbitmq",
      "service": "rabbitmq",
      "transport": "amqp",
      "observe": {
        "type": "http",
        "service": "rabbitmq-mgmt",
        "path": "api/queues/%2F/infra.announcement.publish.queue",
        "auth": { "type": "basic", "env": "SMOKE_RABBITMQ_BASIC" },
        "expectStatus": [200],
        "expectField": { "path": "consumers" }
      }
    },
    {
      "id": "worker-consume",
      "from": "rabbitmq",
      "service": "thanos-worker",
      "transport": "amqp",
      "observe": { "type": "store" },
      "timeoutMs": 20000,
      "envVars": [
        { "name": "RABBITMQ_ANNOUNCEMENT_PUBLISH_QUEUE", "expected": { "default": "infra.announcement.publish.queue" } },
        { "name": "VAPID_PRIVATE_KEY", "secret": true }
      ]
    }
  ]
}
```

### Fields

| Field | Meaning |
|---|---|
| `flow` | Stable id. Also the file name. |
| `mapVersion` | Commit and paths the explore agent read. Setup re-explores this flow only when one of `paths` changed since `commit`. |
| `entry` | The simulation call. The runner adds `flow` to the body and reads the probe id from `probeIdField`. |
| `store` | The shared probe store on the entry service. Every service reports its hop there (see `probe-contract.md`). |
| `hops[]` | Checked in this order. After the first failed hop, the rest are `not-reached`. |
| `hops[].id` | Must equal the `hop` value the service writes into the store. |
| `hops[].observe.type` | `store`: look for this hop in the shared store. `service`: ask the service's own `smoke/probes/{probeId}` (use it as the fallback when a hop is missing from the store). `http`: call any API (infra APIs: queue, CI, git host). |
| `observe.expectField` | `{ "path": "a.b" }` must exist, or `{ "path": "a.b", "equals": "{probeId}" }` must match. `{probeId}`, `{flow}` and `{env}` are filled in. |
| `observe.pollUntilMatch` | `true`: keep polling until it matches or the hop times out (for example, a CI build that appears late). |
| `observe.retryOn` | HTTP statuses that mean "not there yet". Keep polling on them. |
| `envVars[]` | What the service must report it used. `expected` is a string, or `{ "<env>": "...", "default": "..." }`. `secret: true` compares only `sha256:<8 hex>`, against `expectedFrom` (an env var on the runner's machine) when given, otherwise only "set". |
| `timeoutMs`, `pollMs` | Per hop. Defaults come from `envs.json`, then 30000 / 1000. |

### `auth`

| `type` | Header |
|---|---|
| `bearer` | `Authorization: Bearer $<env>` |
| `basic` | `Authorization: Basic base64($<env>)`, where `$<env>` holds `user:password` |
| `header` | `<header>: $<env>` |

The runner masks every auth value in the report.

## Report data (per hop)

The runner embeds one JSON object in the report. Per hop, besides `id`, `service`, `from`, `transport`, `status` and `ms`:

| Field | When | Meaning |
|---|---|---|
| `detail` | always | One line. On an env mismatch it is `NAME = used (expected want)` per failed var, never the service's own success note. |
| `envMismatch` | env check failed | The failed env var names, used by the flow verdict. |
| `env[]` | `envVars` set | `{ name, ok, value, note }` per expected env var, values masked. |
| `polling` | `timed-out` | `{ polls, method, lastUrl, lastStatus, sameStatus, lastReason, waitedMs }`: what the runner polled before giving up. |
| `evidence` | a request was made | `{ url, status, ms, body, truncated }`. For `store`/`service` hops also `entry` (this hop's object from `hopsField`, untruncated) and `entryPath` (e.g. `hops[1]`); the report shows the entry and puts the full body behind "Show full response". |
