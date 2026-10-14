// What the AI recorded when it played the no-screen scenarios (those with a "prompt" in live.js) on the local app.
// Written by the agent, never by hand. `calls`: every call of that run, request and response as returned, secrets masked.
// A Pass/Fail you click in the browser wins. Strict JSON after `var PLAYED_RESULTS = `. Preview data: a real run starts at {}.
var PLAYED_RESULTS = {
 "mcp-list": {
  "status": "pass",
  "by": "Claude over MCP on the local app",
  "at": "2026-10-14",
  "note": "Claude over MCP, 2026-10-14: 2 things, Second thing PENDING then First thing READY.",
  "calls": [
   { "role": "MANAGER_DEV", "tool": "ThingService", "arguments": { "operation": "ListThings", "params": { "ownerId": 1202 } }, "isError": false,
     "response": { "things": [{ "id": 1205, "name": "Second thing", "status": "PENDING" }, { "id": 1204, "name": "First thing", "status": "READY" }], "total": 2 } }
  ]
 },
 "mcp-create": {
  "status": "pass",
  "by": "Claude over MCP on the local app",
  "at": "2026-10-14",
  "note": "Claude over MCP, 2026-10-14: PENDING, audit \"created thing #1207\".",
  "calls": [
   { "role": "MANAGER_DEV", "tool": "ThingService", "arguments": { "operation": "CreateThing", "params": { "ownerId": 1202, "name": "Third thing" } }, "isError": false,
     "response": { "id": 1207, "name": "Third thing", "status": "PENDING" } },
   { "role": "MANAGER_DEV", "tool": "AuditLogService", "arguments": { "operation": "GetAuditLogs", "params": { "thingId": 1207, "limit": 1 } }, "isError": false,
     "response": { "entities": [{ "message": "created thing #1207" }], "total": 1 } }
  ]
 },
 "mcp-create-empty-name": {
  "status": "pass",
  "by": "Claude over MCP on the local app",
  "at": "2026-10-14",
  "note": "Claude over MCP, 2026-10-14: Invalid argument: name is required. The owner still has its 2 things.",
  "calls": [
   { "role": "MANAGER_DEV", "tool": "ThingService", "arguments": { "operation": "CreateThing", "params": { "ownerId": 1210, "name": "" } }, "isError": true,
     "response": "Invalid argument: name is required." },
   { "lookup": "The owner id 1210 came from ▶ Seed (the seed's vars)." },
   { "role": "MANAGER_DEV", "tool": "ThingService", "arguments": { "operation": "ListThings", "params": { "ownerId": 1210 } }, "isError": false,
     "response": { "things": [{ "id": 1212 }, { "id": 1211 }], "total": 2 } }
  ]
 }
};
