---
name: generate-mock-ui
description: Build a clickable mock UI for a feature in the app's real design system, standalone or inside the app, with every edge state. Use when the user says "mock UI for spec 127" or "clickable prototype". Screens only, no real API; the full plan is design-feature.
argument-hint: <plan-folder | spec-folder> [frontend-app-path] [standalone | in-project]
---

# Mock UI Generator

Build a clickable mock of a planned feature, in one of two modes:

| Mode | Where | Built from | Steps |
|------|-------|-----------|-------|
| standalone | `<plan-folder>/mock/` | plain HTML + copied class strings + fake API; opens from disk | this file |
| in-project | `<routes-root>/mock/spec<NNN>/` in the real app | the app's real components and types; local data, no API / RPC calls; needs the app's dev server | [in-project](references/in-project.md) |

Standalone mode builds `mock/` — a clickable mock that opens straight from disk and doubles as the frontend contract. Its index is organised by **use case**: one block per plan flow, a chip per use case, and a card that plays the picked use case on the real screen.

The use cases themselves are not written here. They live in `<plan>/use-cases.js`, written by the `generate-use-case` skill (`naphatwx-tools:generate-use-case` in Claude Code). This skill only adds how to play each one.

```
<plan>/use-cases.js         USE_CASE_FLOWS + USE_CASES (generate-use-case); read-only here
mock/
├── index.html              one block per flow: a side list of use cases, a card that plays the picked one, its steps beside it; audit log; contract links
├── contract/
│   ├── types.ts            real shapes to implement (reference; never loaded by pages)
│   ├── rules.js            spec rules as pure functions
│   └── data.js             realistic data in the real upstream shapes, typed via JSDoc
├── page/
│   ├── <screen>.html       one file per screen; state from ?scenario= and the params its use cases need
│   └── console.html        "MCP client" panel for API / MCP use cases (only when the feature has one)
└── shared/
    ├── use-case-play.js    USE_CASE_PLAY: how to play each use case (scenario, page, steps), keyed by id
    ├── fake-api.js         the real operation names, served from contract/
    ├── components.js       the app's component classes
    ├── shell.js            the app's chrome + the mock-only scenario / use-case panel
    └── scenarios.js        pages list + entity, permissions and upstream faults per scenario
```

`template/` already has this layout working on a placeholder domain: copy it and replace the domain, don't rebuild it. Its pages read `../use-cases.js`, which is this skill's `use-cases.js` (preview data only; never copy it).

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<plan-folder | spec-folder> [frontend-app-path] [standalone | in-project]`

- Plan folder (has `overview.html` + `sequence-diagram/`, from the `design-feature` skill) → `<plan>` is the plan folder. Write `<plan>/mock/`, and read its flows.
- Spec folder only → `<plan>` is `<spec-folder>/plan/`. Write `<plan>/mock/`.
- `<plan>/use-cases.js` missing → run the `generate-use-case` skill with the same input first. Never write use cases here.
- No frontend path → find the app: look for `package.json` with a UI framework, a `components/` folder, or ask once (use AskUserQuestion when the agent has it).
- No frontend exists at all → ask whether to use plain Tailwind defaults instead of a real design system. In-project needs a frontend, so this means standalone.
- No mode → ask once (use AskUserQuestion when the agent has it): in-project is recommended when a frontend app is found, standalone otherwise.
- **In-project → read [references/in-project.md](references/in-project.md) and follow it instead of the Hard Rules and Workflow below.** Its scan step reuses step 2 here.

## Hard Rules (standalone)

1. **Opens from `file://`**: classic `<script src>` only — no `type="module"`, no `import`, no `fetch()`. Data is `.js` setting a global (`var MOCK_DATA = …`), never `.json`.
2. **Real design system**: every class string in `components.js` and `shell.js` is copied from the app's components, with the source files listed in each file's header. Load only what the app itself loads (its CSS framework, icon set, font) — from a CDN when the app does.
3. **Real contract**: `types.ts` mirrors the real proto / OpenAPI / DTOs. Mock-only fields are marked in a comment. Never invent a field the source doesn't have.
4. **One set of rules**: the fake API calls `rules.js` for every mapping, validation and computed value. The mock never enforces a rule looser or stricter than the spec.
5. **Real names**: fake-API functions are named exactly like the real operations and take the real request shapes.
6. **Every state has a link**: each edge state from the spec is a scenario in `scenarios.js`, reachable as `page/<screen>.html?scenario=<id>`. Never an empty list where the real app would show an error.
7. **Mock-only UI is obvious**: the scenario panel stays pink and dashed. Nothing mock-only uses product styling.
8. Wrap every `sessionStorage` / `localStorage` call in `try/catch`; the mock must still work when storage is blocked.
9. No absolute local paths in any file. Code comments max 3 lines.
10. **Use cases are data, owned by `<plan>/use-cases.js`.** Never add, remove or rename a use case here; when one is wrong or missing, fix it with the `generate-use-case` skill. The mock adds only `shared/use-case-play.js`: one entry per use case id, a strict-JSON array (double quotes, no trailing commas, no comments inside) so other tools can parse it after stripping `var NAME = `. The overview's Use cases section and every "Try in the mock" line are generated from both files by a script — never typed by hand — so the plan can't drift from the mock.
11. **Every count you report is computed** (by `scripts/check-use-cases.js`), never estimated: use cases per flow, total, console runs.
12. **Controls follow the spec, then the real app.**
    - No permission → do what the real app does: a control the app hides is **hidden** in the mock too.
    - Shown unavailable with a reason (`aria-disabled="true"` + a tooltip) only where the spec says so (e.g. an ineligible repository, a frozen environment). Use `aria-disabled`, not native `disabled`: a disabled button gets no hover, so its tooltip never shows.

