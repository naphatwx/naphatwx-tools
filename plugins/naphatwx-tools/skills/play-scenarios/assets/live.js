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
    "steps": ["You are signed in as MANAGER_DEV: has things.read and things.create.", "Read the {ownerName} list: Second thing, then First thing.", "Press Refresh."] },
  { "id": "read-failed", "seed": "node seeds/owner-with-things.mjs --status FAILED",
    "steps": ["The Status filter is set to Failed. {ownerName} has one PENDING and one READY thing, none failed."] },
  { "id": "read-empty", "seed": "node seeds/empty-owner.mjs",
    "steps": ["Read the {ownerName} list. The seed gave it no things."] },
  { "id": "read-unreachable", "skip": "Needs the upstream service down. Play it with the mock, or stop the upstream and press Restart." },
  { "id": "read-retry", "skip": "Needs the upstream service down, then back. Play it with the mock." },
  { "id": "mcp-list", "seed": "node seeds/owner-with-things.mjs",
    "steps": ["Once: connect your AI agent to the app's local MCP server (claude mcp add --transport http example-local http://localhost:3000/mcp).", "Press ▶ Seed: it makes a new owner and puts its id into the prompt.", "Copy the prompt and paste it into your AI agent. Approve the calls it asks to make.", "Check its answer against What you should see. Recorded calls shows one earlier run, call by call."],
    "prompt": "Use the example-local MCP server. For every call, show me the exact request and the full response, and read the tool's input schema first. Call ThingService ListThings with ownerId {ownerId}. Tell me how many things it returns, in order, with each name and status." },
  { "id": "mcp-list-empty", "seed": "node seeds/empty-owner.mjs",
    "steps": ["Once: connect your AI agent to the app's local MCP server (claude mcp add --transport http example-local http://localhost:3000/mcp).", "Press ▶ Seed: it makes a new owner and puts its id into the prompt.", "Copy the prompt and paste it into your AI agent. Approve the calls it asks to make.", "Check its answer against What you should see. Recorded calls shows one earlier run, call by call."],
    "prompt": "Use the example-local MCP server. For every call, show me the exact request and the full response, and read the tool's input schema first. Call ThingService ListThings with ownerId {ownerId}. Tell me the things list and the total, and whether the call returned an error." },
  { "id": "mcp-list-unreachable", "skip": "Needs the upstream service down. Play it with the mock, or stop the upstream, then ▶ Seed and run the prompt of mcp-list." },
  { "id": "create-thing", "seed": "node seeds/owner-with-things.mjs --create",
    "steps": ["The Create form of {ownerName} is open.", "Type Third thing as the name and press Create.", "Read the toast, then the list."] },
  { "id": "create-empty-name", "seed": "node seeds/owner-with-things.mjs --create",
    "steps": ["The Create form of {ownerName} is open.", "Leave the name empty and press Create.", "Read the text under the name field, then go back to the list: still 2 rows."] },
  { "id": "create-read-only", "seed": "node seeds/owner-with-things.mjs", "role": "VIEWER",
    "steps": ["You are signed in as VIEWER: has things.read, not things.create.", "Look at the toolbar for Create, then read the list."] },
  { "id": "create-archived", "seed": "node seeds/owner-with-things.mjs --archived",
    "steps": ["{ownerName} is archived.", "Look at Create in the toolbar and read the text under it."] },
  { "id": "mcp-create", "seed": "node seeds/owner-with-things.mjs",
    "steps": ["Once: connect your AI agent to the app's local MCP server (claude mcp add --transport http example-local http://localhost:3000/mcp).", "Press ▶ Seed: it makes a new owner and puts its id into the prompt.", "Copy the prompt and paste it into your AI agent. Approve the calls it asks to make.", "Check its answer against What you should see. Recorded calls shows one earlier run, call by call."],
    "prompt": "Use the example-local MCP server. For every call, show me the exact request and the full response, and read the tool's input schema first. I confirm the write below. Call ThingService CreateThing with ownerId {ownerId} and name \"Third thing\". Then call AuditLogService GetAuditLogs for the new thing. Tell me the new thing's status and the audit message." },
  { "id": "mcp-create-empty-name", "seed": "node seeds/owner-with-things.mjs",
    "steps": ["Once: connect your AI agent to the app's local MCP server (claude mcp add --transport http example-local http://localhost:3000/mcp).", "Press ▶ Seed: it makes a new owner and puts its id into the prompt.", "Copy the prompt and paste it into your AI agent. Approve the calls it asks to make.", "Check its answer against What you should see. Recorded calls shows one earlier run, call by call."],
    "prompt": "Use the example-local MCP server. For every call, show me the exact request and the full response, and read the tool's input schema first. Call ThingService CreateThing with ownerId {ownerId} and an empty name. Then call ThingService ListThings with ownerId {ownerId}. Tell me the error of the first call and how many things the owner has." },
  { "id": "mcp-create-read-only", "seed": "node seeds/owner-with-things.mjs", "role": "VIEWER",
    "steps": ["Once: connect your AI agent to the app's local MCP server (claude mcp add --transport http example-local http://localhost:3000/mcp).", "Use a VIEWER token for this one: has things.read, not things.create. Make it on the app's local token page.", "Press ▶ Seed: it makes a new owner and puts its id into the prompt.", "Copy the prompt and paste it into your AI agent. Approve the calls it asks to make.", "Check its answer against What you should see. Recorded calls shows one earlier run, call by call."],
    "prompt": "Use the example-local MCP server. For every call, show me the exact request and the full response, and read the tool's input schema first. Use the VIEWER token. Call ThingService CreateThing with ownerId {ownerId} and name \"Third thing\". Then call ThingService ListThings with ownerId {ownerId}. Tell me the error of the first call and how many things the owner has." },
  { "id": "mcp-create-archived", "seed": "node seeds/owner-with-things.mjs --archived",
    "steps": ["Once: connect your AI agent to the app's local MCP server (claude mcp add --transport http example-local http://localhost:3000/mcp).", "Press ▶ Seed: it makes a new owner and puts its id into the prompt.", "Copy the prompt and paste it into your AI agent. Approve the calls it asks to make.", "Check its answer against What you should see. Recorded calls shows one earlier run, call by call."],
    "prompt": "Use the example-local MCP server. For every call, show me the exact request and the full response, and read the tool's input schema first. Call ThingService CreateThing with ownerId {ownerId} and name \"Third thing\". Then call ThingService ListThings with ownerId {ownerId}. Tell me the error of the first call and how many things the owner has." },
  { "id": "backfill-skips-filled",
    "steps": ["Copy the prompt and paste it into your AI agent, opened in the app repo. Approve the command it asks to run.", "Check its answer against What you should see."],
    "prompt": "In the app repo, run npm run backfill against the local database. Show me the exact command and its full output. Tell me the updated and skipped counts." },
  { "id": "backfill-rerun",
    "steps": ["Copy the prompt and paste it into your AI agent, opened in the app repo. Approve the command it asks to run.", "Check its answer against What you should see."],
    "prompt": "In the app repo, run npm run backfill twice against the local database. Show me each command and its full output. Tell me the updated and skipped counts of the second run." }
];

// Merge into SCENARIOS (loaded before this file) so the index reads one list, in use-cases.js order.
// A skipped scenario keeps its place in the tree, marked with its reason.
SCENARIOS = SCENARIOS.map(s => Object.assign({}, s, LIVE_PLAY.find(p => p.id === s.id) || { skip: 'No play entry.' }));
