# smoke-test

Checks after a deploy that every service in a real flow still reaches the next one, with the right env vars, using a no-op probe.

## When to use it

- You deployed and want to know each service still talks to the next one: HTTP, gRPC, queue, CI, callbacks.
- You want to catch a wrong queue name, URL or credential before a user does.
- You want a probe and runner set up once in the repo, then rerun after every deploy.
- Say: "smoke test staging", "set up a smoke test", "smoke-test run dev deploy-ticket".

| You want | Use instead |
|----------|-------------|
| Browser tests of the UI, with screenshots | `e2e-test` |
| A test case file an AI runs later | `generate-test-cases` |
| The steps to do before and after a deploy | `deploy-plan` |
| A feature's scenarios played by hand on the running app | `play-scenarios` |
| Why a Jenkins build failed | `check-job` |

## How it works

Two modes. `setup` builds the probe once per flow. `run` checks it after each deploy. With no mode, the agent picks `run` when `scripts/smoke/flows/` exists, else `setup`.

```mermaid
graph TD
    subgraph SETUP["setup, once per flow"]
        S1[read the repo's guide files] --> S2[quick map: services, links, candidate flows]
        S2 --> S3[the user picks flows]
        S3 --> S4{flow file exists and mapVersion paths unchanged?}
        S4 -->|yes| S6
        S4 -->|no| S5[one read-only explore agent per flow, in parallel: hop table]
        S5 --> S6[merge tables, show diagrams, probe design, files to change, gaps]
        S6 --> S7{the user confirms?}
        S7 -->|no| S6
        S7 -->|yes| S8[build the probe in each service]
        S8 --> S9["write scripts/smoke/: run.mjs, report, envs.json, flows/*.json"]
        S9 --> S10[repo build and lint, then one run if an env is up]
    end
    subgraph RUN["run, after each deploy"]
        R1[check files, env name, auth env var names] --> R2[read the deployed version if exposed]
        R2 --> R3["node scripts/smoke/run.mjs #lt;env#gt;"]
        R3 --> R4[open the HTML report]
        R4 --> R5[sum up in chat: status, hop chain, likely cause per failed hop]
    end
    SETUP --> RUN
```

What the probe does on one run:

```mermaid
sequenceDiagram
    participant R as run.mjs
    participant E as Entry service + shared store
    participant B as Service B
    participant C as Service C or outside system
    participant I as Infra API (queue, CI, git host)
    R->>E: POST smoke/probes {flow}
    E-->>R: {probeId}
    E->>B: real transport, marker attached (smoke: true, X-Smoke-Probe)
    B->>E: POST smoke/probes/{probeId}/hops (hop, instance, env names + values)
    B->>C: real transport, real side effect skipped
    C->>E: report hop
    loop each hop in order, until its timeout
        R->>E: GET smoke/probes/{probeId}
        opt hop missing from the store
            R->>B: GET the service's own smoke/probes/{probeId}
        end
        opt hop observed on an infra API
            R->>I: GET queue, build or project
        end
    end
    R->>R: compare env vars with the flow file, write one HTML report
```

How one flow's hops get their status:

```mermaid
graph LR
    T[trigger] -->|no probeId| TF[flow fails, every hop not-reached]
    T -->|probeId| H[next hop]
    H -->|observed, env vars match| P[pass]
    H -->|observed, error or env mismatch| F[fail]
    H -->|never observed before timeout| TO[timed-out]
    P --> H
    F --> NR[rest of the flow: not-reached]
    TO --> NR
```

Rules the diagrams don't show:

- No real work on the smoke path: no business writes, no notifications, no real builds, no git writes.
- Secrets never appear in plain text. Only env var names and `sha256:<8 hex>` are shown.
- One HTML report per run, never raw logs instead.
- Never runs against production unless the user named it for this run.
- The repo's guide files win on naming, permissions and who edits what.

## Input → output

Input: `setup [flow ...] | run <env> [flow ...]`

- `setup`: build the probe for the named flows, or ask which ones.
- `run <env>`: `<env>` is a key in `scripts/smoke/envs.json`. Flows left out means all.

Output of `setup`, in the target repo:

```
<repo>/
├── <each service in the flow>    probe code: smoke/probes endpoints, marker, hop report
├── README or contributor guide   a short "how to run the smoke test" section
├── .gitignore                    adds scripts/smoke/results/
└── scripts/smoke/
    ├── README.md                 how to run it, for teammates
    ├── run.mjs                   the runner, copied unchanged
    ├── report-template.html      the report page, copied unchanged
    ├── envs.json                 base URLs per env, no tokens
    └── flows/
        └── <flow>.json           trigger, store and hops for one flow
```

Output of `run`:

```
scripts/smoke/results/
└── smoke-report-<env>-<YYYYMMDD-HHMMSS>.html
```

Plus a chat summary: overall status, one line per flow, every failed hop with its likely cause, the report path.

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |
| [references/explore-agent.md](references/explore-agent.md) | Prompt for the per-flow explore agent, and how to merge the hop tables |
| [references/probe-contract.md](references/probe-contract.md) | What each service builds: entry call, hop report, shared store, safety rules |
| [references/flow-map.md](references/flow-map.md) | `scripts/smoke/` layout, `envs.json` and `flows/<flow>.json` fields, report data |
| [template/run.mjs](template/run.mjs) | The runner: triggers each flow, polls each hop, writes the report. Node 18+, no dependencies |
| [template/report-template.html](template/report-template.html) | The report page; the runner fills in the data |
| [template/README.md](template/README.md) | Ships as `scripts/smoke/README.md` |

## Related skills

- `deploy-plan`: lists the post-deploy steps; a smoke run is one of them.
- `e2e-test`: checks the UI in a browser; its report has the same layout.
- `check-job`: explains a failed Jenkins build.
- `play-scenarios`: plays a feature's scenarios by hand on the running app.
