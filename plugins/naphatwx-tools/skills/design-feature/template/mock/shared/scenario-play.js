// Mock-only: how to play each ui scenario of the plan's use-cases.js, keyed by its id. Each picks a mock state
// (shared/states.js), the page it opens on and how to drive it. mcp / api / job scenarios get no entry: no mock.
// SCENARIO_PLAY is strict JSON (double quotes, no trailing commas) so a script can parse it after `var NAME = `.

var SCENARIO_PLAY = [
  { "id": "create-read-only", "state": "read-only", "page": "example",
    "steps": ["You are signed in as VIEWER: has things.read, not things.create.", "Look at the toolbar for Create, then read the list."] },
  { "id": "create-archived", "state": "archived", "page": "example",
    "steps": ["Look at Create and read the line under it."] }
];

// Merge into SCENARIOS (loaded before this file) so pages read one list. Only a ui scenario with an entry plays;
// every other one stays in the tree as "No mock".
SCENARIOS = SCENARIOS.map(s => Object.assign({}, s, SCENARIO_PLAY.find(p => p.id === s.id) || {}));
var isPlayable = s => s.surface === 'ui' && !!s.page;
