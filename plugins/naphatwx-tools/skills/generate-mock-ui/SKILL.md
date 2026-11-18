---
name: generate-mock-ui
description: Build a clickable mock UI for a feature in the app's real design system, as plain HTML that opens from disk, with every edge state and a free-play mode that reaches every scenario. Use when the user says "mock UI for this spec folder" or "clickable prototype". Screens only, no real API; the full plan is design-feature.
argument-hint: <plan-folder | spec-folder> [frontend-app-path]
---

# Mock UI Generator

Build `<plan>/mock/` — a clickable mock of a planned feature that opens straight from disk and doubles as the frontend contract. The mock is **only an interactive UI**: the app's real design system, with data shaped like the real API answers.

- Its index shows the same tree as every skill that plays or tests the feature: each **use case**, then its **scenarios** in file order, each with a small surface tag (`ui` / `mcp` / `api` / `job`) and a **Core** pill on core scenarios.
- A `ui` scenario plays on the real screen in a frame.
- **Free play** (always built): `page/<first screen>.html?free=1`, linked as "Free play ↗" from the index. The app's nav links every screen, data written on one screen shows on the others, and a pink drawer changes the data set, role and faults live. Every mock state is one pick of those three, so every `ui` scenario can be reached by playing freely.
- An `mcp`, `api` or `job` scenario stays in the tree, greyed. Picking it shows an empty frame with "No mock". There is no fake API call, console or request / response play for it: the `play-scenarios` and `e2e-test` skills cover those.

The use cases and scenarios are not written here. They live in `<plan>/use-cases.js`, written by the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code). It is the one source for every skill that plays or tests the feature. This skill only adds how to play each `ui` scenario. A mock **state** (`shared/states.js`) is not a scenario: it is the data, permissions and faults a screen starts with, and several scenarios can share one.

```
<plan>/use-cases.js         USE_CASES + SCENARIOS (generate-use-case); read-only here
mock/
├── index.html              one block per use case: a scenario list (the open one shows its steps), the framed screen; audit log; contract links
├── contract/
│   ├── types.ts            real shapes to implement (reference; never loaded by pages)
│   ├── rules.js            spec rules as pure functions
│   └── data.js             realistic data in the real upstream shapes, typed via JSDoc
├── page/
│   └── <screen>.html       one file per screen; state from ?state= and the params its scenarios need
└── shared/
    ├── scenario-play.js    SCENARIO_PLAY: how to play each ui scenario (state, page, steps), keyed by id
    ├── fake-api.js         local data for the screens: the real operation names and answer shapes, from contract/
    ├── components.js       the app's component classes
    ├── shell.js            the app's chrome + the mock-only state / scenario panel
    └── states.js           pages (the nav) + data sets, roles, faults; each mock state is one pick of each
```

