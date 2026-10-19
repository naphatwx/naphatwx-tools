---
name: generate-mock-ui
description: Build a clickable mock UI for a feature in the app's real design system, standalone or inside the app, with every edge state. Use when the user says "mock UI for spec 127" or "clickable prototype". Screens only, no real API; the full plan is design-feature.
argument-hint: <plan-folder | spec-folder> [frontend-app-path] [standalone | in-project]
---

# Mock UI Generator

Build a clickable mock of a planned feature, in one of two modes:

| Mode | Where | Built from | Steps |
|------|-------|-----------|-------|
| standalone | `<plan-folder>/mock/` | plain HTML + copied class strings + local data in the real answer shapes; opens from disk | this file |
| in-project | `<routes-root>/mock/spec<NNN>/` in the real app | the app's real components and types; local data, no API / RPC calls; needs the app's dev server | [in-project](references/in-project.md) |

Standalone mode builds `mock/` — a clickable mock that opens straight from disk and doubles as the frontend contract. The mock is **only an interactive UI**: the app's real design system, with data shaped like the real API answers.

- Its index shows the same tree as every skill that plays or tests the feature: each **use case**, then its **scenarios** in file order, each with a small surface tag (`ui` / `mcp` / `api` / `job`) and a **Core** pill on core scenarios. The picked scenario's title shows its kind (`basic`, `alternate`, `exception`) and the Core pill. One filter bar (Kind + Core only) narrows every list.
- A `ui` scenario plays on the real screen in a frame.
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
    └── states.js           pages list + entity, permissions and upstream faults per mock state
```

`template/` already has this layout working on a placeholder domain: copy it and replace the domain, don't rebuild it. Its pages read `../use-cases.js`, which is this skill's `use-cases.js` (preview data only; never copy it).

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<plan-folder | spec-folder> [frontend-app-path] [standalone | in-project]`

- Plan folder (has `overview.html` + `sequence-diagram/`, from the `design-feature` skill) → `<plan>` is the plan folder. Write `<plan>/mock/`, and read its use cases.
- Spec folder only → `<plan>` is `<spec-folder>/plan/`. Write `<plan>/mock/`.
- `<plan>/use-cases.js` missing → run the `generate-use-case` skill with the same input first, then go on. Never write use cases or scenarios here, and never read them from another skill's output.
- No frontend path → find the app: look for `package.json` with a UI framework, a `components/` folder, or ask once (use AskUserQuestion when the agent has it).
- No frontend exists at all → ask whether to use plain Tailwind defaults instead of a real design system. In-project needs a frontend, so this means standalone.
- No mode → ask once (use AskUserQuestion when the agent has it): in-project is recommended when a frontend app is found, standalone otherwise.
- **In-project → read [references/in-project.md](references/in-project.md) and follow it instead of the Hard Rules and Workflow below.** Its scan step reuses step 2 here.

## Hard Rules (standalone)

