# In-project mock

Mock pages written inside the real frontend app, built from its real components and real types. The pages call no API or RPC: data is local, and every event only changes local state.

```
<routes-root>/mock/spec<NNN>/
├── page.tsx                index: scenarios grouped by use case, one link each
├── <screen>/page.tsx       one route per screen; state from ?state=
└── _mock/                  private folder, not a route
    ├── types.ts            only types the app doesn't generate yet
    ├── rules.ts            spec rules as pure functions
    ├── data.ts             realistic data, typed with the real types
    ├── states.ts           mock state id → data set or forced state
    ├── use-cases.ts        copy of <plan>/use-cases.js as TS exports; never edited here
    ├── scenario-play.ts    SCENARIO_PLAY: how to play each scenario, same shape as standalone
    ├── use<Screen>.ts      one hook per screen: state + events
    └── StatePanel.tsx      mock-only state switcher
```

The tree uses Next.js App Router names. Another router → keep the same split with that framework's file names.

## Where it lives

- `<routes-root>`: the folder whose pages render inside the app's main layout (sidebar, top bar), e.g. `apps/<web-app>/app/(main)/` in a Next.js app with a `(main)` route group.
- `spec<NNN>`: the spec number from the spec folder name (`specs/164-foo/` → `spec164`). No number → ask once.
- Folder already exists → read it, update the screens it has and add the missing ones. Never delete files you didn't write.

## Hard Rules

1. **Write only inside `mock/spec<NNN>/`.** Never edit another file: no shared components, no route registry, no `.gitignore`, no git branch or commit. The user manages branches and ignores the folder.
    - A router that needs a route registered outside the folder → don't add it; give the user the exact line in the confirm step.
2. **No API or RPC calls.** No `fetch`, no RPC or HTTP client, no data-fetching hook, no server action, no import of the app's API layer. Data comes from `_mock/data.ts`; events change local state.
3. **Real components only.** Import the app's existing components, layout parts, icons and tokens. Write no new design-system code; a missing piece is built from existing parts inside the page.
4. **Real types.** Import generated proto / OpenAPI / DTO types from the app. A type the feature adds but the app doesn't generate yet goes in `_mock/types.ts`, each marked `// TODO: not generated yet — <source file>`. Never invent a field the source doesn't have.
5. **One set of rules.** Every mapping, validation, computed value and refusal goes through `_mock/rules.ts`, exactly as strict as the spec.
6. **One hook per screen.** `use<Screen>()` holds the screen's state and event handlers, with the return shape the real hook will have. Building the real feature then means replacing that hook.
7. **Every state has a link.** Each edge state from the spec is a mock state, reachable as `/mock/spec<NNN>/<screen>?state=<id>`. Never an empty list where the real app would show an error.
8. **Mock-only UI is obvious.** `StatePanel` is fixed at the bottom right, dashed pink border, labelled `Mock state`. Nothing mock-only uses product styling.
9. The folder passes the app's own typecheck and lint. Code comments max 3 lines; no absolute local paths.

## Workflow

### 1. Find the app

- Use the frontend path from the input, or find the app as in `SKILL.md` "User Input".
- Read the app's router setup to find `<routes-root>`, its `package.json` scripts (dev, typecheck, lint) and the dev server port.

### 2. Scan the design system

- Same as `SKILL.md` step 2, but record **import paths and props**, not class strings: which component to import for each piece, and how the closest existing screen uses it.
- Also record how existing pages read query params, show toasts, open modals and render empty / error / loading states. Copy those patterns.

### 3. Write `_mock/`