`assets/` already has this layout working on a placeholder domain: copy it and replace the domain, don't rebuild it. Its pages read `../use-cases.js`, which is this skill's `use-cases.js` (preview data only; never copy it).

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<plan-folder | spec-folder> [frontend-app-path]`

- Plan folder (has `overview.html` + `sequence-diagram/`, from the `design-feature` skill) → `<plan>` is the plan folder. Write `<plan>/mock/`, and read its use cases.
- Spec folder only → `<plan>` is `<spec-folder>/plan/`. Write `<plan>/mock/`.
- `<plan>/use-cases.js` missing → run the `generate-use-case` skill with the same input first, then go on. Never write use cases or scenarios here, and never read them from another skill's output.
- No frontend path → find the app: look for `package.json` with a UI framework, a `components/` folder, or ask once (use AskUserQuestion when the agent has it).
- No frontend exists at all → ask whether to use plain Tailwind defaults instead of a real design system.

## Hard Rules

1. **Opens from `file://`**: classic `<script src>` only — no `type="module"`, no `import`, no `fetch()`. Data is `.js` setting a global (`var MOCK_DATA = …`), never `.json`.
2. **Real design system**: every class string in `components.js` and `shell.js` is copied from the app's components, with the source files listed in each file's header. Load only what the app itself loads (its CSS framework, icon set, font) — from a CDN when the app does.
3. **Real contract**: `types.ts` mirrors the real proto / OpenAPI / DTOs. Mock-only fields are marked in a comment. Never invent a field the source doesn't have.
4. **One set of rules**: `fake-api.js` and the pages call `rules.js` for every mapping, validation and computed value. The mock never enforces a rule looser or stricter than the spec.
5. **Real names and messages**: `fake-api.js` functions are named exactly like the real operations the screens call, take the real request shapes and return the real answer shapes. Every user-facing text the screens show (errors, refusals, toasts, empty states) is copied verbatim from the code: the same text `use-cases.js` quotes. Keep the texts as constants in `rules.js`. No code yet → the spec's text, as `use-cases.js` has it. Never write your own wording: a mock that says something else teaches reviewers the wrong screen.
6. **Every state has a link**: each edge state from the spec is a state in `states.js`, reachable as `page/<screen>.html?state=<id>`. Never an empty list where the real app would show an error.
7. **Free play reaches every scenario.** Each mock state is built from one data set, one role and a set of faults, all pickable in the free-play drawer. Every screen is in `States.PAGES`, so it is in the nav. A scenario `param` (`?status=`, `?modal=`) only pre-sets what a control on the screen can also do.
8. **Mock-only UI is obvious**: the state / scenario / free-play panel stays pink and dashed. Nothing mock-only uses product styling.
9. Wrap every `sessionStorage` / `localStorage` call in `try/catch`; the mock must still work when storage is blocked.
10. No absolute local paths in any file. Code comments max 3 lines.
11. **Use cases and scenarios are data, owned by `<plan>/use-cases.js`.** Never add, remove or rename one here; when one is wrong or missing, fix it with the `generate-use-case` skill. The mock adds only `shared/scenario-play.js`: one entry per `ui` scenario id, a strict-JSON array (double quotes, no trailing commas, no comments inside) so other tools can parse it after stripping `var NAME = `.
12. **Only `ui` scenarios play.** `mcp`, `api` and `job` scenarios get no play entry, no page, no console and no fake call. The index shows them greyed with "No mock".
13. **Controls follow the spec, then the real app.**
    - No permission → do what the real app does: a control the app hides is **hidden** in the mock too.
    - Shown unavailable with a reason only where the spec says so (e.g. an archived owner, a locked record). Show the reason where the spec puts it: a line under the control, or a tooltip. Use `aria-disabled="true"`, not native `disabled`: a disabled button gets no hover or focus, so its tooltip never shows.
14. **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

## Workflow

### 1. Read the feature

- From the plan folder: `overview.html` (scope, errors) and each `sequence-diagram/NN-*` file, `.js` or `.html` (operations, participants, branches).
- From the spec: data model, contracts (proto, OpenAPI, upstream API), field mapping tables, error mapping, edge cases.
- List:
    - **Screens** the feature adds or changes → one `page/*.html` each.
    - **Operations** the screens call → `fake-api.js` functions with the real answer shapes.
    - **Edge states** (empty, unreachable, refused, ineligible, timeout, …) → mock states. Split each into its data set, role and faults.
    - **Scenarios**: read `<plan>/use-cases.js`. Each one with `surface` `ui` needs a way to play it (step 4b). A reviewer plays these; they are why the mock exists. The others (`mcp`, `api`, `job`) need nothing here.

### 2. Scan the design system

This is the expensive step — delegate it to a read-only sub-agent when the agent can, and ask for concrete values, not advice:

- Theme: tokens or palette, dark mode mechanism (class / attribute / media), fonts, icon set.
- App shell: sidebar / nav / top bar markup and active states, page padding.
- Components used by the screens: button, badge / status badge, table or list, tabs or section nav, select / dropdown, input, textarea, modal, empty state, skeleton, alert / note, pagination, toast.
- The existing screen being changed (if any) and the closest existing sibling screen (e.g. an existing create form) — layout, labels, field order.
- Record `file:line` for each; they go into the `components.js` / `shell.js` headers.

### 3. Copy the template

