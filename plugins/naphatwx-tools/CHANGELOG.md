# Changelog

## 1.9.139

**design-feature, generate-mock-ui: mock review and control rule**

- New mandatory mock review (`generate-mock-ui/references/mock-review.md`, design-feature step 6b): two fresh review-only agents in parallel (UI fidelity, functional), conflicts settled against the spec then the real code, one fresh fix agent, then the Use cases section is regenerated and Verify re-runs.
- Control rule: a control the user has no permission for is hidden when the real app hides it; it is shown unavailable with a reason only where the spec says so.

## 1.9.138

**design-feature, generate-mock-ui: use cases become first-class**

- generate-mock-ui writes `mock/shared/use-cases.js`: `USE_CASE_FLOWS` and `USE_CASES`, strict-JSON arrays derived from every acceptance scenario, edge case and refusal row in the spec, grouped by plan flow.
- Mock index: one block per flow, a chip row of use cases, and a card that shows "How to play" / "What you should see" and plays the screen in a scaled 1600×940 iframe. `#uc-<id>` deep links, Restart, clean state per use case, thin theme-aware scrollbars.
- Screen pages: `?embed=1` hides the floating panel; `?uc=<id>` shows that use case's steps.
- New `page/console.html`: an MCP client panel for API / MCP use cases.
- New `generate-mock-ui/scripts/check-use-cases.js`: syntax-checks every script, checks ids / flows / scenarios, and runs every console use case against the fake API.
- Overview section 07 is now "Use cases" (was "Mock UI"), generated with each flow's "Try in the mock" line by the new `design-feature/scripts/use-cases-section.js`.
- New optional step: publish the plan as a claude.ai Artifact from a copy (`design-feature/scripts/publish-copy.js` strips `target="_blank"` and points `overview.html` links at `index.html`).
