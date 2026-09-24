---
name: generate-mock-ui
description: Build an interactive, clickable mock UI for a planned feature in the target app's real design system — typed contract (real types, spec rules, realistic data), a fake API with the real operation names, one page per screen, and a scenario switcher for every edge state. Use when the user asks for a mock UI, UI prototype, clickable mock or wireframe for a feature, or when the plan-feature skill offers one.
argument-hint: <plan-folder | spec-folder> [frontend-app-path]
---

# Mock UI Generator

Build `mock/` — a clickable mock that opens straight from disk and doubles as the frontend contract.

```
mock/
├── index.html              pages × scenarios, fake API console, side-effect log
├── contract/
│   ├── types.ts            real shapes to implement (reference; never loaded by pages)
│   ├── rules.js            spec rules as pure functions
│   └── data.js             realistic data in the real upstream shapes, typed via JSDoc
├── page/
│   └── <screen>.html       one file per screen; state from ?scenario=
└── shared/
    ├── fake-api.js         the real operation names, served from contract/
    ├── components.js       the app's component classes
    ├── shell.js            the app's chrome + the mock-only scenario panel
    └── scenarios.js        pages list + entity and upstream faults per scenario
```

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

**Expected format:** `<plan-folder | spec-folder> [frontend-app-path]`

- Plan folder (has `overview.html` + `sequence-diagram/`, from the `plan-feature` skill) → write `<plan-folder>/mock/`, and read its flows.
- Spec folder only → write `<spec-folder>/plan/mock/`.
- No frontend path → find the app: look for `package.json` with a UI framework, a `components/` folder, or ask once (use AskUserQuestion when the agent has it).
- No frontend exists at all → ask whether to use plain Tailwind defaults instead of a real design system.

## Hard Rules

1. **Opens from `file://`**: classic `<script src>` only — no `type="module"`, no `import`, no `fetch()`. Data is `.js` setting a global (`var MOCK_DATA = …`), never `.json`.
2. **Real design system**: every class string in `components.js` and `shell.js` is copied from the app's components, with the source files listed in each file's header. Load only what the app itself loads (its CSS framework, icon set, font) — from a CDN when the app does.
3. **Real contract**: `types.ts` mirrors the real proto / OpenAPI / DTOs. Mock-only fields are marked in a comment. Never invent a field the source doesn't have.
4. **One set of rules**: the fake API calls `rules.js` for every mapping, validation and computed value. The mock never enforces a rule looser or stricter than the spec.
5. **Real names**: fake-API functions are named exactly like the real operations and take the real request shapes.
6. **Every state has a link**: each edge state from the spec is a scenario in `scenarios.js`, reachable as `page/<screen>.html?scenario=<id>`. Never an empty list where the real app would show an error.
7. **Mock-only UI is obvious**: the scenario panel stays pink and dashed. Nothing mock-only uses product styling.
8. Wrap every `sessionStorage` / `localStorage` call in `try/catch`; the mock must still work when storage is blocked.
9. No absolute local paths in any file. Code comments max 3 lines.

## Workflow

### 1. Read the feature

- From the plan folder: `overview.html` (scope, errors) and each `sequence-diagram/NN-*.js` (operations, participants, branches).
- From the spec: data model, contracts (proto, OpenAPI, upstream API), field mapping tables, error mapping, edge cases.
- List:
    - **Screens** the feature adds or changes → one `page/*.html` each.
    - **Operations** the UI calls → fake-API functions.
    - **Edge states** (empty, unreachable, refused, ineligible, timeout, …) → scenarios.

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
- The template's "Thing" domain is a placeholder — replace all of it.

### 4. Write the contract

- `contract/types.ts`: requests, responses, enums, error shape, the existing rows the mock reads, and upstream wire shapes when the feature calls another system. Add a `MockData` interface describing `data.js`.
- `contract/rules.js` (`// @ts-check`, global `Rules`): every rule from the spec as a pure function — computed values, status and field mapping, eligibility, validation, error classification, side-effect messages.
- `contract/data.js` (`// @ts-check`, global `MOCK_DATA`, typed `@type {import('./types').MockData}`):
    - Realistic names, ids, dates and volumes (enough rows to page).
    - Data in the **upstream** shape, so `rules.js` does the mapping as the real service will.
    - One entity per scenario that needs different data (never released, ineligible, …). Keep ids consistent with the plan's diagrams.
    - Generate large data with a throwaway script, then commit the literal result.

### 5. Write `shared/`

- `scenarios.js`: `PAGES` and `LIST` (`id`, entity, `faults`, `label`, `flow` = plan flow numbers, `hint` telling the viewer what to try).
- `fake-api.js`: one async function per operation. Latency, scenario faults, validation via `rules.js`, the real error codes and user-facing messages. Writes and side effects (audit rows, events) persist in `sessionStorage`. Provide `SAMPLES` for the console.
- `components.js`: the helpers the pages need, with the app's real class strings.
- `shell.js`: the app's real chrome around `#page`, plus the scenario panel as-is.

### 6. Write the pages

- Each page: the same `<head>` (CSS stack + the six scripts in template order), `Shell.mount()`, a small state object, `load()` via the fake API, `render()`.
- Show every state the real screen has: loading skeleton, error with retry, empty, filtered-empty, success toast, refusal alert, outcome-unknown.
- Deep links: read extra query params (`?mode=`, `?line=`) so each plan flow can open the exact state.
- Expose page state as `window.S` (or similar) so a test harness can drive it.

### 7. Link the plan (when a plan folder exists)

- In `overview.html`, fill each flow's "Try it in the mock" cards with `mock/page/<screen>.html?scenario=<id>` links (`target="_blank" rel="noopener"`), and the Mock UI section's cards.
- Flows with no UI (API / MCP only) link to `mock/index.html` — its console calls the same operations.

### 8. Verify

- Type-check the contract when Node is available (a temporary install is fine):
  `npx -y -p typescript@5 tsc --noEmit --allowJs --checkJs --strict --lib es2022,dom contract/types.ts contract/rules.js contract/data.js`
- Open every page × scenario in a headless browser when one is available (`--allow-file-access-from-files`). Check the console for errors and look at the screenshots.
- Check every relative `href` / `src` resolves to a file.
- Grep for absolute local paths and remove them.

### 9. Confirm

- Output: `✅ Mock created at: {output}/mock/index.html`
- List the pages and scenarios, and what could not be copied from the real design system (logos, images, fonts), plus the CDNs the pages need.
- Remind the user: open `mock/index.html` directly; no server or build is needed.