- New mock → copy `assets/` → `<output>/mock/`.
- `mock/` already exists → never copy the whole folder. Keep the feature's files (`page/`, `shared/`, `contract/`), but copy `index.html` and `README.md` again on every run, then redo the edits below in them (the header text, `screenUrl()`). This keeps an old page from holding an old design: its theme blocks and page code come from the plugin's newest template every time. List the files the copy changed (`git status`) in the reply.
- Rename `page/example.html` to the first real screen; add one page per screen from the same skeleton. Register each in `States.PAGES`.
- The template's "Thing" domain is a placeholder — replace all of it, including `screenUrl()` in `index.html` (the URL the real app would show) and `FakeApi.STORE` (`naphatwx:mock:<feature-slug>`).

### 4. Write the contract

- `contract/types.ts`: requests, responses, enums, error shape, the existing rows the mock reads, and upstream wire shapes when the feature calls another system. Add a `MockData` interface describing `data.js`.
- `contract/rules.js` (`// @ts-check`, global `Rules`): every rule from the spec as a pure function — computed values, status and field mapping, eligibility, validation, error classification, side-effect messages.
- `contract/data.js` (`// @ts-check`, global `MOCK_DATA`, typed `@type {import('./types').MockData}`):
    - Realistic names, ids, dates and volumes (enough rows to page).
    - Data in the **upstream** shape, so `rules.js` does the mapping as the real service will.
    - One entity per state that needs different data (empty, archived, …). Keep ids consistent with the plan's diagrams.
    - Generate large data with a throwaway script, then commit the literal result.

### 4b. Write how to play each ui scenario (`shared/scenario-play.js`)

- `SCENARIO_PLAY`: exactly one entry per `ui` scenario in `<plan>/use-cases.js`, same `id`, in the same order. No entry for `mcp`, `api` or `job` scenarios:

| Field | What |
|-------|------|
| `id` | the scenario's id; becomes `#sc-<id>` in links |
| `state` | a `States.LIST` id |
| `page` | screen file name without `.html` |
| `params` | optional query params the screen needs (`{ "status": "FAILED" }`, `{ "modal": "CREATE" }`) |
| `steps` | "How to play": imperative, with real values from the mock data (`Open the list of pluto`, `Type Third thing in Name`); a role scenario starts with the role and its permissions |

- **One scenario = one screen = one result.** An entry plays exactly one `state` with one `params`. Never `parts`, part buttons or a list of states; `check-scenarios.js` errors on a `parts` field. A scenario that needs a second state or screen is two scenarios: report it for the `generate-use-case` skill.

- `title`, `story`, `surface` and `expect` come from `use-cases.js`; the file's last lines merge both lists into `SCENARIOS` for the pages and define `isPlayable()`. Keep those lines as the template has them.
- Steps name what is on screen, not how the code works. A reviewer who never read the spec should be able to follow them.
- Pick mock data that gives the scenario's example values (names, counts, dates), so "What you should see" matches the frame.
- A state with other permissions → the first step names them: "You are signed in as VIEWER: has things.read, not things.create."
- Write "tooltip" or "hover" only when the page really has one; an inline reason is read, not hovered.
- A scenario you can't play as written (its `expect` doesn't match the spec or the screen) → report it; don't change `use-cases.js`.

### 5. Write `shared/`

