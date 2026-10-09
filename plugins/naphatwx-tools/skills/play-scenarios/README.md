# play-scenarios

Builds a local page where you play a feature's scenarios by hand on the real running app, with Pass / Fail per scenario.

## When to use it

- You have a feature's use cases and scenarios, and you want to try each one on your local app.
- You want fresh test data for every try, made through the app's own API.
- Say: "play the scenarios on my local app", "test spec 127 by hand".

| You want | Use instead |
|----------|-------------|
| A clickable mock with fake data, no app running | `generate-mock-ui` |
| Automated browser tests with screenshots | `e2e-test` |
| A test case file an AI runs later | `generate-test-cases` |
| Checks that services reach each other after a deploy | `smoke-test` |
| The use cases and scenarios themselves | `generate-use-case` |

## How it works

Four phases. The agent builds the page once, you fill in `.env` once, the pre-test starts the app, then you play any scenario many times.

```mermaid
graph TD
    subgraph AGENT["Agent, once"]
        A1[use-cases.js] --> A2[scan the app: routes, API, auth, start command]
        A2 --> A2b[ask the user about app changes: dev login route, frame headers]
        A2b --> A3[write live/: live.js, seeds/*.mjs, .env.example, .gitignore]
        A3 --> A4[check-live.js: config, secrets, syntax]
    end
    subgraph ENV["The user, once"]
        E1[copy .env.example to .env] --> E2[paste the values: API key, token, ...]
    end
    subgraph PRE["Pre-test, once"]
        P1[start the app the repo's way: compose up, make dev, npm run dev] --> P2[wait for the health URL]
        P2 --> P3[server.mjs on localhost:4000, warns about missing keys]
    end
    subgraph TEST["Test, the user, many times"]
        T1[pick a scenario] --> T2[seed: new data through the API]
        T2 --> T3[sign in as the scenario's role]
        T3 --> T4[frame opens the URL the seed returned]
        T4 --> T5[play the steps, mark Pass or Fail]
        T5 -->|Restart: new data again| T2
        T5 --> T6[Copy results as Markdown]
    end
    AGENT --> ENV --> PRE --> TEST
```

One pick, step by step:

```mermaid
sequenceDiagram
    actor U as You
    participant P as Play page (localhost:4000)
    participant S as server.mjs
    participant D as Seed (seeds/x.mjs)
    participant A as App API + web (localhost:3000)
    U->>P: pick a scenario
    P->>S: POST /__play/<scenario id>
    Note over P: "Creating data…"
    S->>S: read live/.env, get the API credential (apiAuth: header, command or login as the role)
    S->>D: run the scenario's seed, credential in PLAY_API_AUTH
    D->>A: ensure shared data (find, create if missing)
    D->>A: create a new entity "pluto-cut-0412"
    A-->>D: id 1311
    opt the data needs a background job
        D->>A: poll until READY
    end
    D-->>S: last line {"url": "/repositories/1311?tab=versions"}
    opt login type post
        S->>A: POST login route as the scenario's role
        A-->>S: Set-Cookie
    end
    S-->>P: { ok, url } + the same Set-Cookie
    P->>A: frame opens localhost:3000/repositories/1311?tab=versions
    Note over P,A: cookies ignore the port, so the frame is signed in
    A-->>U: the real screen, ready to play
```

What a seed creates:

```mermaid
graph LR
    subgraph SHARED["Shared: create if missing, kept"]
        O[org Astro Payments]
        E[environment dev]
    end
    subgraph NEW["New on every pick"]
        N1[repo pluto-cut-0412: first pick]
        N2[repo pluto-cut-0415: Restart]
        N3[repo pluto-cut-0420: Restart]
    end
    N1 --> O
    N2 --> O
    N3 --> O
    N1 --> E
```

- Read-only scenarios use only shared data (or none), so their picks are fast.
- Writing scenarios get a new entity on every pick. Restart never deletes; it creates again.
- The seed returns the URL, so no id is written in `live.js` or the steps.

Where secrets live, and what keeps them private:

```mermaid
graph TD
    EX[".env.example: key names + where to get each, no values"] -->|the user copies and fills in| ENVF[.env]
    EX -.->|committed| GIT[(git)]
    ENVF -.-x|.gitignore| GIT
    ENVF -.-x|dotfile path: 404| BR[browser]
    ENVF -.-x|never read or printed| AG[agent and chat]
    ENVF -->|re-read on every pick, a shell value wins| SRV[server.mjs]
    SRV -->|apiAuth: login as the role, command, or header| CRED[credential]
    CRED -->|PLAY_API_AUTH, this seed run only| LIB["seeds/lib.mjs api(): sent on every call"]
    SRV -->|output to the page: every secret replaced by ***| PG[play page]
```

Rules the diagrams don't show:

- Local only. `server.mjs` refuses a non-local app unless you pass `--allow-remote` for a dev environment you own.
- Seeds call the app's API only. No SQL, no database client.
- The agent asks before it changes the app (a dev login route, a dev-only frame header).

## Input → output

Input: `<plan-folder | spec-folder> [base-url] [app-repo-path]`

- A plan folder from `design-feature`, or a spec folder (the plan goes in `<spec-folder>/plan/`).
- `<plan>/use-cases.js` must exist. If it doesn't, the agent runs `generate-use-case` first.

Output:

```
<plan>/
├── use-cases.js           read only; written by generate-use-case
└── live/
    ├── README.md          how to run the page, for teammates
    ├── index.html         the play page: one block per use case, framed app, Pass / Fail, results
    ├── live.js            LIVE_CONFIG (app, API, pre-test, login) + LIVE_PLAY (one entry per scenario)
    ├── server.mjs         local server: pre-test, seed, sign in, serve the page
    ├── .env.example       secret key names and where to get each; no values
    ├── .gitignore         lists .env
    └── seeds/
        ├── lib.mjs        api(), ensure(), unique(), poll(), done()
        └── <name>.mjs     one seed per kind of data a scenario needs
```

## Files in the skill folder

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | The agent's instructions |
| [scripts/check-live.js](scripts/check-live.js) | Checks `live/` against `use-cases.js`; `--run-seeds` picks every seeded scenario twice |
| [template/](template/) | The `live/` folder, working against a stand-in app; copied and filled in per feature |
| [template/README.md](template/README.md) | Ships as `live/README.md` |
| [template/preview/](template/preview/) | Stand-in app and fake API for the template; not copied |
| [use-cases.js](use-cases.js) | Example use cases for the template preview; never copied |

## Related skills

- `generate-use-case`: writes the `use-cases.js` this skill plays.
- `design-feature`: makes the plan folder that holds `live/`.
- `generate-mock-ui`: the same layout, with fake data and no app.
- `e2e-test`: plays the same flows as automated browser tests.
