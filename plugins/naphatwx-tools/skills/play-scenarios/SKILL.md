---
name: play-scenarios
description: Play a feature's use-case scenarios by hand on the real running app, in the same framed layout as the mock UI. Each pick creates new data through the app's API, signs in as the scenario's role and opens the screen; mark Pass / Fail. A scenario with no screen (API, MCP, job) gets a prompt for your AI agent; the agent plays it on the local app and records each call and its Pass / Fail. Works on any project. Use when the user says "play the scenarios on my local app" or "test spec 127 by hand". Manual testing only; the mock with fake data is generate-mock-ui, automated browser tests are e2e-test.
argument-hint: <plan-folder | spec-folder> [base-url] [app-repo-path]
---

# Play Scenarios

Play each scenario of a feature on the running app, by hand. The page looks like the mock UI's index: one block per **use case**, a side list of its **scenarios**, the picked one in a 16:9 frame, and a guide beside it (Result, How to play, What you should see). The difference: the frame is the real app, and each pick first **seeds** new data for that scenario by calling the app's API.

A scenario with **no screen** (surface `api`, `mcp` or `job`) is played by an AI agent, not by hand. Its frame shows a **prompt** for the agent (▶ Seed fills in the ids of new data) and the **recorded calls** of the agent's last run: each request and the response as returned. The agent writes its Pass / Fail to `results.js`, which the page reads, and a report to `ai-results.md`.

The use cases and scenarios are not written here. They live in `<plan>/use-cases.js`, written by the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code). This skill only adds how to play each one on the real app.

It is generic: it needs a way to start the app, a health URL and an HTTP API. It needs no seed framework, no database access and no change to the app's code, except a dev login route when the app has none (step 3).

```
<plan>/use-cases.js        USE_CASES + SCENARIOS (generate-use-case); read-only here
live/
├── README.md              how to run the page, for teammates; copied from template/ as is
├── index.html             one block per use case: side list, framed app, guide with Pass / Fail; results table
├── live.js                LIVE_CONFIG (app, API, pre-test, login) + LIVE_PLAY (seed, url, role, steps, prompt per scenario)
├── results.js             PLAYED_RESULTS: what the AI recorded for the no-screen scenarios (status, note, calls)
├── ai-results.md          the AI's report on those scenarios: how it ran, results table, FAILs
├── server.mjs             serves the plan folder on localhost; runs the pre-test; on each pick: seed, sign in, return the URL
├── .env.example           every secret key the play needs, with where to get it; no values (committed)
├── .env                   the user pastes the values here (git-ignored, never served, never read by the agent)
├── .gitignore             lists .env
└── seeds/
    ├── lib.mjs            api(), ensure(), unique(), poll(), done({ url, values })
    └── <name>.mjs         one seed per kind of data a scenario needs; ends by printing {"url": "/...", "values": {...}}
```

`template/` already has this working against a stand-in app (`template/preview/`): copy it and fill it in, don't rebuild it. Its index reads `../use-cases.js`, which is this skill's `use-cases.js` (preview data only; never copy it).

## How it works