1. **Opens from `file://`**: classic `<script src>` only — no `type="module"`, no `import`, no `fetch()`. Data is `.js` setting a global (`var MOCK_DATA = …`), never `.json`.
2. **Real design system**: every class string in `components.js` and `shell.js` is copied from the app's components, with the source files listed in each file's header. Load only what the app itself loads (its CSS framework, icon set, font) — from a CDN when the app does.
3. **Real contract**: `types.ts` mirrors the real proto / OpenAPI / DTOs. Mock-only fields are marked in a comment. Never invent a field the source doesn't have.
4. **One set of rules**: `fake-api.js` and the pages call `rules.js` for every mapping, validation and computed value. The mock never enforces a rule looser or stricter than the spec.
5. **Real names and messages**: `fake-api.js` functions are named exactly like the real operations the screens call, take the real request shapes and return the real answer shapes. Every user-facing text the screens show (errors, refusals, toasts, empty states) is copied verbatim from the code: the same text `use-cases.js` quotes. Keep the texts as constants in `rules.js`. No code yet → the spec's text, as `use-cases.js` has it. Never write your own wording: a mock that says something else teaches reviewers the wrong screen.
6. **Every state has a link**: each edge state from the spec is a state in `states.js`, reachable as `page/<screen>.html?state=<id>`. Never an empty list where the real app would show an error.
7. **Mock-only UI is obvious**: the state / scenario panel stays pink and dashed. Nothing mock-only uses product styling.
8. Wrap every `sessionStorage` / `localStorage` call in `try/catch`; the mock must still work when storage is blocked.
9. No absolute local paths in any file. Code comments max 3 lines.
10. **Use cases and scenarios are data, owned by `<plan>/use-cases.js`.** Never add, remove or rename one here; when one is wrong or missing, fix it with the `generate-use-case` skill. The mock adds only `shared/scenario-play.js`: one entry per `ui` scenario id, a strict-JSON array (double quotes, no trailing commas, no comments inside) so other tools can parse it after stripping `var NAME = `. Each use case's Scenarios view in the overview is generated from both files by a script — never typed by hand — so the plan can't drift from the mock.
11. **Only `ui` scenarios play.** `mcp`, `api` and `job` scenarios get no play entry, no page, no console and no fake call. The index shows them greyed with "No mock".
12. **Every count you report is computed** (by `scripts/check-scenarios.js`), never estimated: scenarios per use case, total, playable.
13. **Controls follow the spec, then the real app.**
    - No permission → do what the real app does: a control the app hides is **hidden** in the mock too.
    - Shown unavailable with a reason only where the spec says so (e.g. an ineligible repository, a frozen environment). Show the reason where the spec puts it: a line under the control, or a tooltip. Use `aria-disabled="true"`, not native `disabled`: a disabled button gets no hover or focus, so its tooltip never shows.
14. **No filler text.** Add only the parts this skill lists. No intro line, subtitle, legend or note that repeats a heading or explains what the page shows. No extra section or example block the user did not ask for.

## Workflow (standalone)

### 1. Read the feature

- From the plan folder: `overview.html` (scope, errors) and each `sequence-diagram/NN-*` file, `.js` or `.html` (operations, participants, branches).
- From the spec: data model, contracts (proto, OpenAPI, upstream API), field mapping tables, error mapping, edge cases.
- List:
    - **Screens** the feature adds or changes → one `page/*.html` each.
    - **Operations** the screens call → `fake-api.js` functions with the real answer shapes.
    - **Edge states** (empty, unreachable, refused, ineligible, timeout, …) → mock states.
    - **Scenarios**: read `<plan>/use-cases.js`. Each one with `surface` `ui` needs a way to play it (step 4b). A reviewer plays these; they are why the mock exists. The others (`mcp`, `api`, `job`) need nothing here.

### 2. Scan the design system

This is the expensive step — delegate it to a read-only sub-agent when the agent can, and ask for concrete values, not advice:

- Theme: tokens or palette, dark mode mechanism (class / attribute / media), fonts, icon set.
- App shell: sidebar / nav / top bar markup and active states, page padding.
- Components used by the screens: button, badge / status badge, table or list, tabs or section nav, select / dropdown, input, textarea, modal, empty state, skeleton, alert / note, pagination, toast.
- The existing screen being changed (if any) and the closest existing sibling screen (e.g. an existing create form) — layout, labels, field order.
- Record `file:line` for each; they go into the `components.js` / `shell.js` headers.

### 3. Copy the template

- Copy `template/` → `<output>/mock/`.
- Rename `page/example.html` to the first real screen; add one page per screen from the same skeleton. Register each in `States.PAGES`.
- The template's "Thing" domain is a placeholder — replace all of it, including `screenUrl()` in `index.html` (the URL the real app would show) and `FakeApi.STORE` (`mock:<feature-slug>`).

### 4. Write the contract

- `contract/types.ts`: requests, responses, enums, error shape, the existing rows the mock reads, and upstream wire shapes when the feature calls another system. Add a `MockData` interface describing `data.js`.
- `contract/rules.js` (`// @ts-check`, global `Rules`): every rule from the spec as a pure function — computed values, status and field mapping, eligibility, validation, error classification, side-effect messages.
- `contract/data.js` (`// @ts-check`, global `MOCK_DATA`, typed `@type {import('./types').MockData}`):
    - Realistic names, ids, dates and volumes (enough rows to page).
    - Data in the **upstream** shape, so `rules.js` does the mapping as the real service will.
    - One entity per state that needs different data (never released, ineligible, …). Keep ids consistent with the plan's diagrams.
    - Generate large data with a throwaway script, then commit the literal result.