## Workflow (standalone)

### 1. Read the feature

- From the plan folder: `overview.html` (scope, errors) and each `sequence-diagram/NN-*` file, `.js` or `.html` (operations, participants, branches).
- From the spec: data model, contracts (proto, OpenAPI, upstream API), field mapping tables, error mapping, edge cases.
- List:
    - **Screens** the feature adds or changes → one `page/*.html` each.
    - **Operations** the UI calls → fake-API functions.
    - **Edge states** (empty, unreachable, refused, ineligible, timeout, …) → scenarios.
    - **Use cases**: read `<plan>/use-cases.js`. Each one with `surface` `ui` or `api` needs a way to play it (step 4b). A reviewer plays these; they are why the mock exists.

### 2. Scan the design system

This is the expensive step — delegate it to a read-only sub-agent when the agent can, and ask for concrete values, not advice:

- Theme: tokens or palette, dark mode mechanism (class / attribute / media), fonts, icon set.
- App shell: sidebar / nav / top bar markup and active states, page padding.
- Components used by the screens: button, badge / status badge, table or list, tabs or section nav, select / dropdown, input, textarea, modal, empty state, skeleton, alert / note, pagination, toast.
- The existing screen being changed (if any) and the closest existing sibling screen (e.g. an existing create form) — layout, labels, field order.
- Record `file:line` for each; they go into the `components.js` / `shell.js` headers.

### 3. Copy the template

- Copy `template/` → `<output>/mock/`.
- Rename `page/example.html` to the first real screen; add one page per screen from the same skeleton. Register each in `Scenarios.PAGES`.
- No API / MCP use case → delete `page/console.html`.
- The template's "Thing" domain is a placeholder — replace all of it, including `screenUrl()` in `index.html` (the URL the real app would show) and `FakeApi.STORE` (`mock:<feature-slug>`).

### 4. Write the contract

- `contract/types.ts`: requests, responses, enums, error shape, the existing rows the mock reads, and upstream wire shapes when the feature calls another system. Add a `MockData` interface describing `data.js`.
- `contract/rules.js` (`// @ts-check`, global `Rules`): every rule from the spec as a pure function — computed values, status and field mapping, eligibility, validation, error classification, side-effect messages.
- `contract/data.js` (`// @ts-check`, global `MOCK_DATA`, typed `@type {import('./types').MockData}`):
    - Realistic names, ids, dates and volumes (enough rows to page).
    - Data in the **upstream** shape, so `rules.js` does the mapping as the real service will.
    - One entity per scenario that needs different data (never released, ineligible, …). Keep ids consistent with the plan's diagrams.
    - Generate large data with a throwaway script, then commit the literal result.

