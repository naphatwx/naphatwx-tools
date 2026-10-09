// Mock-only: how to play each scenario of the plan's use-cases.js, keyed by its id. Each picks a mock state
// (shared/states.js), the page it opens on and how to drive it; `skip` says why one has no screen to play.
// SCENARIO_PLAY is strict JSON (double quotes, no trailing commas) so a script can parse it after `var NAME = `.

var SCENARIO_PLAY = [
  { "id": "read-list", "state": "normal", "page": "example",
    "steps": ["Look at the list: newest first.", "Press Refresh."] },
  { "id": "read-failed", "state": "normal", "page": "example", "params": { "status": "FAILED" },
    "steps": ["The Status filter is set to Failed."] },
  { "id": "read-empty", "state": "empty", "page": "example",
    "steps": ["Open the list of neptune."] },
  { "id": "read-unreachable", "state": "unreachable", "page": "example",
    "steps": ["Wait for the first read to fail."] },
  { "id": "read-retry", "state": "unreachable", "page": "example",
    "steps": ["Wait for the first read to fail.", "Press Retry."] },
  { "id": "create-read-only", "state": "read-only", "page": "example",
    "steps": ["Look at the toolbar."] },
  { "id": "create-archived", "state": "archived", "page": "example",
    "steps": ["Hover or tab to Create."] },
  { "id": "create-api", "state": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "Third thing" },
    "steps": ["Press Run."] },
  { "id": "create-api-empty-name", "state": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "" },
    "steps": ["Press Run."] },
  { "id": "backfill-skips-filled", "skip": "An operator script, run once per environment. No screen to play." },
  { "id": "backfill-rerun", "skip": "An operator script, run once per environment. No screen to play." }
];

// Merge into SCENARIOS (loaded before this file) so pages read one list; skipped ones stay out of the mock.
SCENARIOS = SCENARIOS.map(s => Object.assign({}, s, SCENARIO_PLAY.find(p => p.id === s.id) || { skip: 'No play entry.' }));
var SCENARIOS_SKIPPED = SCENARIOS.filter(s => s.skip);
SCENARIOS = SCENARIOS.filter(s => !s.skip);