### 4b. Write how to play each ui scenario (`shared/scenario-play.js`)

- `SCENARIO_PLAY`: exactly one entry per `ui` scenario in `<plan>/use-cases.js`, same `id`, in the same order. No entry for `mcp`, `api` or `job` scenarios:

| Field | What |
|-------|------|
| `id` | the scenario's id; becomes `#sc-<id>` in links |
| `state` | a `States.LIST` id |
| `page` | screen file name without `.html` |
| `params` | optional query params the screen needs (`{ "status": "FAILED" }`, `{ "modal": "NEW_VERSION" }`) |
| `steps` | "How to play": imperative, with real values from the mock data (`Pick merge request !161`, `v2.3.3-1`); a role scenario starts with the role and its permissions |

- **One scenario = one screen = one result.** An entry plays exactly one `state` with one `params`. Never `parts`, part buttons or a list of states; `check-scenarios.js` errors on a `parts` field. A scenario that needs a second state or screen is two scenarios: report it for the `generate-use-case` skill.

- `title`, `story`, `surface` and `expect` come from `use-cases.js`; the file's last lines merge both lists into `SCENARIOS` for the pages and define `isPlayable()`. Keep those lines as the template has them.
- Steps name what is on screen, not how the code works. A reviewer who never read the spec should be able to follow them.
- Pick mock data that gives the scenario's example values (versions, counts, names), so "What you should see" matches the frame.
- A state with other permissions → the first step names them: "You are signed in as DEV: has repositories.versions.read, not repositories.versions.create."
- Write "tooltip" or "hover" only when the page really has one; an inline reason is read, not hovered.
- A scenario you can't play as written (its `expect` doesn't match the spec or the screen) → report it; don't change `use-cases.js`.

### 5. Write `shared/`

- `states.js`: `PAGES` and `LIST` (`id`, entity, `perms`, `faults`, `label`, `useCase` = the plan use cases it shows (`UC1 · UC2`), `hint` telling the viewer what to try). `perms` includes every permission the operations in its scenarios need.
- `fake-api.js`: local data for the screens, not an API to play. One async function per operation **a screen calls** in a `ui` scenario (refusal-only ones too, e.g. Update / Retry that the feature refuses), returning the real answer shape. Latency, permission checks, state faults, validation via `rules.js`, the real error codes and the code's exact messages (Hard Rule 5). Writes and side effects (audit rows, events) persist in `sessionStorage` under `STORE`; `log()` reads storage, since screens write it from inside their frames.
- `components.js`: the helpers the pages need, with the app's real class strings.
- `shell.js`: the app's real chrome around `#page`, plus the mock-only panel as-is:
    - `?embed=1` (inside a scenario card) → no panel; the card already shows the steps.
    - `?sc=<id>` without embed → the panel shows that scenario's steps and expect, with `← All scenarios` back to `../index.html#sc-<id>`.
    - Otherwise → the state picker.

### 6. Write the pages

- Each page: the same `<head>` (CSS stack + the scripts in template order), `Shell.mount()`, a small state object, `load()` via `fake-api.js`, `render()`.
- Show every state the real screen has: loading skeleton, error with retry, empty, filtered-empty, success toast, refusal alert, outcome-unknown.
- Deep links: support every query param a scenario needs (`?status=FAILED` pre-sets a filter, `?modal=…` opens a form), so each scenario opens on the exact state.
- Load `../../use-cases.js`, then `../shared/scenario-play.js`, before `shell.js` on every page (the index loads `../use-cases.js` and `shared/scenario-play.js`).
- Controls follow the spec's control rules (Hard Rule 13).
- Expose page state as `window.S` (or similar) so a test harness can drive it.

### 6b. The index (`index.html`)

Keep the template's layout; only change the header text and `screenUrl()`. What it does, so you keep it working:

- One block per use case, in plan order. Head, one line: `UC<n> <use case name>`, a `N refs` chip (click shows the trace IDs on the same line; Export PDF prints them) and a `plan` link (`../overview.html#uc-NN`). The head sits in the centered text column, above its use case row (not inside the list).
- Every scenario of the use case gets a row in the list, in `use-cases.js` order. An `mcp`, `api` or `job` row is greyed (dashed disc). Opening it shows the frame with no screen: "No mock" and one line naming its surface ("MCP scenario — play it with play-scenarios or test it with e2e-test"); its details show only "What it should do" (`expect`), with no Pass / Fail. A use case with no scenario shows its `none` sentence.
- Per use case, one row breaks out of the text column (`.use-case-row`, `100vw − 2 × gutter − 12px`, centered) with two columns:
    - Right: the `.frame`, at `min(1920px, 75% of the row, row − 20rem − 24px)`, so the list never drops under 20rem.
    - Left: the sticky `.scenarios` card fills the rest. It matches the frame's height (`--frame-h`, set by `fit()`); a long list scrolls inside.
    - Under 1000px the list stacks above the frame, at its full height.
- The list is an accordion of disclosure cards, the same design and slide as the deploy-plan, smoke-test and e2e-test rows (synced `theme:disclosure` and `theme:slide-js` blocks). Each `.scenario.disclosure` holds a `.disclosure-head` and a `.scenario-details` panel:
    - Head, one line: an `h3 > button` (`aria-expanded`, `aria-controls`) with a status disc and the full title (no `+` / `−` mark; wraps, never cut), then, inside the title's text after its last word (inline, so each pill wraps on its own like a word, also after a 2-line title): the kind pill (`.scenario-kind`: outlined, tinted `--ok` basic / `--neutral` alternate / `--bad` exception), a **Core** pill when `core` is true (solid `--accent`, tooltip "Core: play first") and the `surface` tag. The whole head is a mouse target.
    - The disc shows the number in an outline until the reviewer marks the scenario, then a solid `--ok` check or `--bad` cross (SVG, with the number and result in `sr-only` text). The list heading shows `N pass · N fail · N left` (at `--fs-meta`, the label's size) once anything is marked.
    - Clicking a card picks it and opens it: `.picked` gets a 2px accent ring, a blue head (22% `--accent` over `--surface`), an `--accent-fill` panel and a bold title, folded or open. Its panel slides open and its screen loads in the frame. The last picked card shuts at once. Only one card is picked per use case. The list then scrolls (smoothly, only the list, not the page) so the picked card sits at its top; `--tail` room under the last card lets any card get there, trimmed once the card has slid open.
    - Clicking the picked card slides its panel shut or open; the screen stays.
- **Filter bar** under the page title (`#scenario-filter`, filled by `addScenarioFilter()` from the synced `theme:scenario-filter-js` block): "Kind: All | Basic | Alternate | Exception" (multi-select; All clears the others), a "Core only" toggle and a live "n of N" count. Buttons are 32px high (`padding: 6px 14px`), in bordered segmented controls, with the label and count centred on them. Kind and Core only combine with AND. Hidden rows keep their order and number; a use case with nothing left shows "No scenario matches the filter". The choice is kept in `localStorage` (`mock-filter:<STORE>`). Keep the call and the `data-kind` / `data-core` attributes on each `.scenario` row.
- The open scenario's details: one line with the story as a `N refs` chip and the state label, then "Result" (Pass / Fail toggles and a note), "How to play" (ol) and "What you should see" (ul), under `.label` headings. The `.frame`: a browser bar (three dots, the URL the real app would show — `localhost:3000/<route>?…`, or `MCP · no screen` for a non-ui scenario — `<P>% of 1920 px`, Restart) and the screen in an iframe at 1920×1080 (16:9), transform-scaled by a `ResizeObserver` and a window `resize` listener to fit the frame width; the height follows at 16:9, so a short window scrolls the page. No border.
- The text column (page title, filter, results, audit log, contract) is centered at `--page-w`, the same width as the design-feature plan; dark only. The index chrome uses the synced theme block (Quiet Sheet tokens such as `--surface`, `--text-3`, `--accent`): style it with the template's CSS classes, never Tailwind gray/purple or `dark:` classes. Don't edit between the `theme:*` markers; change `theme/` in the plugin repo and run `node theme/sync.mjs`. Tailwind stays loaded for layout utilities.
- The page has an **Export PDF** button: it opens the print dialog; pick "Save as PDF". Keep the `theme:pdf` and `theme:pdf-js` blocks and the `addExportPdf(...)` call.
- `#sc-<id>` opens that scenario in its use case and scrolls to it; opening a scenario updates the hash.
- Store: clear every `FakeApi.STORE` key on page load, on every scenario pick and on Restart, so each scenario starts clean. Without it, rows written in one card leak into every other card after a reload.
- Results: each reviewer's Pass / Fail and note per `ui` scenario, in `localStorage` under `mock-results:<STORE>` (never cleared with the store, so marks survive Restart and reloads). A Results table above the audit log counts them, shows core results apart ("Core: 18/20 pass") and has "Copy as Markdown". **Clear** (in each use case's scenario list) and **Clear all** (bottom right, beside Export PDF) drop only those marks and notes, to test again. Keep it as the template has it.
- Audit log at the bottom polls storage, since the screens write it from inside their frames. Contract cards (types.ts, rules.js, data.js) stay.