Flow diagrams: [README.md](README.md).

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<plan-folder | spec-folder> [base-url] [app-repo-path]`

- Plan folder (has `overview.html`, from the `design-feature` skill) → `<plan>` is the plan folder. Write `<plan>/live/`.
- Spec folder only → `<plan>` is `<spec-folder>/plan/`. Write `<plan>/live/`.
- `<plan>/use-cases.js` missing → run the `generate-use-case` skill with the same input first. Never write use cases or scenarios here.
- No base URL → read the app's dev config (compose file, `package.json` dev script, `.env`) for its local web port, or ask once (use AskUserQuestion when the agent has it).
- No app repo path → the repo that holds the plan folder, when it has the app; otherwise ask once.

## Hard Rules

1. **Local only.** `server.mjs` listens on localhost and refuses a non-local `base` unless the user passes `--allow-remote` for a dev environment they own. Never point it at staging or production.
2. **Seeds call the app's API only.** No SQL, no database client, no app internals: the API applies the app's own validation, permissions and events, so seeded data looks like real data.
3. **Writing scenarios get new data on every pick** (`unique(name)`); shared and read-only data uses `ensure()` (find, create if missing). A seed never deletes.
4. **Every seed ends with one JSON line** `{"url": "/...", "values": {...}}`: the path to open relative to `base`, and every value the seed makes at run time that a step or prompt needs (ids, names, merge request numbers, authors: `{"repositoryName": "pluto-k3x9", "masterMR": 159}`). `live.js` never hardcodes them; steps and prompts write them as `{key}` tokens, and the page fills them in after each seed.
5. **Commands come from `live.js` only.** The server reads them by scenario id; the page never sends one. Keep the `X-Play` header check: it stops other sites from triggering a pick.
6. **Secrets live only in `live/.env`.** The agent writes `.env.example` (keys, no values) and never reads, prints or writes `.env`; `live.js`, seeds and output name keys, never values. `.env` stays git-ignored (`.gitignore` next to it), the server never serves a dotfile, and it hides every `.env` value and credential in output shown on the page.
7. **Same host name as the app** (`localhost` or `127.0.0.1`, never mixed), so login cookies reach the frame.
8. **Use cases and scenarios are data, owned by `<plan>/use-cases.js`.** `LIVE_PLAY` has exactly one entry per scenario, same id, same order. A wrong or missing scenario → fix it with the `generate-use-case` skill.
9. **AI results are recorded, never invented.** Every status in `results.js` comes from calls the agent really made on the local app, kept in `calls` as sent and as answered. Mask tokens, cookies and internal hosts in them; never record a credential. A viewer's own Pass / Fail on the page wins.
10. **`live.js` and `results.js` are strict JSON** (double quotes, no trailing commas, no comments inside the values).
11. **Every count you report is computed** (by `scripts/check-live.js`), never estimated.
12. **Ask before you change the app.** A dev login route or a dev-only frame header is a change to the user's repo: list it and get a yes first. Seeds live in `<plan>/live/seeds/` and change nothing in the app.
13. No absolute local paths in any file (`appDir` is relative to `live/`). Code comments max 3 lines. Wrap every `localStorage` call in `try/catch`.

## Workflow

### 1. Read the feature

- From the plan folder: `overview.html` (scope, screens, errors) and `use-cases.js`.
- When `<plan>/mock/shared/scenario-play.js` exists, it has each scenario's screen, params and steps. Start from it; names and values change to the seeded ones.
- List per scenario: the screen and route, the data it needs, whether it **writes** (creates or changes data) or only reads, and the role it runs as with the permissions that matter (the scenario's `given` names them).
- A scenario with no screen (surface `api`, `mcp` or `job`) is an **AI scenario**: list the MCP tool and operation, API call or job command it plays, and the ids it needs from a seed.

### 2. Scan the app

Delegate to a read-only sub-agent when the agent can. Ask for concrete answers with `file:line`:

- **Start**: how the repo starts locally, as its docs say (`docker compose up -d`, `make dev`, `npm run dev`). Follow the repo's rules (e.g. "everything runs in Docker"). The web port, the API origin, a health route.
- **API**: the create / read / update calls for every entity the scenarios need, their request shapes, validation (name length and characters, for `unique()`), and which states only a background job reaches (`PENDING → READY`).
- **API auth**: how a script authenticates (API key header, service token, dev login). The env var that holds it.
- **UI login**: a dev login route? Its method and shape (GET link or POST body), and the roles it accepts.
- **Roles**: the permissions each of those roles holds, from the seed or permission map, as exact strings (`DEV: repositories.versions.read`, no `repositories.versions.create`).
- **Routes**: the URL of each screen, and the params that set a filter, tab or open a form.
- **Framing**: `X-Frame-Options` or CSP `frame-ancestors` in dev.
- **MCP**: the local MCP endpoint (e.g. `http://localhost:3003/mcp`), its transport, how a client authenticates (a personal token made on a local page or API), and the tool names. Does a tool describe its own fields (e.g. a `GetInputSchema` operation)?
- **Jobs**: how an operator runs each job scenario (a command and where it runs, or an API trigger) and what it prints.
- **Existing seed tools**: when the repo has one that works over the API, reading it shows the right calls; reuse its patterns, but the play seeds stay in `live/seeds/`.

