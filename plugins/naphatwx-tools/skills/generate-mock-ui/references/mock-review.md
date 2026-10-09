# Mock review

Two fresh agents review the mock, one fix agent applies what they find. Run it once the mock is built and its Verify step passes, and before anything is published.

Why fresh agents: the agent that built the mock reads its own intent into it. A reviewer that never saw the build reads the mock the way a user or a developer will.

```
mock built + verified
   ├── UI fidelity reviewer ─┐  (in parallel, review only)
   └── Functional reviewer ──┤
                             ▼
                 merge, settle conflicts
                             ▼
                  one fix agent applies all
                             ▼
     regenerate Scenarios views → re-run Verify
```

- Spawn both reviewers in **one message**, so they run in parallel. Each is a **fresh** agent (not the one that built the mock) with a **review-only** prompt: it edits no file.
- The agent can't spawn sub-agents → do the two reviews yourself, one after the other, then the fixes. Say so in the confirm step: a self-review is weaker.
- Give each reviewer: the spec folder, the mock folder, the plan's `overview.html` when it exists, the frontend app path (or "none"), and its brief below.

## 1. UI fidelity reviewer

Agent: the repo's design specialist agent when it has one, else a general-purpose agent.

Question: **"Would a user think this IS the real app?"**

- First check whether the feature is already built on the branch (`git log`, grep the app for its components and routes).
    - Built → compare the mock against that code.
    - Not built → compare against the closest existing pages and the repo's `DESIGN-SYSTEM.md` (or equivalent).
    - No frontend app at all → compare against the design system the mock claims to use, and say the verdict is limited.
- Per region — shell / header / nav, toolbar, table, states (loading, empty, error), modal, toasts — check:
    - layout and spacing, class strings, light and dark colours, icons;
    - column names and order, badge styles;
    - which controls are hidden and which are shown unavailable;
    - every copy string: labels, titles, tooltips, empty and error text, toast text.
- Ignore the mock-only pink panels and the scenario wrapper page (`index.html`).
- Report:
    - numbered findings, each with severity `HIGH` / `MEDIUM` / `LOW`, the mock `file:line`, the real `file:line`, and the exact class string or text to use;
    - a verdict: `MATCHES` / `MOSTLY MATCHES` / `DOES NOT MATCH`.

## 2. Functional reviewer

Agent: general-purpose.

Question: **"Does every scenario behave as the spec says?"**

- Standalone mock: load the mock's JS into a Node `vm` (stub `location`, `sessionStorage`, `window`). `scripts/check-scenarios.js` shows how; reuse its `sandbox()`.
    - Run every scenario that has `op` / `req` under its mock state.
    - For a screen scenario, call the RPCs the screen calls with the params it sends, and check the data supports each step (the MR, version or row the step names exists, the filter returns what `expect` says).
- In-project mock: read `_mock/use<Screen>.ts` and `rules.ts`, and trace each scenario through them.
- Compare every code and exact message with `spec.md` and `contracts/`.
- Read the screen logic for dead buttons, wrong or ignored query params, and state leaking between frames (storage keys the index does not clear).
- List every acceptance scenario, edge case and refusal row in the spec that has **no** scenario in `<plan>/use-cases.js`, and every `skip` that could be played.
- Report: numbered findings, each with severity, scenario id, `file:line`, spec line and the fix; then the gaps.

## 3. Merge and fix

- Merge the two reports into one numbered list.
- When the UI review and a scenario disagree (e.g. the mock has a control the real app lacks), settle it against the **spec first, then the real code**. Write down which won and why.
- Apply every fix with **one fresh fix agent** — never one of the reviewers. Give it the merged list and the files; it reports each finding as fixed or not fixable, with why.
    - A missing or wrong scenario (title, `expect`, a gap) is fixed in `<plan>/use-cases.js` with the `generate-use-case` skill's rules, then `scripts/check.js` there. Everything else is fixed in the mock.
- Then regenerate the overview's Scenarios views (`scenarios-panels.js`, see `SKILL.md` step 7) and re-run Verify.
- Don't run the reviewers a second time, unless the fix agent reports a finding it could not apply.
- Confirm step: the two verdicts, the number of findings by severity, how many were fixed, and every conflict with the side that won.
