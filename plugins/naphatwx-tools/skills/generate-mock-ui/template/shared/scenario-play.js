// Mock-only: how to play each ui scenario of the plan's use-cases.js, keyed by its id. Each picks a mock state
// (shared/states.js), the page it opens on and how to drive it. mcp / api / job scenarios get no entry: no mock.
// SCENARIO_PLAY is strict JSON (double quotes, no trailing commas) so a script can parse it after `var NAME = `.

var SCENARIO_PLAY = [
  { "id": "read-list", "state": "normal", "page": "example",
    "steps": ["Read the pluto list: Second thing, then First thing.", "Press Refresh."] },
  { "id": "read-failed", "state": "normal", "page": "example", "params": { "status": "FAILED" },
    "steps": ["The Status filter is set to Failed."] },
  { "id": "read-empty", "state": "empty", "page": "example",
    "steps": ["Open the list of neptune."] },
  { "id": "read-unreachable", "state": "unreachable", "page": "example",
    "steps": ["Wait for the first read to fail."] },
  { "id": "read-retry", "state": "unreachable", "page": "example",
    "steps": ["Wait for the first read to fail.", "Press Retry."] },
  { "id": "create-thing", "state": "normal", "page": "example",
    "steps": ["You are signed in as MANAGER_DEV: has things.create.", "Press Create.", "Type Third thing in Name.", "Press Create in the form."] },
  { "id": "create-empty-name", "state": "normal", "page": "example", "params": { "modal": "CREATE" },
    "steps": ["The Create form is open with Name empty.", "Press Create in the form."] },
  { "id": "create-read-only", "state": "read-only", "page": "example",
    "steps": ["You are signed in as VIEWER: has things.read, not things.create.", "Look at the toolbar for Create, then read the list."] },
  { "id": "create-archived", "state": "archived", "page": "example",
    "steps": ["Look at Create and read the line under it."] }
];

// Merge into SCENARIOS (loaded before this file) so pages read one list. Only a ui scenario with an entry plays;
// every other one stays in the tree as "No mock".
SCENARIOS = SCENARIOS.map(s => Object.assign({}, s, SCENARIO_PLAY.find(p => p.id === s.id) || {}));
var isPlayable = s => s.surface === 'ui' && !!s.page;