### 3. Agree the app changes

- Usually none. List any that are needed and wait for a yes (Hard Rule 12):
    - No dev login route → offer one (dev-only, off in production), or use login type `manual`.
    - A frame header blocks the page → a dev-only relaxation.
- A scenario needing data the API can't create (e.g. no "create user" call) → `skip` with the reason, unless the user agrees to another way.

### 4. Copy the template

- Copy `template/` → `<plan>/live/`, without `preview/`. In `seeds/lib.mjs`, delete the `API === 'preview'` line. Empty `results.js` to `var PLAYED_RESULTS = {};` (keep its comment lines).
- Replace the example seeds in `seeds/` with the feature's own.
- Set the page title and `<h1>` to the feature name.
- `LIVE_CONFIG`:

| Field | What |
|-------|------|
| `slug` | feature slug; keys the saved results |
| `base` | the app's web origin, e.g. `http://localhost:3000` |
| `api` | the API origin seeds call, e.g. `http://localhost:3000/api` |
| `apiAuth` | how seeds authenticate to the API, below; `null` when the API is open |
| `appDir` | the app repo root, relative to `live/`; `pretest.up` runs there |
| `pretest` | `up`: the repo's start command (`""` when the user starts it); `health`: a path that answers when the app is up; `timeoutSec` |
| `login` | how the frame signs in, below |
| `role` | default role for scenarios without their own |
| `seedTimeoutSec` | per seed; default 180 |

`apiAuth.type`, in order of preference. Prefer the one that makes the seed act as the **same role the frame signs in as**: a system key can create records the frame's user can't see or change.

| Type | When | Shape |
|------|------|-------|
| `login` | the app's dev login (`login.type` link or post) gives a session the API accepts | `{ "type": "login", "cookie": "access_token" }` sends that cookie as `Authorization: Bearer`; `"send": "cookie"` sends the whole Cookie header; `"header"` / `"prefix"` change where it goes |
| `command` | a CLI the dev is signed in to prints a token | `{ "type": "command", "run": "gh auth token" }`; run in `appDir` on each pick; `header` (default `Authorization`) and `prefix` (default `Bearer `) |
| `header` | a fixed service key or personal access token | `{ "type": "header", "header": "x-api-key", "env": "APP_API_KEY" }`; the value comes from `live/.env` |

`login.type`:

| Type | When | Shape |
|------|------|-------|
| `none` | the app has no login | `{ "type": "none" }` |
| `link` | a GET dev login route | `{ "type": "link", "path": "/dev/login?as={role}&next={next}" }` |
| `post` | a POST dev login route that sets a cookie | `{ "type": "post", "path": "/api/auth/dev-login", "body": { "role": "{role}" } }`; server.mjs posts it and passes the cookie on |
| `manual` | no dev route | `{ "type": "manual" }`; the user signs in once with Open ↗, and the frames share that session |

### 5. Write `LIVE_PLAY`

One entry per scenario in `<plan>/use-cases.js`, same `id`, same order:

| Field | What |
|-------|------|
| `id` | the scenario's id; becomes `#sc-<id>` in links |
| `seed` | `node seeds/<name>.mjs [args]`; prints `{"url"}`. Several scenarios share one seed with args |
| `url` | only for a scenario with no seed: a fixed path starting with `/` |
| `role` | optional role for this scenario (read-only user, another team) |
| `steps` | "How to play": imperative; name the exact values the reviewer picks and should see, with `{key}` for what the seed creates (`Pick merge request !{masterMR} - Play {repositoryName}: add order export`) |
| `prompt` | AI scenarios only: the text a viewer pastes into an AI agent, below. `{key}` tokens are filled from the seed's `values`; with no seed, the viewer types them |
| `skip` | instead of the fields above, for a scenario you can't play live: one sentence saying why and where to play it instead |

