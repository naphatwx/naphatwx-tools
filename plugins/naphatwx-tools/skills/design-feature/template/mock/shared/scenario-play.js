// Mock-only: how to play each scenario of the plan's use-cases.js, keyed by its id. Each picks a mock state
// (shared/states.js), the page it opens on and how to drive it; `skip` says why one has no screen to play.
// SCENARIO_PLAY is strict JSON (double quotes, no trailing commas) so a script can parse it after `var NAME = `.

var SCENARIO_PLAY = [
  { "id": "create-read-only", "state": "read-only", "page": "example",
    "steps": ["Look at the toolbar."] },
  { "id": "create-archived", "state": "archived", "page": "example",
    "steps": ["Hover or tab to Create."] },
  { "id": "create-api", "state": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "Third thing" },
    "steps": ["Press Run."] },
  { "id": "create-api-empty-name", "state": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "" },
    "steps": ["Press Run."] }
];

// Merge into SCENARIOS (loaded before this file) so pages read one list; skipped ones stay out of the mock.
SCENARIOS = SCENARIOS.map(s => Object.assign({}, s, SCENARIO_PLAY.find(p => p.id === s.id) || { skip: 'No play entry.' }));
var SCENARIOS_SKIPPED = SCENARIOS.filter(s => s.skip);
SCENARIOS = SCENARIOS.filter(s => !s.skip);