- `states.js`:
    - `PAGES`: every screen, in the app's nav order; free play shows them as the nav.
    - `DATA` (data sets: the entity a screen opens on, plus `blocked` when the spec shows a reason on an unavailable control), `ROLES` (the app's real role names and their `perms`) and `FAULTS` (one per upstream fault `fake-api.js` reads as `faults.<id>`). Together they are the free-play drawer.
    - `LIST`: the mock states, each `id`, `data`, `role`, `faults` (ids from the lists above), `label`, `useCase` = the plan use cases it shows (`UC1 · UC2`), `hint` telling the viewer what to try. A role's `perms` include every permission the operations in its scenarios need.
    - Keep `build()`, `current` and `href()` as the template has them: `?state=` picks a mock state, `?free=1&data=&role=&faults=` a free pick.
- `fake-api.js`: local data for the screens, not an API to play. Writes stay in storage across screens, so free play works like the real app until Reset. One async function per operation **a screen calls** in a `ui` scenario (refusal-only ones too, e.g. Update / Retry that the feature refuses), returning the real answer shape. Latency, permission checks, state faults, validation via `rules.js`, the real error codes and the code's exact messages (Hard Rule 5). Writes and side effects (audit rows, events) persist in `sessionStorage` under `STORE`; `log()` reads storage, since screens write it from inside their frames.
- `components.js`: the helpers the pages need, with the app's real class strings.
- `shell.js`: the app's real chrome around `#page`, plus the mock-only panel as-is:
    - The chrome's nav lists `States.PAGES` with the app's real nav-item classes (active and not). Links go through `States.href()`, so they keep the state or the free pick.

### 6. Write the pages

- Each page: the same `<head>` (CSS stack + the scripts in template order), `Shell.mount()`, a small state object, `load()` via `fake-api.js`, `render()`.
- Show every state the real screen has: loading skeleton, error with retry, empty, filtered-empty, success toast, refusal alert, outcome-unknown.
- Deep links: support every query param a scenario needs (`?status=FAILED` pre-sets a filter, `?modal=…` opens a form), so each scenario opens on the exact state.
- Expose page state as `window.S` (or similar) so a test harness can drive it.

### 6b. The index (`index.html`)

Keep the template's layout; only change the header text and `screenUrl()`. Don't edit between the `theme:*` markers. Scenario badge order: status → surface → title → kind → core → refs.

### 7. Link the plan (when a plan folder exists)

- Run `node <design-feature skill dir>/scripts/scenarios-panels.js <plan-folder>` (the design-feature skill is this skill's sibling folder, `../design-feature/`). It rewrites every use case's "Scenarios (N)" view in `overview.html` (each `ui` scenario with a play entry → `Play ↗` to `mock/index.html#sc-<id>`, new tab; the others → "not in the mock") from `use-cases.js` and `scenario-play.js`, and adds "Open the mock ↗" to the Use cases heading. Don't edit those parts by hand; re-run the script after any change to the scenarios.

### 8. Verify

- `node <this skill dir>/scripts/check-scenarios.js <output>/mock` (`--use-cases <file>` for another path). Exit code 0 before you go on. A scenario that is wrong in `use-cases.js` → report it for the `generate-use-case` skill; don't edit it here.
- Type-check the contract when Node is available (a temporary install is fine):
  `npx -y -p typescript@5 tsc --noEmit --allowJs --checkJs --strict --lib es2022,dom contract/types.ts contract/rules.js contract/data.js`
- Open `index.html` and every page × state in a headless browser when one is available (`--allow-file-access-from-files`). Check the console for errors and look at the screenshots: each frame shows its screen scaled to fit, `#sc-<id>` opens the right scenario, a non-ui scenario shows "No mock", core rows show the Core pill, and the search bar (title text, Type, Kind, Core only) gives the right "n of N".
- Play each `ui` scenario's steps in its frame and compare the screen with its `expect`, quoted texts word for word. A mismatch → read the code for the real text, then fix `rules.js`, the data or the page.
- Free play: open "Free play ↗", move between every screen with the nav, and check data created on one screen shows on the others. Pick each preset in the drawer, then change data, role and each fault one at a time: the screen reloads with the new pick and the right controls show or hide.
- Check every relative `href` / `src` resolves to a file.
- Grep for absolute local paths and remove them.

### 8b. Review the mock (always)

- Follow [references/mock-review.md](references/mock-review.md): two fresh review-only agents (UI fidelity, functional) in parallel, then one fresh fix agent, then step 7 and step 8 again.
- Run by the design-feature skill → skip it here; design-feature runs the review as its step 6b, after its own checks.

### 8c. Review the layout (always)

- Follow [references/layout-review.md](references/layout-review.md): one fresh sub-agent per HTML file this run wrote, all in parallel. Each opens its file in a browser and fixes broken layout.
- Run by the design-feature skill → skip it here; design-feature reviews every file as its step 6c.

### 9. Confirm

- Output: `✅ Mock created at: {output}/mock/index.html`
- Scenarios per use case, the total and how many play in the mock (the rest show "No mock"), copied from `check-scenarios.js` output — never counted by eye.
- The review: both verdicts, findings by severity, how many were fixed, and each conflict with the side that won.
- The layout review: files reviewed, count per verdict, and each problem not fixed.
- List the pages and mock states, and what could not be copied from the real design system (logos, images, fonts), plus the CDNs the pages need.
- Remind the user: open `mock/index.html` directly; no server or build is needed. "Free play ↗" in its header opens the free-play mode.