- `title`, `story` and `expect` come from `use-cases.js`; the file's last lines merge both lists. Keep those lines as the template has them.
- The reviewer compares the screen with "What you should see", so the steps must lead to those exact values:
    - A scenario that signs in as a role other than the default starts with that role and its relevant permissions: "You are signed in as DEV: has repositories.versions.read, not repositories.versions.create." Add any upstream rule the scenario depends on ("Your linked Groot user is in the BA group, whose page 7 is not writable").
    - Use the values the seed really creates (project names, tags, versions, merge request titles). When they differ from the scenario's `e.g.` values, the seed wins in the steps; tell the user so the scenario can be updated with the `generate-use-case` skill.
    - Never write `that <thing>`, `the newest <thing>`, `<placeholder>` or `pluto-…` for a value the seed knows. Write a fixed value, or a `{key}` the seed returns in `values`. Before the seed runs, the page shows `[<label>: filled in after the seed]`. Only secrets keep a `<placeholder>`.
    - Before writing "tooltip", "hover" or "point at", read the control's component: a tooltip replaced by inline text is read, not hovered (`Read the amber reason under the card's title`).
- Skip, with a reason, only what can't be caused safely on a dev machine (an upstream outage, a 502 from a proxy; point to the mock or the unit tests). A scenario with no screen is not skipped: it gets a `prompt`.
- An AI scenario's `prompt`:
    - Names the MCP server (the name the steps tell the viewer to add), or the command and the repo it runs in.
    - Asks the agent to show the exact request and the full response of every call, and to read the tool's input schema first when it has one.
    - Lists the calls in order with their values, `{key}` for what a seed makes. Says "I confirm the writes below" when a call writes.
    - Ends by asking for the values `expect` checks ("Tell me the new version's status, source and releaseBranch, and the second call's error").
    - A value MCP can't give (e.g. a merge request number only the screen shows) → the seed returns it in `values`. With no seed, a `{key}` the viewer types, and a `lookup` line in the recorded calls saying where it came from.
- An AI scenario's `steps`: connect the agent to the local MCP server once (the exact `claude mcp add` command, the token's source; never a token), press ▶ Seed, copy the prompt into the agent and approve its calls, check its answer against What you should see.
- A scenario whose `expect` doesn't match what the app should do → report it; don't change `use-cases.js`.

### 5b. List the secrets (`.env.example`)

- One key per secret or local setting a seed or `apiAuth` needs (API key, a token for an outside system the seeds read, a test bucket name).
- The comment line right above each key says what it is and where the user gets it locally (a file path in the app repo, a CLI command, a settings page). Put `Optional` in that comment when the play works without it.
- No values, not even examples that look real. Keep the template's `.gitignore` next to it.
- Tell the user which keys to fill in; never ask them to paste a secret into the chat.

### 6. Write the seeds

- Plain Node `.mjs`, importing only `./lib.mjs` and Node built-ins. They run on the host against `localhost`.
- Each one:
    - `ensure()` the shared data it depends on (org, environment, base records), by natural key.
    - Creates its scenario's own entity with `unique('<name>')` when the scenario writes.
    - Drives the data to the state the scenario starts from, through the same API calls a user or job would make; `poll()` for states a background job reaches.
    - Ends with `done({ url, values })`, with a key for every `{key}` its steps and prompts use (`done({ url, values: { repositoryId: repo.id, repositoryName: name, masterMR: mr.iid } })`). Any failed call throws: the frame shows the output, so make messages say what failed.
- Never handle auth in a seed: `api()` already sends the credential server.mjs resolved. Never print an env value.

### 7. Verify

- `node <this skill dir>/scripts/check-live.js <plan>/live`: syntax of `live.js`, `server.mjs` and every seed; `live.js` as strict JSON; one entry per scenario in order; every playable entry has a seed or a url, and steps; login and roles consistent.
- It warns (`WARN`, exit 0) when a step says "tooltip", "hover" or "point at" (confirm the control still has one, then keep it), and when an entry with a `role` has no step naming its permissions.
- It also warns when a step or prompt uses a `{key}` its seed doesn't return in `done({ values })` (it scans the seed file), and on vague names (`that merge request`, `the newest …`, `<…>` that is not a secret, `pluto-…`). Fix each one.
- Pre-test: `node <plan>/live/server.mjs --up`. It runs `pretest.up`, waits for `health`, warns about framing headers, and prints the page URL.
- `check-live.js` also checks the secrets: `.env.example` exists with no values, every `apiAuth.env` is listed in it, `.env` is git-ignored, and `live.js` holds nothing that looks like a secret. It names keys still empty, never values.
- With the app up, `.env` filled in and `server.mjs` running, `check-live.js <plan>/live --run-seeds [--server http://localhost:4000]`: picks every seeded scenario twice through the server, with the same `.env` and auth as playing. Both picks must succeed; a writing scenario must get a **new** URL each time (it prints which ones get the same).
- Open the page in a headless browser when one is available and pick every playable scenario: no console errors, the "Creating data…" cover clears, the frame shows the right screen signed in as the right role. After each seed, every `{key}` in the steps and the prompt shows a value, not `[…: filled in after the seed]`. Look at the screenshots.
- Grep for absolute local paths and secrets, and remove them.

### 8. Play the AI scenarios

Do this after step 7 with the app up and `server.mjs` running, or when the user later asks to "play the AI scenarios" of a plan. Local only (Hard Rule 1).

- Get a client the way a viewer would: a local token for each role the scenarios need, made through the app (its token page or API, signed in by the dev login). Keep tokens in scratch files only; never print them or write them to `live/`.
- For each AI scenario, in order:
    - Seed it through the server, as the page does: `POST /__play/<id>` with header `X-Play: 1`. Fill the prompt's `{key}` tokens from the answer's `values`.
    - Do what the prompt says, as the scenario's role: MCP `tools/call` through the agent's own MCP tools when they point at the local app, else JSON-RPC over HTTP to the local endpoint (`initialize`, `notifications/initialized`, `tools/call`). A job runs its command in `appDir`.
    - Record every call in order: `{ role, tool, arguments, isError, response }` for MCP, `{ command, isError, response }` for a command, `{ lookup }` for a value found another way. The response as returned, masked (Hard Rule 9).
    - Compare with `expect`. Pass only when every item matches. A value that comes from the mock (an id, a count) and differs only because the local data differs is a pass with a note; a different message, status or field is a fail.
- Write `live/results.js`: `PLAYED_RESULTS[<id>] = { status, by, at, note, calls }`. `note` is one line starting with who and when ("Claude over MCP, 2026-10-14: …"). An AI scenario that can't be played gets `status: ""` and the reason in `note`.
- Write `live/ai-results.md`, the report:
    - Title and date; the stack (web, API, MCP endpoint, play server).
    - **How it ran**: auth, MCP transport, how data was seeded, local stand-ins for the mock's ids.
    - **Results**: a table `Scenario | Result | Call made | Actual answer | Notes`, then the totals (PASS, FAIL, SKIP out of N).
    - **FAILs and suspected product bugs**, and mock values that differ locally.
- Run `check-live.js` again: it checks `results.js` and prints the recorded counts.

### 9. Confirm

- Output: `✅ Play page created at: <plan>/live/index.html`
- Counts copied from `check-live.js`: scenarios, playable live, by the AI (recorded pass, fail), skipped, seed commands.
- The AI's FAILs from `ai-results.md`, each with the call and the answer.
- App changes made (login route, headers), each with its path.
- The keys to fill in `live/.env`, each with where to get it (from `.env.example`).
- Skipped scenarios with their reasons.
- How to run it:
    1. Copy `live/.env.example` to `live/.env` and fill in the values. A value already set in the shell wins.
    2. `node <plan>/live/server.mjs --up` (starts the app, waits for it, serves the page). Without `--up` when the app is already running.
    3. Open the URL it prints. Pick a scenario, play it, mark Pass or Fail, then "Copy as Markdown" under Results. To test again, **Clear** (per use case) or **Clear all** (bottom right) drops the Pass / Fail marks and notes.
    4. An AI scenario already shows the agent's result and its calls. To check it yourself: ▶ Seed, Copy prompt, paste it into your agent.