- `types.ts`: only the types not generated yet (Hard Rule 4). Empty → leave the file out.
- `rules.ts`: every spec rule as a pure function — status and field mapping, eligibility, validation, error classification, the user-facing messages.
- `data.ts`: realistic names, ids, dates and volumes (enough rows to page), typed with the real types. One entity per state that needs different data. Keep ids consistent with the plan's diagrams.
- `use-cases.ts`: `<plan>/use-cases.js` (from the `generate-use-case` skill) copied as-is, with `var` turned into `export const`. The app can't load a file outside itself, so this is a copy: re-copy it whenever `use-cases.js` changes, never edit it here.
- `scenario-play.ts`: `export const SCENARIO_PLAY = [...]`, a strict-JSON array with the fields of `SKILL.md` step 4b (`page` = the screen route segment), one entry per scenario id.
- `states.ts`: `STATES` list (`id`, `label`, `useCase` = the plan use cases it shows, `hint` telling the viewer what to try, the data set or forced state) and a `useMockState()` helper that reads `?state=`.
- `use<Screen>.ts`: the screen's state and events. Fake latency with a short timeout so loading states show; state faults turn into the real error codes and messages from `rules.ts`.
- `StatePanel.tsx`: a select of the states that changes `?state=`, plus the current hint (Hard Rule 8). With `?sc=<id>` it shows that scenario's steps and expect instead, with a link back to the index.

### 4. Write the pages

- Each `<screen>/page.tsx`: a client component (`'use client'` in Next.js) that uses the app's page layout, calls `use<Screen>()` and renders `<StatePanel />`.
- Show every state the real screen has: loading skeleton, error with retry, empty, filtered-empty, success toast, refusal alert, outcome-unknown.
- Every interaction works: submit, edit, delete, filter, sort, paginate, open / close modal, confirm, cancel.
- Deep links: read extra query params (`?mode=`, `?line=`) so each scenario can open the exact state.
- `page.tsx` at the folder root: one block per use case (`UC<n>` + name), each listing its playable scenarios as links to `<screen>?state=<state id>&sc=<scenario id>` with the first `expect` line, then a `Not in the mock` line per skipped one; a use case with none shows its `none` sentence.
- Controls follow the spec, then the real app: a control the user has no permission for is hidden when the real app hides it; shown unavailable with a reason (`aria-disabled` + tooltip) only where the spec says so.

### 5. Link the plan (when a plan folder exists)

- Run the design-feature skill's `scripts/scenarios-panels.js` with the in-project source and links:
  `node <design-feature skill dir, sibling of this skill>/scripts/scenarios-panels.js <plan-folder> --play-file <mock-folder>/_mock/scenario-play.ts --play "http://localhost:<port>/mock/spec<NNN>/{page}?state={state}&sc={id}" --mock http://localhost:<port>/mock/spec<NNN>`
- It writes every use case's "Scenarios (N)" view and the "Open the mock ↗" link. Then add one muted line under the Use cases section's first line: the mock runs in the app, start it with the app's dev command.

### 6. Verify

- Run the app's typecheck and lint on the mock folder (e.g. `npx tsc --noEmit -p <app>`, `npx eslint <mock-folder>`). Fix every error in the mock folder.
- Grep the mock folder for `fetch(`, the app's API client imports and server actions; remove any (Hard Rule 2).
- Dev server running and a headless browser available → open every screen × state, check the console for errors and look at the screenshots. Not running → don't start a long-lived server unasked; list the URLs instead.
- Grep the mock folder for absolute local paths and remove them.

### 6b. Review the mock

- Follow [mock-review.md](mock-review.md) (skip it when the design-feature skill runs this; it reviews in its step 6b). The functional reviewer traces each scenario through `_mock/` instead of a Node `vm`.

### 7. Confirm

- Output: `✅ Mock created at: <mock-folder>` (repo-relative) and the index URL `http://localhost:<port>/mock/spec<NNN>`.
- Scenarios per use case and the total, as printed by `scenarios-panels.js` — never counted by eye.
- List the screens and mock states, the types still marked `TODO: not generated yet`, and any route line the user must add (Hard Rule 1).
- Note when `git check-ignore` says the folder is not ignored yet.