### 4b. Write how to play each use case (`shared/use-case-play.js`)

- `USE_CASE_PLAY`: exactly one entry per use case in `<plan>/use-cases.js`, same `id`, in the same order:

| Field | What |
|-------|------|
| `id` | the use case's id; becomes `#uc-<id>` in links |
| `scenario` | a `Scenarios.LIST` id |
| `page` | screen file name without `.html`, or `"console"` |
| `params` | optional query params the screen needs (`{ "status": "FAILED" }`, `{ "modal": "NEW_VERSION" }`) |
| `steps` | "How to play": imperative, with real values from the mock data (`Pick merge request !161`, `v2.3.3-1`) |
| `op`, `req` | API / MCP use cases: the preset operation and request |
| `skip` | instead of the fields above, for a use case with nothing to play (a `job`, a migration): one sentence saying why |

- `title`, `story` and `expect` come from `use-cases.js`; the file's last lines merge both lists into `USE_CASES` for the pages. Keep those lines as the template has them.
- Steps name what is on screen, not how the code works. A reviewer who never read the spec should be able to follow them.
- A use case you can't play as written (its `expect` doesn't match the spec or the screen) → report it; don't change `use-cases.js`.

### 5. Write `shared/`

- `scenarios.js`: `PAGES` and `LIST` (`id`, entity, `perms`, `faults`, `label`, `flow` = plan flow numbers, `hint` telling the viewer what to try). `perms` includes every permission the operations in its use cases need.
- `fake-api.js`: one async function per operation **any use case references** (refusal-only ones too, e.g. Update / Retry that the feature refuses). Latency, permission checks, scenario faults, validation via `rules.js`, the spec's error codes and user-facing messages. Writes and side effects (audit rows, events) persist in `sessionStorage` under `STORE`; `log()` reads storage, since screens write it from inside their frames. Provide `SAMPLES` for the console.
- `components.js`: the helpers the pages need, with the app's real class strings.
- `shell.js`: the app's real chrome around `#page`, plus the mock-only panel as-is:
    - `?embed=1` (inside a use-case card) → no panel; the card already shows the steps.
    - `?uc=<id>` without embed → the panel shows that use case's steps and expect, with `← All use cases` back to `../index.html#uc-<id>`.
    - Otherwise → the scenario picker.

### 6. Write the pages

- Each page: the same `<head>` (CSS stack + the six scripts in template order), `Shell.mount()`, a small state object, `load()` via the fake API, `render()`.
- Show every state the real screen has: loading skeleton, error with retry, empty, filtered-empty, success toast, refusal alert, outcome-unknown.
- Deep links: support every query param a use case needs (`?status=FAILED` pre-sets a filter, `?modal=…` opens a form), so each use case opens on the exact state.
- Load `../../use-cases.js`, then `../shared/use-case-play.js`, before `shell.js` on every page (the index loads `../use-cases.js` and `shared/use-case-play.js`).
- Controls follow the spec's control rules (Hard Rule 12).
- Expose page state as `window.S` (or similar) so a test harness can drive it.
- API / MCP use cases → `page/console.html`: tool name, operation select, params textarea, Run, result, audit log. It reads `?scenario=` and `?uc=` to preset the operation and request.

### 6b. The index (`index.html`)

Keep the template's layout; only change the header text and `screenUrl()`. What it does, so you keep it working:

- One block per flow, in plan order. Head: `3.N <flow name>`, refs on the right, a `plan` link to `../overview.html#flow-NN`.
- Skipped use cases (`skip`) get no chip: one `Not in the mock: <title> — <why>` line under the flow's card. A flow with only skipped ones shows the first reason instead of chips.
- Per flow, one row breaks out of the text column (`.uc-row`, up to `min(100vw − 2 × gutter, 1880px)`): a sticky side list on the left (17rem, `role="tablist"`, chips are `.tab` `role="tab"` buttons with `aria-selected`), the card and frame in the middle, a sticky `aside.guide` on the right (20rem). Each chip: number, full title (wraps, never cut), `surface` tag. The picked chip gets a solid `--accent` fill with `--bg` text. At 1400px or less the guide moves to the left column, above the list. Under 900px everything stacks: guide, list, frame.
- The picked use case, flat on the page (no card around it): title + story + scenario label, then one `.frame`. The guide column, always open, holds "How to play" (ol) then "What you should see" (ul), under sentence-case `.label` headings. The `.frame`: a browser bar (three dots, the URL the real app would show — `localhost:3000/<route>?…` or `MCP client · <Service> · <op>` — `<P>% of 1600 px`, Restart) and the screen in an iframe at 1600×940, transform-scaled by a `ResizeObserver` and a window `resize` listener to fit both the card width and the window height (flow heading, title and toolbar included), no border.
- Page max width 1200px, dark only. The index chrome uses the synced theme block (Quiet Sheet tokens such as `--surface`, `--text-3`, `--accent`): style it with the template's CSS classes, never Tailwind gray/purple or `dark:` classes. Don't edit between the `theme:*` markers; change `theme/` in the plugin repo and run `node theme/sync.mjs`. Tailwind stays loaded for layout utilities.
- `#uc-<id>` picks that chip in its flow and scrolls to it; picking a chip updates the hash.
- State: clear every `FakeApi.STORE` key on page load, on every chip pick and on Restart, so each use case starts clean. Without it, rows written in one card leak into every other card after a reload.
- Audit log at the bottom polls storage, since the screens write it from inside their frames. Contract cards (types.ts, rules.js, data.js) stay.

### 7. Link the plan (when a plan folder exists)

- Run `node <design-feature skill dir>/scripts/use-cases-section.js <plan-folder>` (the design-feature skill is this skill's sibling folder, `../design-feature/`). It rewrites `overview.html` section 07 "Use cases" and every flow's "Try in the mock" line (each playable use case → `mock/index.html#uc-<id>`, new tab) from `use-cases.js` and `use-case-play.js`, and adds the line to flows that had none. Don't edit those parts by hand; re-run the script after any change to the use cases.

### 8. Verify

- `node <this skill dir>/scripts/check-use-cases.js <output>/mock`. It:
    - runs `node --check` on every `.js` file and the inline `<script>` of every page;
    - reads `<plan>/use-cases.js` (`--use-cases <file>` for another path) and `shared/use-case-play.js`: both strict JSON, every use case has exactly one play entry and every play entry matches a use case, every `scenario` is in `scenarios.js`, every `page` exists;
    - runs every console use case against the fake API in a Node `vm` sandbox (location and `sessionStorage` stubbed) and prints the result next to its `expect`.
    - Read each console result against its `expect`. Any mismatch → fix the data, the fake API or the expect text, then re-run. Exit code 0 and no mismatch before you go on.
- Type-check the contract when Node is available (a temporary install is fine):
  `npx -y -p typescript@5 tsc --noEmit --allowJs --checkJs --strict --lib es2022,dom contract/types.ts contract/rules.js contract/data.js`
- Open `index.html` and every page × scenario in a headless browser when one is available (`--allow-file-access-from-files`). Check the console for errors and look at the screenshots: each card's iframe shows its screen scaled to fit, `#uc-<id>` picks the right chip.
- Check every relative `href` / `src` resolves to a file.
- Grep for absolute local paths and remove them.

### 8b. Review the mock (always)

- Follow [references/mock-review.md](references/mock-review.md): two fresh review-only agents (UI fidelity, functional) in parallel, then one fresh fix agent, then step 7 and step 8 again.
- Run by the design-feature skill → skip it here; design-feature runs the review as its step 6b, after its own checks.

### 9. Confirm

- Output: `✅ Mock created at: {output}/mock/index.html`
- Use cases per flow, the total and how many are playable, copied from `check-use-cases.js` output — never counted by eye.
- The review: both verdicts, findings by severity, how many were fixed, and each conflict with the side that won.
- List the pages and scenarios, and what could not be copied from the real design system (logos, images, fonts), plus the CDNs the pages need.
- Remind the user: open `mock/index.html` directly; no server or build is needed.
