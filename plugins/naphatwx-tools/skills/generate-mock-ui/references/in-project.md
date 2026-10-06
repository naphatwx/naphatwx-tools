# In-project mock

Mock pages written inside the real frontend app, built from its real components and real types. The pages call no API or RPC: data is local, and every event only changes local state.

```
<routes-root>/mock/spec<NNN>/
├── page.tsx                index: screens × scenarios, one link each
├── <screen>/page.tsx       one route per screen; state from ?scenario=
└── _mock/                  private folder, not a route
    ├── types.ts            only types the app doesn't generate yet
    ├── rules.ts            spec rules as pure functions
    ├── data.ts             realistic data, typed with the real types
    ├── scenarios.ts        scenario id → data set or forced state
    ├── use<Screen>.ts      one hook per screen: state + events
    └── ScenarioPanel.tsx   mock-only scenario switcher
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
7. **Every state has a link.** Each edge state from the spec is a scenario, reachable as `/mock/spec<NNN>/<screen>?scenario=<id>`. Never an empty list where the real app would show an error.
8. **Mock-only UI is obvious.** `ScenarioPanel` is fixed at the bottom right, dashed pink border, labelled `Mock scenario`. Nothing mock-only uses product styling.
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
- `data.ts`: realistic names, ids, dates and volumes (enough rows to page), typed with the real types. One entity per scenario that needs different data. Keep ids consistent with the plan's diagrams.
- `scenarios.ts`: `SCENARIOS` list (`id`, `label`, `flow` = plan flow numbers, `hint` telling the viewer what to try, the data set or forced state) and a `useScenario()` helper that reads `?scenario=`.
- `use<Screen>.ts`: the screen's state and events. Fake latency with a short timeout so loading states show; scenario faults turn into the real error codes and messages from `rules.ts`.
- `ScenarioPanel.tsx`: a select of the scenarios that changes `?scenario=`, plus the current hint (Hard Rule 8).

### 4. Write the pages

- Each `<screen>/page.tsx`: a client component (`'use client'` in Next.js) that uses the app's page layout, calls `use<Screen>()` and renders `<ScenarioPanel />`.
- Show every state the real screen has: loading skeleton, error with retry, empty, filtered-empty, success toast, refusal alert, outcome-unknown.
- Every interaction works: submit, edit, delete, filter, sort, paginate, open / close modal, confirm, cancel.
- Deep links: read extra query params (`?mode=`, `?line=`) so each plan flow can open the exact state.
- `page.tsx` at the folder root: a plain index listing every screen × scenario as a link, with each scenario's hint.

### 5. Link the plan (when a plan folder exists)

- In `overview.html`, fill each flow's "Try in the mock" line with `http://localhost:<port>/mock/spec<NNN>/<screen>?scenario=<id>` links joined by ` · ` (`target="_blank" rel="noopener"`), and point the Mock UI section's link at `http://localhost:<port>/mock/spec<NNN>`.
- Add one muted line to the Mock UI section: the mock runs in the app, start it with the app's dev command.
- Flows with no UI (API / MCP only) → no "Try in the mock" line.

### 6. Verify

- Run the app's typecheck and lint on the mock folder (e.g. `npx tsc --noEmit -p <app>`, `npx eslint <mock-folder>`). Fix every error in the mock folder.
- Grep the mock folder for `fetch(`, the app's API client imports and server actions; remove any (Hard Rule 2).
- Dev server running and a headless browser available → open every screen × scenario, check the console for errors and look at the screenshots. Not running → don't start a long-lived server unasked; list the URLs instead.
- Grep the mock folder for absolute local paths and remove them.

### 7. Confirm

- Output: `✅ Mock created at: <mock-folder>` (repo-relative) and the index URL `http://localhost:<port>/mock/spec<NNN>`.
- List the screens and scenarios, the types still marked `TODO: not generated yet`, and any route line the user must add (Hard Rule 1).
- Note when `git check-ignore` says the folder is not ignored yet.
