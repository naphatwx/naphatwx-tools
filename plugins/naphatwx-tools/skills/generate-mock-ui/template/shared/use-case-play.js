// Mock-only: how to play each use case of the plan's use-cases.js, keyed by its id. Each picks a scenario
// (shared/scenarios.js), the page it opens on and how to drive it; `skip` says why one has no screen to play.
// USE_CASE_PLAY is strict JSON (double quotes, no trailing commas) so a script can parse it after `var NAME = `.

var USE_CASE_PLAY = [
  { "id": "read-list", "scenario": "normal", "page": "example",
    "steps": ["Look at the list: newest first.", "Press Refresh."] },
  { "id": "read-failed", "scenario": "normal", "page": "example", "params": { "status": "FAILED" },
    "steps": ["The Status filter is set to Failed."] },
  { "id": "read-empty", "scenario": "empty", "page": "example",
    "steps": ["Open the list of neptune."] },
  { "id": "read-unreachable", "scenario": "unreachable", "page": "example",
    "steps": ["Wait for the first read to fail.", "Press Retry."] },
  { "id": "create-read-only", "scenario": "read-only", "page": "example",
    "steps": ["Look at the toolbar."] },
  { "id": "create-archived", "scenario": "archived", "page": "example",
    "steps": ["Hover or tab to Create."] },
  { "id": "create-api", "scenario": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "Third thing" },
    "steps": ["Press Run.", "Set \"name\": \"\" and run again."] },
  { "id": "backfill-skips-filled", "skip": "An operator script, run once per environment. No screen to play." }
];

// Merge into USE_CASES (loaded before this file) so pages read one list; skipped ones stay out of the mock.
USE_CASES = USE_CASES.map(u => Object.assign({}, u, USE_CASE_PLAY.find(p => p.id === u.id) || { skip: 'No play entry.' }));
var USE_CASES_SKIPPED = USE_CASES.filter(u => u.skip);
USE_CASES = USE_CASES.filter(u => !u.skip);
