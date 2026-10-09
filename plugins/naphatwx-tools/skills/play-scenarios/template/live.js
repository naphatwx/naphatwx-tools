// How to play each scenario of the plan's use-cases.js on the running app, keyed by its id.
// LIVE_CONFIG and LIVE_PLAY are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// Commands run only through server.mjs, read from this file; the page never sends a command.

var LIVE_CONFIG = {
  "slug": "example",
  "base": "preview/app.html#",
  "api": "preview",
  "apiAuth": null,
  "appDir": ".",
  "pretest": { "up": "", "health": "/", "timeoutSec": 300 },
  "login": { "type": "link", "path": "/dev/login?as={role}&next={next}" },
  "role": "MANAGER_DEV",
  "seedTimeoutSec": 180
};

var LIVE_PLAY = [
  { "id": "read-list", "seed": "node seeds/owner-with-things.mjs",
    "steps": ["Look at the list: newest first.", "Press Refresh."] },
  { "id": "read-failed", "seed": "node seeds/owner-with-things.mjs --status FAILED",
    "steps": ["The Status filter is set to Failed."] },
  { "id": "read-empty", "seed": "node seeds/empty-owner.mjs",
    "steps": ["Open the new owner's list. It has no things."] },
  { "id": "read-unreachable", "skip": "Needs the upstream service down. Play it with the mock, or stop the upstream and press Restart." },
  { "id": "read-retry", "skip": "Needs the upstream service down, then back. Play it with the mock." },
  { "id": "create-read-only", "url": "/owners/shared", "role": "VIEWER",
    "steps": ["Look at the toolbar."] },
  { "id": "create-archived", "seed": "node seeds/owner-with-things.mjs --archived",
    "steps": ["Hover or tab to Create."] },
  { "id": "create-api", "skip": "An API scenario with no screen. Run it with the e2e-test skill or an MCP client." },
  { "id": "create-api-empty-name", "skip": "An API scenario with no screen. Run it with the e2e-test skill or an MCP client." },
  { "id": "backfill-skips-filled", "skip": "An operator script, run once per environment. No screen to play." },
  { "id": "backfill-rerun", "skip": "An operator script, run once per environment. No screen to play." }
];

// Merge into SCENARIOS (loaded before this file) so the index reads one list; skipped ones stay out of the frames.
SCENARIOS = SCENARIOS.map(s => Object.assign({}, s, LIVE_PLAY.find(p => p.id === s.id) || { skip: 'No play entry.' }));
var SCENARIOS_SKIPPED = SCENARIOS.filter(s => s.skip);
SCENARIOS = SCENARIOS.filter(s => !s.skip);