### 7. Link the plan (when a plan folder exists)

- Run `node <design-feature skill dir>/scripts/scenarios-panels.js <plan-folder>` (the design-feature skill is this skill's sibling folder, `../design-feature/`). It rewrites every use case's "Scenarios (N)" view in `overview.html` (each `ui` scenario with a play entry → `Play ↗` to `mock/index.html#sc-<id>`, new tab; the others → "not in the mock") from `use-cases.js` and `scenario-play.js`, and adds "Open the mock ↗" to the Use cases heading. Don't edit those parts by hand; re-run the script after any change to the scenarios.

### 8. Verify

- `node <this skill dir>/scripts/check-scenarios.js <output>/mock`. It:
    - runs `node --check` on every `.js` file and the inline `<script>` of every page;
    - reads `<plan>/use-cases.js` (`--use-cases <file>` for another path) and `shared/scenario-play.js`: both strict JSON, every `surface` is `ui`, `mcp`, `api` or `job`;
    - every `ui` scenario has exactly one play entry with one `state`, `page` and `steps`, no `parts`; every `state` is in `states.js` and every `page` exists;
    - `mcp`, `api` and `job` scenarios have no play entry, and every play entry matches a scenario;
    - prints the scenarios per use case, the total and how many play in the mock.
    - Exit code 0 before you go on. A scenario that is wrong in `use-cases.js` → report it for the `generate-use-case` skill; don't edit it here.
- Type-check the contract when Node is available (a temporary install is fine):
  `npx -y -p typescript@5 tsc --noEmit --allowJs --checkJs --strict --lib es2022,dom contract/types.ts contract/rules.js contract/data.js`
- Open `index.html` and every page × state in a headless browser when one is available (`--allow-file-access-from-files`). Check the console for errors and look at the screenshots: each frame shows its screen scaled to fit, `#sc-<id>` opens the right scenario, a non-ui scenario shows "No mock", core rows show the Core pill, and the Kind + Core only filter gives the right "n of N".
- Play each `ui` scenario's steps in its frame and compare the screen with its `expect`, quoted texts word for word. A mismatch → read the code for the real text, then fix `rules.js`, the data or the page.
- Check every relative `href` / `src` resolves to a file.
- Grep for absolute local paths and remove them.

### 8b. Review the mock (always)

- Follow [references/mock-review.md](references/mock-review.md): two fresh review-only agents (UI fidelity, functional) in parallel, then one fresh fix agent, then step 7 and step 8 again.
- Run by the design-feature skill → skip it here; design-feature runs the review as its step 6b, after its own checks.

### 9. Confirm

- Output: `✅ Mock created at: {output}/mock/index.html`
- Scenarios per use case, the total and how many play in the mock (the rest show "No mock"), copied from `check-scenarios.js` output — never counted by eye.
- The review: both verdicts, findings by severity, how many were fixed, and each conflict with the side that won.
- List the pages and mock states, and what could not be copied from the real design system (logos, images, fonts), plus the CDNs the pages need.
- Remind the user: open `mock/index.html` directly; no server or build is needed.
